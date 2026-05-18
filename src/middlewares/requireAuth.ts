import { NextFunction, Request, Response } from "express";
import catchAsync from "../lib/asyncWrapper";
import AppError from "../lib/appError";
import jwt from "jsonwebtoken";
import { env } from "../configs/config";
import { userModel } from "../models/user.model";

const requireAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer "))
      return next(new AppError(401, "Token not found", true));

    const token = authHeader.split(" ")[1];

    let payload: {
      userId: string;
      role: "user" | "admin";
      tokenVersion: number;
    };

    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as typeof payload;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return next(new AppError(401, "Invalid or expired token", true));
    }

    const user = await userModel.findById(payload.userId);

    if (!user) return next(new AppError(404, "User not found", true));

    if (payload.tokenVersion !== user.tokenVersion)
      return next(new AppError(401, "Token invalidated", true));

    req.user = {
      id: user.id,
      email: user.email,
      userName: user.userName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    };

    next();
  },
);

export default requireAuth;
