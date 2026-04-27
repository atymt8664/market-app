import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "@workspace/db";

type EnumRow = {
  schema_name: string;
  enum_name: string;
  enum_label: string;
  sort_order: number;
};

type TableRow = {
  table_name: string;
};

type ColumnRow = {
  table_name: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

type ConstraintRow = {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  definition: string;
};

type FkRow = {
  table_name: string;
  constraint_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  delete_rule: string;
  update_rule: string;
};

type IndexRow = {
  table_name: string;
  index_name: string;
  index_def: string;
};

function nowStamp(): string {
  return new Date().toISOString().replaceAll(":", "-");
}

async function getEnums() {
  const sql = `
    select n.nspname as schema_name,
           t.typname as enum_name,
           e.enumlabel as enum_label,
           e.enumsortorder as sort_order
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    order by n.nspname, t.typname, e.enumsortorder
  `;
  const result = await pool.query<EnumRow>(sql);
  return result.rows;
}

async function getTables() {
  const sql = `
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  const result = await pool.query<TableRow>(sql);
  return result.rows;
}

async function getColumns() {
  const sql = `
    select table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `;
  const result = await pool.query<ColumnRow>(sql);
  return result.rows;
}

async function getConstraints() {
  const sql = `
    select tc.table_name,
           tc.constraint_name,
           tc.constraint_type,
           pg_get_constraintdef(pc.oid, true) as definition
    from information_schema.table_constraints tc
    join pg_constraint pc on pc.conname = tc.constraint_name
    join pg_class c on c.oid = pc.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where tc.table_schema = 'public'
      and n.nspname = 'public'
    order by tc.table_name, tc.constraint_type, tc.constraint_name
  `;
  const result = await pool.query<ConstraintRow>(sql);
  return result.rows;
}

async function getForeignKeys() {
  const sql = `
    select tc.table_name,
           tc.constraint_name,
           kcu.column_name,
           ccu.table_name as foreign_table_name,
           ccu.column_name as foreign_column_name,
           rc.delete_rule,
           rc.update_rule
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    join information_schema.referential_constraints rc
      on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
    order by tc.table_name, tc.constraint_name, kcu.ordinal_position
  `;
  const result = await pool.query<FkRow>(sql);
  return result.rows;
}

async function getIndexes() {
  const sql = `
    select tablename as table_name,
           indexname as index_name,
           indexdef as index_def
    from pg_indexes
    where schemaname = 'public'
    order by tablename, indexname
  `;
  const result = await pool.query<IndexRow>(sql);
  return result.rows;
}

async function main() {
  const outArg = process.argv[2];
  const outDir = outArg?.trim()
    ? path.resolve(outArg)
    : path.resolve("exports", "schema", nowStamp());

  await mkdir(outDir, { recursive: true });

  const [enums, tables, columns, constraints, foreignKeys, indexes] = await Promise.all([
    getEnums(),
    getTables(),
    getColumns(),
    getConstraints(),
    getForeignKeys(),
    getIndexes(),
  ]);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    schema: "public",
    tableCount: tables.length,
    enumCount: new Set(enums.map((e) => `${e.schema_name}.${e.enum_name}`)).size,
    tables,
    columns,
    constraints,
    foreignKeys,
    indexes,
    enums,
  };

  const filePath = path.join(outDir, "schema-snapshot.json");
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Schema snapshot written: ${filePath}`);
}

main()
  .catch((error) => {
    console.error("Schema snapshot failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
