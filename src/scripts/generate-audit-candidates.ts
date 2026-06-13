import { writeFile } from "node:fs/promises";
import { config } from "../config.ts";
import { JsonSourceCandidateRepository } from "../repositories/source-candidate-repository.ts";
import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { writeJsonFile } from "../repositories/json-file.ts";
import { auditCandidatesFor, candidateRecommendationsFor } from "../services/audit-candidates.ts";
import { calculateCoverage, calculateCoverageList, renderCoverageReport } from "../services/source-coverage.ts";
import { sourceCandidateKey } from "../repositories/source-candidate-repository.ts";

const sources = await new JsonSourceRepository().list();
const repository = new JsonSourceCandidateRepository();
const before = await repository.list();
const candidates = auditCandidatesFor(sources);
const result = await repository.upsert(candidates, sources);
const beforeByKey = new Map(before.map((item) => [sourceCandidateKey(item), item]));
const afterKeys = new Set(result.map(sourceCandidateKey));
const coverage = calculateCoverageList(sources, result);
const report = [
  "# Batch Source Candidates",
  "",
  `Generated at: ${new Date().toISOString()}`,
  "",
  "Candidates fill only missing Coverage dimensions. They remain pending review and are not written to sources.json.",
  "",
  ...sources.filter((source) => calculateCoverage(source).coverage_score < 5).flatMap((source) => {
    const current = calculateCoverage(source);
    const missing = [
      current.identity_sources === 0 ? "identity" : "",
      current.updates_sources === 0 ? "updates" : "",
      current.community_sources === 0 ? "community" : "",
      current.discovery_sources === 0 ? "discovery" : "",
      current.media_sources === 0 ? "media" : "",
    ].filter(Boolean);
    const recommendations = candidateRecommendationsFor(source);
    return [
      `## ${source.product_name}`,
      "",
      `- Current Coverage: ${current.coverage_score}/5`,
      `- Missing dimensions: ${missing.join(", ") || "none"}`,
      "",
      "| URL | Type | Purpose | Priority | Reason | Written to source_candidates.json |",
      "| --- | --- | --- | --- | --- | --- |",
      ...(recommendations.length ? recommendations.map(({ candidate, reason }) => {
        const key = sourceCandidateKey(candidate);
        const existing = beforeByKey.get(key);
        const written = existing ? `No - already ${existing.status}` : afterKeys.has(key) ? "Yes" : "No - duplicate formal source";
        return `| ${candidate.url} | ${candidate.type} | ${candidate.purpose} | ${candidate.priority} | ${reason} | ${written} |`;
      }) : ["| - | - | - | - | No verified official candidate available for the remaining dimension. | No |"]),
      "",
    ];
  }),
].join("\n");

await Promise.all([
  writeFile("batch_source_candidates.md", report, "utf8"),
  writeJsonFile(config.coverageFile, coverage),
  writeFile(config.coverageReportFile, renderCoverageReport(coverage), "utf8"),
]);
console.log(`Candidate pool contains ${result.length} records after audit candidate sync.`);
console.log(`Generated ${candidates.length} eligible recommendations for ${sources.filter((source) => calculateCoverage(source).coverage_score < 5).length} products below 5/5 Coverage.`);
