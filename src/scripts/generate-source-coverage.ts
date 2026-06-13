import { writeFile } from "node:fs/promises";
import { config } from "../config.ts";
import { writeJsonFile } from "../repositories/json-file.ts";
import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { calculateCoverageList, renderCoverageReport } from "../services/source-coverage.ts";
import { JsonSourceCandidateRepository } from "../repositories/source-candidate-repository.ts";

const [sources, candidates] = await Promise.all([new JsonSourceRepository().list(), new JsonSourceCandidateRepository().list()]);
const coverage = calculateCoverageList(sources, candidates);
await Promise.all([
  writeJsonFile(config.coverageFile, coverage),
  writeFile(config.coverageReportFile, renderCoverageReport(coverage), "utf8"),
]);
console.log(`Generated coverage for ${coverage.length} products.`);
