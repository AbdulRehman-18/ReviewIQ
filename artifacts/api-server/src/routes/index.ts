import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import reviewsRouter from "./reviews";
import trendsRouter from "./trends";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(reviewsRouter);
router.use(trendsRouter);
router.use(reportsRouter);

export default router;
