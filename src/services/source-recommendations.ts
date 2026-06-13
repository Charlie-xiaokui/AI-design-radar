import type { ProductSource, Source } from "../types/source.ts";
import { effectiveSources, runtimeDefaults } from "./source-signals.ts";

export interface SourceRecommendation {
  label: string;
  reason: string;
  source: ProductSource;
  configured: boolean;
}

function candidate(label: string, reason: string, source: Omit<ProductSource, "collector" | "last_checked_at" | "last_update_at" | "screenshot_count" | "gif_count" | "video_count" | "health" | "parent_source_id" | "relation_type">): Omit<SourceRecommendation, "configured"> {
  return { label, reason, source: { ...source, ...runtimeDefaults(source.type) } };
}

export function recommendedSourcesFor(product: Source): SourceRecommendation[] {
  if (product.product_name.toLowerCase() !== "claude") return [];
  const recommendations = [
    candidate("ClaudeAI", "Official Claude product account for discovery and community signals.", { id: "recommended-claudeai-x", type: "x", url: "https://x.com/claudeai", purpose: "discovery", priority: 4, scan_frequency: "manual", status: "active", notes: "Recommended candidate; review before adding." }),
    candidate("AnthropicAI", "Company account can surface Claude launches and research announcements.", { id: "recommended-anthropicai-x", type: "x", url: "https://x.com/AnthropicAI", purpose: "discovery", priority: 4, scan_frequency: "manual", status: "active", notes: "Recommended candidate; review before adding." }),
    candidate("Anthropic News", "Official announcement stream for product and company updates.", { id: "recommended-anthropic-news", type: "news", url: "https://www.anthropic.com/news", purpose: "updates", priority: 4, scan_frequency: "daily", status: "active", notes: "Recommended candidate; review before adding." }),
    candidate("Claude Release Notes", "Primary first-party Claude product update source.", { id: "recommended-claude-release-notes", type: "release_notes", url: "https://support.claude.com/en/articles/12138966-release-notes", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "Recommended candidate; review before adding." }),
    candidate("Claude Code Releases", "Structured release history for Claude Code updates.", { id: "recommended-claude-code-releases", type: "github_releases", url: "https://github.com/anthropics/claude-code/releases", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "Recommended candidate; review before adding." }),
  ];
  const configuredUrls = new Set(effectiveSources(product).map((source) => source.url).filter(Boolean));
  return recommendations.map((recommendation) => ({
    ...recommendation,
    configured: configuredUrls.has(recommendation.source.url),
  }));
}
