import { NextFunction, Request, Response } from "express";
import catchAsync from "../lib/asyncWrapper";
import AppError from "../lib/appError";

const requireRole = (role: "user" | "admin") => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user)
      return next(
        new AppError(
          401,
          "You're not authenticated to access this resource, please login first!",
          true,
        ),
      );

    if (user.role === role || user.role === "admin") return next();

    return next(new AppError(403, "Access denied", true));
  });
};

export default requireRole;
