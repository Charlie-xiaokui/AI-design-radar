import { randomUUID } from "node:crypto";
import type { ProductSource, Source } from "../types/source.ts";
import type { SourceRepository } from "../repositories/source-repository.ts";
import { runtimeDefaults } from "./source-signals.ts";
import { normalizeSourceUrl } from "./source-suggestions.ts";
import { normalizePurposeFields, primaryPurposeOf } from "./source-purpose.ts";
import { normalizeAccessType } from "./source-access.ts";

export type ProductSourceInput = Pick<ProductSource, "url" | "type" | "purpose" | "primary_purpose" | "purposes" | "priority" | "status" | "access_type">;
export type ProductSourceLocator = Partial<Pick<ProductSource, "id" | "url" | "type" | "purpose">>;

function sourceId(product: Source, type: ProductSource["type"]): string {
  return `source-${product.slug}-${type}-${randomUUID().slice(0, 8)}`;
}

function assertNoDuplicate(product: Source, input: ProductSourceInput, ignoredId = ""): void {
  const normalizedUrl = normalizeSourceUrl(input.url);
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  if (productSources.some((item) => item.id !== ignoredId && normalizeSourceUrl(item.url) === normalizedUrl)) {
    throw new Error("A formal source with this URL already exists");
  }
}

export async function addProductSource(repository: SourceRepository, productId: string, input: ProductSourceInput): Promise<Source> {
  const product = (await repository.list()).find((item) => item.id === productId);
  if (!product) throw new Error("Product not found");
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  assertNoDuplicate(product, input);
  const source: ProductSource = {
    id: sourceId(product, input.type),
    ...input,
    ...normalizePurposeFields(input),
    ...(input.access_type ? { access_type: normalizeAccessType(input) } : {}),
    scan_frequency: input.type === "x" || input.type === "youtube" ? "manual" : "weekly",
    notes: "Added manually in Source Inspector.",
    ...runtimeDefaults(input.type),
  };
  const purposeOrder: Record<ProductSource["purpose"], number> = { identity: 0, updates: 1, media: 2, discovery: 3, community: 4 };
  const nextSources = [...productSources, source].sort((a, b) => purposeOrder[primaryPurposeOf(a)] - purposeOrder[primaryPurposeOf(b)]);
  return repository.update(product.id, { sources: nextSources });
}

export async function updateProductSource(repository: SourceRepository, productId: string, sourceIdValue: string, input: ProductSourceInput): Promise<Source> {
  const product = (await repository.list()).find((item) => item.id === productId);
  if (!product) throw new Error("Product not found");
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  const index = productSources.findIndex((item) => item.id === sourceIdValue);
  if (index < 0) throw new Error("Formal source not found");
  assertNoDuplicate(product, input, sourceIdValue);
  const existing = productSources[index]!;
  const updated: ProductSource = {
    ...existing,
    ...input,
    ...normalizePurposeFields(input),
    ...(input.access_type ? { access_type: normalizeAccessType(input) } : {}),
    collector: input.type === existing.type ? existing.collector : runtimeDefaults(input.type).collector,
    scan_frequency: input.type === "x" || input.type === "youtube" ? "manual" : existing.scan_frequency,
  };
  const nextSources = [...productSources];
  if (primaryPurposeOf(existing) === primaryPurposeOf(updated)) {
    nextSources[index] = updated;
  } else {
    nextSources.splice(index, 1);
    const lastMatchingIndex = nextSources.reduce((last, item, itemIndex) => primaryPurposeOf(item) === primaryPurposeOf(updated) ? itemIndex : last, -1);
    if (lastMatchingIndex >= 0) {
      nextSources.splice(lastMatchingIndex + 1, 0, updated);
    } else {
      const purposeOrder: Record<ProductSource["purpose"], number> = { identity: 0, updates: 1, media: 2, discovery: 3, community: 4 };
      const nextPurposeIndex = nextSources.findIndex((item) => purposeOrder[primaryPurposeOf(item)] > purposeOrder[primaryPurposeOf(updated)]);
      nextSources.splice(nextPurposeIndex < 0 ? nextSources.length : nextPurposeIndex, 0, updated);
    }
  }
  return repository.update(product.id, { sources: nextSources });
}

export async function deleteProductSource(repository: SourceRepository, productId: string, locator: ProductSourceLocator): Promise<Source> {
  const product = (await repository.list()).find((item) => item.id === productId);
  if (!product) throw new Error("Product not found");
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  const indexById = locator.id ? productSources.findIndex((item) => item.id === locator.id) : -1;
  const normalizedUrl = locator.url ? normalizeSourceUrl(locator.url) : "";
  const index = indexById >= 0 ? indexById : productSources.findIndex((item) =>
    Boolean(normalizedUrl)
    && normalizeSourceUrl(item.url) === normalizedUrl
    && item.type === locator.type
    && item.purpose === locator.purpose);
  if (index < 0) throw new Error("Formal source not found");
  const nextSources = [...productSources];
  nextSources.splice(index, 1);
  return repository.update(product.id, { sources: nextSources });
}

export async function reorderProductSources(repository: SourceRepository, productId: string, sourceIds: string[]): Promise<Source> {
  const product = (await repository.list()).find((item) => item.id === productId);
  if (!product) throw new Error("Product not found");
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  if (sourceIds.length !== productSources.length || new Set(sourceIds).size !== sourceIds.length) throw new Error("Invalid source order");
  const byId = new Map(productSources.map((item) => [item.id, item]));
  const ordered = sourceIds.map((id) => byId.get(id));
  if (ordered.some((item) => !item)) throw new Error("Invalid source order");
  return repository.update(product.id, { sources: ordered as ProductSource[] });
}
