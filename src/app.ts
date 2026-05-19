import { logger } from "./middlewares/logger.middleware";
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import AppError from "./lib/appError";
import routes from "./routes/index.routes";
import passport from "./configs/passport";

const app = express();

app.use(helmet());

app.use(express.json());

app.use(passport.initialize());

app.use(cookieParser());

app.use(logger());

app.use("/api/v1", routes);

app.get("/health", (_req: Request, res: Response) => {
  return res.status(200).json({
    status: "ok",
  });
});

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Something went wrong",
  });
});

export default app;
