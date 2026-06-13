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
import { auditRawSignals } from "../services/signal-audit.ts";
import { isAllowedRawSignalTransition } from "../services/raw-signal-review.ts";

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
    quality_score: partial.quality_score ?? 75,
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
  assert(isAllowedRawSignalTransition("discovered", "approved"), "Raw Signals review should allow discovered -> approved");
  assert(isAllowedRawSignalTransition("discovered", "rejected"), "Raw Signals review should allow discovered -> rejected");
  assert(isAllowedRawSignalTransition("approved", "archived"), "Raw Signals review should allow approved -> archived");
  assert(!isAllowedRawSignalTransition("rejected", "approved"), "Raw Signals review should reject unsupported status transitions");

  const auditReportFile = path.join(tempDir, "signal_audit_report.json");
  const auditReport = await auditRawSignals(rawSignalsFile, auditReportFile);
  assert(auditReport.total_signals >= 3, "Signal audit should count total signals");
  assert(auditReport.average_raw_text_length > 0, "Signal audit should calculate average raw_text length");
  assert(auditReport.top_20_longest_signals.length > 0, "Signal audit should include longest signals");
  assert(auditReport.top_20_shortest_signals.length > 0, "Signal audit should include shortest signals");
  assert(JSON.parse(await readFile(auditReportFile, "utf8")).total_signals === auditReport.total_signals, "Signal audit should write report JSON");

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
    assert(summary.sources_scanned === 1, "Phase 2A should scan only supported eligible sources");
    assert(summary.signals_discovered === 0, "Failed fetches should not discover signals");
    assert(fetchCalled, "Phase 2A should fetch supported release_notes/changelog sources");
    assert(JSON.stringify(await readRawSignals(rawSignalsFile)) !== "", "collectSignalSummary should ensure raw_signals.json exists");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const collectorFile = path.join(tempDir, "collector_raw_signals.json");
  const collectorRegistry = [
    product({
      product_name: "Collector Product",
      sources: [
        source({ id: "collector-release-notes", type: "release_notes", url: "https://example.com/release-notes", purpose: "updates", access_type: "public", status: "active" }),
        source({ id: "collector-github-releases", type: "github_releases", url: "https://github.com/example/project/releases", purpose: "updates", access_type: "public", status: "active" }),
        source({ id: "collector-github-atom", type: "github_releases_rss", url: "https://github.com/example/project/releases.atom", purpose: "updates", access_type: "public", status: "active" }),
        source({ id: "collector-blog-skipped-phase2a", type: "blog", url: "https://example.com/blog", purpose: "updates", access_type: "public", status: "active" }),
      ],
    }),
  ];
  const fetchedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);
    if (url === "https://example.com/release-notes") {
      return new Response(`<!doctype html><html><head><title>Release Notes</title><meta name="description" content="Latest updates"></head><body><header>Pricing Marketplace Security</header><nav>Docs Menu Breadcrumbs</nav><main><h1>Release Notes</h1><time datetime="2026-06-12">June 12, 2026</time><article><h2>New canvas controls</h2><p>We shipped better controls.</p></article><img src="/screen.png"></main><footer>Footer links and legal terms</footer></body></html>`, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    if (url === "https://api.github.com/repos/example/project/releases?per_page=50") {
      return new Response(JSON.stringify([
        { html_url: "https://github.com/example/project/releases/tag/v1.2.0", name: "v1.2.0", tag_name: "v1.2.0", published_at: "2026-06-10T12:00:00Z", body: "Added release flow", draft: false },
      ]), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url === "https://github.com/example/project/releases.atom") {
      return new Response(`<feed><entry><title>v1.2.1</title><link href="https://github.com/example/project/releases/tag/v1.2.1"/><updated>2026-06-11T12:00:00Z</updated><content>Added atom release notes</content></entry></feed>`, {
        status: 200,
        headers: { "content-type": "application/atom+xml" },
      });
    }
    throw new Error(`Unexpected collector URL: ${url}`);
  };
  try {
    const firstRun = await collectSignalSummary(collectorRegistry, collectorFile);
    assert(firstRun.sources_scanned === 3, `Expected 3 supported sources scanned, got ${firstRun.sources_scanned}`);
    assert(firstRun.signals_discovered === 3, `Expected 3 discovered signals, got ${firstRun.signals_discovered}`);
    assert(firstRun.duplicates_skipped === 0, "First run should not skip duplicates");
    assert(!fetchedUrls.includes("https://example.com/blog"), "Phase 2A should not fetch unsupported blog/news sources yet");
    const collected = await readRawSignals(collectorFile);
    assert(collected.length === 3, `Expected 3 raw signals, got ${collected.length}`);
    assert(collected.every((item) => item.status === "discovered"), "Collected signals should use discovered status");
    assert(collected.every((item) => typeof item.quality_score === "number" && item.quality_score > 0), "Collected signals should include quality_score");
    assert(collected.some((item) => item.source_type === "release_notes" && item.title === "Release Notes"), "Release notes signal should be collected from HTML title");
    const htmlSignal = collected.find((item) => item.source_type === "release_notes")!;
    assert(!htmlSignal.raw_text.includes("Pricing Marketplace Security"), "HTML extraction should remove header/navigation text");
    assert(!htmlSignal.raw_text.includes("Footer links"), "HTML extraction should remove footer text");
    assert(htmlSignal.raw_text.includes("New canvas controls"), "HTML extraction should keep release entry content");
    assert(collected.some((item) => item.signal_url === "https://github.com/example/project/releases/tag/v1.2.0" && item.raw_text.includes("Added release flow")), "GitHub releases API signal should be collected");
    assert(collected.some((item) => item.signal_url === "https://github.com/example/project/releases/tag/v1.2.1" && item.raw_text.includes("Added atom release notes")), "GitHub Atom release signal should be collected");

    const secondRun = await collectSignalSummary(collectorRegistry, collectorFile);
    assert(secondRun.signals_discovered === 0, "Duplicate run should not discover new signals");
    assert(secondRun.duplicates_skipped === 3, `Duplicate run should skip 3 signals, got ${secondRun.duplicates_skipped}`);
    assert((await readRawSignals(collectorFile)).length === 3, "Duplicate run should not append repeated raw signals");
  } finally {
    globalThis.fetch = originalFetch;
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("Signal Collector Phase 1 tests passed.");
