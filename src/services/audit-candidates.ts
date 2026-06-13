import type { Source, SourceCandidate, SourcePurpose } from "../types/source.ts";
import { evaluateCandidateSource } from "./source-candidate-policy.ts";
import { calculateCoverage } from "./source-coverage.ts";

export interface CandidateRecommendation {
  candidate: SourceCandidate;
  reason: string;
  verifiedOfficial?: boolean;
}

const CANDIDATE_CATALOG: Record<string, CandidateRecommendation[]> = {
  claude: [
    recommendation("Claude", "https://x.com/claudeai", "x", "discovery", "P1", "Official Claude X account already maintained in the Registry.", true),
  ],
  perplexity: [
    recommendation("Perplexity", "https://www.perplexity.ai/hub/blog", "news", "updates", "P1", "Official Perplexity blog publishes product announcements and shipped capabilities."),
    recommendation("Perplexity", "https://github.com/perplexityai", "github_repo", "community", "P1", "GitHub verifies that the Perplexity organization controls perplexity.ai.", true),
  ],
  v0: [
    recommendation("v0", "https://community.vercel.com/c/v0/59", "forum", "community", "P3", "Official Vercel Community category dedicated to v0.", true),
  ],
  lovable: [
    recommendation("Lovable", "https://discord.gg/lovable-dev", "discord", "community", "P3", "Official Lovable documentation links directly to this Discord community.", true),
  ],
  bolt: [
    recommendation("Bolt", "https://x.com/boltdotnew", "x", "discovery", "P1", "Official Bolt X account already maintained in the Registry.", true),
  ],
  manus: [
    recommendation("Manus", "https://manus.im/updates", "release_notes", "updates", "P1", "Official Manus Updates page."),
    recommendation("Manus", "https://manus.im/blog", "blog", "media", "P1", "Official Manus blog contains product screenshots and workflow announcements."),
    recommendation("Manus", "https://x.com/manusai", "x", "discovery", "P1", "Official Manus X account linked from Manus documentation.", true),
    recommendation("Manus", "https://events.manus.im/", "events", "community", "P3", "Official Manus Events community surface."),
  ],
  replit: [
    recommendation("Replit", "https://replit.com/blog", "news", "updates", "P1", "Official Replit blog explicitly publishes product updates from the team."),
  ],
  "figma-ai": [
    recommendation("Figma AI", "https://forum.figma.com/", "forum", "community", "P3", "Official Figma Forum provides product updates and community discussion."),
  ],
  "notion-ai": [
    recommendation("Notion AI", "https://www.notion.com/community", "community", "community", "P3", "Official Notion community entry point."),
  ],
  linear: [
    recommendation("Linear", "https://linear.app/community", "community", "community", "P3", "Official Linear community page."),
  ],
  comfyui: [
    recommendation("ComfyUI", "https://x.com/ComfyUI", "x", "discovery", "P1", "Official ComfyUI repository links to this X account.", true),
  ],
};

function recommendation(
  product: string,
  url: string,
  type: SourceCandidate["type"],
  purpose: SourcePurpose,
  priority: SourceCandidate["priority"],
  reason: string,
  verifiedOfficial = false,
): CandidateRecommendation {
  return {
    candidate: { product, url, type, purpose, priority, source: "batch_source_candidates.md", status: "pending_review" },
    reason,
    verifiedOfficial,
  };
}

function purposeMissing(product: Source, purpose: SourcePurpose): boolean {
  const coverage = calculateCoverage(product);
  if (purpose === "identity") return coverage.identity_sources === 0;
  if (purpose === "updates") return coverage.updates_sources === 0;
  if (purpose === "media") return coverage.media_sources === 0;
  if (purpose === "discovery") return coverage.discovery_sources === 0;
  return coverage.community_sources === 0;
}

export function candidateRecommendationsFor(product: Source): CandidateRecommendation[] {
  if (calculateCoverage(product).coverage_score >= 5) return [];
  return (CANDIDATE_CATALOG[product.slug] ?? [])
    .filter((item) => purposeMissing(product, item.candidate.purpose))
    .filter((item) => evaluateCandidateSource(product, item.candidate, { verifiedOfficial: item.verifiedOfficial }).accepted)
    .slice(0, 5);
}

export function auditCandidatesFor(products: Source[]): SourceCandidate[] {
  return products.flatMap((product) => candidateRecommendationsFor(product).map((item) => item.candidate));
}
