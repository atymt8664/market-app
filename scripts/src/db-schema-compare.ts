import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Snapshot = {
  generatedAt: string;
  schema: string;
  tableCount: number;
  enumCount: number;
  tables: Array<{ table_name: string }>;
  columns: Array<{
    table_name: string;
    column_name: string;
    ordinal_position: number;
    data_type: string;
    udt_name: string;
    is_nullable: "YES" | "NO";
    column_default: string | null;
  }>;
  constraints: Array<{
    table_name: string;
    constraint_name: string;
    constraint_type: string;
    definition: string;
  }>;
  foreignKeys: Array<{
    table_name: string;
    constraint_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
    delete_rule: string;
    update_rule: string;
  }>;
  indexes: Array<{
    table_name: string;
    index_name: string;
    index_def: string;
  }>;
  enums: Array<{
    schema_name: string;
    enum_name: string;
    enum_label: string;
    sort_order: number;
  }>;
};

function key(parts: string[]): string {
  return parts.join("::");
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function toSet(values: string[]): Set<string> {
  return new Set(values);
}

function diffSets(oldSet: Set<string>, newSet: Set<string>) {
  const onlyInOld = sortStrings([...oldSet].filter((v) => !newSet.has(v)));
  const onlyInNew = sortStrings([...newSet].filter((v) => !oldSet.has(v)));
  return { onlyInOld, onlyInNew };
}

function normalizeIndex(indexDef: string): string {
  return indexDef.replace(/\s+/g, " ").trim();
}

function parseSnapshot(raw: string, label: string): Snapshot {
  const parsed = JSON.parse(raw) as Snapshot;
  if (!parsed || !Array.isArray(parsed.tables) || !Array.isArray(parsed.columns)) {
    throw new Error(`Invalid snapshot format for ${label}`);
  }
  return parsed;
}

function tableColumnKey(c: Snapshot["columns"][number]): string {
  return key([c.table_name, c.column_name]);
}

function tableFkKey(fk: Snapshot["foreignKeys"][number]): string {
  return key([
    fk.table_name,
    fk.column_name,
    fk.foreign_table_name,
    fk.foreign_column_name,
    fk.delete_rule,
    fk.update_rule,
  ]);
}

function tableConstraintKey(c: Snapshot["constraints"][number]): string {
  return key([c.table_name, c.constraint_type, c.definition]);
}

function tableIndexKey(i: Snapshot["indexes"][number]): string {
  return key([i.table_name, i.index_name, normalizeIndex(i.index_def)]);
}

function enumKey(e: Snapshot["enums"][number]): string {
  return key([e.schema_name, e.enum_name, String(e.sort_order), e.enum_label]);
}

function markdownList(title: string, items: string[]): string {
  if (items.length === 0) return `### ${title}\n- None\n`;
  return `### ${title}\n${items.map((i) => `- ${i}`).join("\n")}\n`;
}

async function main() {
  const oldPathArg = process.argv[2];
  const newPathArg = process.argv[3];
  const outDirArg = process.argv[4];

  if (!oldPathArg || !newPathArg) {
    throw new Error(
      "Usage: pnpm --filter @workspace/scripts run db:schema:compare -- <old-snapshot.json> <new-snapshot.json> [output-dir]",
    );
  }

  const oldPath = path.resolve(oldPathArg);
  const newPath = path.resolve(newPathArg);
  const outDir = path.resolve(
    outDirArg && outDirArg.trim() !== "" ? outDirArg : path.join("exports", "schema-diff"),
  );
  await mkdir(outDir, { recursive: true });

  const oldSnapshot = parseSnapshot(await readFile(oldPath, "utf8"), "old");
  const newSnapshot = parseSnapshot(await readFile(newPath, "utf8"), "new");

  const oldTables = toSet(oldSnapshot.tables.map((t) => t.table_name));
  const newTables = toSet(newSnapshot.tables.map((t) => t.table_name));
  const tableDiff = diffSets(oldTables, newTables);

  const oldEnums = toSet(oldSnapshot.enums.map(enumKey));
  const newEnums = toSet(newSnapshot.enums.map(enumKey));
  const enumDiff = diffSets(oldEnums, newEnums);

  const oldColsMap = new Map(oldSnapshot.columns.map((c) => [tableColumnKey(c), c]));
  const newColsMap = new Map(newSnapshot.columns.map((c) => [tableColumnKey(c), c]));
  const colDiffKeys = diffSets(toSet([...oldColsMap.keys()]), toSet([...newColsMap.keys()]));
  const sharedColKeys = [...oldColsMap.keys()].filter((k) => newColsMap.has(k)).sort();

  const changedColumns: string[] = [];
  for (const k of sharedColKeys) {
    const oldCol = oldColsMap.get(k)!;
    const newCol = newColsMap.get(k)!;
    if (
      oldCol.data_type !== newCol.data_type ||
      oldCol.udt_name !== newCol.udt_name ||
      oldCol.is_nullable !== newCol.is_nullable ||
      (oldCol.column_default ?? null) !== (newCol.column_default ?? null)
    ) {
      changedColumns.push(
        `${oldCol.table_name}.${oldCol.column_name} | old: type=${oldCol.data_type}(${oldCol.udt_name}), nullable=${oldCol.is_nullable}, default=${oldCol.column_default ?? "null"} | new: type=${newCol.data_type}(${newCol.udt_name}), nullable=${newCol.is_nullable}, default=${newCol.column_default ?? "null"}`,
      );
    }
  }

  const oldFks = toSet(oldSnapshot.foreignKeys.map(tableFkKey));
  const newFks = toSet(newSnapshot.foreignKeys.map(tableFkKey));
  const fkDiff = diffSets(oldFks, newFks);

  const oldConstraints = toSet(oldSnapshot.constraints.map(tableConstraintKey));
  const newConstraints = toSet(newSnapshot.constraints.map(tableConstraintKey));
  const constraintDiff = diffSets(oldConstraints, newConstraints);

  const oldIndexes = toSet(oldSnapshot.indexes.map(tableIndexKey));
  const newIndexes = toSet(newSnapshot.indexes.map(tableIndexKey));
  const indexDiff = diffSets(oldIndexes, newIndexes);

  const recommendations: string[] = [];
  if (tableDiff.onlyInOld.length > 0) {
    recommendations.push(
      "Create missing old tables in Supabase only if required by current API/feature paths; prefer additive migrations.",
    );
  }
  if (colDiffKeys.onlyInOld.length > 0 || changedColumns.length > 0) {
    recommendations.push(
      "Add missing columns and relax constraints first (nullable/default) before backfilling and tightening.",
    );
  }
  if (fkDiff.onlyInOld.length > 0) {
    recommendations.push(
      "Add foreign keys after data import prechecks to avoid batch failures due to orphaned rows.",
    );
  }
  if (indexDiff.onlyInOld.length > 0) {
    recommendations.push("Add indexes concurrently where possible to reduce write locks.");
  }
  if (tableDiff.onlyInNew.length > 0 || colDiffKeys.onlyInNew.length > 0) {
    recommendations.push(
      "Keep Supabase-only auth/session tables and fields; do not drop without explicit approval.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("No schema differences detected that require changes.");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    oldSnapshotPath: oldPath,
    newSnapshotPath: newPath,
    overview: {
      oldTables: oldSnapshot.tableCount,
      newTables: newSnapshot.tableCount,
      oldEnums: oldSnapshot.enumCount,
      newEnums: newSnapshot.enumCount,
    },
    differences: {
      tables: tableDiff,
      enums: enumDiff,
      columns: {
        onlyInOld: colDiffKeys.onlyInOld,
        onlyInNew: colDiffKeys.onlyInNew,
        changedDefinitions: changedColumns,
      },
      foreignKeys: fkDiff,
      constraints: constraintDiff,
      indexes: indexDiff,
    },
    recommendations,
  };

  const jsonPath = path.join(outDir, "schema-compare-report.json");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const md = [
    "# Schema Comparison Report",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Old snapshot: \`${oldPath}\``,
    `- New snapshot: \`${newPath}\``,
    "",
    "## Overview",
    `- Old tables: ${report.overview.oldTables}`,
    `- New tables: ${report.overview.newTables}`,
    `- Old enums: ${report.overview.oldEnums}`,
    `- New enums: ${report.overview.newEnums}`,
    "",
    markdownList("Tables only in old", report.differences.tables.onlyInOld),
    markdownList("Tables only in new", report.differences.tables.onlyInNew),
    markdownList("Enums only in old", report.differences.enums.onlyInOld),
    markdownList("Enums only in new", report.differences.enums.onlyInNew),
    markdownList("Columns only in old", report.differences.columns.onlyInOld),
    markdownList("Columns only in new", report.differences.columns.onlyInNew),
    markdownList("Columns with changed definitions", report.differences.columns.changedDefinitions),
    markdownList("Foreign keys only in old", report.differences.foreignKeys.onlyInOld),
    markdownList("Foreign keys only in new", report.differences.foreignKeys.onlyInNew),
    markdownList("Constraints only in old", report.differences.constraints.onlyInOld),
    markdownList("Constraints only in new", report.differences.constraints.onlyInNew),
    markdownList("Indexes only in old", report.differences.indexes.onlyInOld),
    markdownList("Indexes only in new", report.differences.indexes.onlyInNew),
    "## Recommended Safe Changes",
    ...report.recommendations.map((r) => `- ${r}`),
    "",
  ].join("\n");

  const mdPath = path.join(outDir, "schema-compare-report.md");
  await writeFile(mdPath, md, "utf8");

  console.log(`Schema compare report JSON: ${jsonPath}`);
  console.log(`Schema compare report MD:   ${mdPath}`);
}

main().catch((error) => {
  console.error("Schema compare failed:", error);
  process.exitCode = 1;
});
