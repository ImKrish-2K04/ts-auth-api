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
      required: true,
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
      required: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9_]{6,18}$/,
        "userName can contain only letters, numbers and underscore which should be length from 6 to 18 characters",
      ],
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
