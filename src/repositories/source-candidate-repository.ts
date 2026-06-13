import { config } from "../config.ts";
import type { Source, SourceCandidate } from "../types/source.ts";
import { normalizeSourceUrl } from "../services/source-suggestions.ts";
import { candidateMatchesProductKey, candidateProductKey, isPendingCandidateStatus } from "../services/source-candidate-match.ts";
import { readJsonFile, writeJsonFile } from "./json-file.ts";
import { normalizePurposeFields } from "../services/source-purpose.ts";
import { normalizeAccessType } from "../services/source-access.ts";

export function sourceCandidateKey(candidate: Pick<SourceCandidate, "product" | "product_id" | "product_slug" | "product_name" | "source_id" | "url" | "type" | "purpose">): string {
  return [candidateProductKey(candidate), normalizeSourceUrl(candidate.url), candidate.type, normalizePurposeFields(candidate).primary_purpose].join("|");
}

export class JsonSourceCandidateRepository {
  private readonly candidatesFile: string;

  constructor(candidatesFile = config.candidatesFile) {
    this.candidatesFile = candidatesFile;
  }

  async list(): Promise<SourceCandidate[]> {
    const candidates = await readJsonFile<SourceCandidate[]>(this.candidatesFile).catch(() => []);
    return candidates.map((candidate) => ({ ...candidate, ...normalizePurposeFields(candidate), access_type: normalizeAccessType(candidate) }));
  }

  async listPendingFor(product: string): Promise<SourceCandidate[]> {
    return (await this.list()).filter((item) => candidateMatchesProductKey(item, product) && isPendingCandidateStatus(item.status));
  }

  async findByKeyOrData(
    product: string,
    key: string,
    finalData?: Pick<SourceCandidate, "url" | "type" | "purpose" | "primary_purpose" | "purposes" | "access_type">,
  ): Promise<SourceCandidate | undefined> {
    const candidates = (await this.list()).filter((item) => candidateMatchesProductKey(item, product));
    return candidates.find((item) => sourceCandidateKey(item) === key)
      ?? (finalData
        ? candidates.find((item) => sourceCandidateKey(item) === sourceCandidateKey({ product, ...finalData }))
        : undefined);
  }

  async upsert(incoming: SourceCandidate[], products: Source[]): Promise<SourceCandidate[]> {
    const candidates = await this.list();
    const candidateKeys = new Set(candidates.map(sourceCandidateKey));
    const formalKeys = new Set(products.flatMap((product) => (Array.isArray(product.sources) ? product.sources : []).map((source) => sourceCandidateKey({ product: product.product_name, ...source }))));
    for (const candidate of incoming) {
      const key = sourceCandidateKey(candidate);
      if (candidateKeys.has(key) || formalKeys.has(key)) continue;
      candidates.push(candidate);
      candidateKeys.add(key);
    }
    await writeJsonFile(this.candidatesFile, candidates);
    return candidates;
  }

  async update(original: SourceCandidate, patch: Partial<SourceCandidate>): Promise<SourceCandidate> {
    const candidates = await this.list();
    const index = candidates.findIndex((item) => sourceCandidateKey(item) === sourceCandidateKey(original));
    if (index < 0) throw new Error("Source candidate not found");
    const updated = { ...candidates[index]!, ...patch, ...normalizePurposeFields({ ...candidates[index]!, ...patch }), access_type: normalizeAccessType({ ...candidates[index]!, ...patch }) };
    const duplicate = candidates.some((item, itemIndex) => itemIndex !== index && sourceCandidateKey(item) === sourceCandidateKey(updated));
    if (duplicate) throw new Error("Duplicate source candidate");
    candidates[index] = updated;
    await writeJsonFile(this.candidatesFile, candidates);
    return updated;
  }

  async remove(candidate: SourceCandidate): Promise<void> {
    const key = sourceCandidateKey(candidate);
    const candidates = await this.list();
    const next = candidates.filter((item) => sourceCandidateKey(item) !== key);
    if (next.length === candidates.length) throw new Error("Source candidate not found");
    await writeJsonFile(this.candidatesFile, next);
  }
}
