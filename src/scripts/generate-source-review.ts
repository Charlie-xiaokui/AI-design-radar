import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { writeSourceReview } from "../services/source-review.ts";

const sources = await new JsonSourceRepository().list();
await writeSourceReview(sources);
console.log(`Generated source_review.md with ${sources.length} products.`);
