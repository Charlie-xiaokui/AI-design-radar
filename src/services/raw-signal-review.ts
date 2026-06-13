import type { RawSignalStatus } from "../types/source.ts";

export const RAW_SIGNAL_STATUS_TRANSITIONS: Record<string, RawSignalStatus[]> = {
  discovered: ["approved", "rejected"],
  approved: ["archived"],
};

export function allowedRawSignalStatuses(status: RawSignalStatus): RawSignalStatus[] {
  return RAW_SIGNAL_STATUS_TRANSITIONS[status] ?? [];
}

export function isAllowedRawSignalTransition(from: RawSignalStatus, to: RawSignalStatus): boolean {
  return allowedRawSignalStatuses(from).includes(to);
}
