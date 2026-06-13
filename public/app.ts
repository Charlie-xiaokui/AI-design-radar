type Category = "Chat" | "IDE" | "Workflow" | "Agent" | "Canvas" | "Research" | "Design" | "Automation" | "Prompt→App" | "Other";
type SourceType = "homepage" | "github" | "changelog" | "product_hunt" | "x";
type HealthState = "accessible" | "unavailable" | "redirected" | "timeout";
type RegistrySourceType = "github" | "github_releases" | "changelog" | "release_notes" | "news" | "docs" | "product_hunt" | "x" | "rss";
type ProductSourcePurpose = "identity" | "updates" | "media" | "discovery" | "community";
type AccessType = "public" | "login_required" | "manual" | "unknown";
type RawSignalStatus = "discovered" | "pending_review" | "approved" | "rejected" | "archived";
type HomepageCandidateStatus = boolean | "unknown";
type HomepageCandidateFilterValue = "true" | "false" | "unknown";
type HomepageReviewCriterion = "visual_asset_present" | "ui_or_workflow_change" | "reusable_pattern" | "pm_designer_inspiration" | "trusted_source";
type HomepageReviewCriteria = Record<HomepageReviewCriterion, 0 | 1>;
type HomepageCategory = "new_ui" | "new_workflow" | "new_interaction_pattern" | "agent_experience" | "canvas_workspace" | "concept" | "unknown";
type VisualAssetType = "video" | "gif" | "screenshot" | "flow_diagram" | "concept_mockup" | "unknown";
interface ProductSource { id: string; type: string; url: string; purpose: ProductSourcePurpose; primary_purpose?: ProductSourcePurpose; purposes?: ProductSourcePurpose[]; access_type?: AccessType; priority: number; status: "active" | "disabled" | "paused"; collector: string; last_checked_at: string; last_update_at: string; screenshot_count: number; gif_count: number; video_count: number; health: "unchecked" | "ok" | "failed" | "redirected" | "timeout"; scan_frequency: string; notes: string; }
interface SuggestedSource { id: string; type: string; purpose: ProductSourcePurpose; primary_purpose?: ProductSourcePurpose; purposes?: ProductSourcePurpose[]; access_type?: AccessType; url: string; reason: string; confidence: number; status: "suggested" | "pending_review" | "verified" | "rejected"; parent_source_id: string; relation_type: string; }
interface SourceCandidate { candidate_key: string; product?: string; product_id?: string; product_slug?: string; product_name?: string; source_id?: string; url: string; type: string; purpose: ProductSourcePurpose; primary_purpose?: ProductSourcePurpose; purposes?: ProductSourcePurpose[]; access_type?: AccessType; priority: "P1" | "P2" | "P3"; source: string; status: "pending_review" | "pending" | "suggested" | "accepted" | "rejected"; }
interface SourceRecommendation { label: string; reason: string; source: ProductSource; configured: boolean; }
interface Source { id: string; product_name: string; slug: string; category: Category; design_pattern: string; sources: ProductSource[]; suggested_sources: SuggestedSource[]; source_types: RegistrySourceType[]; github_type: "repo" | "org" | "none"; review_status: "pending" | "verified" | "rejected"; media_score: number; signal_score: number; homepage_url: string; github_url: string; github_releases_url: string; changelog_url: string; docs_url: string; product_hunt_url: string; x_url: string; rss_url: string; news_url: string; videos_url: string; blog_url: string; release_notes_url: string; anthropic_news_url: string; claude_code_github_url: string; claude_code_releases_url: string; claude_code_rss_url: string; source_priority: number; media_likelihood: number; scan_frequency: string; status: string; notes: string; created_at: string; updated_at: string; }
interface Health { source_id: string; source_type: SourceType; url: string; final_url: string; status_code: number | null; ok: boolean; state: HealthState; content_type: string; title: string; has_image_hint: boolean; has_video_hint: boolean; checked_at: string; error: string; }
interface Audit { product_name: string; updates_30d: number; latest_update_at: string; screenshot_count: number; gif_count: number; video_count: number; media_score: number; activity_score: number; collector_priority: "high" | "medium" | "low"; }
interface Coverage { product_name: string; source_id: string; identity_sources: number; updates_sources: number; media_sources: number; discovery_sources: number; community_sources: number; x_sources: number; github_sources: number; missing_identity_source: boolean; missing_updates_source: boolean; missing_media_source: boolean; needs_review_count: number; coverage_score: number; }
interface Review { source_id: string; source_type: SourceType; manual_verified: boolean; media_marked: boolean; updated_at: string; }
interface RawSignal { id: string; product: string; source_id: string; source_url: string; signal_url: string; title: string; description: string; published_at: string; raw_text: string; media_urls: string[]; media_types: string[]; media_count: number; image_count: number; video_count: number; gif_count: number; has_visual_signal: boolean; source_type: string; status: RawSignalStatus; quality_score: number; homepage_candidate: HomepageCandidateStatus; homepage_criteria: HomepageReviewCriteria; homepage_score: number; homepage_reasons: string[]; homepage_category: HomepageCategory; is_concept: boolean; visual_asset_type: VisualAssetType; created_at: string; updated_at: string; }
interface Snapshot { sources: Source[]; health: Health[]; reviews: Review[]; audit: Audit[]; candidates: SourceCandidate[]; recommendations: Record<string, SourceRecommendation[]>; coverage: Coverage[]; }

const categories: Category[] = ["Chat", "IDE", "Workflow", "Agent", "Canvas", "Research", "Design", "Automation", "Prompt→App", "Other"];
const sourceTypes: Array<{ type: SourceType; label: string; field: keyof Source }> = [
  { type: "homepage", label: "Homepage", field: "homepage_url" },
  { type: "github", label: "GitHub", field: "github_url" },
  { type: "changelog", label: "Changelog", field: "changelog_url" },
  { type: "product_hunt", label: "Product Hunt", field: "product_hunt_url" },
  { type: "x", label: "X", field: "x_url" },
];
const inspectorFields: Array<{ field: string; label: string; resolve: (source: Source) => string }> = [
  { field: "homepage_url", label: "Homepage", resolve: (source) => source.homepage_url },
  { field: "github_url", label: "GitHub", resolve: (source) => source.github_url || source.claude_code_github_url },
  { field: "github_releases_url", label: "GitHub Releases", resolve: (source) => source.github_releases_url || source.claude_code_releases_url },
  { field: "changelog_url", label: "Changelog", resolve: (source) => source.changelog_url },
  { field: "release_notes_url", label: "Release Notes", resolve: (source) => source.release_notes_url },
  { field: "docs_url", label: "Docs", resolve: (source) => source.docs_url },
  { field: "rss_url", label: "RSS", resolve: (source) => source.rss_url || source.claude_code_rss_url },
  { field: "product_hunt_url", label: "Product Hunt", resolve: (source) => source.product_hunt_url },
  { field: "x_url", label: "X", resolve: (source) => source.x_url },
  { field: "news_url", label: "News", resolve: (source) => source.news_url || source.anthropic_news_url },
  { field: "videos_url", label: "Videos", resolve: (source) => source.videos_url },
  { field: "blog_url", label: "Blog", resolve: (source) => source.blog_url },
];
let snapshot: Snapshot = { sources: [], health: [], reviews: [], audit: [], candidates: [], recommendations: {}, coverage: [] };
let rawSignals: RawSignal[] = [];
let currentInspectorId = "";
let addingFormalSource = false;
type CoverageSortKey = "coverage_score" | "updates_sources" | "media_sources" | "discovery_sources" | "community_sources" | "github_sources" | "needs_review_count";
let coverageSort: { key: CoverageSortKey; direction: "asc" | "desc" } = { key: "coverage_score", direction: "asc" };
const productSourceTypes = ["homepage", "changelog", "release_notes", "blog", "news", "docs", "github_repo", "community", "forum", "discord", "reddit", "events", "slack", "github_releases", "github_releases_rss", "x", "youtube", "product_hunt", "rss"];
const productSourcePurposes = ["identity", "updates", "media", "discovery", "community"];
const productSourceStatuses = ["active", "disabled", "paused"];
const homepageCandidateStatuses: HomepageCandidateFilterValue[] = ["true", "false", "unknown"];
const homepageReviewCriteria: HomepageReviewCriterion[] = ["visual_asset_present", "ui_or_workflow_change", "reusable_pattern", "pm_designer_inspiration", "trusted_source"];
const homepageCriteriaLabels: Record<HomepageReviewCriterion, string> = {
  visual_asset_present: "视觉素材",
  ui_or_workflow_change: "UI / 工作流变化",
  reusable_pattern: "可复用设计模式",
  pm_designer_inspiration: "PM / 设计师启发",
  trusted_source: "可信来源",
};
const homepageCategories: HomepageCategory[] = ["new_ui", "new_workflow", "new_interaction_pattern", "agent_experience", "canvas_workspace", "concept", "unknown"];
const visualAssetTypes: VisualAssetType[] = ["video", "gif", "screenshot", "flow_diagram", "concept_mockup", "unknown"];
const accessTypes: AccessType[] = ["public", "login_required", "manual", "unknown"];
const publicAccessTypes = new Set(["homepage", "docs", "blog", "news", "release_notes", "github", "github_repo", "github_releases", "github_releases_rss", "rss", "youtube", "product_hunt", "changelog"]);
const loginRequiredAccessTypes = new Set(["x", "discord", "slack"]);
const accessLabels: Record<AccessType, string> = {
  public: "Public",
  login_required: "Login Required",
  manual: "Manual",
  unknown: "Unknown",
};
const purposeLabels: Record<ProductSource["purpose"], string> = {
  identity: "Identity",
  updates: "Updates",
  media: "Media",
  discovery: "Discovery",
  community: "Community",
};

function normalizedPurposeFields(item?: { purpose?: ProductSourcePurpose; primary_purpose?: ProductSourcePurpose; purposes?: ProductSourcePurpose[] }): { purpose: ProductSourcePurpose; primary_purpose: ProductSourcePurpose; purposes: ProductSourcePurpose[] } {
  const selected = safeArray<ProductSourcePurpose>(item?.purposes).filter((purpose) => productSourcePurposes.includes(purpose));
  const primary = item?.primary_purpose && productSourcePurposes.includes(item.primary_purpose)
    ? item.primary_purpose
    : item?.purpose && productSourcePurposes.includes(item.purpose)
      ? item.purpose
      : selected[0] ?? "identity";
  const purposes = [...new Set(selected.length ? selected : [primary])];
  if (!purposes.includes(primary)) purposes.unshift(primary);
  return { purpose: primary, primary_purpose: primary, purposes };
}

function primaryPurpose(item: { purpose?: ProductSourcePurpose; primary_purpose?: ProductSourcePurpose; purposes?: ProductSourcePurpose[] }): ProductSourcePurpose {
  return normalizedPurposeFields(item).primary_purpose;
}

function purposeList(item: { purpose?: ProductSourcePurpose; primary_purpose?: ProductSourcePurpose; purposes?: ProductSourcePurpose[] }): ProductSourcePurpose[] {
  return normalizedPurposeFields(item).purposes;
}

function selectedPurposes(container: HTMLElement, selector: string, primary: ProductSourcePurpose): ProductSourcePurpose[] {
  const selected = Array.from(container.querySelectorAll<HTMLInputElement>(selector))
    .filter((input) => input.checked)
    .map((input) => input.dataset.formalPurpose || input.dataset.candidatePurpose || input.value)
    .filter((purpose): purpose is ProductSourcePurpose => productSourcePurposes.includes(purpose as ProductSourcePurpose));
  if (!selected.includes(primary)) selected.unshift(primary);
  return [...new Set(selected)];
}

function defaultAccessType(type: string): AccessType {
  if (publicAccessTypes.has(type)) return "public";
  if (loginRequiredAccessTypes.has(type)) return "login_required";
  return "unknown";
}

function normalizeAccessType(item?: { type?: string; access_type?: string }): AccessType {
  const accessType = item?.access_type;
  return accessTypes.includes(accessType as AccessType) ? accessType as AccessType : defaultAccessType(item?.type ?? "");
}

function accessTypeBadge(item?: { type?: string; access_type?: string }): string {
  const accessType = normalizeAccessType(item);
  return `<span class="access-type-badge ${accessType}" title="${accessType === "login_required" ? "不会进入自动采集主队列" : ""}">${accessLabels[accessType]}</span>`;
}

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

function safeArray<T>(value: unknown): T[] { return Array.isArray(value) ? value : []; }
function snapshotSources(): Source[] { return safeArray<Source>(snapshot.sources); }
function productSources(source: Source): ProductSource[] { return safeArray<ProductSource>(source.sources); }
function productSuggestedSources(source: Source): SuggestedSource[] { return safeArray<SuggestedSource>(source.suggested_sources); }
function normalizeSnapshot(value: unknown): Snapshot {
  const input = value && typeof value === "object" ? value as Partial<Snapshot> : {};
  const sources = safeArray<Source>(input.sources).map((source) => ({
    ...source,
    sources: productSources(source).map((item) => ({ ...item, ...normalizedPurposeFields(item), access_type: normalizeAccessType(item) })),
    suggested_sources: productSuggestedSources(source).map((item) => ({ ...item, ...normalizedPurposeFields(item), access_type: normalizeAccessType(item) })),
    source_types: safeArray<RegistrySourceType>(source.source_types),
  }));
  return {
    sources,
    health: safeArray<Health>(input.health),
    reviews: safeArray<Review>(input.reviews),
    audit: safeArray<Audit>(input.audit),
    candidates: safeArray<SourceCandidate>(input.candidates).map((item) => ({ ...item, ...normalizedPurposeFields(item), access_type: normalizeAccessType(item) })),
    recommendations: input.recommendations && typeof input.recommendations === "object" ? input.recommendations : {},
    coverage: safeArray<Coverage>(input.coverage),
  };
}

function normalizeRawSignal(signal: RawSignal): RawSignal {
  const homepageCandidate = parseHomepageCandidateValue(signal.homepage_candidate);
  const homepageCategory = homepageCategories.includes(signal.homepage_category) ? signal.homepage_category : "unknown";
  const visualAssetType = visualAssetTypes.includes(signal.visual_asset_type) ? signal.visual_asset_type : "unknown";
  const homepageCriteria = normalizeHomepageCriteria(signal.homepage_criteria, signal.source_type);
  return {
    ...signal,
    media_urls: safeArray<string>(signal.media_urls),
    media_types: safeArray<string>(signal.media_types),
    ...rawSignalMediaMetadata(signal),
    homepage_candidate: homepageCandidate,
    homepage_criteria: homepageCriteria,
    homepage_score: homepageScore(homepageCriteria),
    homepage_reasons: safeArray<string>(signal.homepage_reasons),
    homepage_category: homepageCategory,
    is_concept: Boolean(signal.is_concept),
    visual_asset_type: visualAssetType,
  };
}

function rawSignalMediaMetadata(signal: Pick<RawSignal, "media_urls" | "media_types">): Pick<RawSignal, "media_count" | "image_count" | "video_count" | "gif_count" | "has_visual_signal"> {
  const urls = safeArray<string>(signal.media_urls);
  const types = urls.map((url, index) => String(safeArray<string>(signal.media_types)[index] ?? (/\.gif(?:$|[?#])/i.test(url) ? "gif" : /\.(?:mp4|webm|mov|m4v)(?:$|[?#])/i.test(url) ? "video" : "image")).toLowerCase());
  const gifCount = types.filter((type, index) => type === "gif" || /\.gif(?:$|[?#])/i.test(urls[index] ?? "")).length;
  const videoCount = types.filter((type) => type === "video").length;
  return {
    media_count: urls.length,
    gif_count: gifCount,
    video_count: videoCount,
    image_count: Math.max(0, urls.length - gifCount - videoCount),
    has_visual_signal: urls.some((url, index) => isLikelyVisualSignalMedia(url, types[index] ?? "image")),
  };
}

function isLikelyVisualSignalMedia(url: string, type: string): boolean {
  const lower = decodeURIComponent(url).toLowerCase();
  if (!url) return false;
  if (/\.(?:svg|ico)(?:$|[?#])/.test(lower)) return false;
  if (/(?:^|[/_.-])(?:logo|icon|favicon|avatar|wordmark|sprite|placeholder|tracking|pixel|blank|transparent)(?:[/_.-]|$)/i.test(lower)) return false;
  if (type === "video" || type === "gif") return true;
  return type === "image";
}

function normalizeHomepageCriteria(value: unknown, sourceType = ""): HomepageReviewCriteria {
  const input = value && typeof value === "object" ? value as Partial<Record<HomepageReviewCriterion, unknown>> : {};
  return Object.fromEntries(homepageReviewCriteria.map((criterion) => {
    const raw = input[criterion];
    if (raw === 1 || raw === true || raw === "1" || raw === "true") return [criterion, 1];
    if (raw === 0 || raw === false || raw === "0" || raw === "false") return [criterion, 0];
    if (criterion === "trusted_source" && ["release_notes", "changelog", "blog", "news", "github_releases", "github_releases_rss", "youtube", "product_hunt", "x"].includes(sourceType)) return [criterion, 1];
    return [criterion, 0];
  })) as HomepageReviewCriteria;
}

function homepageScore(criteria: HomepageReviewCriteria): number {
  return homepageReviewCriteria.reduce((sum, criterion) => sum + criteria[criterion], 0);
}

function homepageRecommendation(score: number): "recommended" | "not_recommended" {
  return score >= 3 ? "recommended" : "not_recommended";
}

function parseHomepageCandidateValue(value: unknown): HomepageCandidateStatus {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return "unknown";
}

function homepageCandidateFilterValue(value: HomepageCandidateStatus): HomepageCandidateFilterValue {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unknown";
}

const sourceList = $("#sourceList");
const dialog = $("#sourceDialog") as HTMLDialogElement;
const inspectorDialog = $("#inspectorDialog") as HTMLDialogElement;
const confirmDialog = $("#confirmDialog") as HTMLDialogElement;
const form = $("#sourceForm") as HTMLFormElement;
const filters = {
  search: $("#searchInput") as HTMLInputElement,
  category: $("#categoryFilter") as HTMLSelectElement,
  status: $("#statusFilter") as HTMLSelectElement,
  frequency: $("#frequencyFilter") as HTMLSelectElement,
  reviewStatus: $("#reviewStatusFilter") as HTMLSelectElement,
  mediaScore: $("#mediaScoreFilter") as HTMLSelectElement,
  signalScore: $("#signalScoreFilter") as HTMLSelectElement,
  pattern: $("#patternFilter") as HTMLInputElement,
  updatesZero: $("#updatesZeroFilter") as HTMLInputElement,
  auditMedia: $("#auditMediaFilter") as HTMLInputElement,
  collectorPriority: $("#collectorPriorityFilter") as HTMLSelectElement,
  hasError: $("#hasErrorFilter") as HTMLInputElement,
  pending: $("#pendingFilter") as HTMLInputElement,
};
const coverageFilters = {
  low: $("#coverageLowFilter") as HTMLInputElement,
  missingUpdates: $("#coverageMissingUpdates") as HTMLInputElement,
  missingMedia: $("#coverageMissingMedia") as HTMLInputElement,
  missingCommunity: $("#coverageMissingCommunity") as HTMLInputElement,
  missingDiscovery: $("#coverageMissingDiscovery") as HTMLInputElement,
  missingGithub: $("#coverageMissingGithub") as HTMLInputElement,
  missingX: $("#coverageMissingX") as HTMLInputElement,
  needsReview: $("#coverageNeedsReview") as HTMLInputElement,
};
const rawSignalFilters = {
  product: $("#rawSignalProductFilter") as HTMLSelectElement,
  type: $("#rawSignalTypeFilter") as HTMLSelectElement,
  status: $("#rawSignalStatusFilter") as HTMLSelectElement,
  visual: $("#rawSignalVisualFilter") as HTMLInputElement,
};
const homepageCandidateFilters = {
  candidate: $("#homepageCandidateFilter") as HTMLSelectElement,
  mediaOnly: $("#homepageWithMediaFilter") as HTMLInputElement,
  category: $("#homepageCategoryFilter") as HTMLSelectElement,
  visualAssetType: $("#homepageVisualAssetFilter") as HTMLSelectElement,
  conceptOnly: $("#homepageConceptFilter") as HTMLInputElement,
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...options?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? "Request failed");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

function toast(message: string): void {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2600);
}

function confirmAction(message: string): Promise<boolean> {
  $("#confirmMessage").textContent = message;
  confirmDialog.showModal();
  return new Promise((resolve) => {
    const finish = (accepted: boolean) => {
      $("#acceptConfirm").removeEventListener("click", accept);
      $("#cancelConfirm").removeEventListener("click", cancel);
      confirmDialog.removeEventListener("cancel", cancel);
      if (confirmDialog.open) confirmDialog.close();
      resolve(accepted);
    };
    const accept = () => finish(true);
    const cancel = (event?: Event) => { event?.preventDefault(); finish(false); };
    $("#acceptConfirm").addEventListener("click", accept);
    $("#cancelConfirm").addEventListener("click", cancel);
    confirmDialog.addEventListener("cancel", cancel);
  });
}

function healthFor(sourceId: string, type: SourceType): Health | undefined { return safeArray<Health>(snapshot.health).find((item) => item.source_id === sourceId && item.source_type === type); }
function auditFor(source: Source): Audit | undefined { return safeArray<Audit>(snapshot.audit).find((item) => item.product_name === source.product_name); }
function normalizeUrl(value: string): string { try { const url = new URL(value); return `${url.origin}${url.pathname.replace(/\/$/, "")}${url.search}`; } catch { return value.replace(/\/$/, ""); } }
function healthForUrl(source: Source, url: string): Health | undefined { const normalized = normalizeUrl(url); return safeArray<Health>(snapshot.health).find((item) => item.source_id === source.id && normalizeUrl(item.url) === normalized); }
function sourceHasError(source: Source): boolean { return productSources(source).some((item) => item.health === "failed" || item.health === "timeout") || safeArray<Health>(snapshot.health).some((item) => item.source_id === source.id && (!item.ok || Boolean(item.error))); }
function reviewFor(sourceId: string, type: SourceType): Review | undefined { return safeArray<Review>(snapshot.reviews).find((item) => item.source_id === sourceId && item.source_type === type); }
function isPending(source: Source): boolean { return sourceTypes.some(({ type, field }) => Boolean(source[field]) && healthFor(source.id, type)?.ok && !reviewFor(source.id, type)?.manual_verified); }
function stateLabel(state?: HealthState): string { return ({ accessible: "可访问", unavailable: "不可访问", redirected: "跳转", timeout: "超时" } as Record<string, string>)[state ?? ""] ?? "未校验"; }
function formatTime(value?: string): string { return value ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "尚未校验"; }
function candidateTier(reason: string): string { return reason.match(/^\[(P[123])\]/)?.[1] ?? ""; }

function formalSourceCard(item?: ProductSource): string {
  const option = (value: string, selected: string) => `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`;
  const purposeFields = normalizedPurposeFields(item);
  const accessType = normalizeAccessType(item ?? { type: "homepage" });
  return `<div class="formal-source-card" data-formal-source-id="${escapeHtml(item?.id ?? "")}">
    ${item ? `<button class="formal-source-handle" type="button" draggable="true" aria-label="拖拽排序" title="仅支持同组排序">⋮⋮</button>` : ""}
    <input data-formal-field="url" type="url" required placeholder="https://example.com/source" value="${escapeHtml(item?.url ?? "")}" />
    <select data-formal-field="type">${productSourceTypes.map((value) => option(value, item?.type ?? "homepage")).join("")}</select>
    <div class="purpose-editor"><label>Primary<select data-formal-field="primary_purpose">${productSourcePurposes.map((value) => option(value, purposeFields.primary_purpose)).join("")}</select></label><div class="purpose-multiselect">${productSourcePurposes.map((value) => `<label><input type="checkbox" data-formal-purpose="${value}" ${purposeFields.purposes.includes(value) ? "checked" : ""}/>${value}</label>`).join("")}</div></div>
    <label class="access-type-field">${accessTypeBadge(item ?? { type: "homepage" })}<select data-formal-field="access_type">${accessTypes.map((value) => option(value, accessType)).join("")}</select></label>
    <select data-formal-field="priority">${[1, 2, 3, 4, 5].map((value) => option(String(value), String(item?.priority ?? 3))).join("")}</select>
    <select data-formal-field="status">${productSourceStatuses.map((value) => option(value, item?.status ?? "active")).join("")}</select>
    <div class="formal-source-actions"><button class="mini-button" data-formal-action="save">保存</button>${item ? `<button class="mini-button danger" data-formal-action="delete">删除</button>` : `<button class="mini-button" data-formal-action="cancel">取消</button>`}</div>
  </div>`;
}

function purposeGroupStorageKey(sourceId: string, purpose: ProductSource["purpose"]): string {
  return `source-inspector:${sourceId}:purpose-group:${purpose}:collapsed`;
}

function isPurposeGroupCollapsed(sourceId: string, purpose: ProductSource["purpose"]): boolean {
  try { return window.localStorage.getItem(purposeGroupStorageKey(sourceId, purpose)) === "true"; }
  catch { return false; }
}

function setPurposeGroupCollapsed(sourceId: string, purpose: ProductSource["purpose"], collapsed: boolean): void {
  try { window.localStorage.setItem(purposeGroupStorageKey(sourceId, purpose), String(collapsed)); }
  catch { /* localStorage can be unavailable in restricted browser contexts. */ }
}

function togglePurposeGroup(group: HTMLElement, purpose: ProductSource["purpose"]): void {
  const list = group.querySelector<HTMLElement>("[data-purpose-list]");
  const toggle = group.querySelector<HTMLButtonElement>("[data-purpose-toggle]");
  if (!list || !toggle || !currentInspectorId) return;
  const collapsed = toggle.getAttribute("aria-expanded") !== "false";
  group.classList.toggle("collapsed", collapsed);
  list.hidden = collapsed;
  toggle.setAttribute("aria-expanded", String(!collapsed));
  setPurposeGroupCollapsed(currentInspectorId, purpose, collapsed);
}

function purposeGroupHtml(source: Source, purpose: ProductSource["purpose"], items: ProductSource[], includeDraft: boolean): string {
  if (!items.length && !includeDraft) return "";
  const collapsed = isPurposeGroupCollapsed(source.id, purpose);
  const cards = items.map((item) => formalSourceCard(item));
  if (includeDraft) cards.push(formalSourceCard());
  return `<section class="formal-source-group ${collapsed ? "collapsed" : ""}" data-purpose-group="${purpose}">
    <button class="formal-source-group-header" type="button" data-purpose-toggle="${purpose}" aria-expanded="${!collapsed}">
      <span class="formal-source-group-chevron">▼</span>
      <strong>${purposeLabels[purpose]}</strong>
      <span class="formal-source-group-coverage">(${items.length}/1)</span>
      ${items.length > 1 ? `<span class="formal-source-redundancy">+${items.length - 1} redundant</span>` : ""}
    </button>
    <div class="formal-source-list" data-purpose-list="${purpose}" ${collapsed ? "hidden" : ""}>${cards.join("")}</div>
  </section>`;
}

function renderFormalSources(source: Source): void {
  const groups = productSourcePurposes.map((purpose) => {
    const typedPurpose = purpose as ProductSource["purpose"];
    return purposeGroupHtml(source, typedPurpose, productSources(source).filter((item) => primaryPurpose(item) === typedPurpose), addingFormalSource && typedPurpose === "identity");
  }).join("");
  $("#formalSourceEditor").innerHTML = groups || `<p class="scope-note">暂无正式 Source，点击 + Add Source 添加。</p>`;
}

function normalizeProductKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "-").replace(/^src_/, "");
}

function candidateMatchesProduct(candidate: SourceCandidate, source: Source): boolean {
  const productKey = normalizeProductKey(candidate.product || candidate.product_slug || candidate.product_name || candidate.product_id || candidate.source_id);
  return [source.id, source.slug, source.product_name].map(normalizeProductKey).includes(productKey);
}

function isPendingCandidate(candidate: SourceCandidate): boolean {
  return candidate.status === "pending_review" || candidate.status === "pending" || candidate.status === "suggested";
}

function renderCandidatePanel(source: Source): void {
  const container = $("#inspectorRecommendations");
  try {
    const sourceCandidates = safeArray<SourceCandidate>(snapshot.candidates);
    const suggestions = sourceCandidates.filter((item) => candidateMatchesProduct(item, source) && isPendingCandidate(item));
    if (normalizeProductKey(source.slug) === "manus") {
      console.log("Source Candidate Debug", {
        allCandidatesLength: sourceCandidates.length,
        currentProduct: { id: source.id, slug: source.slug, product_name: source.product_name },
        matchedCandidatesLength: suggestions.length,
        matchedCandidateUrls: suggestions.map((item) => item.url),
        matchedCandidates: sourceCandidates.filter((item) => candidateMatchesProduct(item, source)).map((item) => ({
          product: item.product,
          product_id: item.product_id,
          product_slug: item.product_slug,
          product_name: item.product_name,
          source_id: item.source_id,
          status: item.status,
          url: item.url,
        })),
      });
    }
    const sourceTypeOptions = productSourceTypes;
    const purposeOptions = productSourcePurposes;
    const suggestionHtml = suggestions.length ? `<h3>Suggested Sources <span class="tag">${suggestions.length} needs review</span></h3><div class="suggestion-list">${suggestions.map((item) => { const purposeFields = normalizedPurposeFields(item); const accessType = normalizeAccessType(item); return `<article class="suggestion-card" data-candidate-key="${escapeHtml(item.candidate_key)}"><div class="suggestion-card-head"><strong>${escapeHtml(item.type)} · ${escapeHtml(purposeFields.purposes.join(" + "))}</strong><span class="tag">${escapeHtml(item.priority)} · ${escapeHtml(item.status)}</span></div><div class="suggestion-editor"><input data-field="url" value="${escapeHtml(item.url)}"/><select data-field="type">${sourceTypeOptions.map((value) => `<option value="${value}" ${item.type === value ? "selected" : ""}>${value}</option>`).join("")}</select><div class="purpose-editor"><label>Primary<select data-candidate-primary-purpose>${purposeOptions.map((value) => `<option value="${value}" ${purposeFields.primary_purpose === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><div class="purpose-multiselect">${purposeOptions.map((value) => `<label><input type="checkbox" data-candidate-purpose="${value}" ${purposeFields.purposes.includes(value as ProductSourcePurpose) ? "checked" : ""}/>${value}</label>`).join("")}</div></div><label class="access-type-field">${accessTypeBadge(item)}<select data-candidate-access-type>${accessTypes.map((value) => `<option value="${value}" ${accessType === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div><p class="suggestion-reason">Audit source: ${escapeHtml(item.source)}</p><div class="suggestion-actions"><a class="mini-button" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开链接</a><button class="mini-button" data-suggestion-action="save">保存编辑</button><button class="mini-button" data-suggestion-action="accept">Accept</button><button class="mini-button" data-suggestion-action="reject">Reject</button></div></article>`; }).join("")}</div>` : `<h3>Suggested Sources</h3><p class="scope-note">暂无待审核候选信号源</p>`;
    const recommendations = safeArray<SourceRecommendation>(snapshot.recommendations?.[source.id]);
    container.innerHTML = suggestionHtml + (recommendations.length ? `<h3>Codex 推荐参考 <span class="tag">不会自动添加</span></h3><div class="recommendation-grid">${recommendations.map((item) => `<article class="recommendation-card"><strong>${escapeHtml(item.label)} <span class="tag">${item.configured ? "已配置" : "待评估"}</span></strong><p>${escapeHtml(item.reason)}</p><p>${escapeHtml(item.source.type)} · ${escapeHtml(item.source.purpose)} · P${item.source.priority}</p><a href="${escapeHtml(item.source.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.source.url)}</a></article>`).join("")}</div>` : "");
  } catch (error) {
    console.error("Candidate panel render failed", error);
    container.innerHTML = `<h3>Suggested Sources</h3><p class="scope-note">暂无待审核候选信号源</p>`;
  }
}

function renderInspector(source: Source): void {
  currentInspectorId = source.id;
  const audit = auditFor(source);
  $("#inspectorTitle").textContent = source.product_name;
  const formalSources = productSources(source);
  const sourceTypes = safeArray<RegistrySourceType>(source.source_types);
  const nestedSummary = formalSources.length ? formalSources.map((item) => `${item.type}:${purposeList(item).join("+")}`).join(", ") : sourceTypes.join(", ");
  $("#inspectorSubtitle").textContent = `${source.design_pattern || "未定义模式"} · ${nestedSummary || "未配置信号源"}`;
  $("#inspectorSummary").innerHTML = [
    [audit?.updates_30d ?? "—", "30 天更新"],
    [audit?.media_score ?? "—", "Audit 媒体分"],
    [audit?.activity_score ?? "—", "活跃分"],
    [audit?.collector_priority ?? "—", "采集优先级"],
    [audit?.latest_update_at ? formatTime(audit.latest_update_at) : "—", "最近更新"],
    [sourceHasError(source) ? "YES" : "NO", "Health 错误"],
  ].map(([value, label]) => `<div class="inspector-metric"><strong>${escapeHtml(value)}</strong><span>${label}</span></div>`).join("");
  renderFormalSources(source);

  const header = `<div class="inspector-row header"><span>Source Type</span><span>Purpose</span><span>Access</span><span>Priority</span><span>URL</span><span>Last Update</span><span>Last Check</span><span>Health</span><span>Media Count</span></div>`;
  const configuredRows = formalSources.length
    ? formalSources.map((item) => ({ field: `${item.type} / ${purposeList(item).join("+")}`, url: item.url, signal: item }))
    : inspectorFields.map(({ field, resolve }) => ({ field, url: resolve(source) || "", signal: undefined }));
  const rows = configuredRows.map(({ field, url, signal }) => {
    const urlHealth = url ? healthForUrl(source, url) : undefined;
    const signalHealth = signal?.health ?? (urlHealth ? (urlHealth.ok ? "ok" : "failed") : "unchecked");
    const mediaCount = signal ? `${signal.screenshot_count} img / ${signal.gif_count} gif / ${signal.video_count} video` : "—";
    return `<div class="inspector-row">
      <span class="inspector-field" title="${escapeHtml(signal?.notes || "")}">${escapeHtml(signal?.type || field)}${signal ? ` · ${signal.status}` : ""}</span>
      <span>${escapeHtml(signal ? purposeList(signal).join(" + ") : "—")}</span>
      <span>${signal ? accessTypeBadge(signal) : "—"}</span>
      <span>${signal ? `P${signal.priority}` : "—"}</span>
      <span class="inspector-url ${url ? "" : "empty"}" title="${escapeHtml(url)}">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>` : "空"}</span>
      <span>${signal?.last_update_at ? formatTime(signal.last_update_at) : "—"}</span>
      <span>${signal?.last_checked_at ? formatTime(signal.last_checked_at) : "—"}</span>
      <span class="inspector-${signalHealth === "ok" || signalHealth === "redirected" ? "ok" : signalHealth === "unchecked" ? "unknown" : "failed"}" title="${escapeHtml(urlHealth?.error || signal?.collector || "")}">${escapeHtml(signalHealth)}</span>
      <span>${escapeHtml(mediaCount)}</span>
    </div>`;
  }).join("");
  $("#inspectorSources").innerHTML = header + rows;
  renderCandidatePanel(source);
  const inspectorOrder = visibleCoverage();
  const inspectorIndex = inspectorOrder.findIndex((item) => item.source_id === source.id);
  ($("#previousProduct") as HTMLButtonElement).disabled = inspectorIndex <= 0;
  ($("#nextProduct") as HTMLButtonElement).disabled = inspectorIndex < 0 || inspectorIndex >= inspectorOrder.length - 1;
  window.setTimeout(() => {
    if (!inspectorDialog.open && currentInspectorId === source.id) inspectorDialog.showModal();
  }, 0);
}

function visibleCoverage(): Coverage[] {
  return safeArray<Coverage>(snapshot.coverage).filter((item) =>
    (!coverageFilters.low.checked || item.coverage_score < 5)
    && (!coverageFilters.missingUpdates.checked || item.missing_updates_source)
    && (!coverageFilters.missingMedia.checked || item.missing_media_source)
    && (!coverageFilters.missingCommunity.checked || item.community_sources === 0)
    && (!coverageFilters.missingDiscovery.checked || item.discovery_sources === 0)
    && (!coverageFilters.missingGithub.checked || item.github_sources === 0)
    && (!coverageFilters.missingX.checked || item.x_sources === 0)
    && (!coverageFilters.needsReview.checked || item.needs_review_count > 0)
  ).sort((a, b) => {
    const difference = a[coverageSort.key] - b[coverageSort.key];
    return (coverageSort.direction === "asc" ? difference : -difference) || a.product_name.localeCompare(b.product_name);
  });
}

function sortHeader(label: string, key: CoverageSortKey): string {
  const active = coverageSort.key === key;
  const arrow = active ? (coverageSort.direction === "asc" ? " ↑" : " ↓") : "";
  return `<button class="coverage-sort ${active ? "active" : ""}" data-coverage-sort="${key}">${label}${arrow}</button>`;
}

function resolveInspectorSource(productKey: string): Source | undefined {
  const normalized = productKey.trim().toLowerCase();
  if (!normalized) return undefined;
  return safeArray<Source>(snapshot.sources).find((source) => [source.id, source.slug, source.product_name].some((value) => String(value ?? "").trim().toLowerCase() === normalized));
}

function coverageProductKey(item: Coverage): string {
  return resolveInspectorSource(item.source_id)?.id
    ?? resolveInspectorSource(item.product_name)?.id
    ?? item.source_id
    ?? item.product_name;
}

function openInspector(productKey: string): void {
  const source = resolveInspectorSource(productKey);
  if (!source) return;
  addingFormalSource = false;
  renderInspector(source);
}

function renderCoverage(): void {
  const visible = visibleCoverage();
  $("#coverageCount").textContent = `${visible.length} / ${snapshot.coverage.length} products`;
  const communityTypes = "github_repo, community, forum, discord, reddit, events, slack";
  const header = `<div class="coverage-row header"><span>Product</span><span>Identity</span><span>${sortHeader("Updates", "updates_sources")}</span><span title="Eligible types: ${communityTypes}">${sortHeader("Community", "community_sources")}</span><span>${sortHeader("Discovery", "discovery_sources")}</span><span>${sortHeader("Media", "media_sources")}</span><span>X</span><span>${sortHeader("GitHub", "github_sources")}</span><span>Missing Identity</span><span>Missing Updates</span><span>Missing Media</span><span>${sortHeader("Suggested Count", "needs_review_count")}</span><span>${sortHeader("Score", "coverage_score")}</span><span>Action</span></div>`;
  $("#coverageTable").innerHTML = header + visible.map((item) => {
    const productKey = coverageProductKey(item);
    return `<div class="coverage-row"><span><button type="button" class="coverage-product" data-coverage-inspect="${escapeHtml(productKey)}"><strong>${escapeHtml(item.product_name)}</strong></button></span><span>${item.identity_sources}</span><span>${item.updates_sources}</span><span title="Eligible types: ${communityTypes}">${item.community_sources}</span><span>${item.discovery_sources}</span><span>${item.media_sources}</span><span>${item.x_sources}</span><span>${item.github_sources}</span><span class="${item.missing_identity_source ? "coverage-warning" : ""}">${item.missing_identity_source ? "WARNING" : "—"}</span><span class="${item.missing_updates_source ? "coverage-warning" : ""}">${item.missing_updates_source ? "WARNING" : "—"}</span><span class="${item.missing_media_source ? "coverage-warning" : ""}">${item.missing_media_source ? "WARNING" : "—"}</span><span>${item.needs_review_count}</span><span class="coverage-score">${item.coverage_score}/5</span><span><button type="button" class="mini-button coverage-action" data-coverage-inspect="${escapeHtml(productKey)}">Inspect</button></span></div>`;
  }).join("");
}

function rawSignalActions(signal: RawSignal): string {
  const actions: Partial<Record<RawSignalStatus, RawSignalStatus[]>> = {
    discovered: ["approved", "rejected"],
    approved: ["archived"],
  };
  return (actions[signal.status] ?? [])
    .map((status) => `<button class="mini-button" data-raw-signal-action="${status}" data-id="${escapeHtml(signal.id)}">${status}</button>`)
    .join("");
}

function mediaPreview(signal: RawSignal, interactive = true): string {
  const mediaUrl = safeArray<string>(signal.media_urls)[0];
  if (!mediaUrl) return `<div class="raw-signal-media empty">No media</div>`;
  const type = safeArray<string>(signal.media_types)[0] ?? "";
  if (type === "video" || /\.(?:mp4|webm|mov)(?:$|[?#])/i.test(mediaUrl)) {
    return interactive
      ? `<a class="raw-signal-media video" href="${escapeHtml(mediaUrl)}" target="_blank" rel="noreferrer">Video media</a>`
      : `<div class="raw-signal-media video">Video media</div>`;
  }
  const image = `<img src="${escapeHtml(mediaUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
  return interactive
    ? `<a class="raw-signal-media" href="${escapeHtml(mediaUrl)}" target="_blank" rel="noreferrer">${image}</a>`
    : `<div class="raw-signal-media">${image}</div>`;
}

function fillRawSignalFilters(): void {
  const current = {
    product: rawSignalFilters.product.value,
    type: rawSignalFilters.type.value,
    status: rawSignalFilters.status.value,
  };
  const optionList = (values: string[]) => `<option value="">All</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  rawSignalFilters.product.innerHTML = optionList([...new Set(rawSignals.map((item) => item.product).filter(Boolean))].sort());
  rawSignalFilters.type.innerHTML = optionList([...new Set(rawSignals.map((item) => item.source_type).filter(Boolean))].sort());
  rawSignalFilters.status.innerHTML = optionList(["discovered", "pending_review", "approved", "rejected", "archived"]);
  rawSignalFilters.product.value = current.product;
  rawSignalFilters.type.value = current.type;
  rawSignalFilters.status.value = current.status;
}

function fillHomepageCandidateFilters(): void {
  const current = {
    category: homepageCandidateFilters.category.value,
    visualAssetType: homepageCandidateFilters.visualAssetType.value,
  };
  homepageCandidateFilters.category.innerHTML = `<option value="">All</option>${homepageCategories.map((value) => `<option value="${value}">${value}</option>`).join("")}`;
  homepageCandidateFilters.visualAssetType.innerHTML = `<option value="">All</option>${visualAssetTypes.map((value) => `<option value="${value}">${value}</option>`).join("")}`;
  homepageCandidateFilters.category.value = current.category;
  homepageCandidateFilters.visualAssetType.value = current.visualAssetType;
}

function visibleRawSignals(): RawSignal[] {
  return safeArray<RawSignal>(rawSignals).filter((signal) =>
    (!rawSignalFilters.product.value || signal.product === rawSignalFilters.product.value)
    && (!rawSignalFilters.type.value || signal.source_type === rawSignalFilters.type.value)
    && (!rawSignalFilters.status.value || signal.status === rawSignalFilters.status.value)
    && (!rawSignalFilters.visual.checked || signal.has_visual_signal));
}

function signalSortTimestamp(signal: RawSignal): number {
  const published = Date.parse(signal.published_at || "");
  if (Number.isFinite(published)) return published;
  const created = Date.parse(signal.created_at || "");
  return Number.isFinite(created) ? created : 0;
}

function approvedSignals(): RawSignal[] {
  return safeArray<RawSignal>(rawSignals)
    .filter((signal) => signal.status === "approved")
    .sort((a, b) => signalSortTimestamp(b) - signalSortTimestamp(a));
}

function homepageCandidateSortValue(signal: RawSignal): number {
  if (signal.homepage_candidate === true) return 2;
  if (signal.homepage_candidate === "unknown") return 1;
  return 0;
}

function visibleHomepageCandidateSignals(): RawSignal[] {
  return approvedSignals()
    .filter((signal) =>
      (!homepageCandidateFilters.candidate.value || homepageCandidateFilterValue(signal.homepage_candidate) === homepageCandidateFilters.candidate.value)
      && (!homepageCandidateFilters.mediaOnly.checked || safeArray<string>(signal.media_urls).length > 0)
      && (!homepageCandidateFilters.category.value || signal.homepage_category === homepageCandidateFilters.category.value)
      && (!homepageCandidateFilters.visualAssetType.value || signal.visual_asset_type === homepageCandidateFilters.visualAssetType.value)
      && (!homepageCandidateFilters.conceptOnly.checked || signal.is_concept))
    .sort((a, b) =>
      homepageCandidateSortValue(b) - homepageCandidateSortValue(a)
      || Number(Boolean(b.media_urls.length)) - Number(Boolean(a.media_urls.length))
      || b.homepage_score - a.homepage_score
      || signalSortTimestamp(b) - signalSortTimestamp(a));
}

function renderApprovedSignals(): void {
  const approved = approvedSignals();
  const all = safeArray<RawSignal>(rawSignals);
  $("#approvedSignalCount").textContent = `${approved.length} approved`;
  $("#approvedSignalStats").innerHTML = [
    [approved.length, "Total Approved"],
    [all.filter((item) => item.status === "rejected").length, "Rejected"],
    [all.filter((item) => item.status === "archived").length, "Archived"],
    [all.filter((item) => item.status === "discovered").length, "Discovered"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#approvedSignalGallery").innerHTML = approved.length ? approved.map((signal) => `<a class="approved-signal-card" href="${escapeHtml(signal.signal_url)}" target="_blank" rel="noreferrer">
    ${mediaPreview(signal, false)}
    <div class="approved-signal-copy">
      <div class="raw-signal-meta"><span>${escapeHtml(signal.product)}</span><span>${escapeHtml(signal.source_type)}</span><span>${formatTime(signal.published_at || signal.created_at)}</span><span>Q${Math.round(signal.quality_score ?? 0)}</span></div>
      <h3>${escapeHtml(signal.title || "Untitled signal")}</h3>
    </div>
  </a>`).join("") : `<div class="empty-state">No approved signals yet.</div>`;
}

function homepageSelect<T extends string>(values: T[], selected: T, field: string): string {
  return `<select data-homepage-field="${field}">${values.map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`).join("")}</select>`;
}

function homepageCriteriaControls(signal: RawSignal): string {
  return `<div class="homepage-score-breakdown">
    <div class="homepage-score-head">
      <strong>首页评分 ${signal.homepage_score}/5</strong>
      <span class="homepage-recommendation ${homepageRecommendation(signal.homepage_score)}">${signal.homepage_score >= 3 ? "推荐" : "不推荐"}</span>
    </div>
    ${homepageReviewCriteria.map((criterion) => `<label class="homepage-criterion"><input data-homepage-criterion="${criterion}" type="checkbox" ${signal.homepage_criteria[criterion] ? "checked" : ""}/><span>${homepageCriteriaLabels[criterion]}</span><strong>${signal.homepage_criteria[criterion] ? "✓" : "✗"}</strong></label>`).join("")}
  </div>`;
}

function renderHomepageCandidates(): void {
  fillHomepageCandidateFilters();
  const approved = approvedSignals();
  const visible = visibleHomepageCandidateSignals();
  $("#homepageCandidateCount").textContent = `${visible.length} / ${approved.length} 条已审核信号`;
  $("#homepageCandidateStats").innerHTML = [
    [approved.length, "已通过信号"],
    [approved.filter((item) => item.homepage_candidate === true).length, "首页候选"],
    [approved.filter((item) => item.homepage_candidate === false).length, "非首页候选"],
    [approved.filter((item) => item.homepage_candidate === "unknown").length, "未判断"],
    [approved.filter((item) => item.homepage_score >= 3).length, "推荐"],
    [approved.filter((item) => item.homepage_score < 3).length, "不推荐"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#homepageCandidateList").innerHTML = visible.length ? visible.map((signal) => `<article class="homepage-candidate-card" data-homepage-signal-id="${escapeHtml(signal.id)}">
    ${mediaPreview(signal, false)}
    <div class="homepage-candidate-main">
      <div class="raw-signal-meta"><span>${escapeHtml(signal.product)}</span><span>${escapeHtml(signal.source_type)}</span><span>${formatTime(signal.published_at || signal.created_at)}</span><span>Q${Math.round(signal.quality_score ?? 0)}</span><span>${escapeHtml(homepageCandidateFilterValue(signal.homepage_candidate))}</span><span>${escapeHtml(signal.homepage_category)}</span><span>${escapeHtml(signal.visual_asset_type)}</span>${signal.is_concept ? "<span>Concept</span>" : ""}</div>
      <h3>${escapeHtml(signal.title || "Untitled signal")}</h3>
      <p>${escapeHtml(signal.description || signal.raw_text.slice(0, 260))}</p>
      <a class="mini-button homepage-signal-link" href="${escapeHtml(signal.signal_url)}" target="_blank" rel="noreferrer">查看原文</a>
    </div>
    <div class="homepage-review-controls">
      <label>首页候选${homepageSelect(homepageCandidateStatuses, homepageCandidateFilterValue(signal.homepage_candidate), "homepage_candidate")}</label>
      <label>分类${homepageSelect(homepageCategories, signal.homepage_category, "homepage_category")}</label>
      <label>视觉类型${homepageSelect(visualAssetTypes, signal.visual_asset_type, "visual_asset_type")}</label>
      <label class="check-label"><input data-homepage-field="is_concept" type="checkbox" ${signal.is_concept ? "checked" : ""}/>概念稿</label>
      ${homepageCriteriaControls(signal)}
      <label class="homepage-reasons">入选理由<textarea data-homepage-field="homepage_reasons" rows="3" placeholder="每行一个理由">${escapeHtml(signal.homepage_reasons.join("\n"))}</textarea></label>
      <button class="mini-button" data-homepage-action="save">保存首页审核</button>
    </div>
  </article>`).join("") : `<div class="empty-state">没有符合筛选条件的已审核信号。</div>`;
}

function renderRawSignals(): void {
  fillRawSignalFilters();
  const visible = visibleRawSignals();
  const all = safeArray<RawSignal>(rawSignals);
  $("#rawSignalCount").textContent = `${visible.length} / ${all.length} signals`;
  $("#rawSignalStats").innerHTML = [
    [all.length, "Total Signals"],
    [all.filter((item) => item.status === "approved").length, "Approved"],
    [all.filter((item) => item.image_count > 0).length, "Signals With Screenshots"],
    [all.filter((item) => item.video_count > 0).length, "Signals With Video"],
    [all.filter((item) => item.gif_count > 0).length, "Signals With GIF"],
    [all.filter((item) => item.status === "approved" && item.homepage_candidate === true && item.homepage_score >= 3 && item.has_visual_signal).length, "Homepage-qualified Visual"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#rawSignalList").innerHTML = visible.length ? visible.map((signal) => `<article class="raw-signal-card">
    ${mediaPreview(signal)}
    <div class="raw-signal-body">
      <div class="raw-signal-meta"><span>${escapeHtml(signal.product)}</span><span>${escapeHtml(signal.source_type)}</span><span>${formatTime(signal.published_at)}</span><span>Q${Math.round(signal.quality_score ?? 0)}</span><span>M${signal.media_count} · I${signal.image_count} · V${signal.video_count} · G${signal.gif_count}</span><span class="review-status ${escapeHtml(signal.status)}">${escapeHtml(signal.status)}</span></div>
      <h3>${escapeHtml(signal.title || "Untitled signal")}</h3>
      <p>${escapeHtml(signal.description || signal.raw_text.slice(0, 220))}</p>
      <div class="raw-signal-actions"><a class="mini-button" href="${escapeHtml(signal.signal_url)}" target="_blank" rel="noreferrer">Open Signal</a>${rawSignalActions(signal)}</div>
    </div>
  </article>`).join("") : `<div class="empty-state">No raw signals match the current filters.</div>`;
  renderApprovedSignals();
  renderHomepageCandidates();
}

function renderUrlCell(source: Source, type: SourceType, label: string, field: keyof Source): string {
  const url = String(source[field] ?? "");
  if (!url) return `<div class="url-cell"><div class="url-head"><span class="url-type">${label}</span></div><div class="empty-url">未配置 URL</div></div>`;
  const health = healthFor(source.id, type);
  const review = reviewFor(source.id, type);
  const state = health?.state ?? "unchecked";
  const mediaAuto = health?.has_image_hint || health?.has_video_hint;
  return `<div class="url-cell">
    <div class="url-head"><span class="url-type">${label}</span><span class="health ${state}">${stateLabel(health?.state)}</span></div>
    <div class="url-value" title="${escapeHtml(url)}">${escapeHtml(health?.title || url)}</div>
    <div class="url-time">${escapeHtml(formatTime(health?.checked_at))}${health?.status_code ? ` · ${health.status_code}` : ""}</div>
    <div class="url-actions">
      <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">打开原链接</a>
      <label class="check-label"><input data-review="verified" data-id="${source.id}" data-type="${type}" type="checkbox" ${review?.manual_verified ? "checked" : ""}/>URL 正确</label>
      <label class="check-label" title="${mediaAuto ? "自动检查已发现媒体线索" : ""}"><input data-review="media" data-id="${source.id}" data-type="${type}" type="checkbox" ${review?.media_marked ? "checked" : ""}/>有媒体${mediaAuto ? " · auto" : ""}</label>
    </div>
  </div>`;
}

function filteredSources(): Source[] {
  const query = filters.search.value.trim().toLowerCase();
  const pattern = filters.pattern.value.trim().toLowerCase();
  return safeArray<Source>(snapshot.sources).filter((source) => {
    const audit = auditFor(source);
    const priority = filters.collectorPriority.value;
    return (
    (!query || source.product_name.toLowerCase().includes(query) || source.slug.toLowerCase().includes(query)) &&
    (!filters.category.value || source.category === filters.category.value) &&
    (!filters.status.value || source.status === filters.status.value) &&
    (!filters.frequency.value || source.scan_frequency === filters.frequency.value) &&
    (!filters.reviewStatus.value || source.review_status === filters.reviewStatus.value) &&
    (!filters.mediaScore.value || source.media_score === Number(filters.mediaScore.value)) &&
    (!filters.signalScore.value || source.signal_score === Number(filters.signalScore.value)) &&
    (!pattern || source.design_pattern.toLowerCase().includes(pattern)) &&
    (!filters.updatesZero.checked || audit?.updates_30d === 0) &&
    (!filters.auditMedia.checked || Boolean(audit && audit.media_score >= 4)) &&
    (!priority || (priority === "medium_low" ? audit?.collector_priority === "medium" || audit?.collector_priority === "low" : audit?.collector_priority === priority)) &&
    (!filters.hasError.checked || sourceHasError(source)) &&
    (!filters.pending.checked || isPending(source))
    );
  });
}

function render(): void {
  const visible = filteredSources();
  const allSources = safeArray<Source>(snapshot.sources);
  const allHealth = safeArray<Health>(snapshot.health);
  const active = allSources.filter((item) => item.status === "active").length;
  const pending = allSources.filter(isPending).length;
  const reachable = allHealth.filter((item) => item.ok).length;
  $("#stats").innerHTML = [
    [allSources.length, "全部 Sources"], [active, "Active"], [pending, "待人工校对"], [reachable, "可访问 URL"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#resultCount").textContent = `显示 ${visible.length} / ${allSources.length} 个产品`;
  const latest = allHealth.map((item) => item.checked_at).sort().at(-1);
  $("#lastScan").textContent = latest ? `最近巡检 ${formatTime(latest)}` : "尚未运行巡检";
  sourceList.innerHTML = visible.length ? visible.map((source) => `<article class="source-card">
    <div class="source-main">
      <div class="product-name"><span class="product-mark">${escapeHtml(source.product_name[0])}</span><div><strong>${escapeHtml(source.product_name)}</strong><small>${escapeHtml(source.slug)}</small></div></div>
      <span class="tag">${escapeHtml(source.category)}</span>
      <span class="source-summary" title="${escapeHtml(productSources(source).map((item) => `${item.type}:${purposeList(item).join("+")}`).join(", ") || safeArray<RegistrySourceType>(source.source_types).join(", "))}">${escapeHtml(source.design_pattern || "未定义模式")}</span>
      <span class="priority">M${source.media_score} · S${source.signal_score}</span>
      <span class="review-status ${source.review_status}">${escapeHtml(source.review_status)}</span>
      <div class="card-actions"><button class="mini-button" data-action="inspect" data-id="${source.id}">查看信号源</button><button class="mini-button" data-action="toggle" data-id="${source.id}">${source.status === "paused" ? "恢复" : "暂停"}</button><button class="mini-button" data-action="edit" data-id="${source.id}">编辑</button><button class="mini-button" data-action="delete" data-id="${source.id}">删除</button></div>
    </div>
    <div class="url-grid">${sourceTypes.map(({ type, label, field }) => renderUrlCell(source, type, label, field)).join("")}</div>
  </article>`).join("") : `<div class="empty-state">没有符合当前筛选条件的 Source。</div>`;
  renderRawSignals();
  renderCoverage();
}

function fillSelects(): void {
  filters.category.insertAdjacentHTML("beforeend", categories.map((value) => `<option>${value}</option>`).join(""));
  filters.status.insertAdjacentHTML("beforeend", ["active", "paused", "deprecated"].map((value) => `<option>${value}</option>`).join(""));
  filters.frequency.insertAdjacentHTML("beforeend", ["daily", "weekly", "manual"].map((value) => `<option>${value}</option>`).join(""));
  filters.reviewStatus.insertAdjacentHTML("beforeend", ["pending", "verified", "rejected"].map((value) => `<option>${value}</option>`).join(""));
  const scoreOptions = [1, 2, 3, 4, 5].map((value) => `<option value="${value}">${value}</option>`).join("");
  filters.mediaScore.insertAdjacentHTML("beforeend", scoreOptions);
  filters.signalScore.insertAdjacentHTML("beforeend", scoreOptions);
  (form.elements.namedItem("category") as HTMLSelectElement).innerHTML = categories.map((value) => `<option>${value}</option>`).join("");
  (form.elements.namedItem("scan_frequency") as HTMLSelectElement).innerHTML = ["daily", "weekly", "manual"].map((value) => `<option>${value}</option>`).join("");
  (form.elements.namedItem("status") as HTMLSelectElement).innerHTML = ["active", "paused", "deprecated"].map((value) => `<option>${value}</option>`).join("");
  (form.elements.namedItem("review_status") as HTMLSelectElement).innerHTML = ["pending", "verified", "rejected"].map((value) => `<option>${value}</option>`).join("");
  (form.elements.namedItem("github_type") as HTMLSelectElement).innerHTML = ["repo", "org", "none"].map((value) => `<option>${value}</option>`).join("");
  for (const name of ["source_priority", "media_likelihood", "media_score", "signal_score"]) (form.elements.namedItem(name) as HTMLSelectElement).innerHTML = [1, 2, 3, 4, 5].map((value) => `<option>${value}</option>`).join("");
}

function openForm(source?: Source): void {
  form.reset();
  $("#dialogHeading").textContent = source ? "编辑 Source" : "新增 Source";
  if (source) for (const [key, value] of Object.entries(source)) { const field = form.elements.namedItem(key) as HTMLInputElement | null; if (field) field.value = Array.isArray(value) ? value.join(", ") : String(value); }
  else { for (const name of ["source_priority", "media_likelihood", "media_score", "signal_score"]) (form.elements.namedItem(name) as HTMLSelectElement).value = "3"; (form.elements.namedItem("scan_frequency") as HTMLSelectElement).value = "weekly"; (form.elements.namedItem("review_status") as HTMLSelectElement).value = "pending"; (form.elements.namedItem("github_type") as HTMLSelectElement).value = "none"; }
  window.setTimeout(() => { if (!dialog.open) dialog.showModal(); }, 0);
}

async function load(): Promise<void> {
  const [registry, signals] = await Promise.all([
    api<unknown>("/api/registry"),
    api<unknown>("/api/raw-signals"),
  ]);
  snapshot = normalizeSnapshot(registry);
  rawSignals = safeArray<RawSignal>(signals).map(normalizeRawSignal);
  render();
}
async function reloadInspector(): Promise<void> {
  await load();
  const source = snapshotSources().find((item) => item.id === currentInspectorId);
  if (source && inspectorDialog.open) renderInspector(source);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data: Record<string, unknown> = Object.fromEntries(new FormData(form));
  const id = String(data.id ?? "");
  delete data.id;
  data.source_priority = Number(data.source_priority); data.media_likelihood = Number(data.media_likelihood); data.media_score = Number(data.media_score); data.signal_score = Number(data.signal_score);
  data.source_types = String(data.source_types ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  try { await api(id ? `/api/sources/${encodeURIComponent(id)}` : "/api/sources", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }); dialog.close(); await load(); toast("Source 已保存"); } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});

sourceList.addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!button) return;
  const source = snapshotSources().find((item) => item.id === button.dataset.id); if (!source) return;
  try {
    if (button.dataset.action === "inspect") openInspector(source.id);
    if (button.dataset.action === "edit") openForm(source);
    if (button.dataset.action === "toggle") { await api(`/api/sources/${source.id}`, { method: "PUT", body: JSON.stringify({ status: source.status === "paused" ? "active" : "paused" }) }); await load(); }
    if (button.dataset.action === "delete" && await confirmAction(`删除 ${source.product_name}？此操作不可撤销。`)) { await api(`/api/sources/${source.id}`, { method: "DELETE" }); await load(); toast("Source 已删除"); }
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});

sourceList.addEventListener("change", async (event) => {
  const input = (event.target as HTMLElement).closest<HTMLInputElement>("input[data-review]"); if (!input) return;
  const existing = reviewFor(input.dataset.id!, input.dataset.type as SourceType);
  const body = { manual_verified: input.dataset.review === "verified" ? input.checked : Boolean(existing?.manual_verified), media_marked: input.dataset.review === "media" ? input.checked : Boolean(existing?.media_marked) };
  try { await api(`/api/reviews/${input.dataset.id}/${input.dataset.type}`, { method: "PUT", body: JSON.stringify(body) }); await load(); } catch (error) { input.checked = !input.checked; toast(error instanceof Error ? error.message : String(error)); }
});

Object.values(filters).forEach((element) => element.addEventListener("input", render));
Object.values(coverageFilters).forEach((element) => element.addEventListener("input", renderCoverage));
Object.values(rawSignalFilters).forEach((element) => element.addEventListener("input", renderRawSignals));
Object.values(homepageCandidateFilters).forEach((element) => element.addEventListener("input", renderHomepageCandidates));
$("#rawSignalList").addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-raw-signal-action]");
  if (!button) return;
  const id = button.dataset.id ?? "";
  const status = button.dataset.rawSignalAction as RawSignalStatus;
  try {
    const updated = await api<RawSignal>(`/api/raw-signals/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    rawSignals = rawSignals.map((item) => item.id === updated.id ? updated : item);
    renderRawSignals();
    toast(`Raw signal marked ${status}`);
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
});
$("#homepageCandidateList").addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-homepage-action='save']");
  if (!button) return;
  const card = button.closest<HTMLElement>("[data-homepage-signal-id]");
  const id = card?.dataset.homepageSignalId;
  if (!card || !id) return;
  const reasons = card.querySelector<HTMLTextAreaElement>("[data-homepage-field='homepage_reasons']")!.value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const homepageCriteria = Object.fromEntries(homepageReviewCriteria.map((criterion) => [
    criterion,
    card.querySelector<HTMLInputElement>(`[data-homepage-criterion='${criterion}']`)?.checked ? 1 : 0,
  ])) as HomepageReviewCriteria;
  const body = {
    homepage_candidate: parseHomepageCandidateValue(card.querySelector<HTMLSelectElement>("[data-homepage-field='homepage_candidate']")!.value),
    homepage_category: card.querySelector<HTMLSelectElement>("[data-homepage-field='homepage_category']")!.value,
    visual_asset_type: card.querySelector<HTMLSelectElement>("[data-homepage-field='visual_asset_type']")!.value,
    homepage_criteria: homepageCriteria,
    is_concept: card.querySelector<HTMLInputElement>("[data-homepage-field='is_concept']")!.checked,
    homepage_reasons: reasons,
  };
  try {
    const updated = normalizeRawSignal(await api<RawSignal>(`/api/raw-signals/${encodeURIComponent(id)}/homepage-review`, { method: "PUT", body: JSON.stringify(body) }));
    rawSignals = rawSignals.map((item) => item.id === updated.id ? updated : item);
    renderRawSignals();
    toast("Homepage candidate review saved");
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
});
$("#coverageTable").addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const sortButton = target.closest<HTMLButtonElement>("button[data-coverage-sort]");
  if (sortButton) {
    const key = sortButton.dataset.coverageSort as CoverageSortKey;
    coverageSort = coverageSort.key === key
      ? { key, direction: coverageSort.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "desc" };
    renderCoverage();
    return;
  }
  const inspectButton = target.closest<HTMLButtonElement>("button[data-coverage-inspect]");
  if (inspectButton?.dataset.coverageInspect) openInspector(inspectButton.dataset.coverageInspect);
});
$("#addButton").addEventListener("click", () => openForm());
function closeDialog(event: Event, target: HTMLDialogElement): void {
  event.preventDefault();
  event.stopPropagation();
  if (target.open) target.close();
}
$("#closeSourceDialog").addEventListener("click", (event) => closeDialog(event, dialog));
$("#closeInspector").addEventListener("click", (event) => {
  addingFormalSource = false;
  closeDialog(event, inspectorDialog);
});
function navigateInspector(direction: -1 | 1): void {
  const order = visibleCoverage();
  const index = order.findIndex((item) => item.source_id === currentInspectorId);
  const target = order[index + direction];
  if (target) openInspector(target.source_id || target.product_name);
}
$("#previousProduct").addEventListener("click", () => navigateInspector(-1));
$("#nextProduct").addEventListener("click", () => navigateInspector(1));
$("#addFormalSource").addEventListener("click", () => {
  const source = snapshotSources().find((item) => item.id === currentInspectorId);
  if (!source) return;
  addingFormalSource = true;
  setPurposeGroupCollapsed(source.id, "identity", false);
  renderFormalSources(source);
});
$("#formalSourceEditor").addEventListener("click", async (event) => {
  const toggle = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-purpose-toggle]");
  if (toggle && currentInspectorId) {
    const group = toggle.closest<HTMLElement>("[data-purpose-group]");
    const purpose = toggle.dataset.purposeToggle as ProductSource["purpose"];
    if (!group || !purpose) return;
    togglePurposeGroup(group, purpose);
    return;
  }
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-formal-action]");
  if (!button || !currentInspectorId) return;
  const card = button.closest<HTMLElement>("[data-formal-source-id]");
  if (!card) return;
  const sourceId = card.dataset.formalSourceId ?? "";
  const action = button.dataset.formalAction;
  if (action === "cancel") {
    addingFormalSource = false;
    const source = snapshotSources().find((item) => item.id === currentInspectorId);
    if (source) renderFormalSources(source);
    return;
  }
  try {
    if (action === "delete") {
      if (!await confirmAction("删除这个正式 Source？此操作不可撤销。")) return;
      const locator = {
        id: sourceId,
        url: card.querySelector<HTMLInputElement>("[data-formal-field='url']")!.value.trim(),
        type: card.querySelector<HTMLSelectElement>("[data-formal-field='type']")!.value,
        purpose: card.querySelector<HTMLSelectElement>("[data-formal-field='primary_purpose']")!.value,
      };
      const updated = await api<Source>(`/api/products/${encodeURIComponent(currentInspectorId)}/sources`, { method: "DELETE", body: JSON.stringify(locator) });
      snapshot.sources = snapshotSources().map((item) => item.id === updated.id ? updated : item);
      renderFormalSources(updated);
      toast("正式 Source 已删除");
    } else {
      const primaryPurposeValue = card.querySelector<HTMLSelectElement>("[data-formal-field='primary_purpose']")!.value as ProductSourcePurpose;
      const purposes = selectedPurposes(card, "input[data-formal-purpose]", primaryPurposeValue);
      const body = {
        url: card.querySelector<HTMLInputElement>("[data-formal-field='url']")!.value.trim(),
        type: card.querySelector<HTMLSelectElement>("[data-formal-field='type']")!.value,
        purpose: primaryPurposeValue,
        primary_purpose: primaryPurposeValue,
        purposes,
        access_type: card.querySelector<HTMLSelectElement>("[data-formal-field='access_type']")!.value,
        priority: Number(card.querySelector<HTMLSelectElement>("[data-formal-field='priority']")!.value),
        status: card.querySelector<HTMLSelectElement>("[data-formal-field='status']")!.value,
      };
      if (!body.url) throw new Error("URL is required");
      const endpoint = sourceId
        ? `/api/products/${encodeURIComponent(currentInspectorId)}/sources/${encodeURIComponent(sourceId)}`
        : `/api/products/${encodeURIComponent(currentInspectorId)}/sources`;
      const updated = await api<Source>(endpoint, { method: sourceId ? "PUT" : "POST", body: JSON.stringify(body) });
      snapshot.sources = snapshotSources().map((item) => item.id === updated.id ? updated : item);
      renderFormalSources(updated);
      toast(sourceId ? "正式 Source 已保存" : "正式 Source 已添加");
    }
    addingFormalSource = false;
    await reloadInspector();
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});
$("#formalSourceEditor").addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const card = target.closest<HTMLElement>("[data-formal-source-id]");
  if (!card) return;
  const primarySelect = card.querySelector<HTMLSelectElement>("[data-formal-field='primary_purpose']");
  if (!primarySelect) return;
  if (target.matches("[data-formal-field='primary_purpose']")) {
    const checkbox = card.querySelector<HTMLInputElement>(`input[data-formal-purpose="${primarySelect.value}"]`);
    if (checkbox) checkbox.checked = true;
  } else if (target.matches("input[data-formal-purpose]") && !target.checked && target.dataset.formalPurpose === primarySelect.value) {
    target.checked = true;
  } else if (target.matches("[data-formal-field='type']")) {
    const accessSelect = card.querySelector<HTMLSelectElement>("[data-formal-field='access_type']");
    if (accessSelect) accessSelect.value = defaultAccessType(target.value);
  }
  if (target.matches("[data-formal-field='type'], [data-formal-field='access_type']")) {
    const badgeHost = card.querySelector<HTMLElement>(".access-type-badge");
    const accessSelect = card.querySelector<HTMLSelectElement>("[data-formal-field='access_type']");
    const typeSelect = card.querySelector<HTMLSelectElement>("[data-formal-field='type']");
    if (badgeHost && accessSelect && typeSelect) {
      const accessType = normalizeAccessType({ type: typeSelect.value, access_type: accessSelect.value });
      badgeHost.className = `access-type-badge ${accessType}`;
      badgeHost.textContent = accessLabels[accessType];
    }
  }
});
let draggedFormalSourceId = "";
let draggedFormalSourcePurpose: ProductSource["purpose"] | "" = "";
let formalSourceDropIndicator: HTMLElement | null = null;
let formalSourceDropTargetId = "";
let formalSourceDropPosition: "before" | "after" = "before";
let formalSourceAutoScrollFrame = 0;
let formalSourceAutoScrollSpeed = 0;
let pointerDraggingFormalSource = false;

function clearFormalSourceDropState(): void {
  formalSourceDropIndicator?.remove();
  formalSourceDropIndicator = null;
  formalSourceDropTargetId = "";
  formalSourceDropPosition = "before";
  formalSourceAutoScrollSpeed = 0;
  if (formalSourceAutoScrollFrame) window.cancelAnimationFrame(formalSourceAutoScrollFrame);
  formalSourceAutoScrollFrame = 0;
  $("#formalSourceEditor").querySelectorAll(".dragging").forEach((item) => item.classList.remove("dragging"));
  $("#formalSourceEditor").querySelectorAll(".drop-disabled").forEach((item) => item.classList.remove("drop-disabled"));
}

function positionFormalSourceDropIndicator(target: HTMLElement, position: "before" | "after"): void {
  const list = target.parentElement;
  if (!list) return;
  if (!formalSourceDropIndicator) {
    formalSourceDropIndicator = document.createElement("div");
    formalSourceDropIndicator.className = "formal-source-drop-indicator";
    formalSourceDropIndicator.innerHTML = "<span>Drop Here</span>";
    formalSourceDropIndicator.setAttribute("role", "presentation");
  }
  formalSourceDropTargetId = target.dataset.formalSourceId ?? "";
  formalSourceDropPosition = position;
  formalSourceDropIndicator.dataset.targetId = formalSourceDropTargetId;
  formalSourceDropIndicator.dataset.position = position;
  formalSourceDropIndicator.setAttribute("aria-label", `Insert ${position} target source`);
  if (formalSourceDropIndicator.parentElement !== list) list.append(formalSourceDropIndicator);
  const listBox = list.getBoundingClientRect();
  const targetBox = target.getBoundingClientRect();
  const boundary = position === "before" ? targetBox.top : targetBox.bottom;
  formalSourceDropIndicator.style.top = `${boundary - listBox.top + list.scrollTop}px`;
}

function runFormalSourceAutoScroll(): void {
  if (!formalSourceAutoScrollSpeed) {
    formalSourceAutoScrollFrame = 0;
    return;
  }
  const dialog = $("#inspectorDialog") as HTMLDialogElement;
  dialog.scrollBy({ top: formalSourceAutoScrollSpeed, behavior: "auto" });
  formalSourceAutoScrollFrame = window.requestAnimationFrame(runFormalSourceAutoScroll);
}

function updateFormalSourceAutoScroll(clientY: number): void {
  const dialog = $("#inspectorDialog") as HTMLDialogElement;
  const bounds = dialog.getBoundingClientRect();
  const edgeSize = Math.min(88, bounds.height * 0.18);
  if (clientY < bounds.top + edgeSize) {
    formalSourceAutoScrollSpeed = -Math.max(4, Math.round((bounds.top + edgeSize - clientY) / 4));
  } else if (clientY > bounds.bottom - edgeSize) {
    formalSourceAutoScrollSpeed = Math.max(4, Math.round((clientY - (bounds.bottom - edgeSize)) / 4));
  } else {
    formalSourceAutoScrollSpeed = 0;
  }
  if (formalSourceAutoScrollSpeed && !formalSourceAutoScrollFrame) {
    formalSourceAutoScrollFrame = window.requestAnimationFrame(runFormalSourceAutoScroll);
  }
}

$("#formalSourceEditor").addEventListener("dragstart", (event) => {
  const handle = (event.target as HTMLElement).closest<HTMLElement>(".formal-source-handle[draggable='true']");
  const card = handle?.closest<HTMLElement>("[data-formal-source-id]");
  if (!card?.dataset.formalSourceId) return;
  draggedFormalSourceId = card.dataset.formalSourceId;
  draggedFormalSourcePurpose = card.closest<HTMLElement>("[data-purpose-group]")?.dataset.purposeGroup as ProductSource["purpose"] ?? "";
  card.classList.add("dragging");
  event.dataTransfer?.setData("text/plain", draggedFormalSourceId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
});
$("#formalSourceEditor").addEventListener("dragover", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-formal-source-id]");
  if (!draggedFormalSourceId || !target?.dataset.formalSourceId) return;
  const targetPurpose = target.closest<HTMLElement>("[data-purpose-group]")?.dataset.purposeGroup;
  if (!draggedFormalSourcePurpose || targetPurpose !== draggedFormalSourcePurpose) {
    $("#formalSourceEditor").querySelectorAll(".drop-disabled").forEach((item) => item.classList.remove("drop-disabled"));
    target.closest<HTMLElement>("[data-purpose-group]")?.classList.add("drop-disabled");
    formalSourceDropIndicator?.remove();
    formalSourceDropIndicator = null;
    if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
    return;
  }
  $("#formalSourceEditor").querySelectorAll(".drop-disabled").forEach((item) => item.classList.remove("drop-disabled"));
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  updateFormalSourceAutoScroll(event.clientY);
  if (target.dataset.formalSourceId === draggedFormalSourceId) return;
  const targetBox = target.getBoundingClientRect();
  positionFormalSourceDropIndicator(target, event.clientY < targetBox.top + targetBox.height / 2 ? "before" : "after");
});
$("#formalSourceEditor").addEventListener("drop", async (event) => {
  event.preventDefault();
  await commitFormalSourceDrop();
});

async function commitFormalSourceDrop(): Promise<void> {
  const list = formalSourceDropIndicator?.parentElement;
  const dragged = list?.querySelector<HTMLElement>(`[data-formal-source-id="${CSS.escape(draggedFormalSourceId)}"]`);
  const target = list?.querySelector<HTMLElement>(`[data-formal-source-id="${CSS.escape(formalSourceDropTargetId)}"]`);
  if (!list || !dragged || !target || !formalSourceDropIndicator) return;
  list.insertBefore(dragged, formalSourceDropPosition === "before" ? target : target.nextSibling);
  formalSourceDropIndicator.remove();
  formalSourceDropIndicator = null;
  const groupSourceIds = Array.from(list.querySelectorAll<HTMLElement>("[data-formal-source-id]"))
    .map((item) => item.dataset.formalSourceId ?? "")
    .filter(Boolean);
  const source = snapshotSources().find((item) => item.id === currentInspectorId);
  if (!source || !draggedFormalSourcePurpose) return;
  let groupIndex = 0;
  const sourceIds = productSources(source).map((item) => primaryPurpose(item) === draggedFormalSourcePurpose ? groupSourceIds[groupIndex++]! : item.id);
  list.classList.add("saving-order");
  try {
    const updated = await api<Source>(`/api/products/${encodeURIComponent(currentInspectorId)}/sources/order`, { method: "PUT", body: JSON.stringify({ source_ids: sourceIds }) });
    snapshot.sources = snapshotSources().map((item) => item.id === updated.id ? updated : item);
    renderFormalSources(updated);
    await load();
    const refreshed = snapshotSources().find((item) => item.id === currentInspectorId);
    if (refreshed && inspectorDialog.open) renderInspector(refreshed);
    toast("Formal Sources 顺序已保存");
  } catch (error) {
    const source = snapshotSources().find((item) => item.id === currentInspectorId);
    if (source) renderFormalSources(source);
    toast(error instanceof Error ? error.message : String(error));
  } finally {
    clearFormalSourceDropState();
    draggedFormalSourceId = "";
    draggedFormalSourcePurpose = "";
  }
}

$("#formalSourceEditor").addEventListener("pointerdown", (event) => {
  const handle = (event.target as HTMLElement).closest<HTMLElement>(".formal-source-handle");
  const card = handle?.closest<HTMLElement>("[data-formal-source-id]");
  if (!handle || !card?.dataset.formalSourceId) return;
  pointerDraggingFormalSource = true;
  draggedFormalSourceId = card.dataset.formalSourceId;
  draggedFormalSourcePurpose = card.closest<HTMLElement>("[data-purpose-group]")?.dataset.purposeGroup as ProductSource["purpose"] ?? "";
  card.classList.add("dragging");
  try { handle.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
  event.preventDefault();
});

$("#formalSourceEditor").addEventListener("pointermove", (event) => {
  if (!pointerDraggingFormalSource || !draggedFormalSourceId) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-formal-source-id]");
  if (!target?.dataset.formalSourceId || target.dataset.formalSourceId === draggedFormalSourceId) return;
  const targetPurpose = target.closest<HTMLElement>("[data-purpose-group]")?.dataset.purposeGroup;
  if (targetPurpose !== draggedFormalSourcePurpose) {
    formalSourceDropIndicator?.remove();
    formalSourceDropIndicator = null;
    return;
  }
  updateFormalSourceAutoScroll(event.clientY);
  const targetBox = target.getBoundingClientRect();
  positionFormalSourceDropIndicator(target, event.clientY < targetBox.top + targetBox.height / 2 ? "before" : "after");
  event.preventDefault();
});

$("#formalSourceEditor").addEventListener("pointerup", async () => {
  if (!pointerDraggingFormalSource) return;
  pointerDraggingFormalSource = false;
  if (formalSourceDropIndicator) await commitFormalSourceDrop();
  else clearFormalSourceDropState();
});

$("#formalSourceEditor").addEventListener("pointercancel", () => {
  pointerDraggingFormalSource = false;
  clearFormalSourceDropState();
  draggedFormalSourceId = "";
  draggedFormalSourcePurpose = "";
});
$("#formalSourceEditor").addEventListener("dragend", () => {
  clearFormalSourceDropState();
  draggedFormalSourceId = "";
  draggedFormalSourcePurpose = "";
});
$("#inspectorRecommendations").addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-suggestion-action]");
  if (!button || !currentInspectorId) return;
  const card = button.closest<HTMLElement>("[data-candidate-key]");
  const candidateKey = card?.dataset.candidateKey;
  if (!card || !candidateKey) return;
  const action = button.dataset.suggestionAction;
  try {
    const primaryPurposeValue = card.querySelector<HTMLSelectElement>("[data-candidate-primary-purpose]")!.value as ProductSourcePurpose;
    const purposes = selectedPurposes(card, "input[data-candidate-purpose]", primaryPurposeValue);
    if (action === "save") {
      const url = card.querySelector<HTMLInputElement>("[data-field='url']")!.value.trim();
      const type = card.querySelector<HTMLSelectElement>("[data-field='type']")!.value;
      const access_type = card.querySelector<HTMLSelectElement>("[data-candidate-access-type]")!.value;
      await api(`/api/candidates/${currentInspectorId}/${encodeURIComponent(candidateKey)}`, { method: "PUT", body: JSON.stringify({ url, type, purpose: primaryPurposeValue, primary_purpose: primaryPurposeValue, purposes, access_type }) });
      await reloadInspector();
      toast("候选信号源已更新");
    } else {
      const body = action === "accept" ? {
        url: card.querySelector<HTMLInputElement>("[data-field='url']")!.value.trim(),
        type: card.querySelector<HTMLSelectElement>("[data-field='type']")!.value,
        purpose: primaryPurposeValue,
        primary_purpose: primaryPurposeValue,
        purposes,
        access_type: card.querySelector<HTMLSelectElement>("[data-candidate-access-type]")!.value,
      } : undefined;
      await api(`/api/candidates/${currentInspectorId}/${encodeURIComponent(candidateKey)}/${action}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      toast(action === "accept" ? "候选已加入正式 Source Network" : "候选已拒绝");
    }
    await reloadInspector();
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});
$("#inspectorRecommendations").addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const card = target.closest<HTMLElement>("[data-candidate-key]");
  if (!card) return;
  const primarySelect = card.querySelector<HTMLSelectElement>("[data-candidate-primary-purpose]");
  if (!primarySelect) return;
  if (target.matches("[data-candidate-primary-purpose]")) {
    const checkbox = card.querySelector<HTMLInputElement>(`input[data-candidate-purpose="${primarySelect.value}"]`);
    if (checkbox) checkbox.checked = true;
  } else if (target.matches("input[data-candidate-purpose]") && !target.checked && target.dataset.candidatePurpose === primarySelect.value) {
    target.checked = true;
  } else if (target.matches("[data-field='type']")) {
    const accessSelect = card.querySelector<HTMLSelectElement>("[data-candidate-access-type]");
    if (accessSelect) accessSelect.value = defaultAccessType(target.value);
  }
  if (target.matches("[data-field='type'], [data-candidate-access-type]")) {
    const badgeHost = card.querySelector<HTMLElement>(".access-type-badge");
    const accessSelect = card.querySelector<HTMLSelectElement>("[data-candidate-access-type]");
    const typeSelect = card.querySelector<HTMLSelectElement>("[data-field='type']");
    if (badgeHost && accessSelect && typeSelect) {
      const accessType = normalizeAccessType({ type: typeSelect.value, access_type: accessSelect.value });
      badgeHost.className = `access-type-badge ${accessType}`;
      badgeHost.textContent = accessLabels[accessType];
    }
  }
});
$("#discoverFollowups").addEventListener("click", async () => {
  if (!currentInspectorId) return;
  const button = $("#discoverFollowups") as HTMLButtonElement;
  button.disabled = true; button.textContent = "发现中...";
  try {
    const result = await api<{ discovered: number }>(`/api/sources/${currentInspectorId}/discover-followups`, { method: "POST" });
    await reloadInspector();
    toast(`新增 ${result.discovered} 条候选信号源`);
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
  finally { button.disabled = false; button.textContent = "发现媒体候选"; }
});
$("#scanButton").addEventListener("click", async () => { const button = $("#scanButton") as HTMLButtonElement; button.disabled = true; button.textContent = "巡检中..."; try { await api("/api/scan", { method: "POST" }); await load(); toast("巡检完成"); } catch (error) { toast(error instanceof Error ? error.message : String(error)); } finally { button.disabled = false; button.textContent = "运行巡检"; } });
$("#importButton").addEventListener("click", () => ($("#importFile") as HTMLInputElement).click());
$("#importFile").addEventListener("change", async (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; try { const json = JSON.parse(await file.text()); snapshot = normalizeSnapshot(await api<unknown>("/api/sources/import", { method: "POST", body: JSON.stringify(json) })); render(); toast("JSON 导入完成"); } catch (error) { toast(error instanceof Error ? error.message : String(error)); } });

fillSelects();
load().catch((error) => toast(error instanceof Error ? error.message : String(error)));
