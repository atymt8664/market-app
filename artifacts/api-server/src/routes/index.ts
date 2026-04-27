import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import adsRouter from "./ads";
import aiRouter from "./ai";
import storageRouter from "./storage";
import authRouter from "./auth";
import usersRouter from "./users";
import conversationsRouter from "./conversations";
import reports from "./reports";
import { db, adsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(adsRouter);
router.use(aiRouter);
router.use(storageRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(conversationsRouter);
router.use("/reports", reports);
router.post("/admin-login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ message: "كلمة السر غلط" });
});
console.log("STATUS ROUTE REGISTERED");
router.patch("/admin/ads/:id/status", async (req, res) => {
  console.log("STATUS ROUTE HIT", req.method, req.originalUrl);
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = Number(req.params.id);
  const { status } = req.body;

  if (!["approved", "rejected", "hidden"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  await db.update(adsTable).set({ status }).where(eq(adsTable.id, id));

  return res.json({ success: true });
});
export default router;
