import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../configs/config";

interface AccessTokenTypes {
  id: string;
  role: "user" | "admin";
  tokenVersion: number;
}

interface RefreshTokenTypes {
  id: string;
  tokenVersion: number;
}

const createAccessToken = ({ id, role, tokenVersion }: AccessTokenTypes) => {
  const payload = {
    id: id,
    role,
    tokenVersion,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "30m",
  });
};

const createRefreshToken = ({ id, tokenVersion }: RefreshTokenTypes) => {
  const payload = {
    id: id,
    tokenVersion,
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

const hashToken = (refreshToken: string) => {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
};

export { createAccessToken, createRefreshToken, hashToken };
