import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import affiliateRouter from "./affiliate.js";
import aiRouter from "./ai.js";
import statsRouter from "./stats.js";
import adminRouter from "./adminRoutes.js";
import searchRouter from "./search.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(affiliateRouter);
router.use(aiRouter);
router.use(statsRouter);
router.use(adminRouter);
router.use(searchRouter);

export default router;
