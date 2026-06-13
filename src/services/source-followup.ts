import { createHash } from "node:crypto";
import { config } from "../config.ts";
import type { ProductSource, Source, SuggestedSource } from "../types/source.ts";
import { normalizeSourceUrl } from "./source-suggestions.ts";
import { candidateReason, evaluateCandidateSource } from "./source-candidate-policy.ts";
import { sourceHasPurpose } from "./source-purpose.ts";

const HTML_UPDATE_TYPES = new Set<ProductSource["type"]>(["release_notes", "blog", "news", "docs"]);
const ACCEPT_TERMS = ["news", "blog", "announcement", "launch", "introducing", "release", "product update", "product-update", "product_update", "showcase"];
const REJECT_TERMS = ["docs", "documentation", "support", "faq", "help", "collection", "collections", "privacy", "terms", "legal"];

interface FollowupLink {
  url: string;
  text: string;
}

export interface MediaDiscoveryAudit {
  product_name: string;
  discovered_links: number;
  filtered_remaining: number;
  suggested_accept: number;
  suggested_reject: number;
  suggestions: SuggestedSource[];
  rejected_urls: Array<{ url: string; reason: string }>;
}

function textFromHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function linksFromHtml(html: string, baseUrl: string): FollowupLink[] {
  const links = new Map<string, FollowupLink>();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(match[1] ?? "", baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      url.hash = "";
      const normalized = normalizeSourceUrl(url.toString());
      links.set(normalized, { url: normalized, text: textFromHtml(match[2] ?? "") });
    } catch { /* Ignore malformed links. */ }
  }
  return [...links.values()];
}

function matchedTerm(value: string, terms: string[]): string {
  return terms.find((term) => value.includes(term)) ?? "";
}

export function classifyMediaFollowup(link: FollowupLink): { accept: boolean; reason: string; type?: SuggestedSource["type"]; confidence?: number } {
  const url = new URL(link.url);
  const host = url.hostname.toLowerCase();
  const haystack = `${host} ${decodeURIComponent(url.pathname).replace(/[-_]/g, " ")} ${link.text}`.toLowerCase();
  const rejectTerm = matchedTerm(haystack, REJECT_TERMS);
  if (rejectTerm) return { accept: false, reason: `rejected non-media keyword: ${rejectTerm}` };

  if (host.includes("youtube.com") || host === "youtu.be") {
    return { accept: true, reason: "accepted video platform", type: "youtube", confidence: 0.9 };
  }
  const acceptTerm = matchedTerm(haystack, ACCEPT_TERMS);
  if (!acceptTerm) return { accept: false, reason: "no media or product-release keyword" };
  const type: SuggestedSource["type"] = haystack.includes("news") || haystack.includes("announcement") ? "news" : "blog";
  return { accept: true, reason: `accepted media keyword: ${acceptTerm}`, type, confidence: 0.84 };
}

export async function fetchFollowupHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.scanTimeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": "AI-Design-Radar-Followup/0.2" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) return "";
    return (await response.text()).slice(0, 2_000_000);
  } finally {
    clearTimeout(timer);
  }
}

export async function auditMediaFollowupSources(product: Source, loadHtml: (url: string) => Promise<string> = fetchFollowupHtml): Promise<MediaDiscoveryAudit> {
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  const parents = productSources.filter((item) => item.status === "active" && sourceHasPurpose(item, "updates") && HTML_UPDATE_TYPES.has(item.type) && item.url);
  const existingUrls = new Set(productSources.map((item) => normalizeSourceUrl(item.url)).filter(Boolean));
  const seen = new Set<string>();
  const suggestions: SuggestedSource[] = [];
  const rejectedUrls: Array<{ url: string; reason: string }> = [];
  let discoveredLinks = 0;

  for (const parent of parents) {
    let html = "";
    try { html = await loadHtml(parent.url); } catch { continue; }
    for (const link of linksFromHtml(html, parent.url)) {
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      discoveredLinks += 1;
      if (existingUrls.has(link.url)) continue;
      const classification = classifyMediaFollowup(link);
      if (!classification.accept || !classification.type) {
        rejectedUrls.push({ url: link.url, reason: classification.reason });
        continue;
      }
      const policy = evaluateCandidateSource(product, { url: link.url, type: classification.type }, { linkedFromOfficial: true });
      if (!policy.accepted || !policy.tier) {
        rejectedUrls.push({ url: link.url, reason: policy.reason });
        continue;
      }
      const hash = createHash("sha1").update(`${parent.id}:${link.url}`).digest("hex").slice(0, 10);
      suggestions.push({
        id: `suggested-followup-${hash}`,
        type: classification.type,
        purpose: "media",
        url: link.url,
        reason: candidateReason(policy.tier, `${policy.reason}; ${classification.reason}; linked from ${product.product_name} ${parent.type}`),
        confidence: policy.confidence ?? classification.confidence ?? 0.8,
        status: "suggested",
        parent_source_id: parent.id,
        relation_type: "linked_from_update",
      });
      if (suggestions.length >= 30) break;
    }
    if (suggestions.length >= 30) break;
  }

  return {
    product_name: product.product_name,
    discovered_links: discoveredLinks,
    filtered_remaining: suggestions.length,
    suggested_accept: suggestions.length,
    suggested_reject: rejectedUrls.length,
    suggestions,
    rejected_urls: rejectedUrls,
  };
}

export async function discoverFollowupSources(product: Source): Promise<SuggestedSource[]> {
  const audit = await auditMediaFollowupSources(product);
  const suggestedSources = Array.isArray(product.suggested_sources) ? product.suggested_sources : [];
  const existingSuggestedUrls = new Set(suggestedSources.map((item) => normalizeSourceUrl(item.url)));
  return audit.suggestions.filter((item) => !existingSuggestedUrls.has(normalizeSourceUrl(item.url)));
}
