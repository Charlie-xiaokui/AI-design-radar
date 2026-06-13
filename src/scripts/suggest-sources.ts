import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { recommendedSourcesFor } from "../services/source-recommendations.ts";
import type { SuggestedSource } from "../types/source.ts";
import { candidateReason, evaluateCandidateSource } from "../services/source-candidate-policy.ts";

const repository = new JsonSourceRepository();
const products = await repository.list();
let added = 0;
for (const product of products) {
  const existing = new Set(product.suggested_sources.map((item) => `${item.type}:${item.url}`));
  const candidates: SuggestedSource[] = recommendedSourcesFor(product).flatMap((item) => {
    const key = `${item.source.type}:${item.source.url}`;
    if (existing.has(key)) return [];
    const policy = evaluateCandidateSource(product, item.source, { linkedFromOfficial: true });
    if (!policy.accepted || !policy.tier) return [];
    existing.add(key);
    return [{
      id: `suggested-${product.slug}-${item.source.id.replace(/^recommended-/, "")}`,
      type: item.source.type,
      purpose: item.source.purpose,
      url: item.source.url,
      reason: candidateReason(policy.tier, `${policy.reason}; ${item.reason}`),
      confidence: policy.confidence ?? 0.9,
      status: "suggested",
      parent_source_id: "",
      relation_type: "official_related",
    }];
  });
  if (!candidates.length) continue;
  await repository.update(product.id, { suggested_sources: [...product.suggested_sources, ...candidates] });
  added += candidates.length;
}
console.log(`Added ${added} suggested sources for manual review.`);
