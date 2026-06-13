type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export interface NormalizedRegistrySnapshot extends UnknownRecord {
  sources: UnknownRecord[];
  health: unknown[];
  reviews: unknown[];
  audit: unknown[];
  candidates: unknown[];
  recommendations: UnknownRecord;
  coverage: unknown[];
}

export function normalizeRegistrySnapshot(value: unknown): NormalizedRegistrySnapshot {
  const input = record(value);
  return {
    ...input,
    sources: array(input.sources).map((item) => {
      const source = record(item);
      return {
        ...source,
        sources: array(source.sources),
        suggested_sources: array(source.suggested_sources),
        source_types: array(source.source_types),
      };
    }),
    health: array(input.health),
    reviews: array(input.reviews),
    audit: array(input.audit),
    candidates: array(input.candidates),
    recommendations: record(input.recommendations),
    coverage: array(input.coverage),
  };
}
