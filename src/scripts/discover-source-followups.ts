import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { discoverFollowupSources } from "../services/source-followup.ts";

const repository = new JsonSourceRepository();
const products = await repository.list();
let added = 0;
for (const product of products.filter((item) => item.status === "active")) {
  const suggestions = await discoverFollowupSources(product);
  if (!suggestions.length) continue;
  await repository.update(product.id, { suggested_sources: [...product.suggested_sources, ...suggestions] });
  added += suggestions.length;
}
console.log(`Generated ${added} follow-up suggestions for manual review.`);
