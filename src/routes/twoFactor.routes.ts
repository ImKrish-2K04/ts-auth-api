import { Router } from "express";
import catchAsync from "../lib/asyncWrapper";
import {
  setup2FAHandler,
  verifyLogin2FAHandler,
  verifySetup2FAHandler,
} from "../controllers/auth/twoFactor.controller";
import requireAuth from "../middlewares/requireAuth";
import requireRole from "../middlewares/requireRole";

const twoFactorRouter = Router();

twoFactorRouter.post(
  "/2fa/setup",
  requireAuth,
  requireRole("user"),
  setup2FAHandler,
);

twoFactorRouter.post(
  "/2fa/verify-setup",
  requireAuth,
  requireRole("user"),
  verifySetup2FAHandler,
);

twoFactorRouter.post("/2fa/verify-login", catchAsync(verifyLogin2FAHandler));

export default twoFactorRouter;
