type RawSignalStatus = "discovered" | "pending_review" | "approved" | "rejected" | "archived";
type HomepageCandidateStatus = boolean | "unknown";
type HomepageCategory = "new_ui" | "new_workflow" | "new_interaction_pattern" | "agent_experience" | "canvas_workspace" | "concept" | "unknown";
type VisualAssetType = "video" | "gif" | "screenshot" | "flow_diagram" | "concept_mockup" | "unknown";
type HeroMediaKind = "product_ui" | "workflow_visual" | "concept_mockup" | "generic_cover" | "logo_or_brand" | "unknown";
type HomepageReviewCriterion = "visual_asset_present" | "ui_or_workflow_change" | "reusable_pattern" | "pm_designer_inspiration" | "trusted_source";
type HomepageReviewCriteria = Record<HomepageReviewCriterion, 0 | 1>;

interface RawSignal {
  id: string;
  product: string;
  source_url: string;
  signal_url: string;
  title: string;
  description: string;
  published_at: string;
  raw_text: string;
  media_urls: string[];
  media_types: string[];
  source_type: string;
  status: RawSignalStatus;
  quality_score: number;
  homepage_candidate: HomepageCandidateStatus;
  homepage_criteria: HomepageReviewCriteria;
  homepage_score: number;
  homepage_reasons: string[];
  homepage_category: HomepageCategory;
  is_concept: boolean;
  visual_asset_type: VisualAssetType;
  created_at: string;
  updated_at: string;
}

interface HeroMedia {
  url: string;
  kind: "video" | "gif" | "image" | "none";
  hero_media_kind: HeroMediaKind;
  width?: number;
  height?: number;
  rejected: MediaRejection[];
}

interface MediaRejection {
  url: string;
  reason: string;
}

interface HeroCandidate {
  url: string;
  kind: Exclude<HeroMedia["kind"], "none">;
  priority: number;
  width: number;
  height: number;
  area: number;
  hero_media_kind: HeroMediaKind;
}

const categoryLabels: Record<HomepageCategory, string> = {
  new_ui: "新界面",
  new_workflow: "新工作流",
  new_interaction_pattern: "新交互模式",
  agent_experience: "Agent 表达方式",
  canvas_workspace: "Canvas / 工作区",
  concept: "概念稿",
  unknown: "未分类",
};

const filterCategories: HomepageCategory[] = [
  "new_ui",
  "new_workflow",
  "new_interaction_pattern",
  "agent_experience",
  "canvas_workspace",
  "concept",
];

const mediaPriority: VisualAssetType[] = ["video", "gif", "screenshot", "flow_diagram", "concept_mockup", "unknown"];
const homepageReviewCriteria: HomepageReviewCriterion[] = ["visual_asset_present", "ui_or_workflow_change", "reusable_pattern", "pm_designer_inspiration", "trusted_source"];
const visualAssetLabels: Record<VisualAssetType, string> = {
  video: "视频",
  gif: "GIF",
  screenshot: "产品截图",
  flow_diagram: "流程图",
  concept_mockup: "概念稿",
  unknown: "未知媒体",
};
const heroMediaKindLabels: Record<HeroMediaKind, string> = {
  product_ui: "产品界面图",
  workflow_visual: "工作流视觉",
  concept_mockup: "概念稿",
  generic_cover: "通用封面",
  logo_or_brand: "Logo / 品牌图",
  unknown: "未知",
};

let allSignals: RawSignal[] = [];
let activeCategory: "all" | HomepageCategory = "all";
const heroMediaBySignalId = new Map<string, HeroMedia>();
const brandMediaPattern = /(logo|icon|favicon|avatar|wordmark|company-logo|brand-logo|sprite)/i;
const genericCoverPattern = /(og|social|twitter|card|banner|support|help|cover|brand|placeholder)/i;
const tinyMediaPattern = /(tracking|pixel|blank|transparent|spacer)/i;
const productUiPattern = /(screenshot|demo|ui|interface|app|workspace|canvas|editor|workflow|agent|preview|dashboard|builder|ide|terminal|diff|chat|panel|window)/i;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function parseHomepageCandidate(value: unknown): HomepageCandidateStatus {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return "unknown";
}

function normalizeSignal(signal: RawSignal): RawSignal {
  const homepageCriteria = normalizeHomepageCriteria(signal.homepage_criteria, signal.source_type);
  return {
    ...signal,
    media_urls: safeArray<string>(signal.media_urls),
    media_types: safeArray<string>(signal.media_types),
    homepage_candidate: parseHomepageCandidate(signal.homepage_candidate),
    homepage_criteria: homepageCriteria,
    homepage_score: homepageScore(homepageCriteria),
    homepage_reasons: safeArray<string>(signal.homepage_reasons),
    homepage_category: filterCategories.includes(signal.homepage_category) ? signal.homepage_category : "unknown",
    visual_asset_type: mediaPriority.includes(signal.visual_asset_type) ? signal.visual_asset_type : "unknown",
    is_concept: Boolean(signal.is_concept),
  };
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

function homepageCandidates(): RawSignal[] {
  return allSignals
    .filter((signal) => signal.status === "approved" && signal.homepage_candidate === true && signal.homepage_score >= 3)
    .sort((a, b) =>
      Number(hasMedia(b)) - Number(hasMedia(a))
      || b.homepage_score - a.homepage_score
      || timestamp(b) - timestamp(a));
}

function visibleSignals(): RawSignal[] {
  const candidates = homepageCandidates();
  return activeCategory === "all" ? candidates : candidates.filter((signal) => signal.homepage_category === activeCategory);
}

function timestamp(signal: RawSignal): number {
  return Date.parse(signal.published_at || signal.created_at || signal.updated_at || "") || 0;
}

function hasMedia(signal: RawSignal): boolean {
  return safeArray<string>(signal.media_urls).length > 0;
}

function heroMedia(signal: RawSignal): HeroMedia {
  return heroMediaBySignalId.get(signal.id) ?? { url: "", kind: "none", hero_media_kind: "unknown", rejected: [] };
}

function hasUsableHeroMedia(signal: RawSignal): boolean {
  return heroMedia(signal).kind !== "none";
}

function mediaKindFor(url: string, type = ""): HeroMedia["kind"] {
  const lower = `${url} ${type}`.toLowerCase();
  if (/\.svg(\?|#|$)/.test(lower) || lower.includes("image/svg")) return "none";
  if (/\.(mp4|webm|mov)(\?|#|$)/.test(lower) || lower.includes("video")) return "video";
  if (/\.gif(\?|#|$)/.test(lower) || lower.includes("gif")) return "gif";
  if (url) return "image";
  return "none";
}

function urlBasename(url: string): string {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split("/").pop() ?? parsed.pathname);
  } catch {
    return url;
  }
}

function mediaContext(signal: RawSignal, url: string): string {
  return [
    url,
    urlBasename(url),
    signal.title,
    signal.description,
    signal.source_url,
    signal.signal_url,
    signal.source_type,
  ].join(" ").toLowerCase();
}

function classifyHeroMedia(signal: RawSignal, url: string, kind: HeroMedia["kind"]): HeroMediaKind {
  const context = mediaContext(signal, url);
  if (brandMediaPattern.test(context)) return "logo_or_brand";
  if (genericCoverPattern.test(context)) return "generic_cover";
  if (signal.visual_asset_type === "concept_mockup" || signal.homepage_category === "concept") return "concept_mockup";
  if (productUiPattern.test(context)) {
    return /(workflow|agent|builder|canvas|editor|workspace|dashboard|ide|terminal|diff|chat|panel)/i.test(context)
      ? "workflow_visual"
      : "product_ui";
  }
  if (kind === "video" || kind === "gif") return "workflow_visual";
  return "unknown";
}

function rejectUrlBeforeLoad(signal: RawSignal, url: string, kind: HeroMedia["kind"]): string {
  if (!url.trim()) return "empty media URL";
  if (kind === "none") return "unsupported or SVG media type";
  const context = mediaContext(signal, url);
  if (tinyMediaPattern.test(context)) return "媒体疑似 tracking pixel / blank image";
  if (brandMediaPattern.test(context)) return "媒体疑似 logo / icon / avatar / product wordmark";
  if (genericCoverPattern.test(context)) return "媒体疑似品牌封面 / 支持中心横幅 / OG 社交预览图";
  return "";
}

function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("image failed to load"));
    image.referrerPolicy = "no-referrer";
    image.src = url;
  });
}

async function inspectMediaCandidate(signal: RawSignal, url: string, kind: HeroMedia["kind"], priority: number): Promise<HeroCandidate | MediaRejection> {
  const preReject = rejectUrlBeforeLoad(signal, url, kind);
  if (preReject) return { url, reason: preReject };
  const hero_media_kind = classifyHeroMedia(signal, url, kind);
  if (!["product_ui", "workflow_visual", "concept_mockup"].includes(hero_media_kind)) return { url, reason: `未识别为产品界面图（${heroMediaKindLabels[hero_media_kind]}）` };
  if (kind === "video") return { url, kind, priority, width: 1280, height: 720, area: 921600, hero_media_kind };
  try {
    const { width, height } = await imageDimensions(url);
    if (width <= 2 || height <= 2) return { url, reason: `疑似 tracking pixel 或空白图 (${width}x${height})` };
    if (width < 360 || height < 180 || width * height < 120000) return { url, reason: `尺寸过小，不适合首页产品图 (${width}x${height})` };
    return { url, kind: kind === "gif" ? "gif" : "image", priority, width, height, area: width * height, hero_media_kind };
  } catch {
    return { url, reason: "媒体加载失败" };
  }
}

async function selectHeroMedia(signal: RawSignal): Promise<HeroMedia> {
  const urls = safeArray<string>(signal.media_urls);
  const types = safeArray<string>(signal.media_types);
  if (!urls.length) return { url: "", kind: "none", hero_media_kind: "unknown", rejected: [] };

  const inspected = await Promise.all(urls.map((url, index) => {
    const kind = mediaKindFor(url, types[index] ?? "");
    const priority = kind === "video" ? 5 : kind === "gif" ? 4 : signal.visual_asset_type === "flow_diagram" ? 2 : signal.visual_asset_type === "concept_mockup" ? 1 : 3;
    return inspectMediaCandidate(signal, url, kind, priority);
  }));
  const accepted = inspected.filter((item): item is HeroCandidate => "kind" in item && item.kind !== "none");
  const rejected = inspected.filter((item): item is MediaRejection => "reason" in item);
  accepted.sort((a, b) => b.priority - a.priority || b.area - a.area);
  const selected = accepted[0];
  return selected
    ? { url: selected.url, kind: selected.kind, hero_media_kind: selected.hero_media_kind, width: selected.width, height: selected.height, rejected }
    : { url: "", kind: "none", hero_media_kind: "unknown", rejected };
}

function mediaMarkup(signal: RawSignal, large = false): string {
  const media = heroMedia(signal);
  const label = media.hero_media_kind !== "unknown" ? heroMediaKindLabels[media.hero_media_kind] : visualAssetLabels[signal.visual_asset_type];
  if (media.kind === "video") {
    return `<div class="card-media ${large ? "large" : ""} video"><video src="${escapeHtml(media.url)}" muted playsinline controls></video><span>视频</span></div>`;
  }
  if (media.kind === "gif" || media.kind === "image") {
    return `<div class="card-media ${large ? "large" : ""} ${media.kind}"><img src="${escapeHtml(media.url)}" alt="${escapeHtml(signal.title)}" loading="lazy" onerror="this.closest('.card-media')?.classList.add('media-error')" /><span>${escapeHtml(label)}${media.width && media.height ? ` · ${media.width}×${media.height}` : ""}</span><div class="media-error-fallback"><strong>暂无可用产品界面图</strong><small>选中的媒体无法渲染</small></div></div>`;
  }
  return `<div class="card-media ${large ? "large" : ""} empty"><div><strong>暂无可用产品界面图</strong><small>${safeArray<string>(signal.media_urls).length ? "已发现媒体，但未识别到可用于首页的产品界面图。" : `等待 ${escapeHtml(categoryLabels[signal.homepage_category] ?? "设计信号")} 的产品截图`}</small></div></div>`;
}

function formatDate(value: string): string {
  if (!value) return "暂无日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无日期";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

function descriptionFor(signal: RawSignal, limit = 180): string {
  const text = signal.description || signal.raw_text || "";
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function reasonList(signal: RawSignal): string {
  const reasons = safeArray<string>(signal.homepage_reasons).slice(0, 3);
  if (!reasons.length) return `<p class="reason-fallback">${escapeHtml(categoryLabels[signal.homepage_category])}</p>`;
  return `<ul class="reason-list">${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`;
}

function cardMarkup(signal: RawSignal): string {
  return `<article class="radar-card" data-signal-id="${escapeHtml(signal.id)}" tabindex="0">
    ${mediaMarkup(signal)}
    <div class="card-body">
      <div class="card-kicker"><span>${escapeHtml(signal.product)}</span><span class="category-badge ${escapeHtml(signal.homepage_category)}">${escapeHtml(categoryLabels[signal.homepage_category])}</span></div>
      <h2>${escapeHtml(signal.title || "未命名设计信号")}</h2>
      ${reasonList(signal)}
      <div class="card-meta"><span>${escapeHtml(formatDate(signal.published_at || signal.created_at))}</span><span>${escapeHtml(signal.source_type)}</span></div>
      <a class="source-button" href="${escapeHtml(signal.signal_url)}" target="_blank" rel="noreferrer" data-source-link>查看原文</a>
    </div>
  </article>`;
}

function renderMetrics(): void {
  const candidates = homepageCandidates();
  const withMedia = candidates.filter(hasMedia);
  const withUsableHero = candidates.filter(hasUsableHeroMedia);
  const counts = Object.fromEntries(filterCategories.map((category) => [category, candidates.filter((signal) => signal.homepage_category === category).length]));
  $("#radarMetrics").innerHTML = [
    [candidates.length, "首页候选"],
    [withMedia.length, "含媒体素材"],
    [withUsableHero.length, "可用界面图"],
    [counts.agent_experience ?? 0, "Agent 表达方式"],
    [counts.concept ?? 0, "概念稿"],
  ].map(([value, label]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderFilters(): void {
  const candidates = homepageCandidates();
  const buttons = [
    { value: "all", label: "全部", count: candidates.length },
    ...filterCategories.map((category) => ({
      value: category,
      label: categoryLabels[category],
      count: candidates.filter((signal) => signal.homepage_category === category).length,
    })),
  ];
  $("#radarFilters").innerHTML = buttons.map((button) => `<button class="filter-pill ${button.value === activeCategory ? "active" : ""}" data-category="${escapeHtml(button.value)}">${escapeHtml(button.label)} <span>${button.count}</span></button>`).join("");
}

function renderGrid(): void {
  const visible = visibleSignals();
  $("#radarGrid").innerHTML = visible.length
    ? visible.map(cardMarkup).join("")
    : `<div class="empty-radar"><strong>这个分类暂时没有卡片。</strong><span>在信源后台审核首页候选后，这里会自动出现。</span></div>`;
}

function render(): void {
  renderMetrics();
  renderFilters();
  renderGrid();
}

function detailMarkup(signal: RawSignal): string {
  const media = heroMedia(signal);
  const rejected = media.rejected.length
    ? `<ul>${media.rejected.map((item) => `<li><span>${escapeHtml(item.reason)}</span><code>${escapeHtml(item.url)}</code></li>`).join("")}</ul>`
    : `<p>没有被拒绝的媒体。</p>`;
  return `<div class="detail-layout">
    ${mediaMarkup(signal, true)}
    <div class="detail-copy">
      <div class="card-kicker"><span>产品：${escapeHtml(signal.product)}</span><span class="category-badge ${escapeHtml(signal.homepage_category)}">分类：${escapeHtml(categoryLabels[signal.homepage_category])}</span>${signal.is_concept ? "<span class=\"concept-badge\">概念稿</span>" : ""}</div>
      <h2>${escapeHtml(signal.title || "未命名设计信号")}</h2>
      <p>${escapeHtml(descriptionFor(signal, 900))}</p>
      <section>
        <h3>首页入选理由</h3>
        ${reasonList(signal)}
      </section>
      <section class="media-debug">
        <h3>媒体调试信息</h3>
        <dl>
          <div><dt>媒体 URL 数量</dt><dd>${safeArray<string>(signal.media_urls).length}</dd></div>
          <div><dt>选中的首页媒体 URL</dt><dd>${media.url ? `<code>${escapeHtml(media.url)}</code>` : "无"}</dd></div>
          <div><dt>首页媒体分类</dt><dd>${escapeHtml(heroMediaKindLabels[media.hero_media_kind])}</dd></div>
          <div><dt>选中尺寸</dt><dd>${media.width && media.height ? `${media.width}×${media.height}` : "无"}</dd></div>
        </dl>
        ${safeArray<string>(signal.media_urls).length && !media.url ? "<p>已发现媒体，但未识别到可用于首页的产品界面图。</p>" : ""}
        <h4>被拒绝的媒体</h4>
        ${rejected}
      </section>
      <div class="detail-meta"><span>发布时间：${escapeHtml(formatDate(signal.published_at || signal.created_at))}</span><span>来源类型：${escapeHtml(signal.source_type)}</span><span>首页分：${Math.round(signal.homepage_score ?? 0)}</span></div>
      <a class="detail-source" href="${escapeHtml(signal.signal_url)}" target="_blank" rel="noreferrer">查看原文</a>
    </div>
  </div>`;
}

function openDetail(signalId: string): void {
  const signal = allSignals.find((item) => item.id === signalId);
  if (!signal) return;
  $("#radarDetailContent").innerHTML = detailMarkup(signal);
  ($("#radarDetailDialog") as HTMLDialogElement).showModal();
}

async function load(): Promise<void> {
  const response = await fetch("/api/raw-signals");
  if (!response.ok) throw new Error("无法加载 Raw Signals");
  allSignals = safeArray<RawSignal>(await response.json()).map(normalizeSignal);
  const candidates = homepageCandidates();
  const selections = await Promise.all(candidates.map(async (signal) => [signal.id, await selectHeroMedia(signal)] as const));
  heroMediaBySignalId.clear();
  selections.forEach(([id, media]) => heroMediaBySignalId.set(id, media));
  render();
}

$("#radarFilters").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-category]");
  if (!button) return;
  activeCategory = (button.dataset.category ?? "all") as typeof activeCategory;
  render();
});

$("#radarGrid").addEventListener("click", (event) => {
  if ((event.target as HTMLElement).closest("[data-source-link]")) return;
  const card = (event.target as HTMLElement).closest<HTMLElement>("[data-signal-id]");
  if (card?.dataset.signalId) openDetail(card.dataset.signalId);
});

$("#radarGrid").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = (event.target as HTMLElement).closest<HTMLElement>("[data-signal-id]");
  if (!card?.dataset.signalId) return;
  event.preventDefault();
  openDetail(card.dataset.signalId);
});

$("#closeRadarDetail").addEventListener("click", () => {
  ($("#radarDetailDialog") as HTMLDialogElement).close();
});

load().catch((error) => {
  $("#radarGrid").innerHTML = `<div class="empty-radar"><strong>Design Radar 加载失败。</strong><span>${escapeHtml(error instanceof Error ? error.message : String(error))}</span></div>`;
});
