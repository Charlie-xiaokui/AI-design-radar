import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.ts";
import { JsonRegistryMetadataRepository, JsonSourceRepository } from "./repositories/source-repository.ts";
import { scanSources } from "./services/scanner.ts";
import { writeSourceReview } from "./services/source-review.ts";
import { SOURCE_TYPES, type SourceAudit, type SourceReview, type SourceType } from "./types/source.ts";
import { readJsonFile, writeJsonFile } from "./repositories/json-file.ts";
import { recommendedSourcesFor } from "./services/source-recommendations.ts";
import { acceptSuggestedSource, updateSuggestedSource } from "./services/source-suggestions.ts";
import { calculateCoverageList, renderCoverageReport } from "./services/source-coverage.ts";
import { discoverFollowupSources } from "./services/source-followup.ts";
import { addProductSource, deleteProductSource, reorderProductSources, updateProductSource } from "./services/product-source-manager.ts";
import { JsonSourceCandidateRepository, sourceCandidateKey } from "./repositories/source-candidate-repository.ts";
import { acceptSourceCandidate, rejectSourceCandidate } from "./services/source-candidates.ts";
import type { SourceCandidate } from "./types/source.ts";

const sources = new JsonSourceRepository();
const metadata = new JsonRegistryMetadataRepository();
const candidates = new JsonSourceCandidateRepository();

async function refreshDerivedFiles(): Promise<void> {
  const [sourceList, candidateList] = await Promise.all([sources.list(), candidates.list()]);
  const coverage = calculateCoverageList(sourceList, candidateList);
  await Promise.all([
    writeSourceReview(sourceList),
    writeFile(config.coverageReportFile, renderCoverageReport(coverage), "utf8"),
    writeJsonFile(config.coverageFile, coverage),
  ]);
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 2_000_000) throw new Error("Request body too large");
    chunks.push(buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function registrySnapshot() {
  const [sourceList, health, reviews, audit, candidateList] = await Promise.all([
    sources.list(),
    metadata.listHealth(),
    metadata.listReviews(),
    readJsonFile<SourceAudit[]>(config.auditFile).catch(() => []),
    candidates.list(),
  ]);
  return {
    sources: sourceList,
    health,
    reviews,
    audit,
    candidates: candidateList.map((candidate) => ({ ...candidate, candidate_key: sourceCandidateKey(candidate) })),
    recommendations: Object.fromEntries(sourceList.map((source) => [source.id, recommendedSourcesFor(source)])),
    coverage: calculateCoverageList(sourceList, candidateList),
  };
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
  if (!url.pathname.startsWith("/api/")) return false;

  if (request.method === "GET" && url.pathname === "/api/registry") {
    sendJson(response, 200, await registrySnapshot());
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/sources/export") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="sources-${new Date().toISOString().slice(0, 10)}.json"`,
    });
    response.end(`${JSON.stringify(await sources.list(), null, 2)}\n`);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/sources/import") {
    await sources.replaceAll(await readBody(request));
    await refreshDerivedFiles();
    sendJson(response, 200, await registrySnapshot());
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/sources") {
    const source = await sources.create((await readBody(request)) as never);
    await refreshDerivedFiles();
    sendJson(response, 201, source);
    return true;
  }

  const sourceMatch = url.pathname.match(/^\/api\/sources\/([^/]+)$/);
  if (sourceMatch?.[1] && request.method === "PUT") {
    const source = await sources.update(decodeURIComponent(sourceMatch[1]), (await readBody(request)) as never);
    await refreshDerivedFiles();
    sendJson(response, 200, source);
    return true;
  }
  if (sourceMatch?.[1] && request.method === "DELETE") {
    await sources.delete(decodeURIComponent(sourceMatch[1]));
    await refreshDerivedFiles();
    response.writeHead(204).end();
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/scan") {
    const health = await scanSources(sources, metadata);
    sendJson(response, 200, { health });
    return true;
  }

  const productSourcesMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/sources$/);
  if (productSourcesMatch?.[1] && request.method === "POST") {
    const updated = await addProductSource(sources, decodeURIComponent(productSourcesMatch[1]), (await readBody(request)) as never);
    await refreshDerivedFiles();
    sendJson(response, 201, updated);
    return true;
  }
  if (productSourcesMatch?.[1] && request.method === "DELETE") {
    const updated = await deleteProductSource(sources, decodeURIComponent(productSourcesMatch[1]), (await readBody(request)) as never);
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }
  const productSourceOrderMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/sources\/order$/);
  if (productSourceOrderMatch?.[1] && request.method === "PUT") {
    const body = (await readBody(request)) as { source_ids?: string[] };
    const updated = await reorderProductSources(sources, decodeURIComponent(productSourceOrderMatch[1]), body.source_ids ?? []);
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }
  const productSourceMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/sources\/([^/]+)$/);
  if (productSourceMatch?.[1] && productSourceMatch[2] && request.method === "PUT") {
    const updated = await updateProductSource(sources, decodeURIComponent(productSourceMatch[1]), decodeURIComponent(productSourceMatch[2]), (await readBody(request)) as never);
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }
  if (productSourceMatch?.[1] && productSourceMatch[2] && request.method === "DELETE") {
    const updated = await deleteProductSource(sources, decodeURIComponent(productSourceMatch[1]), { id: decodeURIComponent(productSourceMatch[2]) });
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }

  const suggestionMatch = url.pathname.match(/^\/api\/suggestions\/([^/]+)\/([^/]+)$/);
  if (suggestionMatch?.[1] && suggestionMatch[2] && request.method === "PUT") {
    const updated = await updateSuggestedSource(sources, decodeURIComponent(suggestionMatch[1]), decodeURIComponent(suggestionMatch[2]), (await readBody(request)) as never);
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }
  const suggestionActionMatch = url.pathname.match(/^\/api\/suggestions\/([^/]+)\/([^/]+)\/(accept|reject)$/);
  if (suggestionActionMatch?.[1] && suggestionActionMatch[2] && suggestionActionMatch[3] && request.method === "POST") {
    const productId = decodeURIComponent(suggestionActionMatch[1]);
    const suggestionId = decodeURIComponent(suggestionActionMatch[2]);
    const body = (await readBody(request)) as Partial<Pick<import("./types/source.ts").SuggestedSource, "url" | "type" | "purpose" | "primary_purpose" | "purposes" | "access_type">>;
    const finalData = body.url && body.type && body.purpose
      ? { url: body.url, type: body.type, purpose: body.purpose, primary_purpose: body.primary_purpose, purposes: body.purposes, access_type: body.access_type }
      : undefined;
    const updated = suggestionActionMatch[3] === "accept"
      ? await acceptSuggestedSource(sources, productId, suggestionId, finalData)
      : await updateSuggestedSource(sources, productId, suggestionId, { status: "rejected" });
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }

  const candidateMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)\/([^/]+)$/);
  if (candidateMatch?.[1] && candidateMatch[2] && request.method === "PUT") {
    const productId = decodeURIComponent(candidateMatch[1]);
    const key = decodeURIComponent(candidateMatch[2]);
    const product = (await sources.list()).find((item) => item.id === productId);
    if (!product) throw new Error("Product not found");
    const candidate = await candidates.findByKeyOrData(product.product_name, key);
    if (!candidate) throw new Error("Source candidate not found");
    const body = (await readBody(request)) as Partial<Pick<SourceCandidate, "url" | "type" | "purpose" | "primary_purpose" | "purposes" | "access_type">>;
    const updated = await candidates.update(candidate, { ...body, status: "pending_review" });
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }

  const candidateActionMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)\/([^/]+)\/(accept|reject)$/);
  if (candidateActionMatch?.[1] && candidateActionMatch[2] && candidateActionMatch[3] && request.method === "POST") {
    const productId = decodeURIComponent(candidateActionMatch[1]);
    const key = decodeURIComponent(candidateActionMatch[2]);
    const product = (await sources.list()).find((item) => item.id === productId);
    if (!product) throw new Error("Product not found");
    const body = (await readBody(request)) as Partial<Pick<SourceCandidate, "url" | "type" | "purpose" | "primary_purpose" | "purposes" | "access_type">>;
    const finalData = body.url && body.type && body.purpose
      ? { url: body.url, type: body.type, purpose: body.purpose, primary_purpose: body.primary_purpose, purposes: body.purposes, access_type: body.access_type }
      : undefined;
    const candidate = await candidates.findByKeyOrData(product.product_name, key, finalData);
    if (!candidate) throw new Error("Source candidate not found");
    const finalCandidate = finalData && sourceCandidateKey(candidate) !== sourceCandidateKey({ product: product.product_name, ...finalData })
      ? await candidates.update(candidate, { ...finalData, status: "pending_review" })
      : candidate;
    const updated = candidateActionMatch[3] === "accept"
      ? await acceptSourceCandidate(sources, candidates, productId, finalCandidate)
      : await rejectSourceCandidate(candidates, finalCandidate);
    await refreshDerivedFiles();
    sendJson(response, 200, updated);
    return true;
  }

  const followupMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/discover-followups$/);
  if (followupMatch?.[1] && request.method === "POST") {
    const productId = decodeURIComponent(followupMatch[1]);
    const product = (await sources.list()).find((item) => item.id === productId);
    if (!product) throw new Error("Product not found");
    const discovered = await discoverFollowupSources(product);
    const updated = discovered.length
      ? await sources.update(product.id, { suggested_sources: [...(Array.isArray(product.suggested_sources) ? product.suggested_sources : []), ...discovered] })
      : product;
    await refreshDerivedFiles();
    sendJson(response, 200, { source: updated, discovered: discovered.length });
    return true;
  }

  const reviewMatch = url.pathname.match(/^\/api\/reviews\/([^/]+)\/([^/]+)$/);
  if (reviewMatch?.[1] && reviewMatch[2] && request.method === "PUT") {
    const sourceType = decodeURIComponent(reviewMatch[2]) as SourceType;
    if (!SOURCE_TYPES.includes(sourceType)) throw new Error("Invalid source type");
    const body = (await readBody(request)) as Partial<SourceReview>;
    sendJson(response, 200, await metadata.updateReview(
      decodeURIComponent(reviewMatch[1]),
      sourceType,
      { manual_verified: Boolean(body.manual_verified), media_marked: Boolean(body.media_marked) },
    ));
    return true;
  }

  sendJson(response, 404, { error: "API route not found" });
  return true;
}

async function serveStatic(response: ServerResponse, pathname: string): Promise<void> {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const filePath = path.resolve(config.publicDir, requested);
  if (!filePath.startsWith(`${config.publicDir}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "content-type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (!(await handleApi(request, response, url))) await serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}).listen(config.port, config.host, () => {
  console.log(`Source Registry running at http://${config.host}:${config.port}`);
});
