import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  rootDir,
  dataDir: path.join(rootDir, "data"),
  publicDir: path.join(rootDir, "public"),
  sourcesFile: path.join(rootDir, "data", "sources.json"),
  healthFile: path.join(rootDir, "data", "source_health.json"),
  reviewsFile: path.join(rootDir, "data", "source_reviews.json"),
  auditFile: path.join(rootDir, "data", "source_audit.json"),
  candidatesFile: path.join(rootDir, "data", "source_candidates.json"),
  auditReportFile: path.join(rootDir, "source_audit_report.md"),
  registryDiagnosticsFile: path.join(rootDir, "source_registry_diagnostics.md"),
  coverageFile: path.join(rootDir, "data", "source_coverage.json"),
  coverageReportFile: path.join(rootDir, "source_coverage_report.md"),
  port: Number(process.env.PORT ?? 4173),
  host: process.env.HOST ?? "127.0.0.1",
  scanTimeoutMs: Number(process.env.SCAN_TIMEOUT_MS ?? 12_000),
};
