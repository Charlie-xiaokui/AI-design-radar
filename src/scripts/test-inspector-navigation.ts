import { readFile } from "node:fs/promises";
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
const server = await readFile("src/server.ts", "utf8");

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
assert(html.includes('id="confirmDialog"'), "Delete actions should use an application confirmation dialog");
assert(client.includes("confirmAction("), "Delete actions should await the application confirmation dialog");
assert(!client.includes('confirm("删除这个正式 Source'), "Formal source deletion should not block on native confirm");
assert(client.includes('addEventListener("pointerdown"'), "Formal source sorting should support pointer-driven drag start");
assert(client.includes('addEventListener("pointermove"'), "Formal source sorting should track pointer hover targets");
assert(client.includes('addEventListener("pointerup"'), "Formal source sorting should persist pointer-driven drops");

console.log("Inspector navigation regression tests passed.");
