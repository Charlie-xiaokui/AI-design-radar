import type { ProductSource, Source } from "../types/source.ts";

type RuntimeField = "collector" | "last_checked_at" | "last_update_at" | "screenshot_count" | "gif_count" | "video_count" | "health" | "parent_source_id" | "relation_type";
type LegacySourceSpec = Omit<ProductSource, "url" | RuntimeField> & { field: keyof Source };

const LEGACY_SOURCE_SPECS: LegacySourceSpec[] = [
  { id: "homepage", type: "homepage", field: "homepage_url", purpose: "identity", priority: 3, scan_frequency: "weekly", status: "active", notes: "Legacy homepage field." },
  { id: "changelog", type: "release_notes", field: "changelog_url", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "Legacy changelog field mapped to release_notes in Source Network v2." },
  { id: "release-notes", type: "release_notes", field: "release_notes_url", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "Legacy release notes field." },
  { id: "github-repo", type: "github_repo", field: "github_url", purpose: "community", priority: 3, scan_frequency: "weekly", status: "active", notes: "Legacy GitHub field." },
  { id: "github-releases", type: "github_releases", field: "github_releases_url", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "Legacy GitHub releases field." },
  { id: "docs", type: "docs", field: "docs_url", purpose: "media", priority: 3, scan_frequency: "weekly", status: "active", notes: "Legacy docs field." },
  { id: "blog", type: "blog", field: "blog_url", purpose: "updates", priority: 4, scan_frequency: "weekly", status: "active", notes: "Legacy blog field." },
  { id: "news", type: "news", field: "news_url", purpose: "updates", priority: 4, scan_frequency: "weekly", status: "active", notes: "Legacy news field." },
  { id: "videos", type: "blog", field: "videos_url", purpose: "media", priority: 4, scan_frequency: "weekly", status: "active", notes: "Legacy video page mapped to blog/media; use youtube only for YouTube URLs." },
  { id: "product-hunt", type: "product_hunt", field: "product_hunt_url", purpose: "discovery", priority: 2, scan_frequency: "manual", status: "active", notes: "Legacy Product Hunt field." },
  { id: "x", type: "x", field: "x_url", purpose: "discovery", priority: 3, scan_frequency: "manual", status: "active", notes: "Legacy X field; content is not collected automatically." },
  { id: "rss", type: "rss", field: "rss_url", purpose: "updates", priority: 4, scan_frequency: "daily", status: "active", notes: "Legacy RSS field." },
];

export function legacySourcesFor(source: Source): ProductSource[] {
  const items = LEGACY_SOURCE_SPECS.flatMap((spec) => {
    const url = String(source[spec.field] ?? "");
    return url ? [{ ...spec, id: `${source.slug}-${spec.id}`, url, ...runtimeDefaults(spec.type) }] : [];
  });

  const extra = [
    source.claude_code_github_url ? { id: `${source.slug}-claude-code-repo`, type: "github_repo", url: source.claude_code_github_url, purpose: "community", priority: 4, scan_frequency: "weekly", status: "active", notes: "Legacy Claude Code repository field.", ...runtimeDefaults("github_repo") } : null,
    source.claude_code_releases_url ? { id: `${source.slug}-claude-code-releases`, type: "github_releases", url: source.claude_code_releases_url, purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "Legacy Claude Code releases field.", ...runtimeDefaults("github_releases") } : null,
    source.claude_code_rss_url ? { id: `${source.slug}-claude-code-releases-rss`, type: "github_releases_rss", url: source.claude_code_rss_url, purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "Legacy Claude Code releases feed field.", ...runtimeDefaults("github_releases_rss") } : null,
  ].filter((item): item is ProductSource => Boolean(item));

  const seen = new Set<string>();
  return [...items, ...extra].filter((item) => {
    const key = `${item.type}:${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectorForType(type: ProductSource["type"]): string {
  if (type === "github_releases") return "github_api";
  if (type === "github_releases_rss" || type === "rss") return "feed";
  if (["x", "youtube", "discord", "reddit", "slack"].includes(type)) return "manual";
  return "http_html";
}

export function runtimeDefaults(type: ProductSource["type"]): Pick<ProductSource, "collector" | "last_checked_at" | "last_update_at" | "screenshot_count" | "gif_count" | "video_count" | "health" | "parent_source_id" | "relation_type"> {
  return {
    collector: collectorForType(type),
    last_checked_at: "",
    last_update_at: "",
    screenshot_count: 0,
    gif_count: 0,
    video_count: 0,
    health: "unchecked",
    parent_source_id: "",
    relation_type: "",
  };
}

export function effectiveSources(source: Source): ProductSource[] {
  return source.sources?.length ? source.sources : legacySourcesFor(source);
}
