export const CATEGORIES = [
  "Chat",
  "IDE",
  "Workflow",
  "Agent",
  "Canvas",
  "Research",
  "Design",
  "Automation",
  "Prompt→App",
  "Other",
] as const;

export const SCAN_FREQUENCIES = ["daily", "weekly", "manual"] as const;
export const SOURCE_STATUSES = ["active", "paused", "deprecated"] as const;
export const REGISTRY_SOURCE_TYPES = [
  "github",
  "github_releases",
  "changelog",
  "release_notes",
  "news",
  "docs",
  "product_hunt",
  "x",
  "rss",
] as const;
export const GITHUB_TYPES = ["repo", "org", "none"] as const;
export const REVIEW_STATUSES = ["pending", "verified", "rejected"] as const;
export const PRODUCT_SOURCE_TYPES = [
  "homepage",
  "changelog",
  "release_notes",
  "github_repo",
  "community",
  "forum",
  "discord",
  "reddit",
  "events",
  "slack",
  "github_releases",
  "github_releases_rss",
  "docs",
  "blog",
  "news",
  "product_hunt",
  "x",
  "youtube",
  "rss",
] as const;
export const COMMUNITY_SOURCE_TYPES = ["github_repo", "community", "forum", "discord", "reddit", "events", "slack"] as const;
export const SOURCE_PURPOSES = ["identity", "updates", "media", "discovery", "community"] as const;
export const SIGNAL_SOURCE_STATUSES = ["active", "disabled", "paused"] as const;
export const SIGNAL_HEALTH_STATES = ["unchecked", "ok", "failed", "redirected", "timeout"] as const;
export const SOURCE_RELATION_TYPES = ["linked_from_update", "media_followup", "official_related", "community_related"] as const;
export const SUGGESTED_SOURCE_STATUSES = ["suggested", "pending_review", "verified", "rejected"] as const;
export const ACCESS_TYPES = ["public", "login_required", "manual", "unknown"] as const;
export const RAW_SIGNAL_STATUSES = ["discovered", "pending_review", "approved", "rejected", "archived"] as const;
export const SOURCE_TYPES = [
  "homepage",
  "github",
  "changelog",
  "product_hunt",
  "x",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type ScanFrequency = (typeof SCAN_FREQUENCIES)[number];
export type SourceStatus = (typeof SOURCE_STATUSES)[number];
export type RegistrySourceType = (typeof REGISTRY_SOURCE_TYPES)[number];
export type GithubType = (typeof GITHUB_TYPES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type ProductSourceType = (typeof PRODUCT_SOURCE_TYPES)[number];
export type SourcePurpose = (typeof SOURCE_PURPOSES)[number];
export type SignalSourceStatus = (typeof SIGNAL_SOURCE_STATUSES)[number];
export type SignalHealth = (typeof SIGNAL_HEALTH_STATES)[number];
export type SourceRelationType = (typeof SOURCE_RELATION_TYPES)[number];
export type SuggestedSourceStatus = (typeof SUGGESTED_SOURCE_STATUSES)[number];
export type AccessType = (typeof ACCESS_TYPES)[number];
export type RawSignalStatus = (typeof RAW_SIGNAL_STATUSES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface ProductSource {
  id: string;
  type: ProductSourceType;
  url: string;
  purpose: SourcePurpose;
  primary_purpose?: SourcePurpose;
  purposes?: SourcePurpose[];
  priority: 1 | 2 | 3 | 4 | 5;
  scan_frequency: ScanFrequency;
  status: SignalSourceStatus;
  collector: string;
  last_checked_at: string;
  last_update_at: string;
  screenshot_count: number;
  gif_count: number;
  video_count: number;
  health: SignalHealth;
  parent_source_id: string;
  relation_type: SourceRelationType | "";
  access_type?: AccessType;
  notes: string;
}

export interface SuggestedSource {
  id: string;
  type: ProductSourceType;
  purpose: SourcePurpose;
  primary_purpose?: SourcePurpose;
  purposes?: SourcePurpose[];
  url: string;
  reason: string;
  confidence: number;
  status: SuggestedSourceStatus;
  parent_source_id: string;
  relation_type: SourceRelationType | "";
  access_type?: AccessType;
}

export interface Source {
  id: string;
  product_name: string;
  slug: string;
  category: Category;
  design_pattern: string;
  sources: ProductSource[];
  suggested_sources: SuggestedSource[];
  source_types: RegistrySourceType[];
  github_type: GithubType;
  review_status: ReviewStatus;
  media_score: 1 | 2 | 3 | 4 | 5;
  signal_score: 1 | 2 | 3 | 4 | 5;
  homepage_url: string;
  github_url: string;
  github_releases_url: string;
  changelog_url: string;
  docs_url: string;
  product_hunt_url: string;
  x_url: string;
  rss_url: string;
  news_url: string;
  videos_url: string;
  blog_url: string;
  release_notes_url: string;
  anthropic_news_url: string;
  claude_code_github_url: string;
  claude_code_releases_url: string;
  claude_code_rss_url: string;
  source_priority: 1 | 2 | 3 | 4 | 5;
  media_likelihood: 1 | 2 | 3 | 4 | 5;
  scan_frequency: ScanFrequency;
  status: SourceStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SourceReview {
  source_id: string;
  source_type: SourceType;
  manual_verified: boolean;
  media_marked: boolean;
  updated_at: string;
}

export type HealthState =
  | "unchecked"
  | "accessible"
  | "unavailable"
  | "redirected"
  | "timeout";

export interface SourceHealth {
  source_id: string;
  product_name: string;
  source_type: SourceType;
  url: string;
  final_url: string;
  status_code: number | null;
  ok: boolean;
  state: Exclude<HealthState, "unchecked">;
  content_type: string;
  title: string;
  meta_description: string;
  og_image: string;
  og_video: string;
  has_image_hint: boolean;
  has_video_hint: boolean;
  github_repo_exists: boolean | null;
  github_has_releases: boolean | null;
  github_readme_has_media: boolean | null;
  latest_release_at: string;
  checked_at: string;
  error: string;
}

export interface RegistrySnapshot {
  sources: Source[];
  health: SourceHealth[];
  reviews: SourceReview[];
}

export type CollectorPriority = "high" | "medium" | "low";
export const SOURCE_CANDIDATE_STATUSES = ["pending_review", "pending", "suggested", "accepted", "rejected"] as const;
export type SourceCandidateStatus = (typeof SOURCE_CANDIDATE_STATUSES)[number];

export interface SourceCandidate {
  product?: string;
  product_id?: string;
  product_slug?: string;
  product_name?: string;
  source_id?: string;
  url: string;
  type: ProductSourceType;
  purpose: SourcePurpose;
  primary_purpose?: SourcePurpose;
  purposes?: SourcePurpose[];
  priority: "P1" | "P2" | "P3";
  source: string;
  status: SourceCandidateStatus;
  access_type?: AccessType;
}

export interface SourceAudit {
  product_name: string;
  updates_30d: number;
  latest_update_at: string;
  screenshot_count: number;
  gif_count: number;
  video_count: number;
  media_score: 1 | 2 | 3 | 4 | 5;
  activity_score: 1 | 2 | 3 | 4 | 5;
  collector_priority: CollectorPriority;
}

export interface SourceCoverage {
  product_name: string;
  source_id: string;
  identity_sources: number;
  updates_sources: number;
  media_sources: number;
  discovery_sources: number;
  community_sources: number;
  x_sources: number;
  github_sources: number;
  missing_identity_source: boolean;
  missing_updates_source: boolean;
  missing_media_source: boolean;
  needs_review_count: number;
  coverage_score: number;
}

export interface RawSignal {
  id: string;
  product: string;
  source_id: string;
  source_url: string;
  signal_url: string;
  title: string;
  description: string;
  published_at: string;
  raw_text: string;
  media_urls: string[];
  media_types: string[];
  source_type: ProductSourceType;
  status: RawSignalStatus;
  quality_score: number;
  created_at: string;
  updated_at: string;
}
