import { readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { config } from "../config.ts";

const entries = ["app", "radar"];

for (const entry of entries) {
  const inputPath = `${config.publicDir}/${entry}.ts`;
  const outputPath = `${config.publicDir}/${entry}.js`;
  const source = await readFile(inputPath, "utf8");
  const javascript = stripTypeScriptTypes(source, { mode: "transform", sourceMap: false });
  await writeFile(outputPath, `// Generated from public/${entry}.ts.\n${javascript}`, "utf8");
  console.log(`Built public/${entry}.js`);
}
