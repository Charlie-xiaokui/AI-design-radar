import type { ProductSource, ProductSourceType, Source, SourcePurpose } from "../types/source.ts";
import { normalizeAccessType } from "./source-access.ts";
import { purposesOf } from "./source-purpose.ts";

export const SIGNAL_COLLECTOR_SOURCE_TYPES = [
  "release_notes",
  "changelog",
  "blog",
  "news",
  "github_releases",
  "github_releases_rss",
  "docs",
  "youtube",
  "product_hunt",
] as const;

export type SignalCollectorSourceType = (typeof SIGNAL_COLLECTOR_SOURCE_TYPES)[number];

const ELIGIBLE_TYPES = new Set<string>(SIGNAL_COLLECTOR_SOURCE_TYPES);
const ELIGIBLE_PURPOSES = new Set<SourcePurpose>(["updates", "media", "discovery"]);
const USABLE_STATUSES = new Set<string>(["active", "usable"]);

export interface EligibleSignalSource {
  product: Source;
  source: ProductSource;
}

export interface SignalSourceEligibilitySummary {
  total_sources: number;
  eligible_public_sources: number;
  skipped_sources: number;
}

export function isEligibleSignalSource(source: ProductSource): boolean {
  return normalizeAccessType(source) === "public"
    && USABLE_STATUSES.has(String(source.status))
    && ELIGIBLE_TYPES.has(source.type)
    && purposesOf(source).some((purpose) => ELIGIBLE_PURPOSES.has(purpose));
}

export function filterEligibleSignalSources(products: Source[]): EligibleSignalSource[] {
  return products.flatMap((product) =>
    (Array.isArray(product.sources) ? product.sources : [])
      .filter(isEligibleSignalSource)
      .map((source) => ({ product, source })));
}

export function summarizeSignalSourceEligibility(products: Source[]): SignalSourceEligibilitySummary {
  const totalSources = products.reduce((sum, product) => sum + (Array.isArray(product.sources) ? product.sources.length : 0), 0);
  const eligiblePublicSources = filterEligibleSignalSources(products).length;
  return {
    total_sources: totalSources,
    eligible_public_sources: eligiblePublicSources,
    skipped_sources: totalSources - eligiblePublicSources,
  };
}

export function isSignalCollectorSourceType(type: ProductSourceType | string): type is SignalCollectorSourceType {
  return ELIGIBLE_TYPES.has(type);
}
