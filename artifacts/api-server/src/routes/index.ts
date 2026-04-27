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
import adminRouter from "./admin";
import supportRouter from "./support";

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
router.use(adminRouter);
router.use(supportRouter);
export default router;
