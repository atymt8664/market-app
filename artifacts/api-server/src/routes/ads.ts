import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, adsTable, adViewsTable, categoriesTable, subcategoriesTable } from "@workspace/db";
import { and, desc, eq, gte, ilike, lte, sql, or } from "drizzle-orm";
import crypto from "crypto";
import {
  ListAdsQueryParams,
  CreateAdBody,
  UpdateAdBody,
  GetAdParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "يرجى تسجيل الدخول" });
    return;
  }
  next();
}

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
    views: ad.views ?? 0,
    userId: ad.userId,
    createdAt: ad.createdAt.toISOString(),
  };
}

function viewerKeyFor(req: Parameters<typeof requireAuth>[0]): string {
  if (req.session.userId) return `u:${req.session.userId}`;
  const ip = (req.ip || req.socket.remoteAddress || "0.0.0.0").split(",")[0]!.trim();
  const ua = req.get("user-agent") || "";
  return "ip:" + crypto.createHash("sha256").update(ip + "|" + ua).digest("hex").slice(0, 32);
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

router.get("/ads/mine", requireAuth, async (req, res) => {
  const rows = await baseSelect()
    .where(eq(adsTable.userId, req.session.userId!))
    .orderBy(desc(adsTable.createdAt));
  res.json(rows.map(serializeAd));
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

router.post("/ads", requireAuth, async (req, res) => {
  const body = CreateAdBody.parse(req.body);
  const inserted = await db
    .insert(adsTable)
    .values({
      userId: req.session.userId!,
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

router.patch("/ads/:adId", requireAuth, async (req, res) => {
  const adId = Number(req.params["adId"]);
  const existing = await db
    .select({ userId: adsTable.userId })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  if (existing[0].userId !== req.session.userId) {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }
  const body = UpdateAdBody.parse(req.body);
  await db
    .update(adsTable)
    .set({
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
    .where(eq(adsTable.id, adId));
  const rows = await baseSelect().where(eq(adsTable.id, adId)).limit(1);
  res.json(serializeAd(rows[0]!));
});

router.post("/ads/:adId/view", async (req, res) => {
  const adId = Number(req.params["adId"]);
  if (!Number.isInteger(adId) || adId <= 0) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const adRows = await db.select({ id: adsTable.id }).from(adsTable).where(eq(adsTable.id, adId)).limit(1);
  if (!adRows[0]) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  const key = viewerKeyFor(req);
  const inserted = await db
    .insert(adViewsTable)
    .values({ adId, viewerKey: key })
    .onConflictDoNothing()
    .returning({ id: adViewsTable.id });
  if (inserted.length > 0) {
    await db
      .update(adsTable)
      .set({ views: sql`${adsTable.views} + 1` })
      .where(eq(adsTable.id, adId));
  }
  const fresh = await db.select({ views: adsTable.views }).from(adsTable).where(eq(adsTable.id, adId)).limit(1);
  res.json({ views: fresh[0]?.views ?? 0, counted: inserted.length > 0 });
});

router.delete("/ads/:adId", requireAuth, async (req, res) => {
  const adId = Number(req.params["adId"]);
  const existing = await db
    .select({ userId: adsTable.userId })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!existing[0]) {
    res.status(404).end();
    return;
  }
  if (existing[0].userId !== req.session.userId) {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }
  await db.delete(adsTable).where(eq(adsTable.id, adId));
  res.status(204).end();
});

export default router;
