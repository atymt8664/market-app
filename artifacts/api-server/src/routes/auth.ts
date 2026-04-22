import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AuthSignupBody, AuthLoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    city: u.city,
  };
}

router.post("/auth/signup", async (req, res) => {
  const parsed = AuthSignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const { email, password, name, phone, city } = parsed.data;
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      phone,
      city: city ?? "",
    })
    .returning();
  req.session.userId = user!.id;
  res.json(serializeUser(user!));
});

router.post("/auth/login", async (req, res) => {
  const parsed = AuthLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }
  const { email, password } = parsed.data;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
    return;
  }
  req.session.userId = user.id;
  res.json(serializeUser(user));
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("souq.sid");
    res.status(204).end();
  });
});

router.get("/auth/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!rows[0]) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  res.json(serializeUser(rows[0]));
});

export default router;
