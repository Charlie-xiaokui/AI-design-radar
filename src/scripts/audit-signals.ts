import { auditRawSignals } from "../services/signal-audit.ts";

const report = await auditRawSignals();

console.log("Raw Signal Quality Audit");
console.log(`Total signals: ${report.total_signals}`);
console.log(`Average raw_text length: ${report.average_raw_text_length}`);
console.log(`Signals with media: ${report.signals_with_media}`);
console.log(`Signals without media: ${report.signals_without_media}`);
console.log(`Signals missing published_at: ${report.signals_missing_published_at}`);
console.log("Top longest signals:");
for (const item of report.top_20_longest_signals.slice(0, 20)) {
  console.log(`- ${item.raw_text_length} chars · ${item.product} · ${item.title}`);
}
console.log("Top shortest signals:");
for (const item of report.top_20_shortest_signals.slice(0, 20)) {
  console.log(`- ${item.raw_text_length} chars · ${item.product} · ${item.title}`);
}
