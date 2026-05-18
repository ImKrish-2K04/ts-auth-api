import jwt from "jsonwebtoken";
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
    userId: id,
    role,
    tokenVersion,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "30m",
  });
};

const createRefreshToken = ({ id, tokenVersion }: RefreshTokenTypes) => {
  const payload = {
    userId: id,
    tokenVersion,
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export { createAccessToken, createRefreshToken };
