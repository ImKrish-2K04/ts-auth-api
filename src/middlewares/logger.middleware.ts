import morgan from "morgan";
import { Request } from "express";
import { createStream } from "rotating-file-stream";
import path from "path";
import fs from "fs";

morgan.token("safe-url", (req: Request) => {
  return req.url.replace(/([?&]token=)[^&]*/g, "$1[REDACTED]");
});

export const logger = () => {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  const accessLogStream = createStream("access.log", {
    interval: "6h",
    path: path.join(process.cwd(), "logs"),
    maxFiles: 14,
    compress: "gzip",
  });

  return morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
    {
      stream: accessLogStream,
      skip: (req: Request) => req.url === "/health",
    },
  );
};
