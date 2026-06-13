import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { calculateCoverage } from "../services/source-coverage.ts";
import { normalizePurposeFields, primaryPurposeOf, sourceHasPurpose } from "../services/source-purpose.ts";
import { defaultAccessType, isPublicAccess, normalizeAccessType } from "../services/source-access.ts";
import { classifyMediaFollowup, discoverFollowupSources } from "../services/source-followup.ts";
import { acceptSuggestedSource, updateSuggestedSource } from "../services/source-suggestions.ts";
import { JsonSourceRepository, type SourceRepository } from "../repositories/source-repository.ts";
import type { ProductSource, Source } from "../types/source.ts";
import { addProductSource, deleteProductSource, reorderProductSources, updateProductSource } from "../services/product-source-manager.ts";
import { candidateReason, evaluateCandidateSource } from "../services/source-candidate-policy.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const legacyPurpose = normalizePurposeFields({ purpose: "updates" });
assert(legacyPurpose.primary_purpose === "updates", "Legacy purpose should become primary_purpose");
assert(legacyPurpose.purposes.join("|") === "updates", "Legacy purpose should become a one-item purposes array");
const multiPurpose = normalizePurposeFields({ purpose: "updates", primary_purpose: "updates", purposes: ["media", "updates"] });
assert(multiPurpose.primary_purpose === "updates", "Explicit primary_purpose should control grouping");
assert(multiPurpose.purposes.join("|") === "media|updates", "Multiple purposes should be preserved");
assert(sourceHasPurpose(multiPurpose, "media"), "Multi-purpose source should match its secondary purpose");
assert(primaryPurposeOf(multiPurpose) === "updates", "Primary purpose helper should return the grouping purpose");
assert(defaultAccessType("x") === "login_required", "X should default to login_required");
assert(defaultAccessType("discord") === "login_required", "Discord should default to login_required");
assert(defaultAccessType("github_repo") === "public", "GitHub should default to public");
assert(defaultAccessType("blog") === "public", "Blog should default to public");
assert(defaultAccessType("release_notes") === "public", "Release Notes should default to public");
assert(normalizeAccessType({ type: "x" }) === "login_required", "Legacy X source should normalize to login_required without stored field");
assert(normalizeAccessType({ type: "blog", access_type: "manual" }) === "manual", "Explicit manual access_type should be preserved");
assert(isPublicAccess({ type: "docs" }), "Docs should be public by default");
assert(!isPublicAccess({ type: "x" }), "Login-required X should not be public");

const products = JSON.parse(await readFile("data/sources.json", "utf8")) as Source[];
const claude = structuredClone(products.find((item) => item.slug === "claude")!);
const multiCoverage = structuredClone(claude);
multiCoverage.sources = [{
  ...multiCoverage.sources.find((item) => item.type === "release_notes")!,
  purpose: "updates",
  primary_purpose: "updates",
  purposes: ["updates", "media"],
}];
const multiCoverageResult = calculateCoverage(multiCoverage);
assert(multiCoverageResult.updates_sources === 1, "A multi-purpose source should contribute Updates coverage");
assert(multiCoverageResult.media_sources === 1, "A multi-purpose source should also contribute Media coverage");
claude.sources = claude.sources.filter((item) => item.url !== "https://x.com/AnthropicAI");
const seedSuggestionIds = new Set([
  "suggested-claude-anthropic-x",
  "suggested-claude-product-x",
  "suggested-claude-code-repo",
  "suggested-claude-code-releases",
  "suggested-claude-code-rss",
  "suggested-claude-anthropic-news",
  "suggested-claude-release-notes",
]);
claude.suggested_sources = claude.suggested_sources.filter((item) => seedSuggestionIds.has(item.id)).map((item) => ({ ...item, status: "suggested" }));
const anthropicSuggestion = claude.suggested_sources.find((item) => item.id === "suggested-claude-anthropic-x")!;
anthropicSuggestion.url = "https://x.com/AnthropicAI";
anthropicSuggestion.type = "x";
anthropicSuggestion.purpose = "discovery";
const initial = calculateCoverage(claude);
assert(initial.identity_sources === 1, `Expected one Claude identity source, got ${initial.identity_sources}`);
assert(initial.updates_sources === 4, `Expected 4 Claude updates sources, got ${initial.updates_sources}`);
assert(initial.needs_review_count === 7, "Claude suggestions should require review");
assert(initial.x_sources === 1, `Expected one initial Claude X source, got ${initial.x_sources}`);

const communityCoverageTypes = ["github_repo", "community", "forum", "discord", "reddit", "events", "slack"] as const;
const withoutCommunity = structuredClone(claude);
withoutCommunity.sources = withoutCommunity.sources.filter((item) => item.purpose !== "community");
const coverageWithoutCommunity = calculateCoverage(withoutCommunity);
for (const type of communityCoverageTypes) {
  const fixture = structuredClone(withoutCommunity);
  fixture.sources.push({
    ...fixture.sources[0]!,
    id: `community-${type}`,
    type: type as ProductSource["type"],
    purpose: "community",
    url: `https://community.example/${type}`,
    status: "active",
  });
  const coverage = calculateCoverage(fixture);
  assert(coverage.community_sources === 1, `${type} should count as a Community source`);
  assert(coverage.coverage_score === coverageWithoutCommunity.coverage_score + 1, `${type} should add exactly one Community point`);
}

const redundantCommunityFixture = structuredClone(withoutCommunity);
redundantCommunityFixture.sources.push(...communityCoverageTypes.map((type, index) => ({
  ...redundantCommunityFixture.sources[0]!,
  id: `community-redundancy-${type}`,
  type: type as ProductSource["type"],
  purpose: "community" as const,
  url: `https://community.example/${type}/${index}`,
  status: "active" as const,
})));
const redundantCommunityCoverage = calculateCoverage(redundantCommunityFixture);
assert(redundantCommunityCoverage.community_sources === communityCoverageTypes.length, "Dashboard count should include every eligible Community source");
assert(redundantCommunityCoverage.coverage_score === coverageWithoutCommunity.coverage_score + 1, "Multiple Community sources must still add only one point");
assert(redundantCommunityCoverage.coverage_score <= 5, "Coverage Score must remain capped at 5");

class MemoryRepository implements SourceRepository {
  rows: Source[];
  constructor(rows: Source[]) { this.rows = rows; }
  async list() { return this.rows; }
  async create() { throw new Error("Not implemented"); }
  async update(id: string, input: Partial<Source>) {
    const index = this.rows.findIndex((item) => item.id === id);
    this.rows[index] = { ...this.rows[index]!, ...input };
    return this.rows[index]!;
  }
  async delete() { throw new Error("Not implemented"); }
  async replaceAll() { throw new Error("Not implemented"); }
}

function acceptFixture(): Source {
  const fixture = structuredClone(claude);
  fixture.sources = fixture.sources.filter((item) => item.url !== "https://x.com/AnthropicAI" && item.url !== "https://x.com/ClaudeCodeLog");
  fixture.suggested_sources = [structuredClone(anthropicSuggestion)];
  fixture.suggested_sources[0]!.status = "pending_review";
  return fixture;
}

// Accept the original candidate.
const originalFixture = acceptFixture();
const originalRepository = new MemoryRepository([originalFixture]);
const originalAccepted = await acceptSuggestedSource(originalRepository, originalFixture.id, anthropicSuggestion.id);
assert(originalAccepted.sources.some((item) => item.url === "https://x.com/AnthropicAI" && item.type === "x" && item.purpose === "discovery"), "Original accept should add the candidate data");
assert(originalAccepted.suggested_sources[0]?.status === "verified", "Original accept should verify the candidate");

// Edit URL, then accept using the current edited identity even if the request id is stale.
const editedFixture = acceptFixture();
const editedRepository = new MemoryRepository([editedFixture]);
await updateSuggestedSource(editedRepository, editedFixture.id, anthropicSuggestion.id, { url: "https://x.com/ClaudeCodeLog", status: "pending_review" });
const editedAccepted = await acceptSuggestedSource(editedRepository, editedFixture.id, "stale-original-id", {
  url: "https://x.com/ClaudeCodeLog",
  type: "x",
  purpose: "discovery",
});
assert(editedAccepted.sources.some((item) => item.url === "https://x.com/ClaudeCodeLog" && item.type === "x" && item.purpose === "discovery"), "Edited URL should be used as final source data");
assert(editedAccepted.suggested_sources[0]?.status === "verified", "Edited candidate should be verified and hidden from needs review");
assert(calculateCoverage(editedAccepted).needs_review_count === 0, "Edited accepted candidate should leave needs review");

// A normalized URL duplicate must not create another source, but must finish review.
const duplicateFixture = acceptFixture();
duplicateFixture.sources.push({ ...duplicateFixture.sources[0]!, id: "source-normalized-duplicate", type: "x", purpose: "community", url: "https://x.com/duplicate/" });
duplicateFixture.suggested_sources[0]!.url = "https://X.COM/duplicate";
const duplicateRepository = new MemoryRepository([duplicateFixture]);
const duplicateBefore = duplicateFixture.sources.length;
const normalizedDuplicateAccepted = await acceptSuggestedSource(duplicateRepository, duplicateFixture.id, anthropicSuggestion.id);
assert(normalizedDuplicateAccepted.sources.length === duplicateBefore, "Normalized duplicate URL should not be added twice");
assert(normalizedDuplicateAccepted.suggested_sources[0]?.status === "verified", "Duplicate URL accept should still verify the candidate");
assert(calculateCoverage(normalizedDuplicateAccepted).needs_review_count === 0, "Duplicate URL accept should leave needs review");

// Changing purpose before Accept must be reflected in the formal source.
const purposeFixture = acceptFixture();
const purposeRepository = new MemoryRepository([purposeFixture]);
  const purposeAccepted = await acceptSuggestedSource(purposeRepository, purposeFixture.id, anthropicSuggestion.id, {
  url: "https://x.com/AnthropicAI",
  type: "x",
  purpose: "media",
});
assert(purposeAccepted.sources.some((item) => item.url === "https://x.com/AnthropicAI" && item.purpose === "media"), "Changed purpose should be used as final source data");
assert(calculateCoverage(purposeAccepted).media_sources >= 1, "Coverage should recalculate using the changed purpose");
assert(purposeAccepted.suggested_sources[0]?.status === "verified", "Purpose-edited candidate should be verified");

const accessFixture = acceptFixture();
accessFixture.suggested_sources[0]!.type = "blog";
accessFixture.suggested_sources[0]!.url = "https://example.com/access-blog";
accessFixture.suggested_sources[0]!.purpose = "media";
accessFixture.suggested_sources[0]!.access_type = "manual";
const accessRepository = new MemoryRepository([accessFixture]);
const accessAccepted = await acceptSuggestedSource(accessRepository, accessFixture.id, anthropicSuggestion.id);
assert(accessAccepted.sources.some((item) => item.url === "https://example.com/access-blog" && item.access_type === "manual"), "Candidate Accept should preserve explicit access_type");

const inferredAccessFixture = acceptFixture();
inferredAccessFixture.suggested_sources[0]!.type = "x";
inferredAccessFixture.suggested_sources[0]!.url = "https://x.com/InferredAccess";
delete inferredAccessFixture.suggested_sources[0]!.access_type;
const inferredAccessRepository = new MemoryRepository([inferredAccessFixture]);
const inferredAccessAccepted = await acceptSuggestedSource(inferredAccessRepository, inferredAccessFixture.id, anthropicSuggestion.id);
assert(inferredAccessAccepted.sources.some((item) => item.url === "https://x.com/InferredAccess" && item.access_type === "login_required"), "Candidate Accept should infer access_type when missing");

const coverageFixture = structuredClone(claude);
coverageFixture.sources.find((item) => item.type === "x")!.purpose = "discovery";
coverageFixture.suggested_sources.find((item) => item.id === "suggested-claude-anthropic-x")!.status = "pending_review";
const coverageBeforeSecondX = calculateCoverage(coverageFixture);
const repository = new MemoryRepository([coverageFixture]);
const accepted = await acceptSuggestedSource(repository, coverageFixture.id, "suggested-claude-anthropic-x");
assert(accepted.sources.filter((item) => item.type === "x").length === 2, "Accept should add a second X source");
assert(accepted.suggested_sources.find((item) => item.id === "suggested-claude-anthropic-x")?.status === "verified", "Accept should verify suggestion");
assert(calculateCoverage(accepted).coverage_score === coverageBeforeSecondX.coverage_score, "Multiple discovery X sources must not add Coverage Score");

const tempDirectory = await mkdtemp(path.join(tmpdir(), "source-accept-flow-"));
const tempSourcesFile = path.join(tempDirectory, "sources.json");
try {
  const persistedClaude = structuredClone(claude);
  persistedClaude.sources = persistedClaude.sources.filter((item) => item.url !== "https://x.com/AnthropicAI");
  persistedClaude.sources.find((item) => item.type === "x")!.purpose = "discovery";
  persistedClaude.suggested_sources.find((item) => item.id === "suggested-claude-anthropic-x")!.status = "pending_review";
  const persistedCoverageBefore = calculateCoverage(persistedClaude);
  await writeFile(tempSourcesFile, `${JSON.stringify([persistedClaude], null, 2)}\n`, "utf8");

  const fileRepository = new JsonSourceRepository(tempSourcesFile);
  const persistedAccepted = await acceptSuggestedSource(fileRepository, persistedClaude.id, "suggested-claude-anthropic-x");
  assert(persistedAccepted.suggested_sources.find((item) => item.id === "suggested-claude-anthropic-x")?.status === "verified", "Persisted accept should verify the suggestion");
  assert(persistedAccepted.sources.some((item) => item.url === "https://x.com/AnthropicAI"), "Persisted accept should write the formal source");

  const refreshedRepository = new JsonSourceRepository(tempSourcesFile);
  const refreshedClaude = (await refreshedRepository.list())[0]!;
  assert(refreshedClaude.suggested_sources.find((item) => item.id === "suggested-claude-anthropic-x")?.status === "verified", "Verified status should survive a repository reload");
  assert(refreshedClaude.sources.some((item) => item.url === "https://x.com/AnthropicAI"), "Formal source should survive a repository reload");
  assert(calculateCoverage(refreshedClaude).coverage_score === persistedCoverageBefore.coverage_score, "Redundant discovery X source must not change Coverage Score after reload");
  assert(calculateCoverage(refreshedClaude).needs_review_count === 6, "Accepted suggestion should no longer count as needing review");

  const manuallyAdded = await addProductSource(refreshedRepository, refreshedClaude.id, {
    url: "https://example.com/manual-source",
    type: "blog",
    purpose: "media",
    priority: 4,
    status: "active",
    access_type: "manual",
  });
  const manualSource = manuallyAdded.sources.find((item) => item.url === "https://example.com/manual-source")!;
  assert(manualSource.status === "active", "Manually added source should default to the submitted active status");
  assert(manualSource.purpose === "media", "Manually added source should persist its purpose");
  assert(manualSource.access_type === "manual", "Manually added source should persist access_type");

  const manuallyUpdated = await updateProductSource(refreshedRepository, refreshedClaude.id, manualSource.id, {
    url: "https://example.com/manual-source-edited",
    type: "news",
    purpose: "updates",
    priority: 5,
    status: "paused",
  });
  assert(manuallyUpdated.sources.some((item) => item.id === manualSource.id && item.url === "https://example.com/manual-source-edited" && item.status === "paused"), "Manual source save should persist edited fields");
  assert(manuallyUpdated.sources.find((item) => item.id === manualSource.id)?.purpose === "updates", "Purpose edit should update the source purpose");
  const updatedPurposeIds = manuallyUpdated.sources.filter((item) => item.purpose === "updates").map((item) => item.id);
  assert(updatedPurposeIds.at(-1) === manualSource.id, "Purpose edit should move the source to the target group end");
  const purposeReloaded = (await new JsonSourceRepository(tempSourcesFile).list())[0]!;
  assert(purposeReloaded.sources.find((item) => item.id === manualSource.id)?.purpose === "updates", "Purpose group should survive repository reload");

  await deleteProductSource(refreshedRepository, refreshedClaude.id, { id: manualSource.id });
  const afterManualDelete = (await new JsonSourceRepository(tempSourcesFile).list())[0]!;
  assert(!afterManualDelete.sources.some((item) => item.id === manualSource.id), "Manual source delete should survive repository reload");

  // Delete a normal source by id.
  const normalSource = afterManualDelete.sources.find((item) => item.type === "github_releases_rss")!;
  const afterNormalDelete = await deleteProductSource(refreshedRepository, afterManualDelete.id, { id: normalSource.id });
  assert(!afterNormalDelete.sources.some((item) => item.id === normalSource.id), "Normal source should be deleted by id");

  // Delete one of two normalized duplicate URLs by URL + type + purpose when id is unavailable.
  const duplicateBase = afterNormalDelete.sources[0]!;
  const duplicateRows = [
    { ...duplicateBase, id: "duplicate-media", url: "https://example.com/duplicate/", type: "blog" as const, purpose: "media" as const, primary_purpose: "media" as const, purposes: ["media" as const] },
    { ...duplicateBase, id: "duplicate-discovery", url: "https://example.com/duplicate", type: "x" as const, purpose: "discovery" as const, primary_purpose: "discovery" as const, purposes: ["discovery" as const] },
  ];
  const withDuplicates = await refreshedRepository.update(afterNormalDelete.id, { sources: [...afterNormalDelete.sources, ...duplicateRows] });
  const afterDuplicateDelete = await deleteProductSource(refreshedRepository, withDuplicates.id, { url: "https://example.com/duplicate", type: "blog", purpose: "media" });
  assert(!afterDuplicateDelete.sources.some((item) => item.id === "duplicate-media"), "Composite fallback should delete the matching duplicate URL source");
  assert(afterDuplicateDelete.sources.some((item) => item.id === "duplicate-discovery"), "Composite fallback must preserve a duplicate URL with different type/purpose");

  // Deleting the only community source must update Coverage.
  const communityOnly = afterDuplicateDelete.sources.filter((item) => item.purpose === "community");
  assert(communityOnly.length === 1, "Fixture should have one community source");
  const coverageBeforeDelete = calculateCoverage(afterDuplicateDelete).coverage_score;
  const afterCoverageDelete = await deleteProductSource(refreshedRepository, afterDuplicateDelete.id, { id: communityOnly[0]!.id });
  assert(calculateCoverage(afterCoverageDelete).coverage_score === coverageBeforeDelete - 1, "Deleting the only community source should reduce Coverage Score");

  // Drag order persistence is represented by the sources array order.
  const reorderedIds = [...afterCoverageDelete.sources.map((item) => item.id)].reverse();
  await reorderProductSources(refreshedRepository, afterCoverageDelete.id, reorderedIds);
  const afterOrderReload = (await new JsonSourceRepository(tempSourcesFile).list())[0]!;
  assert(afterOrderReload.sources.map((item) => item.id).join("|") === reorderedIds.join("|"), "Formal source order should survive repository reload");

  const sameGroupSources = afterOrderReload.sources.filter((item) => item.purpose === "updates");
  if (sameGroupSources.length >= 2) {
    const sameGroupReversed = [...sameGroupSources].reverse().map((item) => item.id);
    let sameGroupIndex = 0;
    const sameGroupOrder = afterOrderReload.sources.map((item) => item.purpose === "updates" ? sameGroupReversed[sameGroupIndex++]! : item.id);
    const afterSameGroupDrag = await reorderProductSources(refreshedRepository, afterOrderReload.id, sameGroupOrder);
    assert(afterSameGroupDrag.sources.filter((item) => item.purpose === "updates").map((item) => item.id).join("|") === sameGroupReversed.join("|"), "Same-purpose drag should reorder sources within the group");
    assert(afterSameGroupDrag.sources.every((item, index) => item.purpose === "updates" || item.id === afterOrderReload.sources[index]?.id), "Same-purpose drag must preserve other group slots");
  }
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}

const beforeDuplicate = accepted.sources.length;
const duplicateAccepted = await acceptSuggestedSource(repository, claude.id, "suggested-claude-product-x");
assert(duplicateAccepted.sources.length === beforeDuplicate, "Accept should not duplicate an existing source URL/type");

const followupProduct = structuredClone(claude);
followupProduct.product_name = "Followup Test";
followupProduct.slug = "followup-test";
followupProduct.sources = [{
  ...followupProduct.sources[1]!,
  id: "followup-release-notes",
  url: "https://example.test/releases",
  purpose: "updates",
  type: "release_notes",
}];
followupProduct.suggested_sources = [];
const originalFetch = globalThis.fetch;
let fetchCount = 0;
globalThis.fetch = async (input) => {
  fetchCount += 1;
  assert(String(input) === "https://example.test/releases", "Scanner must only fetch the updates page");
  return new Response(`<a href="/news/demo">News</a><a href="https://youtube.com/watch?v=1">Video</a><a href="https://x.com/example">X</a><a href="https://irrelevant.example/about">Ignore</a>`, { status: 200, headers: { "content-type": "text/html" } });
};
try {
  const discovered = await discoverFollowupSources(followupProduct);
  assert(fetchCount === 1, "Follow-up scanner should make one page request");
  assert(discovered.some((item) => item.type === "news" && item.purpose === "media"), "Should discover linked news media");
  assert(discovered.some((item) => item.type === "youtube" && item.purpose === "media"), "Should discover YouTube media");
  assert(!discovered.some((item) => item.url.includes("x.com")), "Media scanner should not suggest X discovery links");
} finally {
  globalThis.fetch = originalFetch;
}

for (const url of [
  "https://www.anthropic.com/news/introducing-demo",
  "https://claude.com/blog/product-update",
  "https://example.com/announcement/new-canvas",
  "https://example.com/launch/visual-workspace",
  "https://example.com/releases/spring-showcase",
]) assert(classifyMediaFollowup({ url, text: "" }).accept, `Expected media candidate to be accepted: ${url}`);

for (const url of [
  "https://support.claude.com/en/articles/demo",
  "https://docs.claude.com/guide",
  "https://example.com/help/launch-guide",
  "https://example.com/collections/releases",
  "https://example.com/privacy",
  "https://example.com/legal/announcement",
]) assert(!classifyMediaFollowup({ url, text: "" }).accept, `Expected non-media candidate to be rejected: ${url}`);

const officialNewsPolicy = evaluateCandidateSource(claude, { url: "https://www.anthropic.com/news/example", type: "news" });
assert(officialNewsPolicy.accepted && officialNewsPolicy.tier === "P1", "Official product news should be P1");
const officialGithubPolicy = evaluateCandidateSource(claude, { url: "https://github.com/anthropics/claude-code", type: "github_repo" }, { linkedFromOfficial: true });
assert(officialGithubPolicy.accepted && officialGithubPolicy.tier === "P1", "Official GitHub linked from an official page should be P1");
const productHuntPolicy = evaluateCandidateSource(claude, { url: "https://www.producthunt.com/products/claude", type: "product_hunt" });
assert(productHuntPolicy.accepted && productHuntPolicy.tier === "P2", "Product Hunt should be P2");
const discordPolicy = evaluateCandidateSource(claude, { url: "https://discord.gg/anthropic", type: "discord" }, { linkedFromOfficial: true });
assert(discordPolicy.accepted && discordPolicy.tier === "P3", "Official Discord or community link should be P3");
for (const url of [
  "https://medium.com/someone/claude-update",
  "https://techcrunch.com/claude-launch",
  "https://alternativeto.net/software/claude",
  "https://example.com/claude-mirror/news",
]) {
  const policy = evaluateCandidateSource(claude, { url, type: "blog" }, { linkedFromOfficial: true });
  assert(!policy.accepted, `Forbidden third-party candidate should be rejected: ${url}`);
}
assert(candidateReason("P1", "official release notes").startsWith("[P1]"), "Candidate reasons should persist the review tier");

console.log("Source Coverage, suggestion workflow, and follow-up scanner tests passed.");
