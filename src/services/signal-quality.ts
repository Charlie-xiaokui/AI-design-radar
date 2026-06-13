import type { RawSignal } from "../types/source.ts";

export function calculateSignalQualityScore(signal: Pick<RawSignal, "title" | "published_at" | "raw_text" | "media_urls">): number {
  let score = 0;
  if (signal.title.trim() && signal.title.trim().toLowerCase() !== "untitled update") score += 25;
  if (signal.published_at.trim()) score += 25;

  const length = signal.raw_text.trim().length;
  if (length >= 80 && length <= 6_000) score += 30;
  else if (length > 0 && length < 80) score += 10;
  else if (length > 6_000 && length <= 12_000) score += 18;
  else if (length > 12_000) score -= 20;

  if (signal.media_urls.length >= 3) score += 20;
  else if (signal.media_urls.length > 0) score += 12;

  return Math.max(0, Math.min(100, score));
}

export function withSignalQuality<T extends Omit<RawSignal, "quality_score"> & { quality_score?: number }>(signal: T): T & { quality_score: number } {
  return {
    ...signal,
    quality_score: calculateSignalQualityScore(signal),
  };
}
