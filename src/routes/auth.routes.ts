import { Router } from "express";
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "../controllers/auth/auth.controller";
import catchAsync from "../lib/asyncWrapper";
import requireRole from "../middlewares/requireRole";
import requireAuth from "../middlewares/requireAuth";

const authRouter = Router();

authRouter.post("/sign-in", catchAsync(loginHandler));
authRouter.post("/sign-up", catchAsync(registerHandler));
authRouter.get("/verify-email", catchAsync(verifyEmailHandler));
authRouter.post("/refresh", catchAsync(refreshHandler));
authRouter.post("/logout", catchAsync(logoutHandler));
authRouter.post("/forgot-password", catchAsync(forgotPasswordHandler));
authRouter.post("/reset-password", catchAsync(resetPasswordHandler));

export default authRouter;
