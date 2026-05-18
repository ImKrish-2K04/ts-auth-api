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

const router = Router();

router.post("/sign-in", catchAsync(loginHandler));
router.post("/sign-up", catchAsync(registerHandler));
router.get("/verify-email", catchAsync(verifyEmailHandler));
router.post("/refresh", catchAsync(refreshHandler));
router.post("/logout", catchAsync(logoutHandler));
router.post("/forgot-password", catchAsync(forgotPasswordHandler));
router.post("/reset-password", catchAsync(resetPasswordHandler))

export default router;
