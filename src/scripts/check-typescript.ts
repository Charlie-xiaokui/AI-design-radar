import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { config } from "../config.ts";

async function collect(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(filePath) : Promise.resolve(filePath.endsWith(".ts") ? [filePath] : []);
  }));
  return files.flat();
}

const files = [...await collect(path.join(config.rootDir, "src")), path.join(config.publicDir, "app.ts")];
for (const file of files) {
  stripTypeScriptTypes(await readFile(file, "utf8"), { mode: "transform", sourceMap: false });
}

console.log(`Parsed ${files.length} TypeScript files successfully.`);
