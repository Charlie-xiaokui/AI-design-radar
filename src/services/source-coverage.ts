import type { Source, SourceCandidate, SourceCoverage } from "../types/source.ts";
import { effectiveSources } from "./source-signals.ts";
import { candidateMatchesSource, isPendingCandidateStatus } from "./source-candidate-match.ts";
import { sourceHasPurpose } from "./source-purpose.ts";

export function calculateCoverage(source: Source, candidates?: SourceCandidate[]): SourceCoverage {
  const active = effectiveSources(source).filter((item) => item.status === "active" && item.url);
  const count = (purpose: "identity" | "updates" | "media" | "discovery" | "community") => active.filter((item) => sourceHasPurpose(item, purpose)).length;
  const identity = count("identity");
  const updates = count("updates");
  const community = count("community");
  const discovery = count("discovery");
  const media = count("media");
  const x = active.filter((item) => item.type === "x").length;
  const github = active.filter((item) => item.type.startsWith("github_")).length;
  const needsReview = candidates
    ? candidates.filter((item) => candidateMatchesSource(item, source) && isPendingCandidateStatus(item.status)).length
    : (source.suggested_sources ?? []).filter((item) => item.status === "suggested" || item.status === "pending_review").length;
  const score = (identity > 0 ? 1 : 0)
    + (updates > 0 ? 1 : 0)
    + (community > 0 ? 1 : 0)
    + (discovery > 0 ? 1 : 0)
    + (media > 0 ? 1 : 0);
  return {
    product_name: source.product_name,
    source_id: source.id,
    identity_sources: identity,
    updates_sources: updates,
    media_sources: media,
    discovery_sources: discovery,
    community_sources: community,
    x_sources: x,
    github_sources: github,
    missing_identity_source: identity === 0,
    missing_updates_source: updates === 0,
    missing_media_source: media === 0,
    needs_review_count: needsReview,
    coverage_score: score,
  };
}

export function calculateCoverageList(sources: Source[], candidates: SourceCandidate[] = []): SourceCoverage[] {
  return sources.map((source) => calculateCoverage(source, candidates)).sort((a, b) => a.coverage_score - b.coverage_score || a.product_name.localeCompare(b.product_name));
}

export function renderCoverageReport(coverage: SourceCoverage[], generatedAt = new Date()): string {
  const lines = [
    "# Source Coverage Report",
    "",
    `Generated at: ${generatedAt.toISOString()}`,
    "",
    "Coverage Score is 5 points: Identity, Updates, Community, Discovery, and Media each contribute at most 1 point.",
    "Each dimension counts active sources whose purposes[] contains that purpose; legacy purpose is treated as a one-item purposes array.",
    "",
    "| Product | Identity | Updates | Community | Discovery | Media | X | GitHub | Missing Identity | Missing Updates | Missing Media | Needs Review | Score |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |",
    ...coverage.map((item) => `| ${item.product_name} | ${item.identity_sources} | ${item.updates_sources} | ${item.community_sources} | ${item.discovery_sources} | ${item.media_sources} | ${item.x_sources} | ${item.github_sources} | ${item.missing_identity_source ? "warning" : ""} | ${item.missing_updates_source ? "warning" : ""} | ${item.missing_media_source ? "warning" : ""} | ${item.needs_review_count} | ${item.coverage_score}/5 |`),
    "",
  ];
  return lines.join("\n");
}
