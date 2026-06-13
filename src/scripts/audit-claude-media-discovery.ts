import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { auditMediaFollowupSources } from "../services/source-followup.ts";
import { normalizeSourceUrl } from "../services/source-suggestions.ts";

const repository = new JsonSourceRepository();
const execFileAsync = promisify(execFile);
async function loadOfficialHtml(url: string): Promise<string> {
  const { stdout } = await execFileAsync("curl", ["-L", "--silent", "--show-error", "--max-time", "25", "--header", "Accept: text/html,application/xhtml+xml", url], { maxBuffer: 3_000_000 });
  return stdout.slice(0, 2_000_000);
}
const claude = (await repository.list()).find((item) => item.slug === "claude");
if (!claude) throw new Error("Claude source not found");

const audit = await auditMediaFollowupSources(claude, loadOfficialHtml);
const retainedSuggestions = claude.suggested_sources.filter((item) => !item.id.startsWith("suggested-followup-") || item.status === "verified");
const retainedUrls = new Set([
  ...claude.sources.map((item) => normalizeSourceUrl(item.url)),
  ...retainedSuggestions.map((item) => normalizeSourceUrl(item.url)),
]);
const freshSuggestions = audit.suggestions.filter((item) => !retainedUrls.has(normalizeSourceUrl(item.url)));
await repository.update(claude.id, { suggested_sources: [...retainedSuggestions, ...freshSuggestions] });

const report = [
  "# Claude Media Discovery Audit",
  "",
  `Generated at: ${new Date().toISOString()}`,
  "",
  "| Metric | Count |",
  "| --- | ---: |",
  `| 发现链接数 | ${audit.discovered_links} |`,
  `| 过滤后剩余数 | ${audit.filtered_remaining} |`,
  `| 建议 Accept 数 | ${audit.suggested_accept} |`,
  `| 建议 Reject 数 | ${audit.suggested_reject} |`,
  "",
  `另有 ${audit.discovered_links - audit.suggested_accept - audit.suggested_reject} 条链接已存在于正式 Sources，因此跳过去重，不进入 Accept/Reject。`,
  "",
  "## Suggested Accept",
  "",
  ...(audit.suggestions.length ? audit.suggestions.map((item) => `- ${item.url} - ${item.reason}`) : ["- None"]),
  "",
  "## Suggested Reject",
  "",
  ...(audit.rejected_urls.length ? audit.rejected_urls.map((item) => `- ${item.url} - ${item.reason}`) : ["- None"]),
  "",
  `Added ${freshSuggestions.length} fresh suggestions to Claude after preserving verified follow-ups.`,
  "",
].join("\n");

await writeFile("media_discovery_audit.md", report, "utf8");
console.log(`Claude media discovery: ${audit.discovered_links} found, ${audit.filtered_remaining} retained, ${audit.suggested_accept} accept, ${audit.suggested_reject} reject, ${freshSuggestions.length} added.`);
