import { Router } from "express";
import passport from "passport";
import {
  googleCallBackHandler,
  setPasswordHandler,
} from "../controllers/auth/oauth.controller";
import catchAsync from "../lib/asyncWrapper";
import requireAuth from "../middlewares/requireAuth";
import requireRole from "../middlewares/requireRole";

const oauthRouter = Router();

// Route-1 => when user hits this, passport redirects them to Google's login page
oauthRouter.get(
  "/google",
  passport.authenticate("google", {
    // what we are asking Google for
    scope: ["profile", "email"],
    // we are using JWT, so no session
    session: false,
  }),
);

// Route-2 => Google redirects back here after user logs in
// passport.authenticate runs the strategy verify callback first
// if it succeeds, req.user is set and googleCallback runs
// if it fails, we send a 401

oauthRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failWithError: true,
  }),
  catchAsync(googleCallBackHandler),
);

oauthRouter.post(
  "/set-password",
  requireAuth,
  requireRole("user"),
  catchAsync(setPasswordHandler),
);

export default oauthRouter;
