import crypto from "crypto";
import bcrypt from "bcryptjs";

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

const checkPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, passwordHash);
};

const hashToken = (refreshToken: string) => {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
};

export { hashPassword, checkPassword, hashToken };
