import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Please enter a valid email"],
    },
    passwordHash: {
      type: String,
      minlength: 60,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    userName: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9_]{6,18}$/,
        "userName can contain only letters, numbers and underscore which should be length from 6 to 18 characters",
      ],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    avatar: {
      type: String,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorSecretExpiresAt: {
      type: Date,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    resetPasswordHash: {
      type: String,
      select: false,
      index: { sparse: true },
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const userModel = model("users", userSchema);
