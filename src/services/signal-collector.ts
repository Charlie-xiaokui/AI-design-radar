import { config } from "../config.ts";
import type { Source } from "../types/source.ts";
import { readRawSignals } from "../repositories/raw-signal-repository.ts";
import { summarizeSignalSourceEligibility } from "./signal-source-filter.ts";

export interface SignalCollectorSummary {
  total_sources: number;
  eligible_public_sources: number;
  skipped_sources: number;
  signals_discovered: number;
  duplicates_skipped: number;
  signals_with_media: number;
  errors: string[];
}

export async function collectSignalSummary(products: Source[], rawSignalsFile = config.rawSignalsFile): Promise<SignalCollectorSummary> {
  await readRawSignals(rawSignalsFile);
  const eligibility = summarizeSignalSourceEligibility(products);
  return {
    ...eligibility,
    signals_discovered: 0,
    duplicates_skipped: 0,
    signals_with_media: 0,
    errors: [],
  };
}
