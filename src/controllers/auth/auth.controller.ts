import { userModel } from "./../../models/user.model";
import { NextFunction, Request, Response } from "express";
import { loginSchema, registerSchema } from "../../schemas/auth.schema";
import AppError from "../../lib/appError";
import { z } from "zod";
import { checkPassword, hashPassword } from "../../lib/hash";
import jwt from "jsonwebtoken";
import { env } from "../../configs/config";
import sendEmail from "../../lib/email";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
} from "../../lib/token";
import crypto from "crypto";
import {
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "./../../lib/templates/verifyEmail";
import { formatZodError } from "../../lib/formatZodError";

const getAppUrl = () => env.BASE_URL || "http://localhost:5000/api/v1";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%_-]).{8,20}$/;

const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success)
    return next(new AppError(400, formatZodError(result.error), true));

  const { email, userName, password } = result.data;

  const existingUser = await userModel.findOne({
    $or: [{ email }, { userName }],
  });

  if (existingUser)
    return next(
      new AppError(
        409,
        "Email or username already exists, please try a different combination",
        true,
      ),
    );

  const user = await userModel.create({
    email,
    userName,
    passwordHash: await hashPassword(password),
  });

  const verifyToken = jwt.sign({ id: user.id }, env.JWT_VERIFY_SECRET, {
    expiresIn: "5m",
  });

  const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${verifyToken}`;

  try {
    await sendEmail(
      user.email,
      "Verify your email address",
      verifyEmailTemplate(user.userName as string, verifyUrl),
    );
  } catch (error) {
    await userModel.findByIdAndDelete(user._id);
    return next(
      new AppError(
        500,
        "Failed to send verification email. Please try again.",
        true,
      ),
    );
  }

  return res.status(201).json({
    message: "User registered successfully, please verify your email!",
    data: {
      userId: user.id,
      userName: user.userName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  });
};

const verifyEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.query.token as string | undefined;
  if (!token)
    return next(new AppError(400, "Verification token is missing!", true));

  let id: string;
  try {
    ({ id } = jwt.verify(token, env.JWT_VERIFY_SECRET) as { id: string });
  } catch {
    return next(new AppError(401, "Invalid or expired token", true));
  }

  const user = await userModel.findById(id);
  if (!user) return next(new AppError(404, "User not found!", true));

  if (user.isEmailVerified)
    return res.status(200).json({ message: "Email is already verified" });

  user.isEmailVerified = true;
  await user.save();

  return res.status(200).json({ message: "Email verified successfully!" });
};

const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success)
    return next(new AppError(400, formatZodError(result.error), true));

  const { identifier, password } = result.data;
  const isEmail = identifier.includes("@");
  const user = await userModel
    .findOne(
      isEmail ? { email: identifier.toLowerCase() } : { userName: identifier },
    )
    .select("+passwordHash +refreshTokenHash");

  if (!user)
    return next(new AppError(404, "Invalid email/username or password!", true));

  if (!user.passwordHash)
    return next(
      new AppError(
        400,
        "This account uses Google login. Please sign in with Google.",
        true,
      ),
    );

  if (!user.isEmailVerified)
    return next(
      new AppError(403, "Please verify your email before logging in!", true),
    );

  const isValidPassword = await checkPassword(
    password,
    user.passwordHash as string,
  );

  if (!isValidPassword)
    return next(new AppError(400, "Invalid email/username or password!", true));

  if (user.twoFactorEnabled) {
    const tempToken = jwt.sign(
      {
        id: user.id,
        purpose: "2fa",
      },
      env.JWT_VERIFY_SECRET,
      {
        expiresIn: "5m",
      },
    );

    return res.status(200).json({
      message: "OTP required",
      requiresTwoFactor: true,
      tempToken,
    });
  }

  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  const refreshToken = createRefreshToken({
    id: user.id,
    tokenVersion: user.tokenVersion,
  });

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    message: "User logged in successfully",
    accessToken,
    data: {
      userId: user.id,
      email: user.email,
      userName: user.userName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  });
};

const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) return next(new AppError(401, "No refresh token", true));

  let payload: {
    id: string;
    tokenVersion: number;
  };

  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as typeof payload;
  } catch (error) {
    return next(new AppError(401, "Invalid or expired refresh token", true));
  }

  const user = await userModel.findById(payload.id).select("+refreshTokenHash");
  if (!user) return next(new AppError(404, "User not found", true));

  if (payload.tokenVersion !== user.tokenVersion)
    return next(
      new AppError(401, "Session revoked, please re-login again", true),
    );

  const incomingHash = hashToken(token);
  const incomingBuffer = Buffer.from(incomingHash);
  const storedBuffer = Buffer.from(user.refreshTokenHash || "");
  if (
    incomingBuffer.length !== storedBuffer.length ||
    !crypto.timingSafeEqual(incomingBuffer, storedBuffer)
  ) {
    await userModel.findByIdAndUpdate(user._id, {
      $inc: { tokenVersion: 1 },
      $unset: { refreshTokenHash: "" },
    });
    return next(
      new AppError(401, "Token reuse detected, please login again", true),
    );
  }

  const newAccessToken = createAccessToken({
    id: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  const newRefreshToken = createRefreshToken({
    id: user.id,
    tokenVersion: user.tokenVersion,
  });

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    accessToken: newAccessToken,
    data: {
      userId: user.id,
      email: user.email,
      userName: user.userName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  });
};

const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.refreshToken;

  res.clearCookie("refreshToken", { path: "/" });

  if (!token)
    return res.status(200).json({
      message: "Logged out successfully",
    });

  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
      id: string;
      tokenVersion: number;
    };
    await userModel.findByIdAndUpdate(payload.id, {
      $unset: { refreshTokenHash: "" },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }

  return res.status(200).json({
    message: "Logged out successfully",
  });
};

const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email } = req.body;

  if (!email) return next(new AppError(400, "Email is required", true));

  if (!emailRegex.test(email))
    return next(new AppError(400, "Invalid email address", true));

  const user = await userModel.findOne({ email }).select("+resetPasswordHash");

  if (!user)
    return res.status(200).json({
      message:
        "If the entered email exists, we will send a reset password link",
    });

  const resetPasswordToken = crypto.randomBytes(32).toString("hex");
  const resetPasswordHash = crypto
    .createHash("sha256")
    .update(resetPasswordToken)
    .digest("hex");

  user.resetPasswordHash = resetPasswordHash;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();
  const resetUrl = `${getAppUrl()}/auth/reset-password?token=${resetPasswordToken}`;

  try {
    await sendEmail(
      user.email,
      "Reset your password",
      resetPasswordTemplate(user.userName as string, resetUrl),
    );
  } catch (error) {
    await userModel.findByIdAndUpdate(user.id, {
      $unset: { resetPasswordHash: "", resetPasswordExpires: "" },
    });
    return next(new AppError(500, "Failed to send email. Try again.", true));
  }

  return res.status(200).json({
    message: "If the entered email exists, we will send a reset password link",
  });
};

const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.query.token as string | undefined;
  const { password } = req.body;

  if (!token) return next(new AppError(400, "Token is missing", true));

  if (!password || !passwordRegex.test(password))
    return next(new AppError(400, "Valid password is required", true));

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await userModel.findOne({
    resetPasswordHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) return next(new AppError(400, "Invalid or expired token", true));

  const hashedPass = await hashPassword(password);

  await userModel.findByIdAndUpdate(user._id, {
    $set: { passwordHash: hashedPass },
    $inc: { tokenVersion: 1 },
    $unset: { resetPasswordHash: "", resetPasswordExpires: "" },
  });

  return res.status(200).json({
    message: "Password updated successfully!",
  });
};

export {
  registerHandler,
  verifyEmailHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
};
