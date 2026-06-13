import { writeFile } from "node:fs/promises";
import { config } from "../config.ts";
import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { applyAuditResultsToSources, auditSources, renderAuditReport } from "../services/source-auditor.ts";
import { writeJsonFile } from "../repositories/json-file.ts";
import { renderRegistryDiagnostics } from "../services/source-registry-diagnostics.ts";
import { JsonSourceCandidateRepository } from "../repositories/source-candidate-repository.ts";
import { auditCandidatesFor } from "../services/audit-candidates.ts";

const repository = new JsonSourceRepository();
const candidateRepository = new JsonSourceCandidateRepository();
const allSources = await repository.list();
const sources = allSources.filter((source) => source.status === "active");
const generatedAt = new Date();

console.log(`Auditing ${sources.length} active sources over the previous 30 days...`);
const results = await auditSources(sources, generatedAt);
const successfulChecks = results.reduce((total, result) => total + result.successful_checks, 0);
if (successfulChecks === 0) {
  throw new Error("Audit aborted: no configured public source could be reached. Existing audit outputs were not overwritten.");
}

await Promise.all([
  writeJsonFile(config.sourcesFile, applyAuditResultsToSources(allSources, results)),
  writeJsonFile(config.auditFile, results.map((result) => result.audit)),
  writeFile(config.auditReportFile, renderAuditReport(results, generatedAt), "utf8"),
  writeFile(config.registryDiagnosticsFile, renderRegistryDiagnostics({ sources: allSources, audits: results.map((result) => result.audit), details: results, generatedAt }), "utf8"),
]);
await candidateRepository.upsert(auditCandidatesFor(allSources), allSources);

const totals = { high: 0, medium: 0, low: 0 };
let errors = 0;
for (const result of results) {
  totals[result.audit.collector_priority] += 1;
  errors += result.errors.length;
}

console.log(
  `Audit complete: ${totals.high} high, ${totals.medium} medium, ${totals.low} low priority sources across ${successfulChecks} successful checks.`,
);
if (errors) console.log(`${errors} source checks returned errors; see source_audit_report.md for details.`);
console.log("Wrote data/source_audit.json, data/source_candidates.json, source_audit_report.md, and source_registry_diagnostics.md.");
