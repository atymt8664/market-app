import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import adsRouter from "./ads";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(adsRouter);
router.use(aiRouter);

export default router;
