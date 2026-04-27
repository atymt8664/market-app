import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pool } from "@workspace/db";

type TableRow = { table_name: string };
type PkRow = { column_name: string };
type ColumnTypeRow = { column_name: string; data_type: string };

const FK_SAFE_ORDER = [
  "users",
  "categories",
  "subcategories",
  "ads",
  "conversations",
  "messages",
  "reports",
  "ad_views",
  "ad_likes",
  "ad_favorites",
  "user_follows",
  "user_views",
  "user_sessions",
] as const;

function quoteIdent(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
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

async function getColumnTypes(tableName: string): Promise<Map<string, string>> {
  const sql = `
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = $1
  `;
  const result = await pool.query<ColumnTypeRow>(sql, [tableName]);
  return new Map(result.rows.map((r) => [r.column_name, r.data_type]));
}

function sortTablesForImport(allTables: string[]): string[] {
  const inOrder = FK_SAFE_ORDER.filter((t) => allTables.includes(t));
  const rest = allTables
    .filter((t) => !FK_SAFE_ORDER.includes(t as (typeof FK_SAFE_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...inOrder, ...rest];
}

async function loadRows(filePath: string): Promise<Record<string, unknown>[]> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${filePath}`);
  }
  return parsed as Record<string, unknown>[];
}

async function importTable(tableName: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    console.log(`Skipped ${tableName}: 0 row(s)`);
    return;
  }

  const columns = Object.keys(rows[0]!);
  if (columns.length === 0) {
    console.log(`Skipped ${tableName}: row objects had no columns`);
    return;
  }

  const pkColumns = await getPrimaryKeyColumns(tableName);
  const columnTypes = await getColumnTypes(tableName);
  const conflictClause = " on conflict do nothing";

  const columnSql = columns.map(quoteIdent).join(", ");
  const batchSize = 200;
  let insertedApprox = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values: unknown[] = [];
    const tuples: string[] = [];

    for (const row of chunk) {
      const placeholders = columns.map((column) => {
        const value = row[column];
        const dataType = columnTypes.get(column);
        if (
          (dataType === "json" || dataType === "jsonb") &&
          value !== null &&
          value !== undefined
        ) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        return `$${values.length}`;
      });
      tuples.push(`(${placeholders.join(", ")})`);
    }

    const sql = `
      insert into ${quoteIdent("public")}.${quoteIdent(tableName)} (${columnSql})
      values ${tuples.join(", ")}
      ${conflictClause}
    `;
    await pool.query(sql, values);
    insertedApprox += chunk.length;
  }

  console.log(
    `Imported ${tableName}: processed ${rows.length} row(s), attempted insert ${insertedApprox}`,
  );
}

async function syncSequenceIfNeeded(tableName: string) {
  const sql = `
    select
      c.column_name,
      pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) as sequence_name
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = $1
  `;
  const result = await pool.query<{ column_name: string; sequence_name: string | null }>(
    sql,
    [tableName],
  );

  for (const row of result.rows) {
    if (!row.sequence_name) continue;
    const setvalSql = `
      select setval(
        $1,
        coalesce((select max(${quoteIdent(row.column_name)}) from ${quoteIdent("public")}.${quoteIdent(tableName)}), 1),
        true
      )
    `;
    await pool.query(setvalSql, [row.sequence_name]);
  }
}

async function main() {
  const sourceDirArg = process.argv[2];
  if (!sourceDirArg) {
    throw new Error("Usage: pnpm --filter @workspace/scripts run db:import -- <export-directory>");
  }

  const sourceDir = path.resolve(sourceDirArg);
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".json") && e.name !== "manifest.json")
    .map((e) => e.name);

  if (files.length === 0) {
    throw new Error(`No table JSON files found in ${sourceDir}`);
  }

  const targetTables = await getPublicTables();
  const jsonTables = files.map((f) => f.replace(/\.json$/, ""));
  const importTables = sortTablesForImport(
    jsonTables.filter((table) => targetTables.includes(table)),
  );

  const skipped = jsonTables.filter((table) => !targetTables.includes(table));
  if (skipped.length > 0) {
    console.warn(
      `Skipping ${skipped.length} table(s) not present in target DB schema: ${skipped.join(", ")}`,
    );
  }

  for (const table of importTables) {
    const filePath = path.join(sourceDir, `${table}.json`);
    const rows = await loadRows(filePath);
    await importTable(table, rows);
    await syncSequenceIfNeeded(table);
  }

  console.log(`\nImport completed from: ${sourceDir}`);
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
