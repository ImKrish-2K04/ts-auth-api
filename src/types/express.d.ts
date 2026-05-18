declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      userName: string;
      role: "user" | "admin";
      isEmailVerified: boolean;
      twoFactorEnabled: boolean;
    };
  }
}
