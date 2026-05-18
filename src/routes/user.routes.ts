import { Request, Response, Router } from "express";
import requireAuth from "../middlewares/requireAuth";

const router = Router();

router.get("/me", requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  return res.status(200).json({
    user,
  });
});

export default router;
