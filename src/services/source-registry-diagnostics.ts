import type { AuditDetails } from "./source-auditor.ts";
import { effectiveSources } from "./source-signals.ts";
import type { Source, SourceAudit, SourceHealth } from "../types/source.ts";
import { sourceHasPurpose } from "./source-purpose.ts";

interface DiagnosticsInput {
  sources: Source[];
  audits: SourceAudit[];
  health?: SourceHealth[];
  details?: AuditDetails[];
  generatedAt?: Date;
}

function section(lines: string[], heading: string, items: string[]): void {
  lines.push(`## ${heading}`, "");
  if (!items.length) lines.push("- None detected.", "");
  else lines.push(...items.map((item) => `- ${item}`), "");
}

export function renderRegistryDiagnostics(input: DiagnosticsInput): string {
  const auditByProduct = new Map(input.audits.map((audit) => [audit.product_name, audit]));
  const detailsByProduct = new Map((input.details ?? []).map((detail) => [detail.audit.product_name, detail]));

  const zeroUpdatesWithMedia = input.sources.flatMap((source) => {
    const audit = auditByProduct.get(source.product_name);
    return audit?.updates_30d === 0 && audit.media_score >= 4
      ? [`${source.product_name}: updates_30d=0, media_score=${audit.media_score}, priority=${audit.collector_priority}.`]
      : [];
  });

  const homepageFailuresWithUpdates = input.sources.flatMap((source) => {
    const detail = detailsByProduct.get(source.product_name);
    const nested = effectiveSources(source);
    const homepageUrl = nested.find((item) => item.type === "homepage")?.url;
    const detailHomepage = detail?.signal_results.find((item) => item.source.type === "homepage");
    const healthHomepage = input.health?.find((item) => item.source_id === source.id && item.url === homepageUrl);
    const status = detailHomepage?.status_code ?? healthHomepage?.status_code;
    const hasValidUpdates = detail
      ? detail.signal_results.some((item) => sourceHasPurpose(item.source, "updates") && item.ok)
      : nested.some((item) => sourceHasPurpose(item, "updates") && item.status === "active");
    return (status === 403 || status === 404) && hasValidUpdates
      ? [`${source.product_name}: homepage returned ${status}, but another active updates source is available.`]
      : [];
  });

  const noUpdatesSource = input.sources.flatMap((source) =>
    effectiveSources(source).some((item) => sourceHasPurpose(item, "updates") && item.status === "active" && item.url)
      ? []
      : [`${source.product_name}: no active purpose=updates source.`],
  );

  const noMediaSource = input.sources.flatMap((source) =>
    effectiveSources(source).some((item) => sourceHasPurpose(item, "media") && item.status === "active" && item.url)
      ? []
      : [`${source.product_name}: no active purpose=media source; Source Network v2 will not count page media for this product.`],
  );

  const manualXReview = input.sources.flatMap((source) => {
    const candidates = effectiveSources(source).filter((item) => item.type === "x");
    return candidates.some((item) => !item.url || item.status !== "active" || /manual|review|confirm|uncertain/i.test(item.notes))
      ? [`${source.product_name}: ${candidates.map((item) => item.notes || "X address requires review").join("; ")}`]
      : [];
  });

  const onlyOneXSource = input.sources.flatMap((source) => {
    const count = effectiveSources(source).filter((item) => item.type === "x" && item.status === "active" && item.url).length;
    return count === 1 ? [`WARNING: ${source.product_name} has only one active X source.`] : [];
  });

  const onlyOneGithubSource = input.sources.flatMap((source) => {
    const count = effectiveSources(source).filter((item) => item.type.startsWith("github_") && item.status === "active" && item.url).length;
    return count === 1 ? [`WARNING: ${source.product_name} has only one active GitHub source.`] : [];
  });

  const lines = [
    "# Source Registry Diagnostics",
    "",
    `Generated at: ${(input.generatedAt ?? new Date()).toISOString()}`,
    "",
    "This report diagnoses registry coverage. Discovery/community sources do not contribute to activity scoring.",
    "",
  ];
  section(lines, "Updates 30d = 0 but Media Score >= 4", zeroUpdatesWithMedia);
  section(lines, "Homepage 403/404 with Other Update Sources", homepageFailuresWithUpdates);
  section(lines, "Products Without an Updates Source", noUpdatesSource);
  section(lines, "Products Without a Media Source", noMediaSource);
  section(lines, "Products With Only One X Source", onlyOneXSource);
  section(lines, "Products With Only One GitHub Source", onlyOneGithubSource);
  section(lines, "X Addresses Requiring Manual Review", manualXReview);
  return lines.join("\n");
}
