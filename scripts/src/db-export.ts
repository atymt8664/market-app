import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "@workspace/db";

type TableRow = { table_name: string };
type PkRow = { column_name: string };

function quoteIdent(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function nowStamp(): string {
  return new Date().toISOString().replaceAll(":", "-");
}

async function getPublicTables(): Promise<string[]> {
  const sql = `
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  const result = await pool.query<TableRow>(sql);
  return result.rows.map((r) => r.table_name);
}

async function getPrimaryKeyColumns(tableName: string): Promise<string[]> {
  const sql = `
    select a.attname as column_name
    from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
    where n.nspname = 'public'
      and c.relname = $1
      and i.indisprimary
    order by array_position(i.indkey, a.attnum)
  `;
  const result = await pool.query<PkRow>(sql, [tableName]);
  return result.rows.map((r) => r.column_name);
}

async function exportTable(baseDir: string, tableName: string): Promise<number> {
  const pkColumns = await getPrimaryKeyColumns(tableName);
  const orderClause =
    pkColumns.length > 0
      ? ` order by ${pkColumns.map(quoteIdent).join(", ")}`
      : "";
  const sql = `select * from ${quoteIdent("public")}.${quoteIdent(tableName)}${orderClause}`;
  const result = await pool.query(sql);
  const filePath = path.join(baseDir, `${tableName}.json`);
  await writeFile(filePath, JSON.stringify(result.rows, null, 2), "utf8");
  return result.rowCount ?? result.rows.length;
}

async function main() {
  const outDirArg = process.argv[2];
  const baseDir =
    outDirArg && outDirArg.trim() !== ""
      ? path.resolve(outDirArg)
      : path.resolve("exports", "old-db", nowStamp());

  await mkdir(baseDir, { recursive: true });

  const tables = await getPublicTables();
  const summary: Array<{ table: string; rows: number }> = [];

  for (const table of tables) {
    const rows = await exportTable(baseDir, table);
    summary.push({ table, rows });
    console.log(`Exported ${table}: ${rows} row(s)`);
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    tableCount: tables.length,
    tables: summary,
  };
  await writeFile(
    path.join(baseDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  console.log(`\nExport completed: ${baseDir}`);
}

main()
  .catch((error) => {
    console.error("Export failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
