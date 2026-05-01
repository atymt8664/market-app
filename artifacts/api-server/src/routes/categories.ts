import { Router, type IRouter } from "express";
import { db, categoriesTable, subcategoriesTable, adsTable } from "@workspace/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { ListSubcategoriesParams } from "@workspace/api-zod";
import { ensureCategoryAdminColumns } from "../lib/ensure-category-admin-columns";
import { PUBLIC_AD_STATUSES } from "../lib/ad-visibility";

const router: IRouter = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureCategoryAdminColumns();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/categories", async (_req, res) => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      icon: categoriesTable.icon,
      subtitle: categoriesTable.subtitle,
      adCount: sql<number>`count(${adsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(
      adsTable,
      and(
        eq(adsTable.categoryId, categoriesTable.id),
        inArray(adsTable.status, [...PUBLIC_AD_STATUSES]),
      ),
    )
    .where(eq(categoriesTable.isHidden, false))
    .groupBy(categoriesTable.id)
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));

  res.json(rows);
});

router.get("/categories/:categoryId/subcategories", async (req, res) => {
  const params = ListSubcategoriesParams.parse({
    categoryId: Number(req.params["categoryId"]),
  });
  const rows = await db
    .select()
    .from(subcategoriesTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId))
    .where(
      and(
        eq(subcategoriesTable.categoryId, params.categoryId),
        eq(subcategoriesTable.isHidden, false),
        eq(categoriesTable.isHidden, false),
      ),
    )
    .orderBy(asc(subcategoriesTable.sortOrder), asc(subcategoriesTable.id));
  res.json(rows.map((row) => row.subcategories));
});

export default router;
