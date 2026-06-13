import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { collectSignalSummary } from "../services/signal-collector.ts";

const sources = await new JsonSourceRepository().list();
const summary = await collectSignalSummary(sources);

console.log("Signal Collector MVP Phase 1");
console.log(`Total sources: ${summary.total_sources}`);
console.log(`Eligible public sources: ${summary.eligible_public_sources}`);
console.log(`Skipped sources: ${summary.skipped_sources}`);
console.log(`Signals discovered: ${summary.signals_discovered}`);
console.log(`Duplicates skipped: ${summary.duplicates_skipped}`);
console.log(`Signals with media: ${summary.signals_with_media}`);
console.log(`Errors: ${summary.errors.length}`);
