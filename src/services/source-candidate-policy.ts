import type { ProductSource, Source } from "../types/source.ts";

export type CandidateTier = "P1" | "P2" | "P3";

export interface CandidatePolicyResult {
  accepted: boolean;
  tier?: CandidateTier;
  confidence?: number;
  reason: string;
}

const FORBIDDEN_HOSTS = [
  "medium.com", "substack.com", "dev.to", "hashnode.dev", "techcrunch.com", "venturebeat.com",
  "producthunt.com.cn", "alternativeto.net", "g2.com", "capterra.com", "saasworthy.com", "sourceforge.net",
];
const FORBIDDEN_TERMS = ["mirror", "unofficial", "fan site", "fan-site", "aggregator", "directory", "seo"];
const PLATFORM_HOSTS = ["github.com", "x.com", "twitter.com", "youtube.com", "www.youtube.com", "youtu.be", "producthunt.com", "www.producthunt.com", "discord.com", "discord.gg"];

function hostname(value: string): string {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

function officialHosts(product: Source): Set<string> {
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  const urls = [
    product.homepage_url, product.docs_url, product.blog_url, product.news_url, product.release_notes_url,
    product.changelog_url, product.rss_url, ...productSources.map((item) => item.url),
  ];
  return new Set(urls.map(hostname).filter((host) => host && !PLATFORM_HOSTS.includes(host)));
}

function isOfficialWebHost(product: Source, candidateHost: string): boolean {
  return [...officialHosts(product)].some((host) => candidateHost === host || candidateHost.endsWith(`.${host}`) || host.endsWith(`.${candidateHost}`));
}

function tierFor(type: ProductSource["type"], url: string): CandidateTier | undefined {
  const host = hostname(url);
  if (type === "product_hunt" || host === "producthunt.com") return "P2";
  if (["community", "forum", "discord", "reddit", "events", "slack"].includes(type)
    || host === "discord.com"
    || host === "discord.gg"
    || /\/(community|forum)(\/|$)/i.test(new URL(url).pathname)) return "P3";
  if (["homepage", "blog", "news", "release_notes", "github_repo", "github_releases", "github_releases_rss", "rss", "x", "youtube"].includes(type)) return "P1";
  return undefined;
}

export function evaluateCandidateSource(
  product: Source,
  candidate: Pick<ProductSource, "url" | "type">,
  options: { linkedFromOfficial?: boolean; verifiedOfficial?: boolean } = {},
): CandidatePolicyResult {
  let url: URL;
  try { url = new URL(candidate.url); }
  catch { return { accepted: false, reason: "invalid URL" }; }
  const host = hostname(candidate.url);
  const haystack = `${host} ${decodeURIComponent(url.pathname)}`.toLowerCase();
  const forbiddenHost = FORBIDDEN_HOSTS.find((item) => host === item || host.endsWith(`.${item}`));
  if (forbiddenHost) return { accepted: false, reason: `forbidden third-party or aggregator host: ${forbiddenHost}` };
  const forbiddenTerm = FORBIDDEN_TERMS.find((item) => haystack.includes(item));
  if (forbiddenTerm) return { accepted: false, reason: `forbidden unofficial, SEO, or mirror signal: ${forbiddenTerm}` };

  const tier = tierFor(candidate.type, candidate.url);
  if (!tier) return { accepted: false, reason: "source type is outside the candidate priority policy" };
  const platform = PLATFORM_HOSTS.includes(host);
  const official = isOfficialWebHost(product, host) || options.verifiedOfficial === true || (platform && options.linkedFromOfficial === true);
  if (!official && tier !== "P2") return { accepted: false, reason: "official ownership could not be established" };

  const confidence = tier === "P1" ? 0.96 : tier === "P2" ? 0.75 : 0.62;
  return { accepted: true, tier, confidence, reason: `${tier} official source policy` };
}

export function candidateReason(tier: CandidateTier, reason: string): string {
  return `[${tier}] ${reason}`;
}

export function candidateTierFromReason(reason: string): CandidateTier | undefined {
  return reason.match(/^\[(P[123])\]/)?.[1] as CandidateTier | undefined;
}
