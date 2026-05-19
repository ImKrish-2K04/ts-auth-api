import { Request, Response, NextFunction } from "express";
import { userModel } from "./../../models/user.model";
import AppError from "../../lib/appError";
import { generateSecret, generateURI, OTP } from "otplib";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import { env } from "../../configs/config";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
} from "../../lib/token";

const otp2FA = new OTP();

const setup2FAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.user as { id: string };

  const user = await userModel.findById(id).select("+twoFactorSecret");

  if (!user) return next(new AppError(404, "User not found", true));

  // if 2FA is enabled, then reject the request for it
  if (user.twoFactorEnabled)
    return next(new AppError(400, "2FA is already enabled", true));

  // generate a fresh Base32 secret for this user
  const secret = generateSecret();

  // create otpauth uri using issuer(app-name), label(user email), secret
  const otpauthSecret = generateURI({
    issuer: "ts-auth-api",
    label: user.email,
    secret,
  });

  // convert the URI into a base64 png (QRCode)
  const qrCode = await QRCode.toDataURL(otpauthSecret);

  // store the `secret` in the database
  user.twoFactorSecret = secret;
  user.twoFactorSecretExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  return res.status(200).json({
    message: "Scan the QR code in your authenticator app",
    qrCode, // the link to get the qrCode to scan in auth. app
    secret, // the secret to enter manually in auth. app
  });
};

const verifySetup2FAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.user as { id: string };
  const { otp } = req.body;

  const user = await userModel.findById(id).select("+twoFactorSecret");

  if (!user) return next(new AppError(404, "User not found", true));

  if (user.twoFactorEnabled)
    return next(new AppError(400, "2FA is already enabled", true));

  if (!user.twoFactorSecret)
    return next(new AppError(400, "2FA setup not initialized", true));

  if (
    !user.twoFactorSecretExpiresAt ||
    new Date() > user.twoFactorSecretExpiresAt
  )
    return next(
      new AppError(400, "QR Code expired. Please request a new one", true),
    );

  const result = await otp2FA.verify({
    secret: user.twoFactorSecret,
    token: otp,
  });

  if (!result.valid)
    return next(new AppError(400, "Invalid OTP. Please try again", true));

  user.twoFactorEnabled = true;
  user.twoFactorSecretExpiresAt = undefined;
  await user.save();

  return res.status(200).json({
    message: "2FA enabled successfully",
  });
};

const verifyLogin2FAHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { tempToken, otp } = req.body;

  if (!tempToken || !otp)
    return next(new AppError(400, "Temp token and OTP are required", true));

  let payload: {
    id: string;
    purpose: "2fa" | undefined;
  };

  try {
    payload = jwt.verify(tempToken, env.JWT_VERIFY_SECRET) as typeof payload;
  } catch (error) {
    return next(new AppError(401, "Invalid or expired temp token", true));
  }

  if (payload.purpose !== "2fa")
    return next(new AppError(401, "Invalid token purpose", true));

  const user = await userModel
    .findById(payload.id)
    .select("+twoFactorSecret +tokenVersion");

  if (!user) return next(new AppError(404, "User not found", true));

  if (!user.twoFactorEnabled || !user.twoFactorSecret)
    return next(new AppError(400, "2FA is not enabled", true));

  const result = await otp2FA.verify({
    secret: user.twoFactorSecret,
    token: otp,
  });

  if (!result.valid)
    return next(new AppError(400, "Invalid OTP. Please try again", true));

  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  const refreshToken = createRefreshToken({
    id: user.id,
    tokenVersion: user.tokenVersion,
  });

  const refreshTokenHash = hashToken(refreshToken);

  await userModel.findByIdAndUpdate(user.id, { refreshTokenHash });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    message: "Login successful",
    accessToken,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  });
};

export { setup2FAHandler, verifySetup2FAHandler, verifyLogin2FAHandler };
