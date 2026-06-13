import { writeFile } from "node:fs/promises";
import { config } from "../config.ts";
import { readJsonFile } from "../repositories/json-file.ts";
import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { renderRegistryDiagnostics } from "../services/source-registry-diagnostics.ts";
import type { SourceAudit, SourceHealth } from "../types/source.ts";

const [sources, audits, health] = await Promise.all([
  new JsonSourceRepository().list(),
  readJsonFile<SourceAudit[]>(config.auditFile).catch(() => []),
  readJsonFile<SourceHealth[]>(config.healthFile).catch(() => []),
]);
await writeFile(config.registryDiagnosticsFile, renderRegistryDiagnostics({ sources, audits, health }), "utf8");
console.log("Generated source_registry_diagnostics.md.");
