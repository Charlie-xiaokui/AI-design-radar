import { JsonSourceRepository } from "../repositories/source-repository.ts";
import { scanSources } from "../services/scanner.ts";

const health = await scanSources(new JsonSourceRepository());
const ok = health.filter((item) => item.ok).length;
const redirected = health.filter((item) => item.state === "redirected").length;
const timeout = health.filter((item) => item.state === "timeout").length;

console.log(`Checked ${health.length} URLs: ${ok} reachable, ${redirected} redirected, ${timeout} timed out.`);
