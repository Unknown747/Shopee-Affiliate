import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import affiliateRouter from "./affiliate.js";
import aiRouter from "./ai.js";
import statsRouter from "./stats.js";
import adminRouter from "./adminRoutes.js";
import searchRouter from "./search.js";
import seoRouter from "./seo.js";
import siteConfigRouter from "./siteConfig.js";
import bestOfRouter from "./bestOf.js";
import priceTrackerRouter from "./priceTracker.js";
import discoveryRouter from "./discovery.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(affiliateRouter);
router.use(aiRouter);
router.use(statsRouter);
router.use(adminRouter);
router.use(searchRouter);
router.use(seoRouter);
router.use(siteConfigRouter);
router.use(bestOfRouter);
router.use(priceTrackerRouter);
router.use(discoveryRouter);

export default router;
