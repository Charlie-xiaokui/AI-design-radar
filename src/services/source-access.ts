import type { ProductSource, ProductSourceType, SourceType } from "../types/source.ts";

export const ACCESS_TYPES = ["public", "login_required", "manual", "unknown"] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

type AccessSource = Pick<ProductSource, "type"> & { access_type?: AccessType | string };

const PUBLIC_TYPES = new Set<string>([
  "homepage",
  "docs",
  "blog",
  "news",
  "release_notes",
  "github",
  "github_repo",
  "github_releases",
  "github_releases_rss",
  "rss",
  "youtube",
  "product_hunt",
  "changelog",
]);

const LOGIN_REQUIRED_TYPES = new Set<string>(["x", "discord", "slack"]);

export function isAccessType(value: unknown): value is AccessType {
  return typeof value === "string" && ACCESS_TYPES.includes(value as AccessType);
}

export function defaultAccessType(type: ProductSourceType | SourceType | string): AccessType {
  if (PUBLIC_TYPES.has(type)) return "public";
  if (LOGIN_REQUIRED_TYPES.has(type)) return "login_required";
  return "unknown";
}

export function normalizeAccessType(source: AccessSource): AccessType {
  return isAccessType(source.access_type) ? source.access_type : defaultAccessType(source.type);
}

export function isPublicAccess(source: AccessSource): boolean {
  return normalizeAccessType(source) === "public";
}
