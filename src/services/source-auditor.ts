import { config } from "../config.ts";
import type {
  CollectorPriority,
  ProductSource,
  Source,
  SourceAudit,
} from "../types/source.ts";
import { effectiveSources } from "./source-signals.ts";
import { sourceHasPurpose } from "./source-purpose.ts";
import { isPublicAccess } from "./source-access.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HTML_BYTES = 2_000_000;

interface MediaCounts {
  screenshot_count: number;
  gif_count: number;
  video_count: number;
}

export interface AuditSignalResult {
  source: ProductSource;
  status_code: number | null;
  ok: boolean;
  dates: string[];
  media: MediaCounts;
  error: string;
  checked_at: string;
  health: ProductSource["health"];
}

export interface AuditDetails {
  audit: SourceAudit;
  changelog_updates_30d: number;
  release_notes_updates_30d: number;
  news_updates_30d: number;
  github_releases_30d: number;
  rss_articles_30d: number;
  recommendation: string;
  errors: string[];
  successful_checks: number;
  signal_results: AuditSignalResult[];
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeDate(value: string): string | null {
  const timestamp = Date.parse(decodeEntities(value).trim());
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function uniqueDates(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function datesWithinWindow(dates: string[], cutoff: Date, now: Date): string[] {
  return dates.filter((value) => {
    const timestamp = Date.parse(value);
    return timestamp >= cutoff.getTime() && timestamp <= now.getTime() + DAY_MS;
  });
}

export function extractHtmlDates(html: string): string[] {
  const values: Array<string | null> = [];
  for (const match of html.matchAll(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/gi)) {
    values.push(normalizeDate(match[1] ?? ""));
  }
  for (const match of html.matchAll(/["'](?:datePublished|dateModified|dateCreated|uploadDate)["']\s*:\s*["']([^"']+)["']/gi)) {
    values.push(normalizeDate(match[1] ?? ""));
  }
  for (const match of html.matchAll(/\b(20\d{2}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-][0-2]\d:?\d{2})?)?)\b/g)) {
    values.push(normalizeDate(match[1] ?? ""));
  }
  for (const match of html.matchAll(/\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+20\d{2})\b/gi)) {
    values.push(normalizeDate(match[1] ?? ""));
  }
  return uniqueDates(values);
}

function tagAttribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return decodeEntities(match?.[1] ?? "");
}

function isGif(value: string): boolean {
  return /\.gif(?:$|[?#])/i.test(value);
}

function isMp4(value: string): boolean {
  return /\.mp4(?:$|[?#])/i.test(value);
}

export function countHtmlMedia(html: string): MediaCounts {
  let screenshotCount = 0;
  let gifCount = 0;
  let videoCount = 0;

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = tagAttribute(match[0], "src") || tagAttribute(match[0], "data-src");
    if (isGif(src)) gifCount += 1;
    else screenshotCount += 1;
  }

  const videoTags = [...html.matchAll(/<video\b[^>]*>/gi)];
  videoCount += videoTags.length;
  for (const match of videoTags) {
    if (isMp4(tagAttribute(match[0], "src"))) videoCount += 1;
  }
  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    if (isMp4(tagAttribute(match[0], "src"))) videoCount += 1;
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (tagAttribute(match[0], "property") || tagAttribute(match[0], "name")).toLowerCase();
    const content = tagAttribute(match[0], "content");
    if (key === "og:image" || key === "og:image:url") {
      if (isGif(content)) gifCount += 1;
      else if (content) screenshotCount += 1;
    }
    if (key === "og:video" || key === "og:video:url" || key === "og:video:secure_url") {
      if (content) videoCount += 1;
    }
  }

  // Catch directly linked GIF/MP4 files outside the supported tags above.
  const taggedGifCount = gifCount;
  const taggedMp4Count = videoCount;
  const allGifFiles = (html.match(/(?:https?:\/\/|\/)[^\s"'<>]+\.gif(?:[?#][^\s"'<>]*)?/gi) ?? []).length;
  const allMp4Files = (html.match(/(?:https?:\/\/|\/)[^\s"'<>]+\.mp4(?:[?#][^\s"'<>]*)?/gi) ?? []).length;
  gifCount += Math.max(0, allGifFiles - taggedGifCount);
  videoCount += Math.max(0, allMp4Files - taggedMp4Count);

  return {
    screenshot_count: screenshotCount,
    gif_count: gifCount,
    video_count: videoCount,
  };
}

export function extractFeedDates(xml: string): string[] {
  const values: Array<string | null> = [];
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  for (const block of blocks) {
    const value = block.match(/<(?:pubDate|published|updated|dc:date)\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:pubDate|published|updated|dc:date)>/i)?.[1];
    if (value) values.push(normalizeDate(value.replace(/<[^>]+>/g, "").trim()));
  }
  return uniqueDates(values);
}

export function calculateMediaScore(media: MediaCounts): SourceAudit["media_score"] {
  const weighted = media.screenshot_count + media.gif_count * 2 + media.video_count * 3;
  if (weighted >= 20) return 5;
  if (weighted >= 10) return 4;
  if (weighted >= 4) return 3;
  if (weighted >= 1) return 2;
  return 1;
}

export function calculateActivityScore(updates30d: number): SourceAudit["activity_score"] {
  if (updates30d >= 12) return 5;
  if (updates30d >= 6) return 4;
  if (updates30d >= 3) return 3;
  if (updates30d >= 1) return 2;
  return 1;
}

export function calculateCollectorPriority(
  activityScore: number,
  mediaScore: number,
  signalScore: number,
): CollectorPriority {
  const score = activityScore * 0.4 + mediaScore * 0.35 + signalScore * 0.25;
  if (score >= 4) return "high";
  if (score >= 2.75) return "medium";
  return "low";
}

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function fetchText(url: string, accept: string): Promise<{ text: string; response: Response }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.scanTimeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept,
        "user-agent": "AI-Design-Radar-Source-Audit/0.1 (+local registry auditor)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { text: (await response.text()).slice(0, MAX_HTML_BYTES), response };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGithubReleaseDates(url: string): Promise<string[]> {
  const repo = parseGithubRepo(url);
  if (!repo) return [];
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "AI-Design-Radar-Source-Audit/0.1",
    "x-github-api-version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.scanTimeoutMs);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/releases?per_page=100`,
      { signal: controller.signal, headers },
    );
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const releases = await response.json() as Array<{ published_at?: string; created_at?: string; draft?: boolean }>;
    return uniqueDates(releases
      .filter((release) => !release.draft)
      .map((release) => normalizeDate(release.published_at ?? release.created_at ?? "")));
  } finally {
    clearTimeout(timer);
  }
}

function recommendationFor(
  audit: SourceAudit,
  source: Source,
  parts: { changelog: number; releaseNotes: number; news: number; releases: number; rss: number },
): string {
  const activityParts = [
    parts.changelog ? `${parts.changelog} changelog updates` : "",
    parts.releaseNotes ? `${parts.releaseNotes} release note updates` : "",
    parts.news ? `${parts.news} official news posts` : "",
    parts.releases ? `${parts.releases} GitHub releases` : "",
    parts.rss ? `${parts.rss} RSS articles` : "",
  ].filter(Boolean);
  const mediaParts = [
    audit.screenshot_count ? `${audit.screenshot_count} images` : "",
    audit.gif_count ? `${audit.gif_count} GIFs` : "",
    audit.video_count ? `${audit.video_count} videos` : "",
  ].filter(Boolean);

  if (audit.collector_priority === "high") {
    return `High-value collection target: ${activityParts.join(", ") || "strong product signal"}; ${mediaParts.join(", ") || "high expected media value"}.`;
  }
  if (audit.collector_priority === "medium") {
    return `Monitor regularly: ${activityParts.join(", ") || "limited recent activity"}; ${mediaParts.join(", ") || `signal score ${source.signal_score}`}.`;
  }
  return `Lower collection urgency: ${activityParts.join(", ") || "no dated updates found"}; ${mediaParts.join(", ") || "little page media detected"}.`;
}

export async function auditSource(source: Source, now = new Date()): Promise<AuditDetails> {
  const cutoff = new Date(now.getTime() - 30 * DAY_MS);
  const errors: string[] = [];
  const media: MediaCounts = { screenshot_count: 0, gif_count: 0, video_count: 0 };
  const configured = effectiveSources(source).filter((item) => item.status === "active" && item.url && isPublicAccess(item));
  const scannable = configured.filter((item) =>
    item.type !== "x"
    && item.type !== "youtube"
    && (sourceHasPurpose(item, "identity") || sourceHasPurpose(item, "updates") || sourceHasPurpose(item, "media")));
  const signalResults = await Promise.all(scannable.map(async (signal): Promise<AuditSignalResult> => {
    const emptyMedia: MediaCounts = { screenshot_count: 0, gif_count: 0, video_count: 0 };
    const checkedAt = new Date().toISOString();
    try {
      if (signal.type === "github_releases") {
        return { source: signal, status_code: 200, ok: true, dates: await fetchGithubReleaseDates(signal.url), media: emptyMedia, error: "", checked_at: checkedAt, health: "ok" };
      }
      if (signal.type === "github_releases_rss" || signal.type === "rss") {
        const { text, response } = await fetchText(signal.url, "application/rss+xml,application/atom+xml,application/xml,text/xml");
        return { source: signal, status_code: response.status, ok: true, dates: extractFeedDates(text), media: emptyMedia, error: "", checked_at: checkedAt, health: response.url !== signal.url ? "redirected" : "ok" };
      }
      const { text, response } = await fetchText(signal.url, "text/html,application/xhtml+xml");
      const isHtml = (response.headers.get("content-type") ?? "").includes("text/html");
      return {
        source: signal,
        status_code: response.status,
        ok: true,
        dates: sourceHasPurpose(signal, "updates") && isHtml ? extractHtmlDates(text) : [],
        media: sourceHasPurpose(signal, "media") && isHtml ? countHtmlMedia(text) : emptyMedia,
        error: "",
        checked_at: checkedAt,
        health: response.url !== signal.url ? "redirected" : "ok",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = Number(message.match(/HTTP (\d+)/)?.[1] ?? 0) || null;
      errors.push(`${signal.id} ${signal.url}: ${message}`);
      return { source: signal, status_code: status, ok: false, dates: [], media: emptyMedia, error: message, checked_at: checkedAt, health: error instanceof Error && error.name === "AbortError" ? "timeout" : "failed" };
    }
  }));

  for (const result of signalResults) {
    media.screenshot_count += result.media.screenshot_count;
    media.gif_count += result.media.gif_count;
    media.video_count += result.media.video_count;
  }

  const updateResults = signalResults.filter((result) => sourceHasPurpose(result.source, "updates"));
  const releaseDays = new Set(updateResults
    .filter((result) => result.source.type === "github_releases")
    .flatMap((result) => datesWithinWindow(result.dates, cutoff, now))
    .map((value) => value.slice(0, 10)));
  const recentBySignal = updateResults.map((result) => ({
    ...result,
    recentDates: datesWithinWindow(result.dates, cutoff, now).filter((value) =>
      result.source.type !== "github_releases_rss" || !releaseDays.has(value.slice(0, 10))),
  }));
  const recentDates = uniqueDates(recentBySignal.flatMap((result) => result.recentDates));
  const allDates = uniqueDates(updateResults.flatMap((result) => result.dates))
    .filter((value) => Date.parse(value) <= now.getTime() + DAY_MS);
  const updates30d = recentDates.length;
  const mediaScore = calculateMediaScore(media);
  const activityScore = calculateActivityScore(updates30d);
  const collectorPriority = calculateCollectorPriority(
    activityScore,
    Math.max(mediaScore, source.media_score),
    source.signal_score,
  );
  const audit: SourceAudit = {
    product_name: source.product_name,
    updates_30d: updates30d,
    latest_update_at: allDates.at(-1) ?? "",
    ...media,
    media_score: mediaScore,
    activity_score: activityScore,
    collector_priority: collectorPriority,
  };

  const parts = {
    changelog: recentBySignal.filter((item) => item.source.type === "changelog").reduce((sum, item) => sum + item.recentDates.length, 0),
    releaseNotes: recentBySignal.filter((item) => item.source.type === "release_notes").reduce((sum, item) => sum + item.recentDates.length, 0),
    news: recentBySignal.filter((item) => item.source.type === "news" || item.source.type === "blog").reduce((sum, item) => sum + item.recentDates.length, 0),
    releases: recentBySignal.filter((item) => item.source.type === "github_releases").reduce((sum, item) => sum + item.recentDates.length, 0),
    rss: recentBySignal.filter((item) => item.source.type === "rss" || item.source.type === "github_releases_rss").reduce((sum, item) => sum + item.recentDates.length, 0),
  };
  return {
    audit,
    changelog_updates_30d: parts.changelog,
    release_notes_updates_30d: parts.releaseNotes,
    news_updates_30d: parts.news,
    github_releases_30d: parts.releases,
    rss_articles_30d: parts.rss,
    recommendation: recommendationFor(audit, source, parts),
    errors,
    successful_checks: signalResults.filter((result) => result.ok).length,
    signal_results: signalResults,
  };
}

export function applyAuditResultsToSources(sources: Source[], results: AuditDetails[]): Source[] {
  const byProduct = new Map(results.map((result) => [result.audit.product_name, result]));
  return sources.map((source) => {
    const result = byProduct.get(source.product_name);
    if (!result || !source.sources?.length) return source;
    const byId = new Map(result.signal_results.map((item) => [item.source.id, item]));
    return {
      ...source,
      sources: source.sources.map((signal) => {
        const item = byId.get(signal.id);
        if (!item) return signal;
        return {
          ...signal,
          last_checked_at: item.checked_at,
          last_update_at: item.dates.at(-1) ?? signal.last_update_at,
          screenshot_count: item.media.screenshot_count,
          gif_count: item.media.gif_count,
          video_count: item.media.video_count,
          health: item.health,
        };
      }),
      updated_at: new Date().toISOString(),
    };
  });
}

export async function auditSources(sources: Source[], now = new Date()): Promise<AuditDetails[]> {
  const results: AuditDetails[] = [];
  // Sequential product audits keep request pressure low; each product's independent sources run concurrently.
  for (const source of sources) results.push(await auditSource(source, now));
  return results;
}

export function renderAuditReport(results: AuditDetails[], generatedAt = new Date()): string {
  const tiers: Array<{ priority: CollectorPriority; heading: string }> = [
    { priority: "high", heading: "Tier 1 Sources" },
    { priority: "medium", heading: "Tier 2 Sources" },
    { priority: "low", heading: "Tier 3 Sources" },
  ];
  const lines = [
    "# Source Audit Report",
    "",
    `Generated at: ${generatedAt.toISOString()}`,
    "",
    "Activity counts combine dated changelog entries, GitHub releases, and RSS articles from the previous 30 days.",
    "",
  ];
  for (const tier of tiers) {
    lines.push(`## ${tier.heading}`, "");
    const items = results
      .filter((result) => result.audit.collector_priority === tier.priority)
      .sort((a, b) => b.audit.activity_score - a.audit.activity_score || b.audit.media_score - a.audit.media_score || a.audit.product_name.localeCompare(b.audit.product_name));
    if (!items.length) lines.push("No sources in this tier.", "");
    for (const item of items) {
      const audit = item.audit;
      lines.push(
        `### ${audit.product_name}`,
        "",
        `- Activity: ${audit.updates_30d} updates in 30 days (score ${audit.activity_score}/5)`,
        `- Activity breakdown: ${item.changelog_updates_30d} changelog, ${item.release_notes_updates_30d} release notes, ${item.news_updates_30d} news, ${item.github_releases_30d} GitHub releases, ${item.rss_articles_30d} RSS articles`,
        `- Media: ${audit.screenshot_count} screenshots, ${audit.gif_count} GIFs, ${audit.video_count} videos (score ${audit.media_score}/5)`,
        `- Latest update: ${audit.latest_update_at || "Not detected"}`,
        `- Recommendation: ${item.recommendation}`,
      );
      if (item.errors.length) lines.push(`- Audit notes: ${item.errors.join("; ")}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
