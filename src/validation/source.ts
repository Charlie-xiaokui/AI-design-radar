import {
  CATEGORIES,
  GITHUB_TYPES,
  PRODUCT_SOURCE_TYPES,
  REGISTRY_SOURCE_TYPES,
  REVIEW_STATUSES,
  SCAN_FREQUENCIES,
  SOURCE_STATUSES,
  SOURCE_PURPOSES,
  SIGNAL_SOURCE_STATUSES,
  SIGNAL_HEALTH_STATES,
  SOURCE_RELATION_TYPES,
  SUGGESTED_SOURCE_STATUSES,
  ACCESS_TYPES,
  type ProductSource,
  type Source,
  type SuggestedSource,
} from "../types/source.ts";
import { collectorForType, legacySourcesFor } from "../services/source-signals.ts";
import { normalizePurposeFields } from "../services/source-purpose.ts";

const URL_FIELDS = [
  "homepage_url",
  "github_url",
  "github_releases_url",
  "changelog_url",
  "docs_url",
  "product_hunt_url",
  "x_url",
  "rss_url",
  "news_url",
  "videos_url",
  "blog_url",
  "release_notes_url",
  "anthropic_news_url",
  "claude_code_github_url",
  "claude_code_releases_url",
  "claude_code_rss_url",
] as const;

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function assertUrl(value: unknown, field: string): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${field} must use http or https`);
  }
  return url.toString();
}

function validateProductSources(input: unknown): ProductSource[] {
  if (!Array.isArray(input)) throw new Error("sources must be an array");
  const ids = new Set<string>();
  return input.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`sources[${index}] must be an object`);
    const item = value as Partial<ProductSource>;
    const id = String(item.id ?? "").trim();
    if (!id) throw new Error(`sources[${index}].id is required`);
    if (ids.has(id)) throw new Error(`Duplicate source id: ${id}`);
    ids.add(id);
    if (!item.type || !PRODUCT_SOURCE_TYPES.includes(item.type)) throw new Error(`Invalid sources[${index}].type`);
    if (item.purpose && !SOURCE_PURPOSES.includes(item.purpose)) throw new Error(`Invalid sources[${index}].purpose`);
    if (item.primary_purpose && !SOURCE_PURPOSES.includes(item.primary_purpose)) throw new Error(`Invalid sources[${index}].primary_purpose`);
    if (item.purposes && (!Array.isArray(item.purposes) || item.purposes.some((purpose) => !SOURCE_PURPOSES.includes(purpose)))) throw new Error(`Invalid sources[${index}].purposes`);
    const purposeFields = normalizePurposeFields(item);
    if (!item.scan_frequency || !SCAN_FREQUENCIES.includes(item.scan_frequency)) throw new Error(`Invalid sources[${index}].scan_frequency`);
    if (!item.status || !SIGNAL_SOURCE_STATUSES.includes(item.status)) throw new Error(`Invalid sources[${index}].status`);
    const health = item.health ?? "unchecked";
    if (!SIGNAL_HEALTH_STATES.includes(health)) throw new Error(`Invalid sources[${index}].health`);
    if (item.access_type && !ACCESS_TYPES.includes(item.access_type)) throw new Error(`Invalid sources[${index}].access_type`);
    const priority = Number(item.priority);
    if (![1, 2, 3, 4, 5].includes(priority)) throw new Error(`sources[${index}].priority must be 1-5`);
    return {
      id,
      type: item.type,
      url: assertUrl(item.url, `sources[${index}].url`),
      ...purposeFields,
      priority: priority as ProductSource["priority"],
      scan_frequency: item.scan_frequency,
      status: item.status,
      collector: String(item.collector ?? collectorForType(item.type)),
      last_checked_at: String(item.last_checked_at ?? ""),
      last_update_at: String(item.last_update_at ?? ""),
      screenshot_count: Math.max(0, Number(item.screenshot_count ?? 0)),
      gif_count: Math.max(0, Number(item.gif_count ?? 0)),
      video_count: Math.max(0, Number(item.video_count ?? 0)),
      health,
      parent_source_id: String(item.parent_source_id ?? ""),
      relation_type: item.relation_type && SOURCE_RELATION_TYPES.includes(item.relation_type) ? item.relation_type : "",
      ...(item.access_type ? { access_type: item.access_type } : {}),
      notes: String(item.notes ?? ""),
    };
  });
}

function validateSuggestedSources(input: unknown): SuggestedSource[] {
  if (!Array.isArray(input)) throw new Error("suggested_sources must be an array");
  const ids = new Set<string>();
  return input.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`suggested_sources[${index}] must be an object`);
    const item = value as Partial<SuggestedSource>;
    const id = String(item.id ?? "").trim();
    if (!id || ids.has(id)) throw new Error(`Invalid or duplicate suggested source id: ${id}`);
    ids.add(id);
    if (!item.type || !PRODUCT_SOURCE_TYPES.includes(item.type)) throw new Error(`Invalid suggested_sources[${index}].type`);
    if (item.purpose && !SOURCE_PURPOSES.includes(item.purpose)) throw new Error(`Invalid suggested_sources[${index}].purpose`);
    if (item.primary_purpose && !SOURCE_PURPOSES.includes(item.primary_purpose)) throw new Error(`Invalid suggested_sources[${index}].primary_purpose`);
    if (item.purposes && (!Array.isArray(item.purposes) || item.purposes.some((purpose) => !SOURCE_PURPOSES.includes(purpose)))) throw new Error(`Invalid suggested_sources[${index}].purposes`);
    const purposeFields = normalizePurposeFields(item);
    const status = item.status ?? "suggested";
    if (!SUGGESTED_SOURCE_STATUSES.includes(status)) throw new Error(`Invalid suggested_sources[${index}].status`);
    if (item.access_type && !ACCESS_TYPES.includes(item.access_type)) throw new Error(`Invalid suggested_sources[${index}].access_type`);
    const confidence = Number(item.confidence ?? 0.5);
    if (confidence < 0 || confidence > 1) throw new Error(`suggested_sources[${index}].confidence must be 0-1`);
    return {
      id,
      type: item.type,
      ...purposeFields,
      url: assertUrl(item.url, `suggested_sources[${index}].url`),
      reason: String(item.reason ?? ""),
      confidence,
      status,
      parent_source_id: String(item.parent_source_id ?? ""),
      relation_type: item.relation_type && SOURCE_RELATION_TYPES.includes(item.relation_type) ? item.relation_type : "",
      ...(item.access_type ? { access_type: item.access_type } : {}),
    };
  });
}

export function validateSourceInput(
  input: Partial<Source>,
  existing?: Source,
): Source {
  const now = new Date().toISOString();
  const productName = String(input.product_name ?? existing?.product_name ?? "").trim();
  if (!productName) throw new Error("product_name is required");

  const category = input.category ?? existing?.category ?? "Other";
  const scanFrequency = input.scan_frequency ?? existing?.scan_frequency ?? "weekly";
  const status = input.status ?? existing?.status ?? "active";
  const sourcePriority = Number(input.source_priority ?? existing?.source_priority ?? 3);
  const mediaLikelihood = Number(input.media_likelihood ?? existing?.media_likelihood ?? 3);
  const mediaScore = Number(input.media_score ?? existing?.media_score ?? mediaLikelihood);
  const signalScore = Number(input.signal_score ?? existing?.signal_score ?? sourcePriority);
  const githubType = input.github_type ?? existing?.github_type ?? "none";
  const reviewStatus = input.review_status ?? existing?.review_status ?? "pending";
  const sourceTypes = input.source_types ?? existing?.source_types ?? [];

  if (!CATEGORIES.includes(category)) throw new Error("Invalid category");
  if (!SCAN_FREQUENCIES.includes(scanFrequency)) throw new Error("Invalid scan_frequency");
  if (!SOURCE_STATUSES.includes(status)) throw new Error("Invalid status");
  if (!GITHUB_TYPES.includes(githubType)) throw new Error("Invalid github_type");
  if (!REVIEW_STATUSES.includes(reviewStatus)) throw new Error("Invalid review_status");
  if (!Array.isArray(sourceTypes) || sourceTypes.some((type) => !REGISTRY_SOURCE_TYPES.includes(type))) {
    throw new Error("Invalid source_types");
  }
  if (![1, 2, 3, 4, 5].includes(sourcePriority)) throw new Error("source_priority must be 1-5");
  if (![1, 2, 3, 4, 5].includes(mediaLikelihood)) throw new Error("media_likelihood must be 1-5");
  if (![1, 2, 3, 4, 5].includes(mediaScore)) throw new Error("media_score must be 1-5");
  if (![1, 2, 3, 4, 5].includes(signalScore)) throw new Error("signal_score must be 1-5");

  const source = {
    id: existing?.id ?? input.id ?? `src_${crypto.randomUUID()}`,
    product_name: productName,
    slug: slugify(input.slug ?? existing?.slug ?? productName),
    category,
    design_pattern: String(input.design_pattern ?? existing?.design_pattern ?? ""),
    sources: [] as ProductSource[],
    suggested_sources: [] as SuggestedSource[],
    source_types: [...new Set(sourceTypes)],
    github_type: githubType,
    review_status: reviewStatus,
    media_score: mediaScore as Source["media_score"],
    signal_score: signalScore as Source["signal_score"],
    homepage_url: "",
    github_url: "",
    github_releases_url: "",
    changelog_url: "",
    docs_url: "",
    product_hunt_url: "",
    x_url: "",
    rss_url: "",
    news_url: "",
    videos_url: "",
    blog_url: "",
    release_notes_url: "",
    anthropic_news_url: "",
    claude_code_github_url: "",
    claude_code_releases_url: "",
    claude_code_rss_url: "",
    source_priority: sourcePriority as Source["source_priority"],
    media_likelihood: mediaLikelihood as Source["media_likelihood"],
    scan_frequency: scanFrequency,
    status,
    notes: String(input.notes ?? existing?.notes ?? ""),
    created_at: existing?.created_at ?? input.created_at ?? now,
    updated_at: now,
  } satisfies Source;

  for (const field of URL_FIELDS) {
    source[field] = assertUrl(input[field] ?? existing?.[field] ?? "", field);
  }
  source.sources = input.sources !== undefined
    ? validateProductSources(input.sources)
    : existing?.sources?.length
      ? validateProductSources(existing.sources)
      : legacySourcesFor(source);
  source.suggested_sources = input.suggested_sources !== undefined
    ? validateSuggestedSources(input.suggested_sources)
    : validateSuggestedSources(existing?.suggested_sources ?? []);
  return source;
}

export function validateImportedSources(input: unknown): Source[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === "object" && input && "sources" in input && Array.isArray(input.sources)
      ? input.sources
      : null;
  if (!list) throw new Error("Import must be a JSON array or an object with a sources array");

  const sources = list.map((item) => validateSourceInput(item as Partial<Source>));
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.id)) throw new Error(`Duplicate id: ${source.id}`);
    if (slugs.has(source.slug)) throw new Error(`Duplicate slug: ${source.slug}`);
    ids.add(source.id);
    slugs.add(source.slug);
  }
  return sources;
}
