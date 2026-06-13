// Generated from public/app.ts.
const categories = [
    "Chat",
    "IDE",
    "Workflow",
    "Agent",
    "Canvas",
    "Research",
    "Design",
    "Automation",
    "Prompt→App",
    "Other"
];
const sourceTypes = [
    {
        type: "homepage",
        label: "Homepage",
        field: "homepage_url"
    },
    {
        type: "github",
        label: "GitHub",
        field: "github_url"
    },
    {
        type: "changelog",
        label: "Changelog",
        field: "changelog_url"
    },
    {
        type: "product_hunt",
        label: "Product Hunt",
        field: "product_hunt_url"
    },
    {
        type: "x",
        label: "X",
        field: "x_url"
    }
];
const inspectorFields = [
    {
        field: "homepage_url",
        label: "Homepage",
        resolve: (source)=>source.homepage_url
    },
    {
        field: "github_url",
        label: "GitHub",
        resolve: (source)=>source.github_url || source.claude_code_github_url
    },
    {
        field: "github_releases_url",
        label: "GitHub Releases",
        resolve: (source)=>source.github_releases_url || source.claude_code_releases_url
    },
    {
        field: "changelog_url",
        label: "Changelog",
        resolve: (source)=>source.changelog_url
    },
    {
        field: "release_notes_url",
        label: "Release Notes",
        resolve: (source)=>source.release_notes_url
    },
    {
        field: "docs_url",
        label: "Docs",
        resolve: (source)=>source.docs_url
    },
    {
        field: "rss_url",
        label: "RSS",
        resolve: (source)=>source.rss_url || source.claude_code_rss_url
    },
    {
        field: "product_hunt_url",
        label: "Product Hunt",
        resolve: (source)=>source.product_hunt_url
    },
    {
        field: "x_url",
        label: "X",
        resolve: (source)=>source.x_url
    },
    {
        field: "news_url",
        label: "News",
        resolve: (source)=>source.news_url || source.anthropic_news_url
    },
    {
        field: "videos_url",
        label: "Videos",
        resolve: (source)=>source.videos_url
    },
    {
        field: "blog_url",
        label: "Blog",
        resolve: (source)=>source.blog_url
    }
];
let snapshot = {
    sources: [],
    health: [],
    reviews: [],
    audit: [],
    candidates: [],
    recommendations: {},
    coverage: []
};
let currentInspectorId = "";
let addingFormalSource = false;
let coverageSort = {
    key: "coverage_score",
    direction: "asc"
};
const productSourceTypes = [
    "homepage",
    "changelog",
    "release_notes",
    "blog",
    "news",
    "docs",
    "github_repo",
    "community",
    "forum",
    "discord",
    "reddit",
    "events",
    "slack",
    "github_releases",
    "github_releases_rss",
    "x",
    "youtube",
    "product_hunt",
    "rss"
];
const productSourcePurposes = [
    "identity",
    "updates",
    "media",
    "discovery",
    "community"
];
const productSourceStatuses = [
    "active",
    "disabled",
    "paused"
];
const accessTypes = [
    "public",
    "login_required",
    "manual",
    "unknown"
];
const publicAccessTypes = new Set([
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
    "changelog"
]);
const loginRequiredAccessTypes = new Set([
    "x",
    "discord",
    "slack"
]);
const accessLabels = {
    public: "Public",
    login_required: "Login Required",
    manual: "Manual",
    unknown: "Unknown"
};
const purposeLabels = {
    identity: "Identity",
    updates: "Updates",
    media: "Media",
    discovery: "Discovery",
    community: "Community"
};
function normalizedPurposeFields(item) {
    const selected = safeArray(item?.purposes).filter((purpose)=>productSourcePurposes.includes(purpose));
    const primary = item?.primary_purpose && productSourcePurposes.includes(item.primary_purpose) ? item.primary_purpose : item?.purpose && productSourcePurposes.includes(item.purpose) ? item.purpose : selected[0] ?? "identity";
    const purposes = [
        ...new Set(selected.length ? selected : [
            primary
        ])
    ];
    if (!purposes.includes(primary)) purposes.unshift(primary);
    return {
        purpose: primary,
        primary_purpose: primary,
        purposes
    };
}
function primaryPurpose(item) {
    return normalizedPurposeFields(item).primary_purpose;
}
function purposeList(item) {
    return normalizedPurposeFields(item).purposes;
}
function selectedPurposes(container, selector, primary) {
    const selected = Array.from(container.querySelectorAll(selector)).filter((input)=>input.checked).map((input)=>input.dataset.formalPurpose || input.dataset.candidatePurpose || input.value).filter((purpose)=>productSourcePurposes.includes(purpose));
    if (!selected.includes(primary)) selected.unshift(primary);
    return [
        ...new Set(selected)
    ];
}
function defaultAccessType(type) {
    if (publicAccessTypes.has(type)) return "public";
    if (loginRequiredAccessTypes.has(type)) return "login_required";
    return "unknown";
}
function normalizeAccessType(item) {
    const accessType = item?.access_type;
    return accessTypes.includes(accessType) ? accessType : defaultAccessType(item?.type ?? "");
}
function accessTypeBadge(item) {
    const accessType = normalizeAccessType(item);
    return `<span class="access-type-badge ${accessType}" title="${accessType === "login_required" ? "不会进入自动采集主队列" : ""}">${accessLabels[accessType]}</span>`;
}
const $ = (selector)=>document.querySelector(selector);
function safeArray(value) {
    return Array.isArray(value) ? value : [];
}
function snapshotSources() {
    return safeArray(snapshot.sources);
}
function productSources(source) {
    return safeArray(source.sources);
}
function productSuggestedSources(source) {
    return safeArray(source.suggested_sources);
}
function normalizeSnapshot(value) {
    const input = value && typeof value === "object" ? value : {};
    const sources = safeArray(input.sources).map((source)=>({
            ...source,
            sources: productSources(source).map((item)=>({
                    ...item,
                    ...normalizedPurposeFields(item),
                    access_type: normalizeAccessType(item)
                })),
            suggested_sources: productSuggestedSources(source).map((item)=>({
                    ...item,
                    ...normalizedPurposeFields(item),
                    access_type: normalizeAccessType(item)
                })),
            source_types: safeArray(source.source_types)
        }));
    return {
        sources,
        health: safeArray(input.health),
        reviews: safeArray(input.reviews),
        audit: safeArray(input.audit),
        candidates: safeArray(input.candidates).map((item)=>({
                ...item,
                ...normalizedPurposeFields(item),
                access_type: normalizeAccessType(item)
            })),
        recommendations: input.recommendations && typeof input.recommendations === "object" ? input.recommendations : {},
        coverage: safeArray(input.coverage)
    };
}
const sourceList = $("#sourceList");
const dialog = $("#sourceDialog");
const inspectorDialog = $("#inspectorDialog");
const confirmDialog = $("#confirmDialog");
const form = $("#sourceForm");
const filters = {
    search: $("#searchInput"),
    category: $("#categoryFilter"),
    status: $("#statusFilter"),
    frequency: $("#frequencyFilter"),
    reviewStatus: $("#reviewStatusFilter"),
    mediaScore: $("#mediaScoreFilter"),
    signalScore: $("#signalScoreFilter"),
    pattern: $("#patternFilter"),
    updatesZero: $("#updatesZeroFilter"),
    auditMedia: $("#auditMediaFilter"),
    collectorPriority: $("#collectorPriorityFilter"),
    hasError: $("#hasErrorFilter"),
    pending: $("#pendingFilter")
};
const coverageFilters = {
    low: $("#coverageLowFilter"),
    missingUpdates: $("#coverageMissingUpdates"),
    missingMedia: $("#coverageMissingMedia"),
    missingCommunity: $("#coverageMissingCommunity"),
    missingDiscovery: $("#coverageMissingDiscovery"),
    missingGithub: $("#coverageMissingGithub"),
    missingX: $("#coverageMissingX"),
    needsReview: $("#coverageNeedsReview")
};
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char)=>({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        })[char]);
}
async function api(url, options) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "content-type": "application/json",
            ...options?.headers
        }
    });
    if (!response.ok) {
        const body = await response.json().catch(()=>({
                error: response.statusText
            }));
        throw new Error(body.error ?? "Request failed");
    }
    return response.status === 204 ? undefined : response.json();
}
function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    window.setTimeout(()=>element.classList.remove("show"), 2600);
}
function confirmAction(message) {
    $("#confirmMessage").textContent = message;
    confirmDialog.showModal();
    return new Promise((resolve)=>{
        const finish = (accepted)=>{
            $("#acceptConfirm").removeEventListener("click", accept);
            $("#cancelConfirm").removeEventListener("click", cancel);
            confirmDialog.removeEventListener("cancel", cancel);
            if (confirmDialog.open) confirmDialog.close();
            resolve(accepted);
        };
        const accept = ()=>finish(true);
        const cancel = (event)=>{
            event?.preventDefault();
            finish(false);
        };
        $("#acceptConfirm").addEventListener("click", accept);
        $("#cancelConfirm").addEventListener("click", cancel);
        confirmDialog.addEventListener("cancel", cancel);
    });
}
function healthFor(sourceId, type) {
    return safeArray(snapshot.health).find((item)=>item.source_id === sourceId && item.source_type === type);
}
function auditFor(source) {
    return safeArray(snapshot.audit).find((item)=>item.product_name === source.product_name);
}
function normalizeUrl(value) {
    try {
        const url = new URL(value);
        return `${url.origin}${url.pathname.replace(/\/$/, "")}${url.search}`;
    } catch  {
        return value.replace(/\/$/, "");
    }
}
function healthForUrl(source, url) {
    const normalized = normalizeUrl(url);
    return safeArray(snapshot.health).find((item)=>item.source_id === source.id && normalizeUrl(item.url) === normalized);
}
function sourceHasError(source) {
    return productSources(source).some((item)=>item.health === "failed" || item.health === "timeout") || safeArray(snapshot.health).some((item)=>item.source_id === source.id && (!item.ok || Boolean(item.error)));
}
function reviewFor(sourceId, type) {
    return safeArray(snapshot.reviews).find((item)=>item.source_id === sourceId && item.source_type === type);
}
function isPending(source) {
    return sourceTypes.some(({ type, field })=>Boolean(source[field]) && healthFor(source.id, type)?.ok && !reviewFor(source.id, type)?.manual_verified);
}
function stateLabel(state) {
    return ({
        accessible: "可访问",
        unavailable: "不可访问",
        redirected: "跳转",
        timeout: "超时"
    })[state ?? ""] ?? "未校验";
}
function formatTime(value) {
    return value ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value)) : "尚未校验";
}
function candidateTier(reason) {
    return reason.match(/^\[(P[123])\]/)?.[1] ?? "";
}
function formalSourceCard(item) {
    const option = (value, selected)=>`<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`;
    const purposeFields = normalizedPurposeFields(item);
    const accessType = normalizeAccessType(item ?? {
        type: "homepage"
    });
    return `<div class="formal-source-card" data-formal-source-id="${escapeHtml(item?.id ?? "")}">
    ${item ? `<button class="formal-source-handle" type="button" draggable="true" aria-label="拖拽排序" title="仅支持同组排序">⋮⋮</button>` : ""}
    <input data-formal-field="url" type="url" required placeholder="https://example.com/source" value="${escapeHtml(item?.url ?? "")}" />
    <select data-formal-field="type">${productSourceTypes.map((value)=>option(value, item?.type ?? "homepage")).join("")}</select>
    <div class="purpose-editor"><label>Primary<select data-formal-field="primary_purpose">${productSourcePurposes.map((value)=>option(value, purposeFields.primary_purpose)).join("")}</select></label><div class="purpose-multiselect">${productSourcePurposes.map((value)=>`<label><input type="checkbox" data-formal-purpose="${value}" ${purposeFields.purposes.includes(value) ? "checked" : ""}/>${value}</label>`).join("")}</div></div>
    <label class="access-type-field">${accessTypeBadge(item ?? {
        type: "homepage"
    })}<select data-formal-field="access_type">${accessTypes.map((value)=>option(value, accessType)).join("")}</select></label>
    <select data-formal-field="priority">${[
        1,
        2,
        3,
        4,
        5
    ].map((value)=>option(String(value), String(item?.priority ?? 3))).join("")}</select>
    <select data-formal-field="status">${productSourceStatuses.map((value)=>option(value, item?.status ?? "active")).join("")}</select>
    <div class="formal-source-actions"><button class="mini-button" data-formal-action="save">保存</button>${item ? `<button class="mini-button danger" data-formal-action="delete">删除</button>` : `<button class="mini-button" data-formal-action="cancel">取消</button>`}</div>
  </div>`;
}
function purposeGroupStorageKey(sourceId, purpose) {
    return `source-inspector:${sourceId}:purpose-group:${purpose}:collapsed`;
}
function isPurposeGroupCollapsed(sourceId, purpose) {
    try {
        return window.localStorage.getItem(purposeGroupStorageKey(sourceId, purpose)) === "true";
    } catch  {
        return false;
    }
}
function setPurposeGroupCollapsed(sourceId, purpose, collapsed) {
    try {
        window.localStorage.setItem(purposeGroupStorageKey(sourceId, purpose), String(collapsed));
    } catch  {}
}
function togglePurposeGroup(group, purpose) {
    const list = group.querySelector("[data-purpose-list]");
    const toggle = group.querySelector("[data-purpose-toggle]");
    if (!list || !toggle || !currentInspectorId) return;
    const collapsed = toggle.getAttribute("aria-expanded") !== "false";
    group.classList.toggle("collapsed", collapsed);
    list.hidden = collapsed;
    toggle.setAttribute("aria-expanded", String(!collapsed));
    setPurposeGroupCollapsed(currentInspectorId, purpose, collapsed);
}
function purposeGroupHtml(source, purpose, items, includeDraft) {
    if (!items.length && !includeDraft) return "";
    const collapsed = isPurposeGroupCollapsed(source.id, purpose);
    const cards = items.map((item)=>formalSourceCard(item));
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
function renderFormalSources(source) {
    const groups = productSourcePurposes.map((purpose)=>{
        const typedPurpose = purpose;
        return purposeGroupHtml(source, typedPurpose, productSources(source).filter((item)=>primaryPurpose(item) === typedPurpose), addingFormalSource && typedPurpose === "identity");
    }).join("");
    $("#formalSourceEditor").innerHTML = groups || `<p class="scope-note">暂无正式 Source，点击 + Add Source 添加。</p>`;
}
function normalizeProductKey(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "-").replace(/^src_/, "");
}
function candidateMatchesProduct(candidate, source) {
    const productKey = normalizeProductKey(candidate.product || candidate.product_slug || candidate.product_name || candidate.product_id || candidate.source_id);
    return [
        source.id,
        source.slug,
        source.product_name
    ].map(normalizeProductKey).includes(productKey);
}
function isPendingCandidate(candidate) {
    return candidate.status === "pending_review" || candidate.status === "pending" || candidate.status === "suggested";
}
function renderCandidatePanel(source) {
    const container = $("#inspectorRecommendations");
    try {
        const sourceCandidates = safeArray(snapshot.candidates);
        const suggestions = sourceCandidates.filter((item)=>candidateMatchesProduct(item, source) && isPendingCandidate(item));
        if (normalizeProductKey(source.slug) === "manus") {
            console.log("Source Candidate Debug", {
                allCandidatesLength: sourceCandidates.length,
                currentProduct: {
                    id: source.id,
                    slug: source.slug,
                    product_name: source.product_name
                },
                matchedCandidatesLength: suggestions.length,
                matchedCandidateUrls: suggestions.map((item)=>item.url),
                matchedCandidates: sourceCandidates.filter((item)=>candidateMatchesProduct(item, source)).map((item)=>({
                        product: item.product,
                        product_id: item.product_id,
                        product_slug: item.product_slug,
                        product_name: item.product_name,
                        source_id: item.source_id,
                        status: item.status,
                        url: item.url
                    }))
            });
        }
        const sourceTypeOptions = productSourceTypes;
        const purposeOptions = productSourcePurposes;
        const suggestionHtml = suggestions.length ? `<h3>Suggested Sources <span class="tag">${suggestions.length} needs review</span></h3><div class="suggestion-list">${suggestions.map((item)=>{
            const purposeFields = normalizedPurposeFields(item);
            const accessType = normalizeAccessType(item);
            return `<article class="suggestion-card" data-candidate-key="${escapeHtml(item.candidate_key)}"><div class="suggestion-card-head"><strong>${escapeHtml(item.type)} · ${escapeHtml(purposeFields.purposes.join(" + "))}</strong><span class="tag">${escapeHtml(item.priority)} · ${escapeHtml(item.status)}</span></div><div class="suggestion-editor"><input data-field="url" value="${escapeHtml(item.url)}"/><select data-field="type">${sourceTypeOptions.map((value)=>`<option value="${value}" ${item.type === value ? "selected" : ""}>${value}</option>`).join("")}</select><div class="purpose-editor"><label>Primary<select data-candidate-primary-purpose>${purposeOptions.map((value)=>`<option value="${value}" ${purposeFields.primary_purpose === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><div class="purpose-multiselect">${purposeOptions.map((value)=>`<label><input type="checkbox" data-candidate-purpose="${value}" ${purposeFields.purposes.includes(value) ? "checked" : ""}/>${value}</label>`).join("")}</div></div><label class="access-type-field">${accessTypeBadge(item)}<select data-candidate-access-type>${accessTypes.map((value)=>`<option value="${value}" ${accessType === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div><p class="suggestion-reason">Audit source: ${escapeHtml(item.source)}</p><div class="suggestion-actions"><a class="mini-button" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开链接</a><button class="mini-button" data-suggestion-action="save">保存编辑</button><button class="mini-button" data-suggestion-action="accept">Accept</button><button class="mini-button" data-suggestion-action="reject">Reject</button></div></article>`;
        }).join("")}</div>` : `<h3>Suggested Sources</h3><p class="scope-note">暂无待审核候选信号源</p>`;
        const recommendations = safeArray(snapshot.recommendations?.[source.id]);
        container.innerHTML = suggestionHtml + (recommendations.length ? `<h3>Codex 推荐参考 <span class="tag">不会自动添加</span></h3><div class="recommendation-grid">${recommendations.map((item)=>`<article class="recommendation-card"><strong>${escapeHtml(item.label)} <span class="tag">${item.configured ? "已配置" : "待评估"}</span></strong><p>${escapeHtml(item.reason)}</p><p>${escapeHtml(item.source.type)} · ${escapeHtml(item.source.purpose)} · P${item.source.priority}</p><a href="${escapeHtml(item.source.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.source.url)}</a></article>`).join("")}</div>` : "");
    } catch (error) {
        console.error("Candidate panel render failed", error);
        container.innerHTML = `<h3>Suggested Sources</h3><p class="scope-note">暂无待审核候选信号源</p>`;
    }
}
function renderInspector(source) {
    currentInspectorId = source.id;
    const audit = auditFor(source);
    $("#inspectorTitle").textContent = source.product_name;
    const formalSources = productSources(source);
    const sourceTypes = safeArray(source.source_types);
    const nestedSummary = formalSources.length ? formalSources.map((item)=>`${item.type}:${purposeList(item).join("+")}`).join(", ") : sourceTypes.join(", ");
    $("#inspectorSubtitle").textContent = `${source.design_pattern || "未定义模式"} · ${nestedSummary || "未配置信号源"}`;
    $("#inspectorSummary").innerHTML = [
        [
            audit?.updates_30d ?? "—",
            "30 天更新"
        ],
        [
            audit?.media_score ?? "—",
            "Audit 媒体分"
        ],
        [
            audit?.activity_score ?? "—",
            "活跃分"
        ],
        [
            audit?.collector_priority ?? "—",
            "采集优先级"
        ],
        [
            audit?.latest_update_at ? formatTime(audit.latest_update_at) : "—",
            "最近更新"
        ],
        [
            sourceHasError(source) ? "YES" : "NO",
            "Health 错误"
        ]
    ].map(([value, label])=>`<div class="inspector-metric"><strong>${escapeHtml(value)}</strong><span>${label}</span></div>`).join("");
    renderFormalSources(source);
    const header = `<div class="inspector-row header"><span>Source Type</span><span>Purpose</span><span>Access</span><span>Priority</span><span>URL</span><span>Last Update</span><span>Last Check</span><span>Health</span><span>Media Count</span></div>`;
    const configuredRows = formalSources.length ? formalSources.map((item)=>({
            field: `${item.type} / ${purposeList(item).join("+")}`,
            url: item.url,
            signal: item
        })) : inspectorFields.map(({ field, resolve })=>({
            field,
            url: resolve(source) || "",
            signal: undefined
        }));
    const rows = configuredRows.map(({ field, url, signal })=>{
        const urlHealth = url ? healthForUrl(source, url) : undefined;
        const signalHealth = signal?.health ?? (urlHealth ? urlHealth.ok ? "ok" : "failed" : "unchecked");
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
    const inspectorIndex = inspectorOrder.findIndex((item)=>item.source_id === source.id);
    $("#previousProduct").disabled = inspectorIndex <= 0;
    $("#nextProduct").disabled = inspectorIndex < 0 || inspectorIndex >= inspectorOrder.length - 1;
    window.setTimeout(()=>{
        if (!inspectorDialog.open && currentInspectorId === source.id) inspectorDialog.showModal();
    }, 0);
}
function visibleCoverage() {
    return safeArray(snapshot.coverage).filter((item)=>(!coverageFilters.low.checked || item.coverage_score < 5) && (!coverageFilters.missingUpdates.checked || item.missing_updates_source) && (!coverageFilters.missingMedia.checked || item.missing_media_source) && (!coverageFilters.missingCommunity.checked || item.community_sources === 0) && (!coverageFilters.missingDiscovery.checked || item.discovery_sources === 0) && (!coverageFilters.missingGithub.checked || item.github_sources === 0) && (!coverageFilters.missingX.checked || item.x_sources === 0) && (!coverageFilters.needsReview.checked || item.needs_review_count > 0)).sort((a, b)=>{
        const difference = a[coverageSort.key] - b[coverageSort.key];
        return (coverageSort.direction === "asc" ? difference : -difference) || a.product_name.localeCompare(b.product_name);
    });
}
function sortHeader(label, key) {
    const active = coverageSort.key === key;
    const arrow = active ? coverageSort.direction === "asc" ? " ↑" : " ↓" : "";
    return `<button class="coverage-sort ${active ? "active" : ""}" data-coverage-sort="${key}">${label}${arrow}</button>`;
}
function resolveInspectorSource(productKey) {
    const normalized = productKey.trim().toLowerCase();
    if (!normalized) return undefined;
    return safeArray(snapshot.sources).find((source)=>[
            source.id,
            source.slug,
            source.product_name
        ].some((value)=>String(value ?? "").trim().toLowerCase() === normalized));
}
function coverageProductKey(item) {
    return resolveInspectorSource(item.source_id)?.id ?? resolveInspectorSource(item.product_name)?.id ?? item.source_id ?? item.product_name;
}
function openInspector(productKey) {
    const source = resolveInspectorSource(productKey);
    if (!source) return;
    addingFormalSource = false;
    renderInspector(source);
}
function renderCoverage() {
    const visible = visibleCoverage();
    $("#coverageCount").textContent = `${visible.length} / ${snapshot.coverage.length} products`;
    const communityTypes = "github_repo, community, forum, discord, reddit, events, slack";
    const header = `<div class="coverage-row header"><span>Product</span><span>Identity</span><span>${sortHeader("Updates", "updates_sources")}</span><span title="Eligible types: ${communityTypes}">${sortHeader("Community", "community_sources")}</span><span>${sortHeader("Discovery", "discovery_sources")}</span><span>${sortHeader("Media", "media_sources")}</span><span>X</span><span>${sortHeader("GitHub", "github_sources")}</span><span>Missing Identity</span><span>Missing Updates</span><span>Missing Media</span><span>${sortHeader("Suggested Count", "needs_review_count")}</span><span>${sortHeader("Score", "coverage_score")}</span><span>Action</span></div>`;
    $("#coverageTable").innerHTML = header + visible.map((item)=>{
        const productKey = coverageProductKey(item);
        return `<div class="coverage-row"><span><button type="button" class="coverage-product" data-coverage-inspect="${escapeHtml(productKey)}"><strong>${escapeHtml(item.product_name)}</strong></button></span><span>${item.identity_sources}</span><span>${item.updates_sources}</span><span title="Eligible types: ${communityTypes}">${item.community_sources}</span><span>${item.discovery_sources}</span><span>${item.media_sources}</span><span>${item.x_sources}</span><span>${item.github_sources}</span><span class="${item.missing_identity_source ? "coverage-warning" : ""}">${item.missing_identity_source ? "WARNING" : "—"}</span><span class="${item.missing_updates_source ? "coverage-warning" : ""}">${item.missing_updates_source ? "WARNING" : "—"}</span><span class="${item.missing_media_source ? "coverage-warning" : ""}">${item.missing_media_source ? "WARNING" : "—"}</span><span>${item.needs_review_count}</span><span class="coverage-score">${item.coverage_score}/5</span><span><button type="button" class="mini-button coverage-action" data-coverage-inspect="${escapeHtml(productKey)}">Inspect</button></span></div>`;
    }).join("");
}
function renderUrlCell(source, type, label, field) {
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
function filteredSources() {
    const query = filters.search.value.trim().toLowerCase();
    const pattern = filters.pattern.value.trim().toLowerCase();
    return safeArray(snapshot.sources).filter((source)=>{
        const audit = auditFor(source);
        const priority = filters.collectorPriority.value;
        return (!query || source.product_name.toLowerCase().includes(query) || source.slug.toLowerCase().includes(query)) && (!filters.category.value || source.category === filters.category.value) && (!filters.status.value || source.status === filters.status.value) && (!filters.frequency.value || source.scan_frequency === filters.frequency.value) && (!filters.reviewStatus.value || source.review_status === filters.reviewStatus.value) && (!filters.mediaScore.value || source.media_score === Number(filters.mediaScore.value)) && (!filters.signalScore.value || source.signal_score === Number(filters.signalScore.value)) && (!pattern || source.design_pattern.toLowerCase().includes(pattern)) && (!filters.updatesZero.checked || audit?.updates_30d === 0) && (!filters.auditMedia.checked || Boolean(audit && audit.media_score >= 4)) && (!priority || (priority === "medium_low" ? audit?.collector_priority === "medium" || audit?.collector_priority === "low" : audit?.collector_priority === priority)) && (!filters.hasError.checked || sourceHasError(source)) && (!filters.pending.checked || isPending(source));
    });
}
function render() {
    const visible = filteredSources();
    const allSources = safeArray(snapshot.sources);
    const allHealth = safeArray(snapshot.health);
    const active = allSources.filter((item)=>item.status === "active").length;
    const pending = allSources.filter(isPending).length;
    const reachable = allHealth.filter((item)=>item.ok).length;
    $("#stats").innerHTML = [
        [
            allSources.length,
            "全部 Sources"
        ],
        [
            active,
            "Active"
        ],
        [
            pending,
            "待人工校对"
        ],
        [
            reachable,
            "可访问 URL"
        ]
    ].map(([value, label])=>`<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
    $("#resultCount").textContent = `显示 ${visible.length} / ${allSources.length} 个产品`;
    const latest = allHealth.map((item)=>item.checked_at).sort().at(-1);
    $("#lastScan").textContent = latest ? `最近巡检 ${formatTime(latest)}` : "尚未运行巡检";
    sourceList.innerHTML = visible.length ? visible.map((source)=>`<article class="source-card">
    <div class="source-main">
      <div class="product-name"><span class="product-mark">${escapeHtml(source.product_name[0])}</span><div><strong>${escapeHtml(source.product_name)}</strong><small>${escapeHtml(source.slug)}</small></div></div>
      <span class="tag">${escapeHtml(source.category)}</span>
      <span class="source-summary" title="${escapeHtml(productSources(source).map((item)=>`${item.type}:${purposeList(item).join("+")}`).join(", ") || safeArray(source.source_types).join(", "))}">${escapeHtml(source.design_pattern || "未定义模式")}</span>
      <span class="priority">M${source.media_score} · S${source.signal_score}</span>
      <span class="review-status ${source.review_status}">${escapeHtml(source.review_status)}</span>
      <div class="card-actions"><button class="mini-button" data-action="inspect" data-id="${source.id}">查看信号源</button><button class="mini-button" data-action="toggle" data-id="${source.id}">${source.status === "paused" ? "恢复" : "暂停"}</button><button class="mini-button" data-action="edit" data-id="${source.id}">编辑</button><button class="mini-button" data-action="delete" data-id="${source.id}">删除</button></div>
    </div>
    <div class="url-grid">${sourceTypes.map(({ type, label, field })=>renderUrlCell(source, type, label, field)).join("")}</div>
  </article>`).join("") : `<div class="empty-state">没有符合当前筛选条件的 Source。</div>`;
    renderCoverage();
}
function fillSelects() {
    filters.category.insertAdjacentHTML("beforeend", categories.map((value)=>`<option>${value}</option>`).join(""));
    filters.status.insertAdjacentHTML("beforeend", [
        "active",
        "paused",
        "deprecated"
    ].map((value)=>`<option>${value}</option>`).join(""));
    filters.frequency.insertAdjacentHTML("beforeend", [
        "daily",
        "weekly",
        "manual"
    ].map((value)=>`<option>${value}</option>`).join(""));
    filters.reviewStatus.insertAdjacentHTML("beforeend", [
        "pending",
        "verified",
        "rejected"
    ].map((value)=>`<option>${value}</option>`).join(""));
    const scoreOptions = [
        1,
        2,
        3,
        4,
        5
    ].map((value)=>`<option value="${value}">${value}</option>`).join("");
    filters.mediaScore.insertAdjacentHTML("beforeend", scoreOptions);
    filters.signalScore.insertAdjacentHTML("beforeend", scoreOptions);
    form.elements.namedItem("category").innerHTML = categories.map((value)=>`<option>${value}</option>`).join("");
    form.elements.namedItem("scan_frequency").innerHTML = [
        "daily",
        "weekly",
        "manual"
    ].map((value)=>`<option>${value}</option>`).join("");
    form.elements.namedItem("status").innerHTML = [
        "active",
        "paused",
        "deprecated"
    ].map((value)=>`<option>${value}</option>`).join("");
    form.elements.namedItem("review_status").innerHTML = [
        "pending",
        "verified",
        "rejected"
    ].map((value)=>`<option>${value}</option>`).join("");
    form.elements.namedItem("github_type").innerHTML = [
        "repo",
        "org",
        "none"
    ].map((value)=>`<option>${value}</option>`).join("");
    for (const name of [
        "source_priority",
        "media_likelihood",
        "media_score",
        "signal_score"
    ])form.elements.namedItem(name).innerHTML = [
        1,
        2,
        3,
        4,
        5
    ].map((value)=>`<option>${value}</option>`).join("");
}
function openForm(source) {
    form.reset();
    $("#dialogHeading").textContent = source ? "编辑 Source" : "新增 Source";
    if (source) for (const [key, value] of Object.entries(source)){
        const field = form.elements.namedItem(key);
        if (field) field.value = Array.isArray(value) ? value.join(", ") : String(value);
    }
    else {
        for (const name of [
            "source_priority",
            "media_likelihood",
            "media_score",
            "signal_score"
        ])form.elements.namedItem(name).value = "3";
        form.elements.namedItem("scan_frequency").value = "weekly";
        form.elements.namedItem("review_status").value = "pending";
        form.elements.namedItem("github_type").value = "none";
    }
    window.setTimeout(()=>{
        if (!dialog.open) dialog.showModal();
    }, 0);
}
async function load() {
    snapshot = normalizeSnapshot(await api("/api/registry"));
    render();
}
async function reloadInspector() {
    await load();
    const source = snapshotSources().find((item)=>item.id === currentInspectorId);
    if (source && inspectorDialog.open) renderInspector(source);
}
form.addEventListener("submit", async (event)=>{
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const id = String(data.id ?? "");
    delete data.id;
    data.source_priority = Number(data.source_priority);
    data.media_likelihood = Number(data.media_likelihood);
    data.media_score = Number(data.media_score);
    data.signal_score = Number(data.signal_score);
    data.source_types = String(data.source_types ?? "").split(",").map((value)=>value.trim()).filter(Boolean);
    try {
        await api(id ? `/api/sources/${encodeURIComponent(id)}` : "/api/sources", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(data)
        });
        dialog.close();
        await load();
        toast("Source 已保存");
    } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
    }
});
sourceList.addEventListener("click", async (event)=>{
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const source = snapshotSources().find((item)=>item.id === button.dataset.id);
    if (!source) return;
    try {
        if (button.dataset.action === "inspect") openInspector(source.id);
        if (button.dataset.action === "edit") openForm(source);
        if (button.dataset.action === "toggle") {
            await api(`/api/sources/${source.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    status: source.status === "paused" ? "active" : "paused"
                })
            });
            await load();
        }
        if (button.dataset.action === "delete" && await confirmAction(`删除 ${source.product_name}？此操作不可撤销。`)) {
            await api(`/api/sources/${source.id}`, {
                method: "DELETE"
            });
            await load();
            toast("Source 已删除");
        }
    } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
    }
});
sourceList.addEventListener("change", async (event)=>{
    const input = event.target.closest("input[data-review]");
    if (!input) return;
    const existing = reviewFor(input.dataset.id, input.dataset.type);
    const body = {
        manual_verified: input.dataset.review === "verified" ? input.checked : Boolean(existing?.manual_verified),
        media_marked: input.dataset.review === "media" ? input.checked : Boolean(existing?.media_marked)
    };
    try {
        await api(`/api/reviews/${input.dataset.id}/${input.dataset.type}`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
        await load();
    } catch (error) {
        input.checked = !input.checked;
        toast(error instanceof Error ? error.message : String(error));
    }
});
Object.values(filters).forEach((element)=>element.addEventListener("input", render));
Object.values(coverageFilters).forEach((element)=>element.addEventListener("input", renderCoverage));
$("#coverageTable").addEventListener("click", (event)=>{
    const target = event.target;
    const sortButton = target.closest("button[data-coverage-sort]");
    if (sortButton) {
        const key = sortButton.dataset.coverageSort;
        coverageSort = coverageSort.key === key ? {
            key,
            direction: coverageSort.direction === "asc" ? "desc" : "asc"
        } : {
            key,
            direction: "desc"
        };
        renderCoverage();
        return;
    }
    const inspectButton = target.closest("button[data-coverage-inspect]");
    if (inspectButton?.dataset.coverageInspect) openInspector(inspectButton.dataset.coverageInspect);
});
$("#addButton").addEventListener("click", ()=>openForm());
function closeDialog(event, target) {
    event.preventDefault();
    event.stopPropagation();
    if (target.open) target.close();
}
$("#closeSourceDialog").addEventListener("click", (event)=>closeDialog(event, dialog));
$("#closeInspector").addEventListener("click", (event)=>{
    addingFormalSource = false;
    closeDialog(event, inspectorDialog);
});
function navigateInspector(direction) {
    const order = visibleCoverage();
    const index = order.findIndex((item)=>item.source_id === currentInspectorId);
    const target = order[index + direction];
    if (target) openInspector(target.source_id || target.product_name);
}
$("#previousProduct").addEventListener("click", ()=>navigateInspector(-1));
$("#nextProduct").addEventListener("click", ()=>navigateInspector(1));
$("#addFormalSource").addEventListener("click", ()=>{
    const source = snapshotSources().find((item)=>item.id === currentInspectorId);
    if (!source) return;
    addingFormalSource = true;
    setPurposeGroupCollapsed(source.id, "identity", false);
    renderFormalSources(source);
});
$("#formalSourceEditor").addEventListener("click", async (event)=>{
    const toggle = event.target.closest("button[data-purpose-toggle]");
    if (toggle && currentInspectorId) {
        const group = toggle.closest("[data-purpose-group]");
        const purpose = toggle.dataset.purposeToggle;
        if (!group || !purpose) return;
        togglePurposeGroup(group, purpose);
        return;
    }
    const button = event.target.closest("button[data-formal-action]");
    if (!button || !currentInspectorId) return;
    const card = button.closest("[data-formal-source-id]");
    if (!card) return;
    const sourceId = card.dataset.formalSourceId ?? "";
    const action = button.dataset.formalAction;
    if (action === "cancel") {
        addingFormalSource = false;
        const source = snapshotSources().find((item)=>item.id === currentInspectorId);
        if (source) renderFormalSources(source);
        return;
    }
    try {
        if (action === "delete") {
            if (!await confirmAction("删除这个正式 Source？此操作不可撤销。")) return;
            const locator = {
                id: sourceId,
                url: card.querySelector("[data-formal-field='url']").value.trim(),
                type: card.querySelector("[data-formal-field='type']").value,
                purpose: card.querySelector("[data-formal-field='primary_purpose']").value
            };
            const updated = await api(`/api/products/${encodeURIComponent(currentInspectorId)}/sources`, {
                method: "DELETE",
                body: JSON.stringify(locator)
            });
            snapshot.sources = snapshotSources().map((item)=>item.id === updated.id ? updated : item);
            renderFormalSources(updated);
            toast("正式 Source 已删除");
        } else {
            const primaryPurposeValue = card.querySelector("[data-formal-field='primary_purpose']").value;
            const purposes = selectedPurposes(card, "input[data-formal-purpose]", primaryPurposeValue);
            const body = {
                url: card.querySelector("[data-formal-field='url']").value.trim(),
                type: card.querySelector("[data-formal-field='type']").value,
                purpose: primaryPurposeValue,
                primary_purpose: primaryPurposeValue,
                purposes,
                access_type: card.querySelector("[data-formal-field='access_type']").value,
                priority: Number(card.querySelector("[data-formal-field='priority']").value),
                status: card.querySelector("[data-formal-field='status']").value
            };
            if (!body.url) throw new Error("URL is required");
            const endpoint = sourceId ? `/api/products/${encodeURIComponent(currentInspectorId)}/sources/${encodeURIComponent(sourceId)}` : `/api/products/${encodeURIComponent(currentInspectorId)}/sources`;
            const updated = await api(endpoint, {
                method: sourceId ? "PUT" : "POST",
                body: JSON.stringify(body)
            });
            snapshot.sources = snapshotSources().map((item)=>item.id === updated.id ? updated : item);
            renderFormalSources(updated);
            toast(sourceId ? "正式 Source 已保存" : "正式 Source 已添加");
        }
        addingFormalSource = false;
        await reloadInspector();
    } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
    }
});
$("#formalSourceEditor").addEventListener("change", (event)=>{
    const target = event.target;
    const card = target.closest("[data-formal-source-id]");
    if (!card) return;
    const primarySelect = card.querySelector("[data-formal-field='primary_purpose']");
    if (!primarySelect) return;
    if (target.matches("[data-formal-field='primary_purpose']")) {
        const checkbox = card.querySelector(`input[data-formal-purpose="${primarySelect.value}"]`);
        if (checkbox) checkbox.checked = true;
    } else if (target.matches("input[data-formal-purpose]") && !target.checked && target.dataset.formalPurpose === primarySelect.value) {
        target.checked = true;
    } else if (target.matches("[data-formal-field='type']")) {
        const accessSelect = card.querySelector("[data-formal-field='access_type']");
        if (accessSelect) accessSelect.value = defaultAccessType(target.value);
    }
    if (target.matches("[data-formal-field='type'], [data-formal-field='access_type']")) {
        const badgeHost = card.querySelector(".access-type-badge");
        const accessSelect = card.querySelector("[data-formal-field='access_type']");
        const typeSelect = card.querySelector("[data-formal-field='type']");
        if (badgeHost && accessSelect && typeSelect) {
            const accessType = normalizeAccessType({
                type: typeSelect.value,
                access_type: accessSelect.value
            });
            badgeHost.className = `access-type-badge ${accessType}`;
            badgeHost.textContent = accessLabels[accessType];
        }
    }
});
let draggedFormalSourceId = "";
let draggedFormalSourcePurpose = "";
let formalSourceDropIndicator = null;
let formalSourceDropTargetId = "";
let formalSourceDropPosition = "before";
let formalSourceAutoScrollFrame = 0;
let formalSourceAutoScrollSpeed = 0;
let pointerDraggingFormalSource = false;
function clearFormalSourceDropState() {
    formalSourceDropIndicator?.remove();
    formalSourceDropIndicator = null;
    formalSourceDropTargetId = "";
    formalSourceDropPosition = "before";
    formalSourceAutoScrollSpeed = 0;
    if (formalSourceAutoScrollFrame) window.cancelAnimationFrame(formalSourceAutoScrollFrame);
    formalSourceAutoScrollFrame = 0;
    $("#formalSourceEditor").querySelectorAll(".dragging").forEach((item)=>item.classList.remove("dragging"));
    $("#formalSourceEditor").querySelectorAll(".drop-disabled").forEach((item)=>item.classList.remove("drop-disabled"));
}
function positionFormalSourceDropIndicator(target, position) {
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
function runFormalSourceAutoScroll() {
    if (!formalSourceAutoScrollSpeed) {
        formalSourceAutoScrollFrame = 0;
        return;
    }
    const dialog = $("#inspectorDialog");
    dialog.scrollBy({
        top: formalSourceAutoScrollSpeed,
        behavior: "auto"
    });
    formalSourceAutoScrollFrame = window.requestAnimationFrame(runFormalSourceAutoScroll);
}
function updateFormalSourceAutoScroll(clientY) {
    const dialog = $("#inspectorDialog");
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
$("#formalSourceEditor").addEventListener("dragstart", (event)=>{
    const handle = event.target.closest(".formal-source-handle[draggable='true']");
    const card = handle?.closest("[data-formal-source-id]");
    if (!card?.dataset.formalSourceId) return;
    draggedFormalSourceId = card.dataset.formalSourceId;
    draggedFormalSourcePurpose = card.closest("[data-purpose-group]")?.dataset.purposeGroup ?? "";
    card.classList.add("dragging");
    event.dataTransfer?.setData("text/plain", draggedFormalSourceId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
});
$("#formalSourceEditor").addEventListener("dragover", (event)=>{
    const target = event.target.closest("[data-formal-source-id]");
    if (!draggedFormalSourceId || !target?.dataset.formalSourceId) return;
    const targetPurpose = target.closest("[data-purpose-group]")?.dataset.purposeGroup;
    if (!draggedFormalSourcePurpose || targetPurpose !== draggedFormalSourcePurpose) {
        $("#formalSourceEditor").querySelectorAll(".drop-disabled").forEach((item)=>item.classList.remove("drop-disabled"));
        target.closest("[data-purpose-group]")?.classList.add("drop-disabled");
        formalSourceDropIndicator?.remove();
        formalSourceDropIndicator = null;
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
        return;
    }
    $("#formalSourceEditor").querySelectorAll(".drop-disabled").forEach((item)=>item.classList.remove("drop-disabled"));
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    updateFormalSourceAutoScroll(event.clientY);
    if (target.dataset.formalSourceId === draggedFormalSourceId) return;
    const targetBox = target.getBoundingClientRect();
    positionFormalSourceDropIndicator(target, event.clientY < targetBox.top + targetBox.height / 2 ? "before" : "after");
});
$("#formalSourceEditor").addEventListener("drop", async (event)=>{
    event.preventDefault();
    await commitFormalSourceDrop();
});
async function commitFormalSourceDrop() {
    const list = formalSourceDropIndicator?.parentElement;
    const dragged = list?.querySelector(`[data-formal-source-id="${CSS.escape(draggedFormalSourceId)}"]`);
    const target = list?.querySelector(`[data-formal-source-id="${CSS.escape(formalSourceDropTargetId)}"]`);
    if (!list || !dragged || !target || !formalSourceDropIndicator) return;
    list.insertBefore(dragged, formalSourceDropPosition === "before" ? target : target.nextSibling);
    formalSourceDropIndicator.remove();
    formalSourceDropIndicator = null;
    const groupSourceIds = Array.from(list.querySelectorAll("[data-formal-source-id]")).map((item)=>item.dataset.formalSourceId ?? "").filter(Boolean);
    const source = snapshotSources().find((item)=>item.id === currentInspectorId);
    if (!source || !draggedFormalSourcePurpose) return;
    let groupIndex = 0;
    const sourceIds = productSources(source).map((item)=>primaryPurpose(item) === draggedFormalSourcePurpose ? groupSourceIds[groupIndex++] : item.id);
    list.classList.add("saving-order");
    try {
        const updated = await api(`/api/products/${encodeURIComponent(currentInspectorId)}/sources/order`, {
            method: "PUT",
            body: JSON.stringify({
                source_ids: sourceIds
            })
        });
        snapshot.sources = snapshotSources().map((item)=>item.id === updated.id ? updated : item);
        renderFormalSources(updated);
        await load();
        const refreshed = snapshotSources().find((item)=>item.id === currentInspectorId);
        if (refreshed && inspectorDialog.open) renderInspector(refreshed);
        toast("Formal Sources 顺序已保存");
    } catch (error) {
        const source = snapshotSources().find((item)=>item.id === currentInspectorId);
        if (source) renderFormalSources(source);
        toast(error instanceof Error ? error.message : String(error));
    } finally{
        clearFormalSourceDropState();
        draggedFormalSourceId = "";
        draggedFormalSourcePurpose = "";
    }
}
$("#formalSourceEditor").addEventListener("pointerdown", (event)=>{
    const handle = event.target.closest(".formal-source-handle");
    const card = handle?.closest("[data-formal-source-id]");
    if (!handle || !card?.dataset.formalSourceId) return;
    pointerDraggingFormalSource = true;
    draggedFormalSourceId = card.dataset.formalSourceId;
    draggedFormalSourcePurpose = card.closest("[data-purpose-group]")?.dataset.purposeGroup ?? "";
    card.classList.add("dragging");
    try {
        handle.setPointerCapture(event.pointerId);
    } catch  {}
    event.preventDefault();
});
$("#formalSourceEditor").addEventListener("pointermove", (event)=>{
    if (!pointerDraggingFormalSource || !draggedFormalSourceId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-formal-source-id]");
    if (!target?.dataset.formalSourceId || target.dataset.formalSourceId === draggedFormalSourceId) return;
    const targetPurpose = target.closest("[data-purpose-group]")?.dataset.purposeGroup;
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
$("#formalSourceEditor").addEventListener("pointerup", async ()=>{
    if (!pointerDraggingFormalSource) return;
    pointerDraggingFormalSource = false;
    if (formalSourceDropIndicator) await commitFormalSourceDrop();
    else clearFormalSourceDropState();
});
$("#formalSourceEditor").addEventListener("pointercancel", ()=>{
    pointerDraggingFormalSource = false;
    clearFormalSourceDropState();
    draggedFormalSourceId = "";
    draggedFormalSourcePurpose = "";
});
$("#formalSourceEditor").addEventListener("dragend", ()=>{
    clearFormalSourceDropState();
    draggedFormalSourceId = "";
    draggedFormalSourcePurpose = "";
});
$("#inspectorRecommendations").addEventListener("click", async (event)=>{
    const button = event.target.closest("button[data-suggestion-action]");
    if (!button || !currentInspectorId) return;
    const card = button.closest("[data-candidate-key]");
    const candidateKey = card?.dataset.candidateKey;
    if (!card || !candidateKey) return;
    const action = button.dataset.suggestionAction;
    try {
        const primaryPurposeValue = card.querySelector("[data-candidate-primary-purpose]").value;
        const purposes = selectedPurposes(card, "input[data-candidate-purpose]", primaryPurposeValue);
        if (action === "save") {
            const url = card.querySelector("[data-field='url']").value.trim();
            const type = card.querySelector("[data-field='type']").value;
            const access_type = card.querySelector("[data-candidate-access-type]").value;
            await api(`/api/candidates/${currentInspectorId}/${encodeURIComponent(candidateKey)}`, {
                method: "PUT",
                body: JSON.stringify({
                    url,
                    type,
                    purpose: primaryPurposeValue,
                    primary_purpose: primaryPurposeValue,
                    purposes,
                    access_type
                })
            });
            await reloadInspector();
            toast("候选信号源已更新");
        } else {
            const body = action === "accept" ? {
                url: card.querySelector("[data-field='url']").value.trim(),
                type: card.querySelector("[data-field='type']").value,
                purpose: primaryPurposeValue,
                primary_purpose: primaryPurposeValue,
                purposes,
                access_type: card.querySelector("[data-candidate-access-type]").value
            } : undefined;
            await api(`/api/candidates/${currentInspectorId}/${encodeURIComponent(candidateKey)}/${action}`, {
                method: "POST",
                body: body ? JSON.stringify(body) : undefined
            });
            toast(action === "accept" ? "候选已加入正式 Source Network" : "候选已拒绝");
        }
        await reloadInspector();
    } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
    }
});
$("#inspectorRecommendations").addEventListener("change", (event)=>{
    const target = event.target;
    const card = target.closest("[data-candidate-key]");
    if (!card) return;
    const primarySelect = card.querySelector("[data-candidate-primary-purpose]");
    if (!primarySelect) return;
    if (target.matches("[data-candidate-primary-purpose]")) {
        const checkbox = card.querySelector(`input[data-candidate-purpose="${primarySelect.value}"]`);
        if (checkbox) checkbox.checked = true;
    } else if (target.matches("input[data-candidate-purpose]") && !target.checked && target.dataset.candidatePurpose === primarySelect.value) {
        target.checked = true;
    } else if (target.matches("[data-field='type']")) {
        const accessSelect = card.querySelector("[data-candidate-access-type]");
        if (accessSelect) accessSelect.value = defaultAccessType(target.value);
    }
    if (target.matches("[data-field='type'], [data-candidate-access-type]")) {
        const badgeHost = card.querySelector(".access-type-badge");
        const accessSelect = card.querySelector("[data-candidate-access-type]");
        const typeSelect = card.querySelector("[data-field='type']");
        if (badgeHost && accessSelect && typeSelect) {
            const accessType = normalizeAccessType({
                type: typeSelect.value,
                access_type: accessSelect.value
            });
            badgeHost.className = `access-type-badge ${accessType}`;
            badgeHost.textContent = accessLabels[accessType];
        }
    }
});
$("#discoverFollowups").addEventListener("click", async ()=>{
    if (!currentInspectorId) return;
    const button = $("#discoverFollowups");
    button.disabled = true;
    button.textContent = "发现中...";
    try {
        const result = await api(`/api/sources/${currentInspectorId}/discover-followups`, {
            method: "POST"
        });
        await reloadInspector();
        toast(`新增 ${result.discovered} 条候选信号源`);
    } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
    } finally{
        button.disabled = false;
        button.textContent = "发现媒体候选";
    }
});
$("#scanButton").addEventListener("click", async ()=>{
    const button = $("#scanButton");
    button.disabled = true;
    button.textContent = "巡检中...";
    try {
        await api("/api/scan", {
            method: "POST"
        });
        await load();
        toast("巡检完成");
    } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
    } finally{
        button.disabled = false;
        button.textContent = "运行巡检";
    }
});
$("#importButton").addEventListener("click", ()=>$("#importFile").click());
$("#importFile").addEventListener("change", async (event)=>{
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const json = JSON.parse(await file.text());
        snapshot = normalizeSnapshot(await api("/api/sources/import", {
            method: "POST",
            body: JSON.stringify(json)
        }));
        render();
        toast("JSON 导入完成");
    } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
    }
});
fillSelects();
load().catch((error)=>toast(error instanceof Error ? error.message : String(error)));
