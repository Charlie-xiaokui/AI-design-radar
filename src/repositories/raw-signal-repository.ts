import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.ts";
import { RAW_SIGNAL_STATUSES, type RawSignal, type RawSignalStatus } from "../types/source.ts";
import { writeJsonFile } from "./json-file.ts";

export interface RawSignalUpsertResult {
  signals: RawSignal[];
  inserted: number;
  merged: number;
  duplicates_skipped: number;
}

const LOCKED_STATUSES = new Set<RawSignalStatus>(["approved", "rejected"]);

async function ensureRawSignalFile(filePath: string): Promise<void> {
  try {
    await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "[]\n", "utf8");
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function duplicateKeyByTitle(signal: Pick<RawSignal, "product" | "title">): string {
  return `${normalizeText(signal.product)}::${normalizeText(signal.title)}`;
}

function duplicateKeyBySourceDateTitle(signal: Pick<RawSignal, "source_id" | "published_at" | "title">): string {
  return `${signal.source_id}::${signal.published_at}::${normalizeText(signal.title)}`;
}

export async function readRawSignals(filePath = config.rawSignalsFile): Promise<RawSignal[]> {
  await ensureRawSignalFile(filePath);
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  return Array.isArray(parsed) ? parsed as RawSignal[] : [];
}

export async function writeRawSignals(signals: RawSignal[], filePath = config.rawSignalsFile): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeJsonFile(filePath, signals);
}

export function findDuplicateRawSignal(signal: RawSignal, existing: RawSignal[]): RawSignal | undefined {
  const signalUrl = signal.signal_url.trim();
  const titleKey = duplicateKeyByTitle(signal);
  const sourceDateTitleKey = duplicateKeyBySourceDateTitle(signal);
  return existing.find((item) =>
    (signalUrl && item.signal_url.trim() === signalUrl)
    || duplicateKeyByTitle(item) === titleKey
    || duplicateKeyBySourceDateTitle(item) === sourceDateTitleKey);
}

function mergeRawSignal(existing: RawSignal, incoming: RawSignal): RawSignal {
  if (LOCKED_STATUSES.has(existing.status)) return existing;
  const description = existing.description || incoming.description;
  const rawText = existing.raw_text || incoming.raw_text;
  const mediaUrls = [...new Set([...existing.media_urls, ...incoming.media_urls])];
  const mediaTypes = [...new Set([...existing.media_types, ...incoming.media_types])];
  if (
    description === existing.description
    && rawText === existing.raw_text
    && mediaUrls.length === existing.media_urls.length
    && mediaTypes.length === existing.media_types.length
  ) {
    return existing;
  }
  return {
    ...existing,
    description,
    raw_text: rawText,
    media_urls: mediaUrls,
    media_types: mediaTypes,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertRawSignals(incoming: RawSignal[], filePath = config.rawSignalsFile): Promise<RawSignalUpsertResult> {
  const signals = await readRawSignals(filePath);
  let inserted = 0;
  let merged = 0;
  let duplicatesSkipped = 0;
  for (const signal of incoming) {
    const duplicate = findDuplicateRawSignal(signal, signals);
    if (!duplicate) {
      signals.push(signal);
      inserted += 1;
      continue;
    }
    const index = signals.findIndex((item) => item.id === duplicate.id);
    if (index < 0 || LOCKED_STATUSES.has(duplicate.status)) {
      duplicatesSkipped += 1;
      continue;
    }
    const mergedSignal = mergeRawSignal(duplicate, signal);
    if (JSON.stringify(mergedSignal) === JSON.stringify(duplicate)) duplicatesSkipped += 1;
    else {
      signals[index] = mergedSignal;
      merged += 1;
    }
  }
  await writeRawSignals(signals, filePath);
  return { signals, inserted, merged, duplicates_skipped: duplicatesSkipped };
}

export async function updateRawSignalStatus(id: string, status: RawSignalStatus, filePath = config.rawSignalsFile): Promise<RawSignal> {
  if (!RAW_SIGNAL_STATUSES.includes(status)) throw new Error(`Invalid raw signal status: ${status}`);
  const signals = await readRawSignals(filePath);
  const index = signals.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Raw signal not found");
  const existing = signals[index]!;
  const updated = { ...existing, status, updated_at: new Date().toISOString() };
  signals[index] = updated;
  await writeRawSignals(signals, filePath);
  return updated;
}
