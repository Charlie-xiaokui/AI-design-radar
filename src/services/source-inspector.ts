export interface InspectorSourceIdentity {
  id: string;
  slug: string;
  product_name: string;
}

function normalizeProductKey(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveInspectorSource<T extends InspectorSourceIdentity>(sources: T[], productKey: string): T | undefined {
  const normalized = normalizeProductKey(productKey);
  if (!normalized) return undefined;
  return sources.find((source) => [source.id, source.slug, source.product_name].some((value) => normalizeProductKey(value) === normalized));
}
