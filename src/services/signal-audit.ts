import { config } from "../config.ts";
import type { RawSignal } from "../types/source.ts";
import { readRawSignals } from "../repositories/raw-signal-repository.ts";
import { writeJsonFile } from "../repositories/json-file.ts";
import { calculateSignalQualityScore } from "./signal-quality.ts";

export interface SignalAuditItem {
  id: string;
  product: string;
  source_id: string;
  source_type: string;
  title: string;
  signal_url: string;
  raw_text_length: number;
  quality_score: number;
}

export interface SignalAuditReport {
  total_signals: number;
  average_raw_text_length: number;
  top_20_longest_signals: SignalAuditItem[];
  top_20_shortest_signals: SignalAuditItem[];
  signals_with_media: number;
  signals_without_media: number;
  signals_missing_published_at: number;
}

function auditItem(signal: RawSignal): SignalAuditItem {
  return {
    id: signal.id,
    product: signal.product,
    source_id: signal.source_id,
    source_type: signal.source_type,
    title: signal.title,
    signal_url: signal.signal_url,
    raw_text_length: signal.raw_text.length,
    quality_score: typeof signal.quality_score === "number" ? signal.quality_score : calculateSignalQualityScore(signal),
  };
}

export async function auditRawSignals(
  rawSignalsFile = config.rawSignalsFile,
  reportFile = config.signalAuditReportFile,
): Promise<SignalAuditReport> {
  const signals = await readRawSignals(rawSignalsFile);
  const items = signals.map(auditItem);
  const totalLength = items.reduce((sum, item) => sum + item.raw_text_length, 0);
  const report: SignalAuditReport = {
    total_signals: signals.length,
    average_raw_text_length: signals.length ? Math.round(totalLength / signals.length) : 0,
    top_20_longest_signals: [...items].sort((a, b) => b.raw_text_length - a.raw_text_length).slice(0, 20),
    top_20_shortest_signals: [...items].sort((a, b) => a.raw_text_length - b.raw_text_length).slice(0, 20),
    signals_with_media: signals.filter((signal) => signal.media_urls.length > 0).length,
    signals_without_media: signals.filter((signal) => signal.media_urls.length === 0).length,
    signals_missing_published_at: signals.filter((signal) => !signal.published_at).length,
  };
  await writeJsonFile(reportFile, report);
  return report;
}
