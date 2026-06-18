import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import parkingRouter from "./parking";
import extrasRouter from "./extras";
import vehiclesRouter from "./vehicles";
import notificationsRouter from "./notifications";
import aiRouter from "./ai";
import sessionsRouter from "./sessions";
import favouritesRouter from "./favourites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(parkingRouter);
router.use(extrasRouter);
router.use(vehiclesRouter);
router.use(notificationsRouter);
router.use(sessionsRouter);
router.use(favouritesRouter);
router.use(aiRouter);

export default router;
