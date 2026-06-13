import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { collectSignalSummary } from "../services/signal-collector.ts";

const sources = await new JsonSourceRepository().list();
const summary = await collectSignalSummary(sources);

console.log("Signal Collector MVP Phase 5");
console.log(`Sources scanned: ${summary.sources_scanned}`);
console.log(`Total sources: ${summary.total_sources}`);
console.log(`Eligible public sources: ${summary.eligible_public_sources}`);
console.log(`Skipped sources: ${summary.skipped_sources}`);
console.log(`Signals discovered: ${summary.signals_discovered}`);
console.log(`Duplicates skipped: ${summary.duplicates_skipped}`);
console.log(`Signals with media: ${summary.signals_with_media}`);
console.log(`Signals with screenshots: ${summary.signals_with_screenshots}`);
console.log(`Signals with video: ${summary.signals_with_video}`);
console.log(`Signals with GIF: ${summary.signals_with_gif}`);
console.log(`Homepage-qualified visual signals: ${summary.homepage_qualified_visual_signals}`);
console.log(`Errors: ${summary.errors.length}`);
for (const error of summary.errors.slice(0, 20)) {
  console.log(`- ${error}`);
}
