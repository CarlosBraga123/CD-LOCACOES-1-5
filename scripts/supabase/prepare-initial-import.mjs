import fs from "node:fs";
import path from "node:path";
import { createSql, formatReportText, prepareImport, sha256, stableStringify } from "./initial-import-lib.mjs";

const [backupPath, outputArg = "supabase/imports"] = process.argv.slice(2);
if (!backupPath) {
  console.error("Uso: node scripts/supabase/prepare-initial-import.mjs <backup.json> [diretorio-saida]");
  process.exit(2);
}

const absoluteBackup = path.resolve(backupPath);
const outputDir = path.resolve(outputArg);
const original = fs.readFileSync(absoluteBackup);
const backupHash = sha256(original);
const backup = JSON.parse(original.toString("utf8"));
const { data, report } = prepareImport(backup, backupHash);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "initial-import-data.json"), `${stableStringify(data)}\n`);
fs.writeFileSync(path.join(outputDir, "initial-import-report.json"), `${stableStringify(report)}\n`);
fs.writeFileSync(path.join(outputDir, "initial-import-report.txt"), formatReportText(report));

const sqlPath = path.join(outputDir, "initial-import.sql");
if (report.executable_sql_generated) fs.writeFileSync(sqlPath, createSql(data));
else if (fs.existsSync(sqlPath)) fs.rmSync(sqlPath);

console.log(formatReportText(report));
