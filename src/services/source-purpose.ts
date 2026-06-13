import { SOURCE_PURPOSES, type SourcePurpose } from "../types/source.ts";

export interface PurposeFields {
  purpose?: SourcePurpose;
  primary_purpose?: SourcePurpose;
  purposes?: readonly SourcePurpose[];
}

export interface NormalizedPurposeFields {
  purpose: SourcePurpose;
  primary_purpose: SourcePurpose;
  purposes: SourcePurpose[];
}

export function normalizePurposeFields(input: PurposeFields, fallback: SourcePurpose = "identity"): NormalizedPurposeFields {
  const selected = Array.isArray(input.purposes)
    ? input.purposes.filter((purpose): purpose is SourcePurpose => SOURCE_PURPOSES.includes(purpose))
    : [];
  const requestedPrimary = input.primary_purpose && SOURCE_PURPOSES.includes(input.primary_purpose)
    ? input.primary_purpose
    : input.purpose && SOURCE_PURPOSES.includes(input.purpose)
      ? input.purpose
      : selected[0] ?? fallback;
  const purposes = [...new Set(selected.length ? selected : [requestedPrimary])];
  if (!purposes.includes(requestedPrimary)) purposes.unshift(requestedPrimary);
  return {
    purpose: requestedPrimary,
    primary_purpose: requestedPrimary,
    purposes,
  };
}

export function primaryPurposeOf(input: PurposeFields): SourcePurpose {
  return normalizePurposeFields(input).primary_purpose;
}

export function purposesOf(input: PurposeFields): SourcePurpose[] {
  return normalizePurposeFields(input).purposes;
}

export function sourceHasPurpose(input: PurposeFields, purpose: SourcePurpose): boolean {
  return purposesOf(input).includes(purpose);
}
