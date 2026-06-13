import { readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { config } from "../config.ts";

const inputPath = `${config.publicDir}/app.ts`;
const outputPath = `${config.publicDir}/app.js`;
const source = await readFile(inputPath, "utf8");
const javascript = stripTypeScriptTypes(source, { mode: "transform", sourceMap: false });

await writeFile(outputPath, `// Generated from public/app.ts.\n${javascript}`, "utf8");
console.log("Built public/app.js");
