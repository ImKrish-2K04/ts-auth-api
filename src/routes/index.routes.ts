import { Router } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import adminRouter from "./admin.routes";
import oauthRouter from "./oauth.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/auth", oauthRouter);
router.use("/user", userRouter);
router.use("/admin", adminRouter);

export default router;
