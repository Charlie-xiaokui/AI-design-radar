import { readFile } from "node:fs/promises";
import { readRawSignals } from "../repositories/raw-signal-repository.ts";
import { resolveInspectorSource } from "../services/source-inspector.ts";
import { normalizeRegistrySnapshot } from "../services/runtime-snapshot.ts";
import type { Source, SourceCoverage } from "../types/source.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sources = JSON.parse(await readFile("data/sources.json", "utf8")) as Source[];
const coverage = JSON.parse(await readFile("data/source_coverage.json", "utf8")) as SourceCoverage[];
const client = await readFile("public/app.ts", "utf8");
const html = await readFile("public/index.html", "utf8");
const radarClient = await readFile("public/radar.ts", "utf8");
const radarHtml = await readFile("public/radar.html", "utf8");
const server = await readFile("src/server.ts", "utf8");
const rawSignals = await readRawSignals();

const legacySnapshot = normalizeRegistrySnapshot({
  sources: [{ ...sources.find((item) => item.slug === "manus")!, sources: undefined, suggested_sources: undefined }],
  candidates: undefined,
  coverage: undefined,
});
assert(Array.isArray(legacySnapshot.sources[0]?.sources), "Missing product.sources should normalize to []");
assert(Array.isArray(legacySnapshot.sources[0]?.suggested_sources), "Missing product.suggested_sources should normalize to []");
assert(Array.isArray(legacySnapshot.candidates), "Missing candidates should normalize to []");
assert(Array.isArray(legacySnapshot.coverage), "Missing coverage should normalize to []");

for (const productName of ["Manus", "Claude", "Cursor"]) {
  const source = sources.find((item) => item.product_name === productName)!;
  const row = coverage.find((item) => item.product_name === productName)!;
  assert(resolveInspectorSource(sources, row.source_id)?.id === source.id, `${productName} Inspect should resolve coverage source_id`);
  assert(resolveInspectorSource(sources, source.slug)?.id === source.id, `${productName} Inspector should resolve slug`);
  assert(resolveInspectorSource(sources, productName)?.id === source.id, `${productName} product-name click should resolve product_name`);
}

assert(client.includes("data-coverage-inspect"), "Coverage rows should expose an Inspector product key");
assert(client.includes("openInspector("), "Coverage Inspect and product-name clicks should call openInspector");
assert(client.includes("window.setTimeout"), "Inspector dialog opening should be deferred beyond the originating click event");
assert(client.includes("safeArray<SourceCandidate>(snapshot.candidates)"), "Candidate Pipeline should remain visible in Inspector with an empty-array fallback");
assert(client.includes("normalizeSnapshot"), "Registry responses should be normalized before rendering");
assert(client.includes("renderCandidatePanel"), "Candidate rendering should have an isolated render boundary");
assert(client.includes("暂无待审核候选信号源"), "Empty candidate pools should render the Suggested Sources empty state");
assert(client.includes('data-formal-field="primary_purpose"'), "Formal Sources should expose Primary Purpose");
assert(client.includes('data-formal-purpose='), "Formal Sources should expose purpose multi-select controls");
assert(client.includes('data-candidate-primary-purpose'), "Suggested Sources should expose Primary Purpose");
assert(client.includes('data-candidate-purpose='), "Suggested Sources should expose purpose multi-select controls");
assert(client.includes('data-formal-field="access_type"'), "Formal Sources should expose access_type editing");
assert(client.includes("access-type-badge"), "Inspector should render access_type badges");
assert(client.includes("candidate.product || candidate.product_slug || candidate.product_name || candidate.product_id || candidate.source_id"), "Candidate matching should support all registry identity fields");
assert(client.includes('candidate.status === "pending_review" || candidate.status === "pending" || candidate.status === "suggested"'), "Suggested Sources should display pending and legacy suggested statuses");
assert(server.includes("candidates: candidateList.map"), "Registry API must expose the independent candidate pool");
assert(client.includes("allCandidatesLength") && client.includes("matchedCandidatesLength") && client.includes("matchedCandidateUrls"), "Manus Inspector should log runtime candidate diagnostics");
assert(client.includes("Candidate panel render failed"), "Candidate rendering should have a minimal error boundary");
assert(html.includes("Formal Sources") && html.includes("+ Add Source"), "Inspector should retain Formal Sources and Add Source controls");
assert(html.includes('id="closeSourceDialog"'), "Add Source dialog should have an explicit close control");
assert(client.includes("closeSourceDialog"), "Add Source close control should have a dedicated handler");
assert(client.includes("closeDialog(event, inspectorDialog)"), "Inspector close control should close only the Inspector dialog");
assert(html.includes("Raw Signals Review"), "Raw Signals review panel should be present");
assert(html.includes('id="rawSignalVisualFilter"'), "Raw Signals review should expose a visual-first filter");
assert(html.includes("Approved Signals"), "Approved Signals gallery should be present");
assert(html.includes("Homepage Candidate Review"), "Homepage Candidate Review section should be present");
assert(client.includes('/api/raw-signals'), "Raw Signals page should load raw signals from the API");
assert(client.includes("renderRawSignals"), "Raw Signals page should render collected signals");
assert(client.includes("Signals With Screenshots") && client.includes("Signals With Video") && client.includes("Signals With GIF"), "Raw Signals dashboard should expose visual media metrics");
assert(client.includes("Homepage-qualified Visual"), "Raw Signals dashboard should count homepage-qualified visual signals");
assert(client.includes("renderApprovedSignals"), "Approved Signals gallery should render approved-only signals");
assert(client.includes('signal.status === "approved"'), "Approved Signals gallery should filter approved signals only");
assert(client.includes("signalSortTimestamp"), "Approved Signals gallery should sort by published_at with created_at fallback");
assert(client.includes("renderHomepageCandidates"), "Homepage Candidate Review should render approved signals for homepage qualification");
assert(client.includes("homepage_candidate"), "Homepage Candidate Review should expose homepage_candidate controls");
assert(client.includes("visual_asset_type"), "Homepage Candidate Review should expose visual asset controls");
assert(client.includes("homepage_reasons"), "Homepage Candidate Review should persist reasons");
assert(client.includes("homepageReviewCriteria"), "Homepage Candidate Review should expose scoring criteria");
assert(client.includes("homepage_score >= 3"), "Homepage Candidate Review should mark score >= 3 as recommended");
assert(html.includes('href="/radar"'), "Source Registry should link to the Design Radar page");
assert(radarHtml.includes("Design Radar"), "Design Radar page should exist");
assert(radarHtml.includes('id="radarGrid"'), "Design Radar page should include a responsive card grid target");
assert(radarHtml.includes("radar.js"), "Design Radar page should load its generated client script");
assert(radarClient.includes('signal.status === "approved" && signal.homepage_candidate === true'), "Design Radar cards should only use approved homepage candidates");
assert(radarClient.includes("signal.homepage_score >= 3"), "Design Radar should exclude homepage candidates below the qualification threshold");
assert(radarClient.includes("filterCategories"), "Design Radar should expose homepage category filters");
assert(radarClient.includes("openDetail"), "Design Radar cards should open a detail view");
assert(radarClient.includes("selectHeroMedia"), "Design Radar should compute a best hero media URL for display");
assert(radarClient.includes("brandMediaPattern") && radarClient.includes("genericCoverPattern"), "Design Radar hero media should reject logo, brand, support, cover, and social-preview assets");
assert(radarClient.includes("HeroMediaKind"), "Design Radar should classify hero media before rendering it");
assert(radarClient.includes("imageDimensions"), "Design Radar hero media should inspect image dimensions before selecting screenshots");
assert(radarClient.includes("可用界面图"), "Design Radar metrics should separate any media from usable hero media");
assert(radarClient.includes("媒体调试信息"), "Design Radar detail view should expose hero media debug info");
assert(radarClient.includes("暂无可用产品界面图"), "Design Radar should show a clear Chinese placeholder when no useful product visual exists");
assert(radarClient.includes("已发现媒体，但未识别到可用于首页的产品界面图。"), "Design Radar should explain when media exists but no product UI visual is usable");
assert(server.includes('pathname === "/radar" ? "radar.html"'), "Server should route /radar to the Design Radar page");
const claudeHelpReleaseNotes = rawSignals.find((signal) => signal.id === "raw_claude_claude_release_notes_134th70");
assert(claudeHelpReleaseNotes?.homepage_score !== undefined && claudeHelpReleaseNotes.homepage_score < 3, "Claude Help Center release notes should score below homepage recommendation threshold");
assert(client.includes("data-raw-signal-action"), "Raw Signals page should expose status action buttons");
assert(server.includes('/api/raw-signals'), "Server should expose raw signal API routes");
assert(server.includes("homepage-review"), "Server should expose homepage candidate review API route");
assert(html.includes('id="confirmDialog"'), "Delete actions should use an application confirmation dialog");
assert(client.includes("confirmAction("), "Delete actions should await the application confirmation dialog");
assert(!client.includes('confirm("删除这个正式 Source'), "Formal source deletion should not block on native confirm");
assert(client.includes('addEventListener("pointerdown"'), "Formal source sorting should support pointer-driven drag start");
assert(client.includes('addEventListener("pointermove"'), "Formal source sorting should track pointer hover targets");
assert(client.includes('addEventListener("pointerup"'), "Formal source sorting should persist pointer-driven drops");

console.log("Inspector navigation regression tests passed.");
