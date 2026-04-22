import { Router, type IRouter } from "express";
import { db, adsTable, categoriesTable, subcategoriesTable } from "@workspace/db";
import { and, desc, eq, gte, ilike, lte, sql, or } from "drizzle-orm";
import {
  ListAdsQueryParams,
  CreateAdBody,
  GetAdParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeAd(row: {
  ads: typeof adsTable.$inferSelect;
  categoryName: string | null;
  subcategoryName: string | null;
}) {
  const ad = row.ads;
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    price: ad.price === null ? null : Number(ad.price),
    priceType: ad.priceType,
    type: ad.type,
    city: ad.city,
    images: (ad.images as string[]) ?? [],
    categoryId: ad.categoryId,
    subcategoryId: ad.subcategoryId,
    categoryName: row.categoryName ?? "",
    subcategoryName: row.subcategoryName,
    sellerName: ad.sellerName,
    sellerPhone: ad.sellerPhone,
    featured: ad.featured,
    createdAt: ad.createdAt.toISOString(),
  };
}

const baseSelect = () =>
  db
    .select({
      ads: adsTable,
      categoryName: categoriesTable.name,
      subcategoryName: subcategoriesTable.name,
    })
    .from(adsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, adsTable.categoryId))
    .leftJoin(
      subcategoriesTable,
      eq(subcategoriesTable.id, adsTable.subcategoryId),
    );

router.get("/ads/featured", async (_req, res) => {
  const rows = await baseSelect()
    .where(eq(adsTable.featured, true))
    .orderBy(desc(adsTable.createdAt))
    .limit(10);
  res.json(rows.map(serializeAd));
});

router.get("/ads/recommended", async (_req, res) => {
  const rows = await baseSelect()
    .orderBy(desc(adsTable.createdAt))
    .limit(20);
  res.json(rows.map(serializeAd));
});

router.get("/ads/stats", async (_req, res) => {
  const totals = await db
    .select({
      totalAds: sql<number>`count(*)::int`,
      totalCities: sql<number>`count(distinct ${adsTable.city})::int`,
    })
    .from(adsTable);

  const totalCategories = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(categoriesTable);

  const byCategory = await db
    .select({
      categoryName: categoriesTable.name,
      count: sql<number>`count(${adsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(adsTable, eq(adsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id, categoriesTable.name)
    .orderBy(sql`count(${adsTable.id}) desc`)
    .limit(8);

  const byCity = await db
    .select({
      city: adsTable.city,
      count: sql<number>`count(*)::int`,
    })
    .from(adsTable)
    .groupBy(adsTable.city)
    .orderBy(sql`count(*) desc`)
    .limit(8);

  res.json({
    totalAds: totals[0]?.totalAds ?? 0,
    totalCategories: totalCategories[0]?.c ?? 0,
    totalCities: totals[0]?.totalCities ?? 0,
    byCategory,
    byCity,
  });
});

router.get("/ads/:adId", async (req, res) => {
  const params = GetAdParams.parse({ adId: Number(req.params["adId"]) });
  const rows = await baseSelect().where(eq(adsTable.id, params.adId)).limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  res.json(serializeAd(row));
});

router.get("/ads", async (req, res) => {
  const q = ListAdsQueryParams.parse(req.query);
  const conds = [] as ReturnType<typeof eq>[];
  if (q.q) {
    const pat = `%${q.q}%`;
    const like = or(ilike(adsTable.title, pat), ilike(adsTable.description, pat));
    if (like) conds.push(like);
  }
  if (q.categoryId !== undefined) conds.push(eq(adsTable.categoryId, q.categoryId));
  if (q.subcategoryId !== undefined)
    conds.push(eq(adsTable.subcategoryId, q.subcategoryId));
  if (q.city) conds.push(ilike(adsTable.city, `%${q.city}%`));
  if (q.minPrice !== undefined)
    conds.push(gte(adsTable.price, q.minPrice.toString()));
  if (q.maxPrice !== undefined)
    conds.push(lte(adsTable.price, q.maxPrice.toString()));
  if (q.type) conds.push(eq(adsTable.type, q.type));

  const where = conds.length ? and(...conds) : undefined;
  const limit = q.limit ?? 50;

  const rows = await baseSelect()
    .where(where as never)
    .orderBy(desc(adsTable.createdAt))
    .limit(limit);

  res.json(rows.map(serializeAd));
});

router.post("/ads", async (req, res) => {
  const body = CreateAdBody.parse(req.body);
  const inserted = await db
    .insert(adsTable)
    .values({
      title: body.title,
      description: body.description,
      price: body.price !== undefined && body.price !== null ? body.price.toString() : null,
      priceType: body.priceType,
      type: body.type,
      city: body.city,
      images: body.images ?? [],
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId ?? null,
      sellerName: body.sellerName,
      sellerPhone: body.sellerPhone,
    })
    .returning();
  const id = inserted[0]!.id;
  const rows = await baseSelect().where(eq(adsTable.id, id)).limit(1);
  res.status(201).json(serializeAd(rows[0]!));
});

export default router;
