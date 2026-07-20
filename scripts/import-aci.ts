import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { importAciCsv } from "../src/lib/aci-import";

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Uso: npx tsx scripts/import-aci.ts data/aci-2026.csv");
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), fileArg);
  const content = await readFile(filePath, "utf8");
  const summary = await importAciCsv({
    content,
    sourceFile: path.basename(filePath),
    replaceYear: true,
  });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
