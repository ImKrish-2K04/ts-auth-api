import { Request, Response, Router } from "express";
import catchAsync from "../lib/asyncWrapper";
import requireAuth from "../middlewares/requireAuth";
import requireRole from "../middlewares/requireRole";
import { userModel } from "../models/user.model";

const adminRouter = Router();

adminRouter.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  catchAsync(async (req: Request, res: Response) => {
    const includeAdmin: boolean = req.query.includeAdmin === "true";

    const users = await userModel
      .find(includeAdmin ? {} : { role: { $ne: "admin" } })
      .select("email userName role isEmailVerified twoFactorEnabled createdAt");

    if (users.length === 0)
      return res.status(200).json({
        message: "No users available yet!",
      });

    return res.status(200).json({
      message: `total ${users.length} users available!`,
      data: users,
    });
  }),
);

export default adminRouter;
