import { writeFile } from "node:fs/promises";
import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { calculateCoverage } from "../services/source-coverage.ts";
import { effectiveSources } from "../services/source-signals.ts";

const products = await new JsonSourceRepository().list();

function oldScore(product: (typeof products)[number]): number {
  const active = effectiveSources(product).filter((item) => item.status === "active" && item.url);
  const count = (purpose: string) => active.filter((item) => item.purpose === purpose).length;
  const github = active.filter((item) => item.type.startsWith("github_")).length;
  const x = active.filter((item) => item.type === "x").length;
  return Math.min(8,
    (count("updates") > 0 ? 2 : 0)
    + (count("media") > 0 ? 2 : 0)
    + (count("discovery") > 0 ? 1 : 0)
    + (count("community") > 0 ? 1 : 0)
    + (github > 0 ? 1 : 0)
    + (x > 1 ? 1 : 0));
}

const rows = products.map((product) => ({ product, coverage: calculateCoverage(product), old: oldScore(product) }));
const affected = rows.filter((item) => item.old !== item.coverage.coverage_score);
const ranking = [...rows].sort((a, b) => b.coverage.coverage_score - a.coverage.coverage_score || a.product.product_name.localeCompare(b.product.product_name)).slice(0, 10);
const missing = (item: (typeof rows)[number]) => [
  item.coverage.missing_identity_source ? "identity" : "",
  item.coverage.missing_updates_source ? "updates" : "",
  item.coverage.community_sources === 0 ? "community" : "",
  item.coverage.discovery_sources === 0 ? "discovery" : "",
  item.coverage.missing_media_source ? "media" : "",
].filter(Boolean).join(", ") || "none";

const report = [
  "# Coverage Score v2",
  "",
  `Generated at: ${new Date().toISOString()}`,
  "",
  "## 旧规则",
  "",
  "旧版为 8 分制：updates +2、media +2、discovery +1、community +1、任意 GitHub source +1、多个 X source +1。Identity/homepage 不单独计分，因此重复配置 X 账号可以提高 Coverage Score。",
  "",
  "## 新规则",
  "",
  "新版为 5 分制，每项能力最多 1 分：",
  "",
  "| Capability | Eligible Sources | Score |",
  "| --- | --- | ---: |",
  "| identity | active homepage with purpose=identity | 1 |",
  "| updates | release_notes, news, rss, github_releases, github_releases_rss with purpose=updates | 1 |",
  "| community | github_repo, community, forum, discord, reddit, events, or slack with purpose=community | 1 |",
  "| discovery | x or youtube with purpose=discovery | 1 |",
  "| media | blog, docs, or youtube with purpose=media | 1 |",
  "",
  "同一能力配置多个 source 只提高冗余度，不增加 Coverage Score。多个 X source 不再额外加分。五项能力全部具备即为 5/5。",
  "",
  "## 受影响产品",
  "",
  "由于评分量表和 identity 定义均发生变化，下列产品的数值分数发生变化：",
  "",
  "| Product | Old Score | New Score | Missing Capability |",
  "| --- | ---: | ---: | --- |",
  ...affected.map((item) => `| ${item.product.product_name} | ${item.old}/8 | ${item.coverage.coverage_score}/5 | ${missing(item)} |`),
  "",
  "Claude 是多个 X source 直接影响旧分数的产品：第二个 X 在旧规则中贡献 1 分，在新规则中仅作为冗余来源，不再加分。",
  "",
  "## 新的 Top10 排名",
  "",
  "同分产品按产品名称排序；同类 source 数量不用于打破平分。",
  "",
  "| Rank | Product | Score | Identity | Updates | Community | Discovery | Media |",
  "| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...ranking.map((item, index) => `| ${index + 1} | ${item.product.product_name} | ${item.coverage.coverage_score}/5 | ${item.coverage.identity_sources > 0 ? 1 : 0} | ${item.coverage.updates_sources > 0 ? 1 : 0} | ${item.coverage.community_sources > 0 ? 1 : 0} | ${item.coverage.discovery_sources > 0 ? 1 : 0} | ${item.coverage.media_sources > 0 ? 1 : 0} |`),
  "",
].join("\n");

await writeFile("coverage_score_v2.md", report, "utf8");
console.log(`Generated Coverage Score v2 report for ${products.length} products; ${affected.length} score values changed.`);
