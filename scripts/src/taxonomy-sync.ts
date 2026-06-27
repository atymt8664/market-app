/**
 * Upsert canonical taxonomy into DB without truncating ads.
 * Hides subcategories not in SSOT (legacy sunset per Blueprint Migration Strategy).
 * Safe for local/staging — does not touch production unless explicitly run there.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, categoriesTable, subcategoriesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { REFERENCE_CATEGORY_TAXONOMY } from "./seed-reference-taxonomy";

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

function assertNotProduction(): void {
  const dbHost = hostOfUrl(process.env.DATABASE_URL);
  if (!dbHost) return;
  const prodGuards = ["nptfxtkedqndkgmrcntn", "souq-arab.com"];
  if (prodGuards.some((g) => dbHost.includes(g))) {
    throw new Error(
      `Refusing taxonomy:sync on production-like host: ${dbHost}. Run on STAGING only.`,
    );
  }
}

async function main() {
  assertNotProduction();

  let categoriesUpserted = 0;
  let subsInserted = 0;
  let legacyHidden = 0;

  for (const [i, ref] of REFERENCE_CATEGORY_TAXONOMY.entries()) {
    const existing = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, ref.slug))
      .limit(1);

    let categoryId: number;
    if (existing[0]) {
      categoryId = existing[0].id;
      await db
        .update(categoriesTable)
        .set({
          name: ref.name,
          icon: ref.icon,
          subtitle: ref.subtitle,
          sortOrder: i,
          isHidden: false,
        })
        .where(eq(categoriesTable.id, categoryId));
    } else {
      const [inserted] = await db
        .insert(categoriesTable)
        .values({
          name: ref.name,
          slug: ref.slug,
          icon: ref.icon,
          subtitle: ref.subtitle,
          sortOrder: i,
          isHidden: false,
        })
        .returning();
      if (!inserted) continue;
      categoryId = inserted.id;
      categoriesUpserted += 1;
    }

    const canonicalSet = new Set(ref.subs);

    for (const [j, subName] of ref.subs.entries()) {
      const subExisting = await db
        .select({ id: subcategoriesTable.id })
        .from(subcategoriesTable)
        .where(
          and(
            eq(subcategoriesTable.categoryId, categoryId),
            eq(subcategoriesTable.name, subName),
          ),
        )
        .limit(1);

      if (subExisting[0]) {
        await db
          .update(subcategoriesTable)
          .set({ sortOrder: j, isHidden: false })
          .where(eq(subcategoriesTable.id, subExisting[0].id));
      } else {
        await db.insert(subcategoriesTable).values({
          name: subName,
          categoryId,
          sortOrder: j,
          isHidden: false,
        });
        subsInserted += 1;
      }
    }

    const allSubs = await db
      .select({ id: subcategoriesTable.id, name: subcategoriesTable.name })
      .from(subcategoriesTable)
      .where(eq(subcategoriesTable.categoryId, categoryId));

    for (const sub of allSubs) {
      if (!canonicalSet.has(sub.name)) {
        await db
          .update(subcategoriesTable)
          .set({ isHidden: true })
          .where(eq(subcategoriesTable.id, sub.id));
        legacyHidden += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        categories: REFERENCE_CATEGORY_TAXONOMY.length,
        newCategories: categoriesUpserted,
        newSubcategories: subsInserted,
        legacySubcategoriesHidden: legacyHidden,
        totalCanonicalSubcategories: REFERENCE_CATEGORY_TAXONOMY.reduce(
          (n, c) => n + c.subs.length,
          0,
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
