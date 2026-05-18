## The Mental Model First

Think of it like a hotel key card system:

- **AccessToken** = your room key. Works for 15 mins. If stolen, attacker has access — but only briefly.
- **RefreshToken** = the front desk receipt. You show it to get a new room key. Lives for 7 days.
- **tokenVersion** = the "master override" at the front desk. If they increment it, *all* your receipts become void instantly.

---

## What you need for BOTH rotation + revocation

Here's the honest truth — `tokenVersion` alone covers revocation beautifully. But for **rotation security** (detecting stolen refresh tokens), you *do* need to store the refreshToken hash in DB. Here's why:

> Imagine attacker steals your refreshToken. They use it before you do. Server issues new tokens to attacker. Now *you* try to use your old refreshToken — server should detect "hey this was already used" and raise alarm.

This is called **Refresh Token Reuse Detection** and it needs DB storage.

---

## The complete picture — what to add

### 1. Schema changes

```typescript
refreshTokenHash: {
  type: String,
  select: false,
},
```

That's it. Just one field. You store a **hash** of the token, never the raw token.

---

### 2. On Login — store the hash

```typescript
import crypto from "crypto";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

// in loginHandler, before sending response:
user.refreshTokenHash = hashToken(refreshToken);
await user.save();
```

---

### 3. The `/refresh` route — the heart of it all

```typescript
const refreshHandler = async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) return next(new AppError(401, "No refresh token", true));

  // 1. Verify signature + expiry
  let payload: { id: string; tokenVersion: number };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as typeof payload;
  } catch {
    return next(new AppError(401, "Invalid or expired refresh token", true));
  }

  // 2. Find user
  const user = await userModel.findById(payload.id).select("+refreshTokenHash");
  if (!user) return next(new AppError(404, "User not found", true));

  // 3. Check tokenVersion (revocation check)
  if (payload.tokenVersion !== user.tokenVersion)
    return next(new AppError(401, "Session revoked, please login again", true));

  // 4. Check token hash (reuse detection)
  const incomingHash = hashToken(token);
  if (incomingHash !== user.refreshTokenHash) {
    // 🚨 Possible token theft — kill all sessions
    user.tokenVersion += 1;
    user.refreshTokenHash = undefined;
    await user.save();
    return next(new AppError(401, "Token reuse detected, please login again", true));
  }

  // 5. Rotate — issue new tokens
  const newAccessToken = createAccessToken({ id: user.id, role: user.role, tokenVersion: user.tokenVersion });
  const newRefreshToken = createRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });

  // 6. Store new hash, clear old
  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({ accessToken: newAccessToken });
};
```

---

### 4. Revocation (force logout) — one liner anywhere

```typescript
// password change, suspicious activity, admin ban — anywhere:
user.tokenVersion += 1;
user.refreshTokenHash = undefined;
await user.save();
```

That's it. Every existing token — access or refresh — is now dead.

---

## Summary of what checks what

| Check | Guards against |
|---|---|
| `jwt.verify()` | Tampered or expired tokens |
| `tokenVersion` match | Force-logout / revocation |
| `refreshTokenHash` match | Stolen + replayed refresh tokens |

---

You're in a really solid spot — `tokenVersion` was already the smart move. Now with `refreshTokenHash` added, you'll have production-grade auth.

Want me to help wire up the logout handler next? That one's short but easy to get wrong.