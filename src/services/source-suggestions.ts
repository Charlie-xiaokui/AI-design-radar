import type { ProductSource, Source, SuggestedSource } from "../types/source.ts";
import { runtimeDefaults } from "./source-signals.ts";
import type { SourceRepository } from "../repositories/source-repository.ts";
import { candidateTierFromReason } from "./source-candidate-policy.ts";
import { normalizePurposeFields } from "./source-purpose.ts";
import { normalizeAccessType } from "./source-access.ts";

type SuggestedSourceFinalData = Pick<SuggestedSource, "url" | "type" | "purpose" | "primary_purpose" | "purposes" | "access_type">;

export function normalizeSourceUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/+$/, "").toLowerCase();
  }
}

function sameSuggestedSource(item: SuggestedSource, finalData: SuggestedSourceFinalData): boolean {
  return normalizeSourceUrl(item.url) === normalizeSourceUrl(finalData.url)
    && item.type === finalData.type
    && item.purpose === finalData.purpose;
}

export async function updateSuggestedSource(
  repository: SourceRepository,
  productId: string,
  suggestionId: string,
  patch: Partial<Pick<SuggestedSource, "url" | "type" | "purpose" | "primary_purpose" | "purposes" | "access_type" | "status">>,
): Promise<Source> {
  const product = (await repository.list()).find((item) => item.id === productId);
  if (!product) throw new Error("Product not found");
  const suggestedSources = Array.isArray(product.suggested_sources) ? product.suggested_sources : [];
  const index = suggestedSources.findIndex((item) => item.id === suggestionId);
  if (index < 0) throw new Error("Suggested source not found");
  suggestedSources[index] = { ...suggestedSources[index]!, ...patch, ...normalizePurposeFields({ ...suggestedSources[index]!, ...patch }) };
  return repository.update(product.id, { suggested_sources: suggestedSources });
}

export async function acceptSuggestedSource(
  repository: SourceRepository,
  productId: string,
  suggestionId: string,
  finalData?: SuggestedSourceFinalData,
): Promise<Source> {
  const product = (await repository.list()).find((item) => item.id === productId);
  if (!product) throw new Error("Product not found");
  const suggestedSources = Array.isArray(product.suggested_sources) ? product.suggested_sources : [];
  const formalSources = Array.isArray(product.sources) ? product.sources : [];
  const suggestionIndexById = suggestedSources.findIndex((item) => item.id === suggestionId);
  const suggestionIndex = suggestionIndexById >= 0
    ? suggestionIndexById
    : finalData
      ? suggestedSources.findIndex((item) => sameSuggestedSource(item, finalData))
      : -1;
  const suggestion = suggestedSources[suggestionIndex];
  if (!suggestion) throw new Error("Suggested source not found");
  const source = finalData ? { ...suggestion, ...finalData } : suggestion;
  const purposeFields = normalizePurposeFields(source);
  const action = "accept";
  const beforeStatus = source.status;
  const afterStatus = "verified" as const;
  const normalizedUrl = normalizeSourceUrl(source.url);
  const exactDuplicate = formalSources.some((item) => normalizeSourceUrl(item.url) === normalizedUrl && item.type === source.type && item.purpose === source.purpose);
  const urlDuplicate = formalSources.some((item) => normalizeSourceUrl(item.url) === normalizedUrl);
  const duplicate = exactDuplicate || urlDuplicate;
  const candidateTier = candidateTierFromReason(source.reason);
  const acceptedPriority = candidateTier === "P1" ? 5 : candidateTier === "P2" ? 3 : candidateTier === "P3" ? 2 : Math.max(1, Math.min(5, Math.round(source.confidence * 5)));
  const nextSources = duplicate ? formalSources : [...formalSources, {
    id: source.id.replace(/^suggested-/, "source-"),
    type: source.type,
    ...purposeFields,
    access_type: normalizeAccessType(source),
    url: source.url,
    priority: acceptedPriority as ProductSource["priority"],
    status: "active",
    scan_frequency: source.type === "x" || source.type === "youtube" ? "manual" : "weekly",
    notes: source.reason,
    ...runtimeDefaults(source.type),
    parent_source_id: source.parent_source_id,
    relation_type: source.relation_type,
  } satisfies ProductSource];
  const suggested = suggestedSources.map((item, index) => index === suggestionIndex ? { ...source, status: afterStatus } : item);
  const updated = await repository.update(product.id, { sources: nextSources, suggested_sources: suggested });
  console.log(source.id, action, beforeStatus, afterStatus);
  return updated;
}
