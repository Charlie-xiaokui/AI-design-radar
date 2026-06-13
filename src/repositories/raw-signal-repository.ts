import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.ts";
import {
  HOMEPAGE_CATEGORIES,
  HOMEPAGE_REVIEW_CRITERIA,
  RAW_SIGNAL_STATUSES,
  VISUAL_ASSET_TYPES,
  type HomepageCandidateStatus,
  type HomepageCategory,
  type HomepageReviewCriteria,
  type RawSignal,
  type RawSignalStatus,
  type VisualAssetType,
} from "../types/source.ts";
import { calculateSignalQualityScore } from "../services/signal-quality.ts";
import { writeJsonFile } from "./json-file.ts";

export interface RawSignalUpsertResult {
  signals: RawSignal[];
  inserted: number;
  merged: number;
  duplicates_skipped: number;
}

const LOCKED_STATUSES = new Set<RawSignalStatus>(["approved", "rejected"]);

export type RawSignalHomepageReviewPatch = Partial<Pick<
  RawSignal,
  "homepage_candidate" | "homepage_criteria" | "homepage_reasons" | "homepage_category" | "is_concept" | "visual_asset_type"
>>;

async function ensureRawSignalFile(filePath: string): Promise<void> {
  try {
    await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "[]\n", "utf8");
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function duplicateKeyByTitle(signal: Pick<RawSignal, "product" | "title">): string {
  return `${normalizeText(signal.product)}::${normalizeText(signal.title)}`;
}

function duplicateKeyBySourceDateTitle(signal: Pick<RawSignal, "source_id" | "published_at" | "title">): string {
  return `${signal.source_id}::${signal.published_at}::${normalizeText(signal.title)}`;
}

function normalizeHomepageCandidateStatus(value: unknown): HomepageCandidateStatus {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return "unknown";
}

function mediaTypeForUrl(url: string): string {
  if (/\.gif(?:$|[?#])/i.test(url)) return "gif";
  if (/\.(?:mp4|webm|mov|m4v)(?:$|[?#])/i.test(url)) return "video";
  return "image";
}

export function rawSignalMediaMetadata(signal: Pick<RawSignal, "media_urls" | "media_types">): Pick<RawSignal, "media_count" | "image_count" | "video_count" | "gif_count" | "has_visual_signal"> {
  const urls = Array.isArray(signal.media_urls) ? signal.media_urls.filter(Boolean) : [];
  const explicitTypes = Array.isArray(signal.media_types) ? signal.media_types : [];
  const types = urls.map((url, index) => String(explicitTypes[index] ?? mediaTypeForUrl(url)).toLowerCase());
  const gifCount = types.filter((type, index) => type === "gif" || /\.gif(?:$|[?#])/i.test(urls[index] ?? "")).length;
  const videoCount = types.filter((type) => type === "video").length;
  const imageCount = Math.max(0, urls.length - gifCount - videoCount);
  return {
    media_count: urls.length,
    image_count: imageCount,
    video_count: videoCount,
    gif_count: gifCount,
    has_visual_signal: urls.some((url, index) => isLikelyVisualSignalMedia(url, types[index] ?? "image")),
  };
}

function isLikelyVisualSignalMedia(url: string, type: string): boolean {
  const lower = decodeURIComponent(url).toLowerCase();
  if (!url) return false;
  if (/\.(?:svg|ico)(?:$|[?#])/.test(lower)) return false;
  if (/(?:^|[/_.-])(?:logo|icon|favicon|avatar|wordmark|sprite|placeholder|tracking|pixel|blank|transparent)(?:[/_.-]|$)/i.test(lower)) return false;
  if (type === "video" || type === "gif") return true;
  return type === "image";
}

function isTrustedSourceType(sourceType: string): boolean {
  return ["release_notes", "changelog", "blog", "news", "github_releases", "github_releases_rss", "youtube", "product_hunt", "x"].includes(sourceType);
}

export function normalizeHomepageCriteria(value: unknown, signal?: Pick<RawSignal, "source_type">): HomepageReviewCriteria {
  const input = value && typeof value === "object" ? value as Partial<Record<keyof HomepageReviewCriteria, unknown>> : {};
  return Object.fromEntries(HOMEPAGE_REVIEW_CRITERIA.map((criterion) => {
    const raw = input[criterion];
    if (raw === 1 || raw === true || raw === "1" || raw === "true") return [criterion, 1];
    if (raw === 0 || raw === false || raw === "0" || raw === "false") return [criterion, 0];
    if (criterion === "trusted_source" && signal?.source_type && isTrustedSourceType(signal.source_type)) return [criterion, 1];
    return [criterion, 0];
  })) as HomepageReviewCriteria;
}

export function calculateHomepageScore(criteria: HomepageReviewCriteria): number {
  return HOMEPAGE_REVIEW_CRITERIA.reduce((sum, criterion) => sum + criteria[criterion], 0);
}

export async function readRawSignals(filePath = config.rawSignalsFile): Promise<RawSignal[]> {
  await ensureRawSignalFile(filePath);
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  return Array.isArray(parsed)
    ? (parsed as RawSignal[]).map((signal) => {
      const mediaMetadata = rawSignalMediaMetadata(signal);
      const homepageCriteria = normalizeHomepageCriteria(signal.homepage_criteria, signal);
      return {
        ...signal,
        quality_score: calculateSignalQualityScore(signal),
        ...mediaMetadata,
        homepage_candidate: normalizeHomepageCandidateStatus(signal.homepage_candidate),
        homepage_criteria: homepageCriteria,
        homepage_score: calculateHomepageScore(homepageCriteria),
        homepage_reasons: Array.isArray(signal.homepage_reasons) ? signal.homepage_reasons.map(String) : [],
        homepage_category: HOMEPAGE_CATEGORIES.includes(signal.homepage_category as HomepageCategory) ? signal.homepage_category : "unknown",
        is_concept: Boolean(signal.is_concept),
        visual_asset_type: VISUAL_ASSET_TYPES.includes(signal.visual_asset_type as VisualAssetType) ? signal.visual_asset_type : "unknown",
      };
    })
    : [];
}

export async function writeRawSignals(signals: RawSignal[], filePath = config.rawSignalsFile): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeJsonFile(filePath, signals);
}

export function findDuplicateRawSignal(signal: RawSignal, existing: RawSignal[]): RawSignal | undefined {
  const signalUrl = signal.signal_url.trim();
  const titleKey = duplicateKeyByTitle(signal);
  const sourceDateTitleKey = duplicateKeyBySourceDateTitle(signal);
  return existing.find((item) =>
    (signalUrl && item.signal_url.trim() === signalUrl)
    || duplicateKeyByTitle(item) === titleKey
    || duplicateKeyBySourceDateTitle(item) === sourceDateTitleKey);
}

function mergeRawSignal(existing: RawSignal, incoming: RawSignal): RawSignal {
  if (LOCKED_STATUSES.has(existing.status)) return existing;
  if ((incoming.quality_score ?? 0) > (existing.quality_score ?? 0)) {
    return {
      ...existing,
      title: incoming.title || existing.title,
      description: incoming.description || existing.description,
      published_at: incoming.published_at || existing.published_at,
      raw_text: incoming.raw_text || existing.raw_text,
      media_urls: [...new Set([...incoming.media_urls, ...existing.media_urls])],
      media_types: [...new Set([...incoming.media_types, ...existing.media_types])],
      quality_score: incoming.quality_score,
      updated_at: new Date().toISOString(),
    };
  }
  const description = existing.description || incoming.description;
  const rawText = existing.raw_text || incoming.raw_text;
  const mediaUrls = [...new Set([...existing.media_urls, ...incoming.media_urls])];
  const mediaTypes = [...new Set([...existing.media_types, ...incoming.media_types])];
  const qualityScore = Math.max(existing.quality_score ?? 0, incoming.quality_score ?? 0);
  if (
    description === existing.description
    && rawText === existing.raw_text
    && mediaUrls.length === existing.media_urls.length
    && mediaTypes.length === existing.media_types.length
    && qualityScore === existing.quality_score
  ) {
    return existing;
  }
  return {
    ...existing,
    description,
    raw_text: rawText,
    media_urls: mediaUrls,
    media_types: mediaTypes,
    quality_score: qualityScore,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertRawSignals(incoming: RawSignal[], filePath = config.rawSignalsFile): Promise<RawSignalUpsertResult> {
  const signals = await readRawSignals(filePath);
  let inserted = 0;
  let merged = 0;
  let duplicatesSkipped = 0;
  for (const signal of incoming) {
    const normalizedSignal = { ...signal, quality_score: calculateSignalQualityScore(signal), ...rawSignalMediaMetadata(signal) };
    const duplicate = findDuplicateRawSignal(normalizedSignal, signals);
    if (!duplicate) {
      signals.push(normalizedSignal);
      inserted += 1;
      continue;
    }
    const index = signals.findIndex((item) => item.id === duplicate.id);
    if (index < 0 || LOCKED_STATUSES.has(duplicate.status)) {
      duplicatesSkipped += 1;
      continue;
    }
    const mergedSignal = mergeRawSignal(duplicate, normalizedSignal);
    if (JSON.stringify(mergedSignal) === JSON.stringify(duplicate)) duplicatesSkipped += 1;
    else {
      signals[index] = mergedSignal;
      merged += 1;
    }
  }
  await writeRawSignals(signals, filePath);
  return { signals, inserted, merged, duplicates_skipped: duplicatesSkipped };
}

export async function updateRawSignalStatus(id: string, status: RawSignalStatus, filePath = config.rawSignalsFile): Promise<RawSignal> {
  if (!RAW_SIGNAL_STATUSES.includes(status)) throw new Error(`Invalid raw signal status: ${status}`);
  const signals = await readRawSignals(filePath);
  const index = signals.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Raw signal not found");
  const existing = signals[index]!;
  const updated = { ...existing, status, updated_at: new Date().toISOString() };
  signals[index] = updated;
  await writeRawSignals(signals, filePath);
  return updated;
}

export async function updateRawSignalHomepageReview(id: string, patch: RawSignalHomepageReviewPatch, filePath = config.rawSignalsFile): Promise<RawSignal> {
  const signals = await readRawSignals(filePath);
  const index = signals.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Raw signal not found");
  const existing = signals[index]!;
  const homepageCandidate = normalizeHomepageCandidateStatus(patch.homepage_candidate);
  const homepageCriteria = patch.homepage_criteria !== undefined
    ? normalizeHomepageCriteria(patch.homepage_criteria, existing)
    : existing.homepage_criteria;
  const next: RawSignal = {
    ...existing,
    ...(patch.homepage_candidate !== undefined ? { homepage_candidate: homepageCandidate } : {}),
    homepage_criteria: homepageCriteria,
    homepage_score: calculateHomepageScore(homepageCriteria),
    ...(Array.isArray(patch.homepage_reasons) ? { homepage_reasons: patch.homepage_reasons.map(String).map((item) => item.trim()).filter(Boolean) } : {}),
    ...(patch.homepage_category && HOMEPAGE_CATEGORIES.includes(patch.homepage_category) ? { homepage_category: patch.homepage_category } : {}),
    ...(typeof patch.is_concept === "boolean" ? { is_concept: patch.is_concept } : {}),
    ...(patch.visual_asset_type && VISUAL_ASSET_TYPES.includes(patch.visual_asset_type) ? { visual_asset_type: patch.visual_asset_type } : {}),
    updated_at: new Date().toISOString(),
  };
  signals[index] = next;
  await writeRawSignals(signals, filePath);
  return next;
}
