import { config } from "../config.ts";
import { JsonRegistryMetadataRepository, type SourceRepository } from "../repositories/source-repository.ts";
import { SOURCE_TYPES, type Source, type SourceHealth, type SourceType } from "../types/source.ts";
import { isPublicAccess } from "./source-access.ts";

const URL_FIELD_BY_TYPE: Record<SourceType, keyof Source> = {
  homepage: "homepage_url",
  github: "github_url",
  changelog: "changelog_url",
  product_hunt: "product_hunt_url",
  x: "x_url",
};

interface FetchResult {
  response: Response;
  redirected: boolean;
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getMeta(html: string, key: string): string {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (property !== key.toLowerCase()) continue;
    return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "";
  }
  return "";
}

function getTitle(html: string): string {
  return cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

async function fetchWithTimeout(
  url: string,
  accept: string,
  extraHeaders: Record<string, string> = {},
): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.scanTimeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept,
        "user-agent": "AI-Design-Radar-Source-Health/0.1 (+local registry checker)",
        ...extraHeaders,
      },
    });
    return { response, redirected: response.url !== url };
  } finally {
    clearTimeout(timer);
  }
}

function emptyHealth(source: Source, sourceType: SourceType, url: string): SourceHealth {
  return {
    source_id: source.id,
    product_name: source.product_name,
    source_type: sourceType,
    url,
    final_url: "",
    status_code: null,
    ok: false,
    state: "unavailable",
    content_type: "",
    title: "",
    meta_description: "",
    og_image: "",
    og_video: "",
    has_image_hint: false,
    has_video_hint: false,
    github_repo_exists: null,
    github_has_releases: null,
    github_readme_has_media: null,
    latest_release_at: "",
    checked_at: new Date().toISOString(),
    error: "",
  };
}

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const parsed = new URL(url);
  if (parsed.hostname !== "github.com") return null;
  const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
  if (!owner || !repo || repo === "releases") return null;
  return { owner, repo: repo.replace(/\.git$/, "") };
}

async function githubApi(pathname: string): Promise<Response> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "AI-Design-Radar-Source-Health/0.1",
    "x-github-api-version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return fetchWithTimeout(`https://api.github.com${pathname}`, headers.accept, headers).then(({ response }) => response);
}

async function enrichGithub(health: SourceHealth): Promise<void> {
  const repo = parseGithubRepo(health.url);
  if (!repo) return;
  const basePath = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  const repoResponse = await githubApi(basePath);
  health.github_repo_exists = repoResponse.ok;
  if (!repoResponse.ok) return;

  const [releaseResponse, readmeResponse] = await Promise.all([
    githubApi(`${basePath}/releases/latest`),
    githubApi(`${basePath}/readme`),
  ]);

  health.github_has_releases = releaseResponse.ok;
  if (releaseResponse.ok) {
    const release = (await releaseResponse.json()) as { published_at?: string };
    health.latest_release_at = release.published_at ?? "";
  }

  if (readmeResponse.ok) {
    const readme = (await readmeResponse.json()) as { content?: string; encoding?: string };
    const markdown = readme.encoding === "base64" && readme.content
      ? Buffer.from(readme.content.replace(/\n/g, ""), "base64").toString("utf8")
      : "";
    const imagePattern = /!\[[^\]]*\]\([^)]*\.(?:png|jpe?g|gif|webp|svg)(?:\?[^)]*)?\)|<img\b/i;
    const videoPattern = /\.(?:mp4|webm|mov)(?:\?\S*)?|<video\b|github\.com\/user-attachments\/assets/i;
    health.github_readme_has_media = imagePattern.test(markdown) || videoPattern.test(markdown);
    health.has_image_hint ||= imagePattern.test(markdown);
    health.has_video_hint ||= videoPattern.test(markdown) || /\.gif(?:\?\S*)?/i.test(markdown);
  } else {
    health.github_readme_has_media = false;
  }
}

export async function checkSourceUrl(
  source: Source,
  sourceType: SourceType,
  url: string,
): Promise<SourceHealth> {
  const health = emptyHealth(source, sourceType, url);
  try {
    const { response, redirected } = await fetchWithTimeout(
      url,
      sourceType === "x" ? "text/html;q=0.8,*/*;q=0.1" : "text/html,application/xhtml+xml",
    );
    health.final_url = response.url;
    health.status_code = response.status;
    health.ok = response.ok;
    health.state = response.ok ? (redirected ? "redirected" : "accessible") : "unavailable";
    health.content_type = response.headers.get("content-type") ?? "";

    // X is connectivity-only. Do not read or parse its page body.
    if (sourceType !== "x" && health.content_type.includes("text/html")) {
      const html = (await response.text()).slice(0, 1_500_000);
      health.title = getTitle(html);
      health.meta_description = getMeta(html, "description");
      health.og_image = getMeta(html, "og:image");
      health.og_video = getMeta(html, "og:video") || getMeta(html, "og:video:url");
      health.has_image_hint = Boolean(health.og_image);
      health.has_video_hint = Boolean(health.og_video);
    }

    if (sourceType === "github") await enrichGithub(health);
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    health.state = isTimeout ? "timeout" : "unavailable";
    health.error = error instanceof Error ? error.message : String(error);
  }
  health.checked_at = new Date().toISOString();
  return health;
}

export async function scanSources(
  sourceRepository: SourceRepository,
  metadataRepository = new JsonRegistryMetadataRepository(),
): Promise<SourceHealth[]> {
  const sources = await sourceRepository.list();
  const jobs: Array<Promise<SourceHealth>> = [];
  for (const source of sources.filter((item) => item.status === "active")) {
    for (const sourceType of SOURCE_TYPES) {
      const url = String(source[URL_FIELD_BY_TYPE[sourceType]] ?? "");
      if (url && isPublicAccess({ type: sourceType })) jobs.push(checkSourceUrl(source, sourceType, url));
    }
  }
  const health = await Promise.all(jobs);
  await metadataRepository.saveHealth(health);
  return health;
}
