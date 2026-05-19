import { z } from "zod";

const registerSchema = z.object({
  email: z.email("Please enter a valid email address").lowercase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be at most 20 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%_-]).*$/,
      "Password must contain uppercase, lowercase, number and special character (!@#$%_-)",
    ),
  userName: z
    .string()
    .regex(
      /^[a-zA-Z0-9_]{2,16}$/,
      "userName can only contain letters, numbers and underscores (2-16 characters)",
    ),
});

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be at most 20 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%_-]).*$/,
      "Password must contain uppercase, lowercase, number and special character (!@#$%_-)",
    ),
});

const setPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be at most 20 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%_-]).*$/,
      "Password must contain uppercase, lowercase, number and special character (!@#$%_-)",
    ),
});

export { registerSchema, loginSchema, setPasswordSchema };
