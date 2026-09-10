import { Router, type IRouter } from "express";
import authRouter from "./auth";
import communityRouter from "./community";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(communityRouter);

export default router;
