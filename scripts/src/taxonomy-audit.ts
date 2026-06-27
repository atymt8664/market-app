/**
 * Staging taxonomy audit — legacy subs, ad counts, subcategoryId coverage.
 * Loads api-server .env.local (STAGING only). Does not mutate data.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { db, adsTable, categoriesTable, subcategoriesTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import {
  REFERENCE_CATEGORY_TAXONOMY,
  referenceTaxonomySubcategoryCount,
} from "./seed-reference-taxonomy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiServerDir = path.resolve(__dirname, "../../artifacts/api-server");
dotenv.config({ path: path.join(apiServerDir, ".env") });
dotenv.config({ path: path.join(apiServerDir, ".env.local"), override: true });

function hostOfUrl(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function assertStagingOnly(): void {
  const dbHost = hostOfUrl(process.env.DATABASE_URL);
  if (!dbHost) throw new Error("DATABASE_URL not set");
  const prodGuards = ["nptfxtkedqndkgmrcntn", "souq-arab.com", "production"];
  if (prodGuards.some((g) => dbHost.includes(g))) {
    throw new Error(`Refusing audit on production-like host: ${dbHost}`);
  }
}

async function main() {
  assertStagingOnly();

  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.sortOrder);
  const subs = await db.select().from(subcategoriesTable);
  const refBySlug = Object.fromEntries(
    REFERENCE_CATEGORY_TAXONOMY.map((c) => [c.slug, new Set(c.subs)]),
  );

  const coverageTable = REFERENCE_CATEGORY_TAXONOMY.map((ref) => {
    const cat = cats.find((c) => c.slug === ref.slug);
    const dbSubs = subs.filter((s) => s.categoryId === cat?.id);
    const canonical = dbSubs.filter((s) => ref.subs.includes(s.name));
    const legacy = dbSubs.filter((s) => !ref.subs.includes(s.name));
    return {
      category: ref.name,
      slug: ref.slug,
      categoryId: cat?.id ?? null,
      canonicalSubsExpected: ref.subs.length,
      canonicalSubsInDb: canonical.length,
      legacySubsInDb: legacy.length,
      legacyNames: legacy.map((s) => s.name),
      missingCanonical: ref.subs.filter(
        (n) => !dbSubs.some((s) => s.name === n),
      ),
    };
  });

  const legacySubRows = subs
    .map((sub) => {
      const cat = cats.find((c) => c.id === sub.categoryId);
      const canonicalSet = cat ? refBySlug[cat.slug] : undefined;
      if (!cat || !canonicalSet || canonicalSet.has(sub.name)) return null;
      return { id: sub.id, name: sub.name, categoryId: cat.id, categoryName: cat.name, slug: cat.slug };
    })
    .filter(Boolean) as Array<{
    id: number;
    name: string;
    categoryId: number;
    categoryName: string;
    slug: string;
  }>;

  const legacyIds = legacySubRows.map((r) => r.id);
  const adCountsByLegacySub =
    legacyIds.length === 0
      ? []
      : await db
          .select({
            subcategoryId: adsTable.subcategoryId,
            count: sql<number>`count(*)::int`,
          })
          .from(adsTable)
          .where(inArray(adsTable.subcategoryId, legacyIds))
          .groupBy(adsTable.subcategoryId);

  const legacyWithAds = legacySubRows.map((row) => ({
    ...row,
    adCount: adCountsByLegacySub.find((a) => a.subcategoryId === row.id)?.count ?? 0,
  }));

  const [totalAdsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adsTable);
  const [withSubRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adsTable)
    .where(sql`${adsTable.subcategoryId} is not null and ${adsTable.subcategoryId} > 0`);
  const [withoutSubRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adsTable)
    .where(orNullSubcategory());

  function orNullSubcategory() {
    return sql`(${adsTable.subcategoryId} is null or ${adsTable.subcategoryId} = 0)`;
  }

  const sampleAds = await db
    .select({
      id: adsTable.id,
      title: adsTable.title,
      categoryId: adsTable.categoryId,
      subcategoryId: adsTable.subcategoryId,
      categoryName: categoriesTable.name,
      subcategoryName: subcategoriesTable.name,
      status: adsTable.status,
    })
    .from(adsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, adsTable.categoryId))
    .leftJoin(subcategoriesTable, eq(subcategoriesTable.id, adsTable.subcategoryId))
    .where(inArray(adsTable.status, ["approved", "pending"]))
    .orderBy(sql`${adsTable.id} desc`)
    .limit(30);

  const legacyAdsOnDetail = sampleAds.filter(
    (a) => a.subcategoryId != null && legacyIds.includes(a.subcategoryId),
  );

  const report = {
    ok: true,
    dbHost: hostOfUrl(process.env.DATABASE_URL),
    canonicalSubcategoriesExpected: referenceTaxonomySubcategoryCount(),
    dbCategories: cats.length,
    dbSubcategories: subs.length,
    legacySubcategoryCount: legacySubRows.length,
    legacySubcategoriesWithAds: legacyWithAds.filter((r) => r.adCount > 0),
    legacySubcategoriesWithoutAds: legacyWithAds.filter((r) => r.adCount === 0),
    ads: {
      total: totalAdsRow?.count ?? 0,
      withSubcategoryId: withSubRow?.count ?? 0,
      withoutSubcategoryId: withoutSubRow?.count ?? 0,
      subcategoryIdCoveragePct:
        totalAdsRow?.count && totalAdsRow.count > 0
          ? Math.round(((withSubRow?.count ?? 0) / totalAdsRow.count) * 100)
          : 0,
    },
    coverageTable,
    recentSampleAds: sampleAds,
    recentSampleWithLegacySub: legacyAdsOnDetail,
    legacyCleanupDecision: {
      recommendation:
        legacyWithAds.some((r) => r.adCount > 0) ? "hide_and_migrate" : "hide_or_delete",
      hide: "Set isHidden=true on legacy subs not in REFERENCE_CATEGORY_TAXONOMY",
      migrate:
        "Map ads on legacy subs to canonical subcategoryId by categoryId + closest name match; backfill null subcategoryId from details.categoryPath.sub when possible",
      delete:
        legacyWithAds.every((r) => r.adCount === 0)
          ? "Safe to delete legacy subs with zero ads after hide period"
          : "Do not delete until ads migrated",
    },
    backfillPlan: {
      phase1: "SQL report: ads where subcategory_id IS NULL grouped by category_id + details->categoryPath->sub",
      phase2: "Manual mapping table for ambiguous legacy names (e.g. عطور وعناية → عطور ومكياج)",
      phase3: "UPDATE ads SET subcategory_id = :canonical WHERE id IN (...); verify category feed filters",
      safety: "Run on STAGING first; dry-run counts; no production until Mohammed approves",
    },
  };

  const outDir = path.join(process.env.TEMP ?? "/tmp", "pls-taxonomy-db-audit");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ...report, outPath }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
