import { Router, type IRouter } from "express";
import { db, categoriesTable, subcategoriesTable, adsTable } from "@workspace/db";
import { asc, eq, sql } from "drizzle-orm";
import { ListSubcategoriesParams } from "@workspace/api-zod";

const router: IRouter = Router();

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
    .leftJoin(adsTable, eq(adsTable.categoryId, categoriesTable.id))
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
    .where(eq(subcategoriesTable.categoryId, params.categoryId))
    .orderBy(asc(subcategoriesTable.id));
  res.json(rows);
});

export default router;
