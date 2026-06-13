import { config } from "../config.ts";
import type { EligibleSignalSource } from "./signal-source-filter.ts";
import type { ProductSource, RawSignal, Source } from "../types/source.ts";
import { readRawSignals, upsertRawSignals } from "../repositories/raw-signal-repository.ts";
import { filterEligibleSignalSources, summarizeSignalSourceEligibility } from "./signal-source-filter.ts";
import { withSignalQuality } from "./signal-quality.ts";

const MAX_TEXT_BYTES = 1_000_000;
const SUPPORTED_SIGNAL_TYPES = new Set(["release_notes", "changelog", "blog", "news", "docs", "youtube", "product_hunt", "rss", "github_releases", "github_releases_rss"]);
const MAX_VISUAL_PAGE_SIGNALS = 12;
const COLLECTOR_CONCURRENCY = 6;

export interface SignalCollectorSummary {
  sources_scanned: number;
  total_sources: number;
  eligible_public_sources: number;
  skipped_sources: number;
  signals_discovered: number;
  duplicates_skipped: number;
  signals_with_media: number;
  signals_with_screenshots: number;
  signals_with_video: number;
  signals_with_gif: number;
  homepage_qualified_visual_signals: number;
  errors: string[];
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, " ")
    .replace(/&nbsp;/gi, " ");
}

function stripTags(value: string): string {
  return decodeEntities(value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function removeNoisyHtml(html: string): string {
  return html
    .replace(/<(?:nav|header|footer|aside)\b[\s\S]*?<\/(?:nav|header|footer|aside)>/gi, " ")
    .replace(/<[^>]+(?:class|id)=["'][^"']*(?:nav|menu|sidebar|breadcrumb|footer|header|cookie|promo|banner)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, " ");
}

function candidateBlocks(html: string): string[] {
  const cleaned = removeNoisyHtml(html);
  const blocks: string[] = [];
  for (const tag of ["article", "main", "section"]) {
    for (const match of cleaned.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"))) {
      blocks.push(match[0]);
    }
  }
  for (const match of cleaned.matchAll(/<(?:div|li)\b[^>]*(?:class|id)=["'][^"']*(?:release|changelog|update|entry|post|article)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|li)>/gi)) {
    blocks.push(match[0]);
  }
  return blocks.length ? blocks : [cleaned];
}

function blockScore(block: string): number {
  const text = stripTags(block);
  const length = text.length;
  const lengthScore = length >= 120 && length <= 6_000 ? 40 : length > 6_000 && length <= 12_000 ? 20 : length > 0 ? 8 : 0;
  const dateScore = publishedDateFromHtml(block) ? 25 : 0;
  const headingScore = /<h[1-4]\b/i.test(block) ? 15 : 0;
  const keywordScore = /\b(release|changelog|update|new|fixed|improved|launch|version)\b/i.test(text) ? 20 : 0;
  return lengthScore + dateScore + headingScore + keywordScore;
}

function focusedHtml(html: string): string {
  return candidateBlocks(html)
    .map((block) => ({ block, score: blockScore(block), length: stripTags(block).length }))
    .filter((item) => item.length > 0)
    .sort((a, b) => b.score - a.score || b.length - a.length)[0]?.block ?? removeNoisyHtml(html);
}

function normalizeDate(value: string): string {
  const timestamp = Date.parse(decodeEntities(value).trim());
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function titleFromHtml(html: string): string {
  return stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
    || stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "")
    || "Untitled update";
}

function descriptionFromHtml(html: string): string {
  const meta = html.match(/<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    ?? html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
  if (meta?.[1]) return decodeEntities(meta[1]).trim();
  return stripTags(html).slice(0, 280);
}

function publishedDateFromHtml(html: string): string {
  const values = [
    html.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i)?.[1],
    html.match(/["'](?:datePublished|dateModified|dateCreated|uploadDate)["']\s*:\s*["']([^"']+)["']/i)?.[1],
    html.match(/\b(20\d{2}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-][0-2]\d:?\d{2})?)?)\b/)?.[1],
    html.match(/\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+20\d{2})\b/i)?.[1],
  ];
  for (const value of values) {
    if (!value) continue;
    const normalized = normalizeDate(value);
    if (normalized) return normalized;
  }
  return "";
}

function absoluteUrl(value: string, baseUrl: string): string {
  try {
    return new URL(decodeEntities(value), baseUrl).toString();
  } catch {
    return decodeEntities(value);
  }
}

function mediaTypeForUrl(url: string): string {
  if (/\.gif(?:$|[?#])/i.test(url)) return "gif";
  if (/\.(?:mp4|webm|mov|m4v)(?:$|[?#])/i.test(url) || /youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return "video";
  return "image";
}

function extractMediaUrls(html: string, baseUrl: string): { urls: string[]; types: string[] } {
  const urls: string[] = [];
  for (const match of html.matchAll(/<(?:img|video|source)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    urls.push(absoluteUrl(match[1] ?? "", baseUrl));
  }
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*\bsrcset=["']([^"']+)["'][^>]*>/gi)) {
    const first = (match[1] ?? "").split(",").map((item) => item.trim().split(/\s+/)[0]).find(Boolean);
    if (first) urls.push(absoluteUrl(first, baseUrl));
  }
  for (const match of html.matchAll(/<video\b[^>]*\bposter=["']([^"']+)["'][^>]*>/gi)) {
    urls.push(absoluteUrl(match[1] ?? "", baseUrl));
  }
  for (const match of html.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']*(?:youtube\.com\/embed\/|youtu\.be\/|vimeo\.com\/video\/)[^"']*)["'][^>]*>/gi)) {
    const iframeUrl = absoluteUrl(match[1] ?? "", baseUrl);
    urls.push(iframeUrl);
    const youtubeId = iframeUrl.match(/(?:embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
    if (youtubeId) urls.push(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`);
  }
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|og:image:url|twitter:image|og:video|og:video:url|og:video:secure_url)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    urls.push(absoluteUrl(match[1] ?? "", baseUrl));
  }
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+(?:\.gif|\.mp4|\.webm|\.mov)(?:[?#][^\s"'<>]*)?/gi)) {
    urls.push(absoluteUrl(match[0], baseUrl));
  }
  const unique = [...new Set(urls.filter(Boolean))];
  return { urls: unique, types: unique.map(mediaTypeForUrl) };
}

function extractLinks(html: string, baseUrl: string): Array<{ url: string; text: string; block: string }> {
  const links: Array<{ url: string; text: string; block: string }> = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const block = match[0];
    const url = absoluteUrl(match[1] ?? "", baseUrl);
    const text = stripTags(match[2] ?? "");
    if (!url || /^mailto:|^tel:|#/.test(url)) continue;
    links.push({ url, text, block });
  }
  return links;
}

function isLikelyArticleUrl(url: string, baseUrl: string): boolean {
  try {
    const parsed = new URL(url);
    const base = new URL(baseUrl);
    if (parsed.hostname !== base.hostname) return false;
    const path = parsed.pathname.toLowerCase();
    if (/\.(?:png|jpg|jpeg|gif|svg|webp|mp4|webm|mov|pdf|zip)$/i.test(path)) return false;
    if (/(privacy|terms|legal|login|signin|signup|contact|careers|pricing|docs\/api)/i.test(path)) return false;
    return /(blog|news|update|updates|release|releases|changelog|product|launch|announce|article|post|video|demo|showcase|stories)/i.test(path)
      || /\/20\d{2}\//.test(path);
  } catch {
    return false;
  }
}

function articleLinksFromHtml(html: string, baseUrl: string): Array<{ url: string; title: string }> {
  const seen = new Set<string>();
  return extractLinks(removeNoisyHtml(html), baseUrl)
    .filter((link) => isLikelyArticleUrl(link.url, baseUrl) && link.text.length >= 4)
    .map((link) => ({ url: link.url, title: link.text.slice(0, 160) }))
    .filter((link) => {
      if (seen.has(link.url)) return false;
      seen.add(link.url);
      return true;
    })
    .slice(0, MAX_VISUAL_PAGE_SIGNALS);
}

function rssEntries(xml: string): string[] {
  return xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
}

function signalId(product: Source, source: ProductSource, signalUrl: string, title: string): string {
  const input = `${product.slug}:${source.id}:${signalUrl}:${title}`.toLowerCase();
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return `raw_${product.slug}_${source.id}_${hash.toString(36)}`.replace(/[^a-z0-9_]/gi, "_");
}

async function fetchText(url: string, accept: string): Promise<{ text: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.scanTimeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept,
        "user-agent": "AI-Design-Radar-Signal-Collector/0.1 (+raw signal discovery)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { text: (await response.text()).slice(0, MAX_TEXT_BYTES), finalUrl: response.url || url };
  } finally {
    clearTimeout(timer);
  }
}

function rawSignalBase(product: Source, source: ProductSource, signalUrl: string, title: string): Pick<RawSignal, "id" | "product" | "source_id" | "source_url" | "signal_url" | "title" | "source_type" | "status" | "created_at" | "updated_at"> {
  const now = new Date().toISOString();
  return {
    id: signalId(product, source, signalUrl, title),
    product: product.product_name,
    source_id: source.id,
    source_url: source.url,
    signal_url: signalUrl,
    title,
    source_type: source.type,
    status: "discovered",
    created_at: now,
    updated_at: now,
  };
}

async function collectReleaseNotesSignal({ product, source }: EligibleSignalSource): Promise<RawSignal[]> {
  const { text: html, finalUrl } = await fetchText(source.url, "text/html,application/xhtml+xml");
  const focused = focusedHtml(html);
  const title = titleFromHtml(html);
  const media = extractMediaUrls(focused, finalUrl);
  return [withSignalQuality({
    ...rawSignalBase(product, source, finalUrl, title),
    description: descriptionFromHtml(focused),
    published_at: publishedDateFromHtml(focused) || publishedDateFromHtml(html),
    raw_text: stripTags(focused).slice(0, 6_000),
    media_urls: media.urls,
    media_types: media.types,
  })];
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

function atomTag(block: string, tag: string): string {
  return stripTags(block.match(new RegExp(`<${tag}\\b[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"))?.[1] ?? "");
}

function xmlTag(block: string, tag: string): string {
  return stripTags(block.match(new RegExp(`<${tag}\\b[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"))?.[1] ?? "");
}

function atomLink(block: string): string {
  return decodeEntities(block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? xmlTag(block, "link"));
}

function mediaFromFeedBlock(block: string, baseUrl: string): { urls: string[]; types: string[] } {
  const urls: string[] = [];
  for (const match of block.matchAll(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*(?:url|href)=["']([^"']+)["'][^>]*>/gi)) {
    urls.push(absoluteUrl(match[1] ?? "", baseUrl));
  }
  const htmlMedia = extractMediaUrls(decodeEntities(block), baseUrl);
  urls.push(...htmlMedia.urls);
  const unique = [...new Set(urls.filter(Boolean))];
  return { urls: unique, types: unique.map(mediaTypeForUrl) };
}

function collectGithubAtomSignals(product: Source, source: ProductSource, xml: string): RawSignal[] {
  const entries = rssEntries(xml);
  return entries.map((entry) => {
    const title = atomTag(entry, "title") || xmlTag(entry, "title") || "GitHub release";
    const url = atomLink(entry) || source.url;
    const rawText = atomTag(entry, "content") || atomTag(entry, "summary") || xmlTag(entry, "description");
    const media = mediaFromFeedBlock(entry, url);
    return withSignalQuality({
      ...rawSignalBase(product, source, url, title),
      description: rawText.slice(0, 280),
      published_at: normalizeDate(atomTag(entry, "published") || atomTag(entry, "updated") || xmlTag(entry, "pubDate")),
      raw_text: rawText,
      media_urls: media.urls,
      media_types: media.types,
    });
  });
}

function collectFeedSignals(product: Source, source: ProductSource, xml: string): RawSignal[] {
  return rssEntries(xml).slice(0, MAX_VISUAL_PAGE_SIGNALS).map((entry) => {
    const title = atomTag(entry, "title") || xmlTag(entry, "title") || "Product update";
    const url = atomLink(entry) || source.url;
    const rawText = atomTag(entry, "content") || atomTag(entry, "summary") || xmlTag(entry, "description");
    const media = mediaFromFeedBlock(entry, url);
    return withSignalQuality({
      ...rawSignalBase(product, source, url, title),
      description: rawText.slice(0, 280),
      published_at: normalizeDate(atomTag(entry, "published") || atomTag(entry, "updated") || xmlTag(entry, "pubDate")),
      raw_text: rawText.slice(0, 6_000),
      media_urls: media.urls,
      media_types: media.types,
    });
  });
}

function isFeed(text: string): boolean {
  return /<(rss|feed)\b/i.test(text) || /<item\b[\s\S]*?<\/item>/i.test(text) || /<entry\b[\s\S]*?<\/entry>/i.test(text);
}

async function collectArticleDetailSignal(product: Source, source: ProductSource, url: string, fallbackTitle = ""): Promise<RawSignal> {
  const { text: html, finalUrl } = await fetchText(url, "text/html,application/xhtml+xml");
  const focused = focusedHtml(html);
  const media = extractMediaUrls(focused, finalUrl);
  if (!media.urls.length) {
    const pageMedia = extractMediaUrls(html, finalUrl);
    media.urls.push(...pageMedia.urls);
    media.types.push(...pageMedia.types);
  }
  const title = titleFromHtml(focused) || titleFromHtml(html) || fallbackTitle || "Product update";
  return withSignalQuality({
    ...rawSignalBase(product, source, finalUrl, title),
    description: descriptionFromHtml(focused || html),
    published_at: publishedDateFromHtml(focused) || publishedDateFromHtml(html),
    raw_text: stripTags(focused).slice(0, 6_000),
    media_urls: [...new Set(media.urls)],
    media_types: [...new Set(media.urls)].map(mediaTypeForUrl),
  });
}

async function collectVisualPageSignals({ product, source }: EligibleSignalSource): Promise<RawSignal[]> {
  const { text, finalUrl } = await fetchText(source.url, "text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml,text/xml");
  if (isFeed(text) || source.type === "rss") return collectFeedSignals(product, source, text);
  const links = articleLinksFromHtml(text, finalUrl);
  if (!links.length) return collectReleaseNotesSignal({ product, source });
  const signals: RawSignal[] = [];
  for (const link of links) {
    try {
      signals.push(await collectArticleDetailSignal(product, source, link.url, link.title));
    } catch {
      // Individual visual article failures should not cancel the whole source.
    }
  }
  return signals.length ? signals : [await collectArticleDetailSignal(product, source, finalUrl)];
}

async function collectGithubReleaseSignals({ product, source }: EligibleSignalSource): Promise<RawSignal[]> {
  if (source.type === "github_releases_rss" || source.url.endsWith(".atom")) {
    const { text } = await fetchText(source.url, "application/atom+xml,application/rss+xml,application/xml,text/xml");
    return collectGithubAtomSignals(product, source, text);
  }
  const repo = parseGithubRepo(source.url);
  if (!repo) throw new Error(`Invalid GitHub releases URL: ${source.url}`);
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "AI-Design-Radar-Signal-Collector/0.1",
    "x-github-api-version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.scanTimeoutMs);
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/releases?per_page=50`, {
      signal: controller.signal,
      headers,
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const releases = await response.json() as Array<{ html_url?: string; name?: string; tag_name?: string; published_at?: string; created_at?: string; body?: string; draft?: boolean }>;
    return releases
      .filter((release) => !release.draft)
      .map((release) => {
        const title = release.name || release.tag_name || "GitHub release";
        const url = release.html_url || source.url;
        return withSignalQuality({
          ...rawSignalBase(product, source, url, title),
          description: (release.body ?? "").slice(0, 280),
          published_at: normalizeDate(release.published_at ?? release.created_at ?? ""),
          raw_text: release.body ?? "",
          media_urls: [],
          media_types: [],
        });
      });
  } finally {
    clearTimeout(timer);
  }
}

async function collectFromSource(eligibleSource: EligibleSignalSource): Promise<RawSignal[]> {
  if (eligibleSource.source.type === "release_notes" || eligibleSource.source.type === "changelog") {
    return collectReleaseNotesSignal(eligibleSource);
  }
  if (["blog", "news", "docs", "youtube", "product_hunt", "rss"].includes(eligibleSource.source.type)) {
    return collectVisualPageSignals(eligibleSource);
  }
  if (eligibleSource.source.type === "github_releases" || eligibleSource.source.type === "github_releases_rss") {
    return collectGithubReleaseSignals(eligibleSource);
  }
  return [];
}

export async function collectSignalSummary(products: Source[], rawSignalsFile = config.rawSignalsFile): Promise<SignalCollectorSummary> {
  await readRawSignals(rawSignalsFile);
  const eligibility = summarizeSignalSourceEligibility(products);
  const supportedSources = filterEligibleSignalSources(products)
    .filter((item) => SUPPORTED_SIGNAL_TYPES.has(item.source.type));
  const errors: string[] = [];
  const discovered: RawSignal[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < supportedSources.length) {
      const eligibleSource = supportedSources[cursor];
      cursor += 1;
      if (!eligibleSource) continue;
      try {
        discovered.push(...await collectFromSource(eligibleSource));
      } catch (error) {
        errors.push(`${eligibleSource.product.product_name} ${eligibleSource.source.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(COLLECTOR_CONCURRENCY, supportedSources.length) }, () => worker()));
  const upsert = await upsertRawSignals(discovered, rawSignalsFile);
  const currentSignals = upsert.signals;
  return {
    ...eligibility,
    sources_scanned: supportedSources.length,
    signals_discovered: upsert.inserted,
    duplicates_skipped: upsert.duplicates_skipped,
    signals_with_media: currentSignals.filter((signal) => signal.media_urls.length > 0).length,
    signals_with_screenshots: currentSignals.filter((signal) => signal.image_count > 0).length,
    signals_with_video: currentSignals.filter((signal) => signal.video_count > 0).length,
    signals_with_gif: currentSignals.filter((signal) => signal.gif_count > 0).length,
    homepage_qualified_visual_signals: currentSignals.filter((signal) => signal.status === "approved" && signal.homepage_candidate === true && signal.homepage_score >= 3 && signal.has_visual_signal).length,
    errors,
  };
}
