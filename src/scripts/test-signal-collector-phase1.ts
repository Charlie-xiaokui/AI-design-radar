import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ProductSource, RawSignal, Source } from "../types/source.ts";
import {
  findDuplicateRawSignal,
  readRawSignals,
  updateRawSignalStatus,
  upsertRawSignals,
  writeRawSignals,
} from "../repositories/raw-signal-repository.ts";
import { filterEligibleSignalSources, summarizeSignalSourceEligibility } from "../services/signal-source-filter.ts";
import { collectSignalSummary } from "../services/signal-collector.ts";
import { runtimeDefaults } from "../services/source-signals.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function source(partial: Partial<ProductSource>): ProductSource {
  return {
    id: partial.id ?? "source",
    type: partial.type ?? "blog",
    url: partial.url ?? "https://example.com/blog",
    purpose: partial.purpose ?? "updates",
    primary_purpose: partial.primary_purpose,
    purposes: partial.purposes,
    priority: partial.priority ?? 3,
    scan_frequency: partial.scan_frequency ?? "weekly",
    status: partial.status ?? "active",
    notes: partial.notes ?? "",
    access_type: partial.access_type,
    ...runtimeDefaults(partial.type ?? "blog"),
  };
}

function product(partial: Partial<Source>): Source {
  return {
    id: partial.id ?? "src_product",
    product_name: partial.product_name ?? "Product",
    slug: partial.slug ?? "product",
    category: "Other",
    design_pattern: "",
    sources: partial.sources ?? [],
    suggested_sources: [],
    source_types: [],
    github_type: "none",
    review_status: "pending",
    media_score: 3,
    signal_score: 3,
    homepage_url: "",
    github_url: "",
    github_releases_url: "",
    changelog_url: "",
    docs_url: "",
    product_hunt_url: "",
    x_url: "",
    rss_url: "",
    news_url: "",
    videos_url: "",
    blog_url: "",
    release_notes_url: "",
    anthropic_news_url: "",
    claude_code_github_url: "",
    claude_code_releases_url: "",
    claude_code_rss_url: "",
    source_priority: 3,
    media_likelihood: 3,
    scan_frequency: "weekly",
    status: "active",
    notes: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function rawSignal(partial: Partial<RawSignal>): RawSignal {
  const now = "2026-06-13T00:00:00.000Z";
  return {
    id: partial.id ?? "signal_1",
    product: partial.product ?? "Product",
    source_id: partial.source_id ?? "source",
    source_url: partial.source_url ?? "https://example.com/blog",
    signal_url: partial.signal_url ?? "https://example.com/blog/post",
    title: partial.title ?? "Launch Post",
    description: partial.description ?? "",
    published_at: partial.published_at ?? "2026-06-01T00:00:00.000Z",
    raw_text: partial.raw_text ?? "Raw launch text",
    media_urls: partial.media_urls ?? [],
    media_types: partial.media_types ?? [],
    source_type: partial.source_type ?? "blog",
    status: partial.status ?? "discovered",
    created_at: partial.created_at ?? now,
    updated_at: partial.updated_at ?? now,
  };
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), "signal-collector-phase1-"));
const rawSignalsFile = path.join(tempDir, "raw_signals.json");

try {
  assert(JSON.stringify(await readRawSignals(rawSignalsFile)) === "[]", "readRawSignals should create a missing file as []");
  assert(await readFile(rawSignalsFile, "utf8") === "[]\n", "raw_signals.json should be initialized with []");

  const initial = rawSignal({ id: "signal_initial", signal_url: "https://example.com/a", title: "Alpha" });
  await writeRawSignals([initial], rawSignalsFile);
  const duplicateByUrl = rawSignal({ id: "signal_url_dup", signal_url: "https://example.com/a", title: "Different" });
  assert(findDuplicateRawSignal(duplicateByUrl, await readRawSignals(rawSignalsFile))?.id === initial.id, "Duplicate detection should match exact signal_url");

  const duplicateByTitle = rawSignal({ id: "signal_title_dup", signal_url: "https://example.com/b", title: "Alpha", product: "Product" });
  assert(findDuplicateRawSignal(duplicateByTitle, await readRawSignals(rawSignalsFile))?.id === initial.id, "Duplicate detection should match normalized title + product");

  const inserted = await upsertRawSignals([
    rawSignal({ id: "signal_new", signal_url: "https://example.com/new", title: "New" }),
    duplicateByUrl,
  ], rawSignalsFile);
  assert(inserted.inserted === 1, "upsertRawSignals should insert only new signals");
  assert(inserted.duplicates_skipped === 1, "upsertRawSignals should skip duplicates");

  const approved = rawSignal({ id: "signal_approved", signal_url: "https://example.com/approved", title: "Approved", status: "approved" });
  await upsertRawSignals([approved], rawSignalsFile);
  const skippedApproved = await upsertRawSignals([{ ...approved, raw_text: "New text should not overwrite approved" }], rawSignalsFile);
  assert(skippedApproved.duplicates_skipped === 1, "upsertRawSignals should not overwrite approved duplicates");
  const afterApproved = await readRawSignals(rawSignalsFile);
  assert(afterApproved.find((item) => item.id === approved.id)?.raw_text === approved.raw_text, "approved signal should remain unchanged");

  const updated = await updateRawSignalStatus("signal_new", "pending_review", rawSignalsFile);
  assert(updated.status === "pending_review", "updateRawSignalStatus should update status");

  const registry = [
    product({
      product_name: "Eligible Product",
      sources: [
        source({ id: "release", type: "release_notes", purpose: "updates", access_type: "public", status: "active" }),
        source({ id: "blog-media", type: "blog", purpose: "identity", purposes: ["identity", "media"], access_type: "public", status: "active" }),
        source({ id: "docs-discovery", type: "docs", purpose: "discovery", access_type: "public", status: "active" }),
        source({ id: "x-skip", type: "x", purpose: "discovery", access_type: "login_required", status: "active" }),
        source({ id: "manual-skip", type: "news", purpose: "updates", access_type: "manual", status: "active" }),
        source({ id: "unknown-skip", type: "news", purpose: "updates", access_type: "unknown", status: "active" }),
        source({ id: "paused-skip", type: "blog", purpose: "updates", access_type: "public", status: "paused" }),
        source({ id: "homepage-skip", type: "homepage", purpose: "identity", access_type: "public", status: "active" }),
      ],
    }),
  ];
  const eligible = filterEligibleSignalSources(registry);
  assert(eligible.length === 3, `Expected 3 eligible signal sources, got ${eligible.length}`);
  assert(eligible.map((item) => item.source.id).join(",") === "release,blog-media,docs-discovery", "Eligible source filtering should preserve product source order");
  const eligibilitySummary = summarizeSignalSourceEligibility(registry);
  assert(eligibilitySummary.total_sources === 8, "Eligibility summary should count nested sources");
  assert(eligibilitySummary.eligible_public_sources === 3, "Eligibility summary should count eligible sources");
  assert(eligibilitySummary.skipped_sources === 5, "Eligibility summary should count skipped sources");

  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Phase 1 must not fetch external URLs");
  };
  try {
    const summary = await collectSignalSummary(registry, rawSignalsFile);
    assert(summary.total_sources === 8, "CLI summary should include total sources");
    assert(summary.eligible_public_sources === 3, "CLI summary should include eligible public sources");
    assert(summary.skipped_sources === 5, "CLI summary should include skipped sources");
    assert(summary.signals_discovered === 0, "Phase 1 should not discover signals yet");
    assert(!fetchCalled, "Phase 1 collector must not fetch external URLs");
    assert(JSON.stringify(await readRawSignals(rawSignalsFile)) !== "", "collectSignalSummary should ensure raw_signals.json exists");
  } finally {
    globalThis.fetch = originalFetch;
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("Signal Collector Phase 1 tests passed.");
