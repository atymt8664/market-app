/**
 * Staging-only demo seed. Loads api-server `.env` then `.env.local` (override),
 * refuses known production URL patterns, then replaces categories/ads/subs and upserts cities + demo user.
 *
 * Required: STAGING_SEED_TEST_PASSWORD (≥8 chars) for the demo login user.
 * Optional: STAGING_ADMIN_BOOTSTRAP_PASSWORD — strong password to set app_settings admin hash if empty.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REFERENCE_CATEGORY_TAXONOMY,
  referenceTaxonomySubcategoryCount,
} from "./seed-reference-taxonomy";
import { STAGING_PUBLIC_DE_CITY_NAMES } from "./staging-public-de-cities";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiServerDir = path.resolve(__dirname, "../../artifacts/api-server");

dotenv.config({ path: path.join(apiServerDir, ".env") });
dotenv.config({ path: path.join(apiServerDir, ".env.local"), override: true });

function parsePatterns(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function hostOfUrl(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function assertStagingOnly(): { dbHost: string; supabaseHost: string } {
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  const supUrl = process.env.SUPABASE_URL?.trim() ?? "";
  if (!dbUrl || !supUrl) {
    throw new Error("DATABASE_URL and SUPABASE_URL must be set (api-server .env / .env.local).");
  }
  const blocked = [
    ...parsePatterns(process.env.PRODUCTION_DB_HOST_PATTERNS),
    ...parsePatterns(process.env.PRODUCTION_SUPABASE_HOST_PATTERNS),
  ];
  const lowerDb = dbUrl.toLowerCase();
  const lowerSb = supUrl.toLowerCase();
  for (const p of blocked) {
    if (!p) continue;
    if (lowerDb.includes(p) || lowerSb.includes(p)) {
      throw new Error(
        "Refusing seed: DATABASE_URL or SUPABASE_URL matches a configured production guard pattern.",
      );
    }
  }
  return { dbHost: hostOfUrl(dbUrl), supabaseHost: hostOfUrl(supUrl) };
}

/** Must pass `z.string().email()` (used by `/api/auth/login`). */
const STAGING_TEST_EMAIL = "souq-staging-demo@example.com";

async function main() {
  const { dbHost, supabaseHost } = assertStagingOnly();
  console.log(
    JSON.stringify({
      step: "staging-target-ok",
      dbHost,
      supabaseHost,
      note: "Values are hostnames only; no secrets.",
    }),
  );

  const testPassword = process.env.STAGING_SEED_TEST_PASSWORD?.trim();
  if (!testPassword || testPassword.length < 8) {
    throw new Error("Set STAGING_SEED_TEST_PASSWORD (min 8 characters) before running seed:staging.");
  }

  const bcrypt = (await import("bcryptjs")).default;
  const {
    db,
    categoriesTable,
    subcategoriesTable,
    adsTable,
    usersTable,
    citiesTable,
    appSettingsTable,
  } = await import("@workspace/db");
  const { eq, sql } = await import("drizzle-orm");

  await db.execute(
    sql`TRUNCATE TABLE ads, subcategories, categories RESTART IDENTITY CASCADE`,
  );

  await db
    .insert(appSettingsTable)
    .values({
      id: 1,
      appName: "سوق العرب EU",
      appVersion: "1.0.0",
      supportEmail: "souqarab.market@gmail.com",
      requireAdApproval: false,
      reportsEnabled: true,
      supportEnabled: true,
      termsPath: "/terms",
      privacyPath: "/privacy",
    })
    .onConflictDoNothing({ target: appSettingsTable.id });

  await db
    .update(appSettingsTable)
    .set({ requireAdApproval: false, updatedAt: new Date() })
    .where(eq(appSettingsTable.id, 1));

  const adminBootstrap = process.env.STAGING_ADMIN_BOOTSTRAP_PASSWORD?.trim();
  const strongAdmin =
    !!adminBootstrap &&
    adminBootstrap.length >= 8 &&
    /[a-z]/.test(adminBootstrap) &&
    /[A-Z]/.test(adminBootstrap) &&
    /[0-9]/.test(adminBootstrap) &&
    /[^A-Za-z0-9]/.test(adminBootstrap);

  if (strongAdmin) {
    const [row] = await db
      .select({ h: appSettingsTable.adminPasswordHash })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.id, 1))
      .limit(1);
    if (!row?.h) {
      const hash = await bcrypt.hash(adminBootstrap!, 12);
      await db
        .update(appSettingsTable)
        .set({ adminPasswordHash: hash, updatedAt: new Date() })
        .where(eq(appSettingsTable.id, 1));
      console.log(JSON.stringify({ step: "admin-password-set", hadHash: false }));
    } else {
      console.log(JSON.stringify({ step: "admin-password-skip", reason: "hash already present" }));
    }
  } else {
    console.log(
      JSON.stringify({
        step: "admin-password-skip",
        reason: "STAGING_ADMIN_BOOTSTRAP_PASSWORD not set or not strong enough",
      }),
    );
  }

  /** Public DE city list (same strings as frontend `GERMAN_CITIES`); idempotent upsert. */
  const cityRows = STAGING_PUBLIC_DE_CITY_NAMES.map((name) => ({
    name,
    countryCode: "DE",
    countryName: "Germany",
    isHidden: false,
  }));
  await db
    .insert(citiesTable)
    .values(cityRows)
    .onConflictDoNothing({ target: [citiesTable.countryCode, citiesTable.name] });

  const passwordHash = await bcrypt.hash(testPassword, 10);
  const demoPhone = "+4900000000999";
  await db.delete(usersTable).where(eq(usersTable.phone, demoPhone));

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, STAGING_TEST_EMAIL))
    .limit(1);

  let userId: number;
  if (existingUser) {
    userId = existingUser.id;
    await db
      .update(usersTable)
      .set({
        passwordHash,
        name: "Staging Demo User",
        phone: "+4900000000999",
        city: "Berlin",
        emailVerified: true,
      })
      .where(eq(usersTable.id, userId));
  } else {
    const [inserted] = await db
      .insert(usersTable)
      .values({
        email: STAGING_TEST_EMAIL,
        passwordHash,
        name: "Staging Demo User",
        phone: "+4900000000999",
        city: "Berlin",
        emailVerified: true,
      })
      .returning({ id: usersTable.id });
    userId = inserted!.id;
  }

  for (const [i, c] of REFERENCE_CATEGORY_TAXONOMY.entries()) {
    const [inserted] = await db
      .insert(categoriesTable)
      .values({
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        subtitle: c.subtitle,
        sortOrder: i,
      })
      .returning();
    if (!inserted) continue;
    await db.insert(subcategoriesTable).values(
      c.subs.map((name) => ({ name, categoryId: inserted.id })),
    );
  }

  const cats = await db.select().from(categoriesTable);
  const bySlug = Object.fromEntries(cats.map((row) => [row.slug, row.id])) as Record<
    string,
    number
  >;

  const ads = [
    {
      title: "[Staging] هاتف تجريبي — عرض مميز",
      description:
        "إعلان تجريبي لبيئة staging فقط. لا يمثل منتجاً حقيقياً. يستخدم للتحقق من الواجهة والقوائم.",
      price: "199",
      priceType: "fixed",
      type: "offer",
      city: "Berlin",
      categoryId: bySlug["elektronik"]!,
      sellerName: "Staging Demo User",
      sellerPhone: "+4900000000999",
      featured: true,
    },
    {
      title: "[Staging] كنبة تجريبية — عرض مميز",
      description: "إعلان staging للتحقق من البطاقات المميزة والصور الافتراضية.",
      price: "120",
      priceType: "negotiable",
      type: "offer",
      city: "München",
      categoryId: bySlug["haus-garten"]!,
      sellerName: "Staging Demo User",
      sellerPhone: "+4900000000999",
      featured: true,
    },
    {
      title: "[Staging] دراجة تجريبية",
      description: "إعلان عادي (غير مميز) للتحقق من قائمة التوصيات.",
      price: "85",
      priceType: "fixed",
      type: "offer",
      city: "Köln",
      categoryId: bySlug["auto-rad"]!,
      sellerName: "Staging Demo User",
      sellerPhone: "+4900000000999",
      featured: false,
    },
    {
      title: "[Staging] شقة تجريبية للإيجار",
      description: "نص تجريبي لوصف عقار في staging.",
      price: "750",
      priceType: "fixed",
      type: "offer",
      city: "Hamburg",
      categoryId: bySlug["immobilien"]!,
      sellerName: "Staging Demo User",
      sellerPhone: "+4900000000999",
      featured: false,
    },
    {
      title: "[Staging] طلب تجريبي — غرفة في فرانكفورت",
      description: "إعلان نوع طلب للتحقق من أنواع الإعلانات.",
      price: "400",
      priceType: "negotiable",
      type: "request",
      city: "Frankfurt am Main",
      categoryId: bySlug["immobilien"]!,
      sellerName: "Staging Demo User",
      sellerPhone: "+4900000000999",
      featured: false,
    },
  ];

  await db.insert(adsTable).values(
    ads.map((a) => ({
      userId,
      title: a.title,
      description: a.description,
      price: a.price,
      priceType: a.priceType,
      type: a.type,
      city: a.city,
      images: [] as string[],
      categoryId: a.categoryId,
      sellerName: a.sellerName,
      sellerPhone: a.sellerPhone,
      featured: a.featured,
      status: "approved" as const,
      details: {},
    })),
  );

  console.log(
    JSON.stringify({
      step: "done",
      categories: REFERENCE_CATEGORY_TAXONOMY.length,
      subcategories: referenceTaxonomySubcategoryCount(),
      ads: ads.length,
      citiesUpsertAttempted: cityRows.length,
      demoUserEmail: STAGING_TEST_EMAIL,
      demoUserId: userId,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
