import type { Source, SourceCandidate } from "../types/source.ts";

type CandidateIdentity = Partial<Pick<SourceCandidate, "product" | "product_id" | "product_slug" | "product_name" | "source_id">>;
type ProductIdentity = Partial<Pick<Source, "id" | "slug" | "product_name">> & { name?: string };

export function normalizeCandidateProductKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^src_/, "");
}

export function candidateProductKey(candidate: CandidateIdentity): string {
  return normalizeCandidateProductKey(candidate.product || candidate.product_slug || candidate.product_name || candidate.product_id || candidate.source_id);
}

export function productIdentityKeys(product: ProductIdentity): string[] {
  return [...new Set([product.id, product.slug, product.product_name, product.name].map(normalizeCandidateProductKey).filter(Boolean))];
}

export function candidateMatchesSource(candidate: CandidateIdentity, product: ProductIdentity): boolean {
  const candidateKey = candidateProductKey(candidate);
  return Boolean(candidateKey) && productIdentityKeys(product).includes(candidateKey);
}

export function candidateMatchesProductKey(candidate: CandidateIdentity, productKey: string): boolean {
  return candidateProductKey(candidate) === normalizeCandidateProductKey(productKey);
}

export function isPendingCandidateStatus(status: unknown): boolean {
  return status === "pending_review" || status === "pending" || status === "suggested";
}
