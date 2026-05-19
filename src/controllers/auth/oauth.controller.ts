import { Request, Response, NextFunction } from "express";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
} from "../../lib/token";
import { userModel } from "../../models/user.model";
import AppError from "../../lib/appError";
import { env } from "../../configs/config";
import { setPasswordSchema } from "../../schemas/auth.schema";
import { z } from "zod";
import { hashPassword } from "../../lib/hash";
import { formatZodError } from "../../lib/formatZodError";

const googleCallBackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user as any;

  if (!user)
    return next(new AppError(401, "Google authentication failed", true));

  const freshUser = await userModel.findById(user._id).select("+tokenVersion");

  if (!freshUser) return next(new AppError(401, "User not found", true));

  const accessToken = createAccessToken({
    id: freshUser.id,
    role: freshUser.role,
    tokenVersion: freshUser.tokenVersion,
  });

  const refreshToken = createRefreshToken({
    id: freshUser.id,
    tokenVersion: freshUser.tokenVersion,
  });

  const refreshTokenHash = hashToken(refreshToken);

  await userModel.findByIdAndUpdate(freshUser._id, {
    refreshTokenHash,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    message: "Google authentication successful",
    accessToken,
    data: {
      id: freshUser.id,
      email: freshUser.email,
      role: freshUser.role,
      userName: freshUser?.userName,
      avatar: freshUser?.avatar,
      isEmailVerified: freshUser.isEmailVerified,
      twoFactorEnabled: freshUser.twoFactorEnabled,
      hasPassword: !!freshUser.passwordHash,
    },
  });
};

const setPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.user as { id: string };
  const result = setPasswordSchema.safeParse(req.body);

  if (!result.success)
    return next(new AppError(400, formatZodError(result.error), true));

  const { password } = result.data;

  const user = await userModel.findById(id).select("+passwordHash");

  if (!user) return next(new AppError(404, "User not found", true));

  if (user?.passwordHash)
    return next(
      new AppError(
        400,
        "You already have a password. Use reset-password to change it.",
        true,
      ),
    );

  user.passwordHash = await hashPassword(password);
  await user.save();

  return res.status(200).json({
    message:
      "Password set successfully. You can now log in with your email and password.",
  });
};

export { googleCallBackHandler, setPasswordHandler };
