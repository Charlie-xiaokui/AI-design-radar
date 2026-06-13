import type { SourceCandidate, ProductSource, Source } from "../types/source.ts";
import type { SourceRepository } from "../repositories/source-repository.ts";
import { JsonSourceCandidateRepository } from "../repositories/source-candidate-repository.ts";
import { normalizeSourceUrl } from "./source-suggestions.ts";
import { runtimeDefaults } from "./source-signals.ts";
import { normalizePurposeFields } from "./source-purpose.ts";
import { normalizeAccessType } from "./source-access.ts";

const priorityValue = { P1: 5, P2: 3, P3: 2 } as const;

export async function acceptSourceCandidate(
  sources: SourceRepository,
  candidates: JsonSourceCandidateRepository,
  productId: string,
  candidate: SourceCandidate,
): Promise<Source> {
  const product = (await sources.list()).find((item) => item.id === productId);
  if (!product || product.product_name !== candidate.product) throw new Error("Candidate product not found");
  const productSources = Array.isArray(product.sources) ? product.sources : [];
  const normalized = normalizeSourceUrl(candidate.url);
  const purposeFields = normalizePurposeFields(candidate);
  const duplicate = productSources.some((item) => normalizeSourceUrl(item.url) === normalized);
  const nextSources = duplicate ? productSources : [...productSources, {
    id: `source-candidate-${product.slug}-${candidate.type}-${Date.now()}`,
    type: candidate.type,
    ...purposeFields,
    access_type: normalizeAccessType(candidate),
    url: candidate.url,
    priority: priorityValue[candidate.priority],
    status: "active",
    scan_frequency: ["x", "youtube", "discord", "reddit", "slack"].includes(candidate.type) ? "manual" : "weekly",
    notes: `Accepted from ${candidate.source}`,
    ...runtimeDefaults(candidate.type),
  } satisfies ProductSource];
  const updated = await sources.update(product.id, { sources: nextSources });
  await candidates.remove(candidate);
  return updated;
}

export async function rejectSourceCandidate(candidates: JsonSourceCandidateRepository, candidate: SourceCandidate): Promise<SourceCandidate> {
  return candidates.update(candidate, { status: "rejected" });
}
