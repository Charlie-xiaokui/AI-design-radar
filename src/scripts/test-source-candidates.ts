import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JsonSourceCandidateRepository, sourceCandidateKey } from "../repositories/source-candidate-repository.ts";
import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { auditCandidatesFor } from "../services/audit-candidates.ts";
import { acceptSourceCandidate, rejectSourceCandidate } from "../services/source-candidates.ts";
import { calculateCoverage } from "../services/source-coverage.ts";
import { candidateMatchesSource, isPendingCandidateStatus, normalizeCandidateProductKey } from "../services/source-candidate-match.ts";
import type { Source } from "../types/source.ts";
import { sourceHasPurpose } from "../services/source-purpose.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const products = JSON.parse(await readFile("data/sources.json", "utf8")) as Source[];
const manus = structuredClone(products.find((item) => item.slug === "manus")!);
const batchFixtures = products.map((product) => {
  const clone = structuredClone(product);
  if (clone.slug === "perplexity") clone.sources = clone.sources.filter((item) => !sourceHasPurpose(item, "updates") && !sourceHasPurpose(item, "community"));
  if (clone.slug === "bolt") clone.sources = clone.sources.filter((item) => !sourceHasPurpose(item, "discovery"));
  if (clone.slug === "figma-ai") clone.sources = clone.sources.filter((item) => !sourceHasPurpose(item, "community"));
  return clone;
});
const batchGenerated = auditCandidatesFor(batchFixtures);
assert(batchGenerated.some((item) => item.product === "Perplexity" && item.purpose === "updates"), "Batch generation should add a Perplexity updates candidate");
assert(batchGenerated.some((item) => item.product === "Bolt" && item.purpose === "discovery"), "Batch generation should add a Bolt discovery candidate");
assert(batchGenerated.some((item) => item.product === "Figma AI" && item.purpose === "community"), "Batch generation should add a Figma AI community candidate");
assert(!batchGenerated.some((item) => item.product === "Cursor"), "Products with 5/5 Coverage should not receive candidates");
for (const product of batchFixtures) {
  assert(batchGenerated.filter((item) => item.product === product.product_name).length <= 5, `${product.product_name} should receive at most five candidates`);
  const coverage = calculateCoverage(product);
  for (const candidate of batchGenerated.filter((item) => item.product === product.product_name)) {
    const missing = candidate.purpose === "identity" ? coverage.identity_sources === 0
      : candidate.purpose === "updates" ? coverage.updates_sources === 0
      : candidate.purpose === "media" ? coverage.media_sources === 0
      : candidate.purpose === "discovery" ? coverage.discovery_sources === 0
      : coverage.community_sources === 0;
    assert(missing, `${product.product_name} candidate should only fill a missing ${candidate.purpose} dimension`);
  }
}

assert(normalizeCandidateProductKey(" src_Manus ") === "manus", "Product keys should normalize src_ prefixes, case, and whitespace");
const productVariants = [
  { product: "Manus" },
  { product: "manus" },
  { product_slug: "manus" },
  { product_id: "src_manus" },
  { product: "", product_slug: "manus" },
];
for (const variant of productVariants) {
  assert(candidateMatchesSource(variant as never, manus), `Candidate identity variant should match Manus: ${JSON.stringify(variant)}`);
}
assert(isPendingCandidateStatus("pending_review"), "pending_review candidates should display");
assert(isPendingCandidateStatus("pending"), "pending candidates should display");
assert(isPendingCandidateStatus("suggested"), "suggested candidates should display for compatibility");
assert(!isPendingCandidateStatus("accepted"), "accepted candidates should not display");
assert(!isPendingCandidateStatus("rejected"), "rejected candidates should not display");
const tempDirectory = await mkdtemp(path.join(tmpdir(), "source-candidates-"));
const sourcesFile = path.join(tempDirectory, "sources.json");
const candidatesFile = path.join(tempDirectory, "source_candidates.json");

try {
  await writeFile(sourcesFile, `${JSON.stringify([manus], null, 2)}\n`, "utf8");
  await writeFile(candidatesFile, "[]\n", "utf8");
  const sourceRepository = new JsonSourceRepository(sourcesFile);
  const candidateRepository = new JsonSourceCandidateRepository(candidatesFile);
  const bareManus = { ...manus, sources: (manus.sources ?? []).filter((item) => item.purpose === "identity") };
  await writeFile(sourcesFile, `${JSON.stringify([bareManus], null, 2)}\n`, "utf8");
  const generated = auditCandidatesFor([bareManus]);
  assert(generated.length === 4, "A bare Manus registry entry should generate four missing-capability candidates");

  await candidateRepository.upsert(generated, [bareManus]);
  await candidateRepository.upsert(generated, [bareManus]);
  assert((await candidateRepository.list()).length === 4, "Repeated audit must deduplicate candidates");
  assert((await candidateRepository.listPendingFor("Manus")).length === 4, "Suggested Sources should receive four pending Manus candidates");

  const coverageSourcesFile = path.join(tempDirectory, "coverage-sources.json");
  const coverageCandidatesFile = path.join(tempDirectory, "coverage-candidates.json");
  await writeFile(coverageSourcesFile, `${JSON.stringify([bareManus], null, 2)}\n`, "utf8");
  await writeFile(coverageCandidatesFile, `${JSON.stringify(generated, null, 2)}\n`, "utf8");
  const coverageSourceRepository = new JsonSourceRepository(coverageSourcesFile);
  const coverageCandidateRepository = new JsonSourceCandidateRepository(coverageCandidatesFile);
  let fullyCovered = bareManus;
  for (const candidate of generated) {
    fullyCovered = await acceptSourceCandidate(coverageSourceRepository, coverageCandidateRepository, manus.id, candidate);
  }
  assert(calculateCoverage(fullyCovered).coverage_score === 5, "Accepting the four Manus capability candidates should raise Coverage from 1/5 to 5/5");

  const editable = (await candidateRepository.list()).find((item) => item.type === "blog")!;
  const staleKey = sourceCandidateKey(editable);
  const editedData = {
    url: "https://manus.im/blog/product-updates",
    type: "news" as const,
    purpose: "media" as const,
    primary_purpose: "media" as const,
    purposes: ["media", "updates"] as const,
  };
  const edited = await candidateRepository.update(editable, editedData);
  const resolvedAfterEdit = await candidateRepository.findByKeyOrData("Manus", staleKey, editedData);
  assert(sourceCandidateKey(resolvedAfterEdit!) === sourceCandidateKey(edited), "Accept should resolve an edited candidate even when the UI sends its stale pre-edit key");
  const acceptedEdited = await acceptSourceCandidate(sourceRepository, candidateRepository, manus.id, resolvedAfterEdit!);
  assert(acceptedEdited.sources.some((item) => item.url === editedData.url && item.type === "news" && item.purpose === "media"), "Accept should use the edited URL, type, and purpose as final source data");
  const acceptedMultiPurpose = acceptedEdited.sources.find((item) => item.url === editedData.url)!;
  assert(acceptedMultiPurpose.primary_purpose === "media", "Accepted candidate should preserve primary_purpose");
  assert(acceptedMultiPurpose.purposes?.join("|") === "media|updates", "Accepted candidate should preserve edited purposes");
  assert(calculateCoverage(acceptedEdited).updates_sources >= 1 && calculateCoverage(acceptedEdited).media_sources >= 1, "Accepted multi-purpose candidate should contribute both Coverage dimensions");
  assert(!(await candidateRepository.list()).some((item) => item.url === editedData.url), "Edited candidate should leave the pool after Accept");

  const rejected = (await candidateRepository.list()).find((item) => item.type === "events")!;
  await rejectSourceCandidate(candidateRepository, rejected);
  assert((await candidateRepository.list()).find((item) => item.type === "events")?.status === "rejected", "Reject should retain the candidate with rejected status");

  const beforeCoverage = calculateCoverage(acceptedEdited).coverage_score;
  const updatesCandidate = (await candidateRepository.list()).find((item) => item.type === "release_notes")!;
  const accepted = await acceptSourceCandidate(sourceRepository, candidateRepository, manus.id, updatesCandidate);
  assert(accepted.sources.some((item) => item.url === "https://manus.im/updates" && item.purpose === "updates"), "Accept should add the candidate to formal sources");
  assert(!(await candidateRepository.list()).some((item) => item.url === "https://manus.im/updates"), "Accept should remove the candidate from the pool");
  assert(calculateCoverage(accepted).updates_sources === calculateCoverage(acceptedEdited).updates_sources + 1, "Accept should update the Updates source count");
  assert(calculateCoverage(accepted).coverage_score === beforeCoverage, "Accepting a redundant Updates source should not add a second Coverage point");

  await candidateRepository.upsert(generated, [accepted]);
  assert(!(await candidateRepository.list()).some((item) => item.url === "https://manus.im/updates"), "Re-audit must not recreate a candidate already present in formal sources");
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}

console.log("Audit candidate pipeline tests passed.");
