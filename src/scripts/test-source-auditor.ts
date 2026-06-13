import {
  applyAuditResultsToSources,
  auditSource,
  calculateActivityScore,
  calculateCollectorPriority,
  calculateMediaScore,
  countHtmlMedia,
  extractFeedDates,
  extractHtmlDates,
} from "../services/source-auditor.ts";
import { scanSources } from "../services/scanner.ts";
import type { Source } from "../types/source.ts";
import { runtimeDefaults } from "../services/source-signals.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const html = `
  <html><head>
    <meta property="og:image" content="https://example.com/cover.png">
    <meta property="og:video" content="https://example.com/demo.mp4">
    <script type="application/ld+json">{"datePublished":"2026-06-01T10:00:00Z"}</script>
  </head><body>
    <time datetime="2026-06-02">June 2</time>
    <img src="/screen.png"><img src="/motion.gif">
    <video src="/walkthrough.mp4"></video>
  </body></html>`;
const media = countHtmlMedia(html);
assert(media.screenshot_count === 2, `Expected 2 screenshots, got ${media.screenshot_count}`);
assert(media.gif_count === 1, `Expected 1 GIF, got ${media.gif_count}`);
assert(media.video_count >= 3, `Expected video tag, MP4 and og:video, got ${media.video_count}`);
assert(extractHtmlDates(html).length === 2, "Expected two unique HTML dates");

const feed = `<rss><channel>
  <item><pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate></item>
  <item><pubDate>Tue, 02 Jun 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;
assert(extractFeedDates(feed).length === 2, "Expected two feed dates");
assert(calculateMediaScore({ screenshot_count: 2, gif_count: 1, video_count: 3 }) === 4, "Unexpected media score");
assert(calculateActivityScore(12) === 5, "Unexpected activity score");
assert(calculateCollectorPriority(5, 4, 5) === "high", "Unexpected collector priority");

const claude: Source = {
  id: "src_claude",
  product_name: "Claude",
  slug: "claude",
  category: "Chat",
  design_pattern: "Chat + Workspace",
  sources: [
    { id: "claude-homepage", type: "homepage", url: "https://claude.ai/", purpose: "identity", priority: 3, scan_frequency: "weekly", status: "active", notes: "", ...runtimeDefaults("homepage") },
    { id: "claude-release-notes", type: "release_notes", url: "https://support.claude.com/en/articles/12138966-release-notes", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "", ...runtimeDefaults("release_notes") },
    { id: "claude-news", type: "news", url: "https://www.anthropic.com/news", purpose: "updates", priority: 4, scan_frequency: "daily", status: "active", notes: "", ...runtimeDefaults("news") },
    { id: "claude-releases", type: "github_releases", url: "https://github.com/anthropics/claude-code/releases", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "", ...runtimeDefaults("github_releases") },
    { id: "claude-releases-rss", type: "github_releases_rss", url: "https://github.com/anthropics/claude-code/releases.atom", purpose: "updates", priority: 5, scan_frequency: "daily", status: "active", notes: "", ...runtimeDefaults("github_releases_rss") },
    { id: "claude-x", type: "x", url: "https://x.com/claudeai", purpose: "discovery", priority: 3, scan_frequency: "manual", status: "active", notes: "", ...runtimeDefaults("x") },
  ],
  source_types: ["release_notes", "news", "github_releases", "docs", "rss", "x"],
  github_type: "none",
  review_status: "pending",
  media_score: 4,
  signal_score: 5,
  homepage_url: "https://claude.ai/",
  github_url: "",
  github_releases_url: "https://github.com/anthropics/claude-code/releases",
  changelog_url: "",
  docs_url: "https://docs.anthropic.com/",
  product_hunt_url: "",
  x_url: "https://x.com/AnthropicAI",
  rss_url: "",
  news_url: "https://www.anthropic.com/news",
  videos_url: "",
  blog_url: "",
  release_notes_url: "https://support.claude.com/en/articles/12138966-release-notes",
  anthropic_news_url: "https://www.anthropic.com/news",
  claude_code_github_url: "https://github.com/anthropics/claude-code",
  claude_code_releases_url: "https://github.com/anthropics/claude-code/releases",
  claude_code_rss_url: "https://github.com/anthropics/claude-code/releases.atom",
  source_priority: 5,
  media_likelihood: 4,
  scan_frequency: "daily",
  status: "active",
  notes: "",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url === claude.homepage_url) return new Response("Forbidden", { status: 403 });
  if (url === claude.release_notes_url) {
    return new Response("<time datetime='2026-06-01'></time><h2>May 30, 2026</h2><img src='/release.png'>", { status: 200, headers: { "content-type": "text/html" } });
  }
  if (url === claude.anthropic_news_url) {
    return new Response("<article>Jun 5, 2026</article><img src='/news.png'>", { status: 200, headers: { "content-type": "text/html" } });
  }
  if (url === claude.docs_url) return new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
  if (url.includes("api.github.com/repos/anthropics/claude-code/releases")) {
    return new Response(JSON.stringify([
      { published_at: "2026-06-06T10:00:00Z", draft: false },
      { published_at: "2026-05-20T10:00:00Z", draft: false },
    ]), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (url === claude.claude_code_rss_url) {
    return new Response("<feed><entry><updated>2026-06-06T10:00:00Z</updated></entry><entry><updated>2026-06-08T10:00:00Z</updated></entry></feed>", { status: 200, headers: { "content-type": "application/atom+xml" } });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

try {
  const claudeAudit = await auditSource(claude, new Date("2026-06-10T00:00:00Z"));
  assert(claudeAudit.audit.updates_30d === 6, `Expected 6 deduplicated Claude updates, got ${claudeAudit.audit.updates_30d}`);
  assert(claudeAudit.github_releases_30d === 2, "Expected Claude Code releases");
  assert(claudeAudit.rss_articles_30d === 1, "Expected duplicate GitHub RSS event to be removed");
  assert(claudeAudit.audit.collector_priority === "high", `Homepage 403 incorrectly lowered Claude to ${claudeAudit.audit.collector_priority}`);
  assert(claudeAudit.errors.some((error) => error.includes("HTTP 403")), "Expected Homepage 403 diagnostic");
  const updatedClaude = applyAuditResultsToSources([claude], [claudeAudit])[0]!;
  const releaseSignal = updatedClaude.sources.find((item) => item.id === "claude-releases");
  assert(releaseSignal?.health === "ok", "Audit should write source health");
  assert(Boolean(releaseSignal?.last_checked_at), "Audit should write last_checked_at");
  assert(releaseSignal?.last_update_at === "2026-06-06T10:00:00.000Z", "Audit should write last_update_at");
} finally {
  globalThis.fetch = originalFetch;
}

const purposeSource: Source = {
  ...claude,
  id: "src_purpose_test",
  product_name: "Purpose Test",
  slug: "purpose-test",
  sources: [
    { id: "purpose-homepage", type: "homepage", url: "https://example.test/home", purpose: "identity", priority: 3, scan_frequency: "weekly", status: "active", notes: "", ...runtimeDefaults("homepage") },
    { id: "purpose-disabled-updates", type: "release_notes", url: "https://example.test/disabled", purpose: "updates", priority: 5, scan_frequency: "daily", status: "disabled", notes: "", ...runtimeDefaults("release_notes") },
    { id: "purpose-media", type: "blog", url: "https://example.test/media", purpose: "media", priority: 4, scan_frequency: "weekly", status: "active", notes: "", ...runtimeDefaults("blog") },
    { id: "purpose-x", type: "x", url: "https://x.com/example", purpose: "discovery", priority: 2, scan_frequency: "manual", status: "active", notes: "", ...runtimeDefaults("x") },
    { id: "purpose-login-blog", type: "blog", url: "https://example.test/login-blog", purpose: "media", priority: 4, scan_frequency: "weekly", status: "active", access_type: "login_required", notes: "", ...runtimeDefaults("blog") },
  ],
};
const purposeFetchUrls: string[] = [];
globalThis.fetch = async (input) => {
  const url = String(input);
  purposeFetchUrls.push(url);
  if (url.endsWith("/home")) return new Response("<time datetime='2026-06-09'></time><img src='/identity.png'>", { status: 200, headers: { "content-type": "text/html" } });
  if (url.endsWith("/media")) return new Response("<img src='/media.png'>", { status: 200, headers: { "content-type": "text/html" } });
  if (url.endsWith("/login-blog")) throw new Error("login_required source must not enter auto audit queue");
  throw new Error(`Source should not have been scanned: ${url}`);
};
try {
  const purposeAudit = await auditSource(purposeSource, new Date("2026-06-10T00:00:00Z"));
  assert(purposeAudit.audit.updates_30d === 0, "Identity/discovery/disabled sources must not contribute updates");
  assert(purposeAudit.audit.screenshot_count === 1, "Only purpose=media or updates pages should contribute media");
  assert(purposeAudit.successful_checks === 2, "Only identity and media sources should have been scanned");
  assert(!purposeFetchUrls.some((url) => url.endsWith("/login-blog")), "login_required source must not enter auto audit queue");
} finally {
  globalThis.fetch = originalFetch;
}

const scannerFetchUrls: string[] = [];
globalThis.fetch = async (input) => {
  const url = String(input);
  scannerFetchUrls.push(url);
  if (url === "https://example.test/scanner-home") return new Response("<title>Scanner Home</title>", { status: 200, headers: { "content-type": "text/html" } });
  if (url === "https://x.com/scanner") throw new Error("X should not enter scan-sources main queue");
  throw new Error(`Unexpected scanner URL: ${url}`);
};
try {
  const savedHealth: unknown[] = [];
  const health = await scanSources(
    { list: async () => [{ ...claude, id: "src_scanner_access", product_name: "Scanner Access", homepage_url: "https://example.test/scanner-home", x_url: "https://x.com/scanner" }] },
    { saveHealth: async (items) => { savedHealth.push(...items); } },
  );
  assert(health.length === 1, "scan-sources should only schedule public legacy URL fields");
  assert(health[0]?.source_type === "homepage", "scan-sources should keep public homepage checks");
  assert(scannerFetchUrls.length === 1 && scannerFetchUrls[0] === "https://example.test/scanner-home", "login_required X should not enter scan-sources main queue");
  assert(savedHealth.length === 1, "scan-sources should save only public source health");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Source auditor parser and scoring tests passed.");
