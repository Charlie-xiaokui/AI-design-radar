import { writeFile } from "node:fs/promises";
import { config } from "../config.ts";
import type { Source } from "../types/source.ts";

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export async function writeSourceReview(sources: Source[]): Promise<void> {
  const rows = [...sources]
    .sort((a, b) => a.product_name.localeCompare(b.product_name))
    .map((source) =>
      `| ${escapeCell(source.product_name)} | ${escapeCell(source.design_pattern)} | ${source.media_score} | ${source.signal_score} | ${source.review_status} |`,
    );

  const markdown = [
    "# Source Review",
    "",
    "| Product | Pattern | Media Score | Signal Score | Review Status |",
    "| --- | --- | ---: | ---: | --- |",
    ...rows,
    "",
  ].join("\n");

  await writeFile(`${config.rootDir}/source_review.md`, markdown, "utf8");
}
