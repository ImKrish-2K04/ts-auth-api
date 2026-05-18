# Auth Hardening — Rate Limiting, Per-Device Sessions & Audit Logging

---

# 1. Rate Limiting

## Why it exists

Without rate limiting, an attacker can hammer your `/login` endpoint
thousands of times per second trying different passwords.
That's called a **brute force attack**.

Same goes for `/refresh` — an attacker with a stolen token can keep
hitting it to stay alive indefinitely if nothing stops them.

Rate limiting says: "You get N attempts in X minutes. After that, you're blocked."

## How it works conceptually

Every incoming request carries an IP address.
Rate limiter keeps a counter per IP. Each request increments it.
If counter crosses the limit within the time window → block with 429.
When the window resets → counter goes back to zero.

```
IP: 103.x.x.x
  Request 1 → counter: 1 ✓
  Request 2 → counter: 2 ✓
  Request 3 → counter: 3 ✓
  Request 4 → counter: 4 ✓
  Request 5 → counter: 5 ✓
  Request 6 → counter: 6 → 429 Too Many Requests ✗
```

In-memory (express-rate-limit): counter lives in RAM.
Resets if server restarts. Fine for learning + single-server apps.

Redis: counter lives in Redis. Survives restarts. Works across
multiple servers. That's the production upgrade.

## Code

```bash
npm install express-rate-limit
```

```typescript
// src/middlewares/rateLimiter.ts
import rateLimit from "express-rate-limit";

// For login and register — strict
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10,                   // 10 attempts per window per IP
  standardHeaders: true,     // sends RateLimit headers to client
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many attempts, please try again after 15 minutes",
  },
});

// For /refresh — slightly more lenient
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many refresh attempts, please login again",
  },
});
```

```typescript
// src/routes/auth.routes.ts
import { authRateLimiter, refreshRateLimiter } from "../middlewares/rateLimiter";

router.post("/sign-in", authRateLimiter, loginHandler);
router.post("/sign-up", authRateLimiter, registerHandler);
router.post("/refresh", refreshRateLimiter, refreshHandler);
```

That's it. Two limiters, applied as middleware before your handlers.

## Redis upgrade path (later)

When you add Redis, you just swap the store:

```typescript
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../lib/redis";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: new RedisStore({ client: redisClient }), // ← only this changes
  // everything else stays the same
});
```

One line change. That's the beauty of express-rate-limit's design.

---

# 2. Per-Device Session Management

## Why it exists

Right now your schema stores ONE refreshToken hash per user.

The problem: if you log in from your phone, then log in from your laptop,
the laptop's login overwrites the phone's refreshTokenHash in DB.
Phone is now silently logged out on next refresh — it gets a hash mismatch.

Worse — "logout from this device only" is impossible.
You can only nuke everything (tokenVersion++) or nothing.

Per-device sessions fix this by giving each device its own slot.

## How it works conceptually

Instead of one `refreshTokenHash` field on the user,
you maintain a **list of sessions** — one per device.

Each session contains:
- The token hash (to validate)
- Device info (to display "your devices" screen)
- Last used timestamp (to expire stale sessions)
- A session ID (to target specific logout)

```
User: john@example.com
Sessions: [
  { id: "abc", hash: "x1y2...", device: "Chrome on Windows", lastUsed: ... },
  { id: "def", hash: "a3b4...", device: "Safari on iPhone",  lastUsed: ... },
  { id: "ghi", hash: "c5d6...", device: "Bruno API Client",  lastUsed: ... },
]
```

Login from a new device → push a new session.
Logout from one device → remove just that session by ID.
Force logout all → tokenVersion++ (kills everything, sessions don't even matter).
Refresh → find session by hash, rotate it in place.

## Schema change

```typescript
// Replace refreshTokenHash: String with this:

sessions: [
  {
    sessionId: { type: String, required: true },
    refreshTokenHash: { type: String, required: true },
    deviceInfo: { type: String, default: "Unknown device" },
    lastUsed: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
],
```

## Helper — parse device info from user agent

```typescript
// src/utils/deviceInfo.ts
export const parseDeviceInfo = (userAgent: string): string => {
  if (!userAgent) return "Unknown device";

  // Browser detection
  const browser =
    userAgent.includes("Firefox") ? "Firefox" :
    userAgent.includes("Chrome")  ? "Chrome"  :
    userAgent.includes("Safari")  ? "Safari"  :
    userAgent.includes("bruno")   ? "Bruno API Client" :
    "Unknown browser";

  // OS detection
  const os =
    userAgent.includes("Windows") ? "Windows" :
    userAgent.includes("Mac")     ? "macOS"   :
    userAgent.includes("iPhone")  ? "iPhone"  :
    userAgent.includes("Android") ? "Android" :
    userAgent.includes("Linux")   ? "Linux"   :
    "Unknown OS";

  return `${browser} on ${os}`;
};
```

## Updated loginHandler (session push)

```typescript
import { randomUUID } from "crypto";
import { parseDeviceInfo } from "../utils/deviceInfo";
import { hashToken } from "../utils/hashToken"; // sha256 hash helper

// inside loginHandler, replace the refreshTokenHash line with:

const sessionId = randomUUID();
const deviceInfo = parseDeviceInfo(req.headers["user-agent"] || "");

// Optional: cap sessions at 5 per user (kick oldest)
if (user.sessions.length >= 5) {
  user.sessions.sort((a, b) => 
    new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime()
  );
  user.sessions.shift(); // remove oldest
}

user.sessions.push({
  sessionId,
  refreshTokenHash: hashToken(refreshToken),
  deviceInfo,
  lastUsed: new Date(),
  createdAt: new Date(),
});

await user.save();

// Also embed sessionId in the refreshToken payload:
const refreshToken = createRefreshToken({
  id: user.id,
  tokenVersion: user.tokenVersion,
  sessionId, // ← add this
});
```

## Updated refreshHandler (rotate in place)

```typescript
// inside refreshHandler, replace the hash check section with:

const incomingHash = hashToken(token);

// Find the specific session
const sessionIndex = user.sessions.findIndex(
  (s) => s.refreshTokenHash === incomingHash
);

if (sessionIndex === -1) {
  // Hash not found — reuse detected or session doesn't exist
  // Could be theft — kill everything
  user.tokenVersion += 1;
  user.sessions = [];
  await user.save();
  return next(new AppError(401, "Token reuse detected, please login again", true));
}

// Rotate — update the session in place
const newSessionId = randomUUID();
const newRefreshToken = createRefreshToken({
  id: user.id,
  tokenVersion: user.tokenVersion,
  sessionId: newSessionId,
});

user.sessions[sessionIndex] = {
  sessionId: newSessionId,
  refreshTokenHash: hashToken(newRefreshToken),
  deviceInfo: user.sessions[sessionIndex].deviceInfo, // keep device info
  lastUsed: new Date(),
  createdAt: user.sessions[sessionIndex].createdAt,
};

await user.save();
```

## Logout from one device only

```typescript
// POST /auth/logout
const logoutHandler = async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(200).json({ message: "Logged out" });

  const user = await userModel.findById(req.user.id);
  if (user) {
    const incomingHash = hashToken(token);
    // Remove just this session
    user.sessions = user.sessions.filter(
      (s) => s.refreshTokenHash !== incomingHash
    );
    await user.save();
  }

  res.clearCookie("refreshToken");
  return res.status(200).json({ message: "Logged out successfully" });
};

// POST /auth/logout-all
const logoutAllHandler = async (req, res, next) => {
  const user = await userModel.findById(req.user.id);
  if (user) {
    user.tokenVersion += 1; // kills all accessTokens
    user.sessions = [];     // kills all refreshTokens
    await user.save();
  }

  res.clearCookie("refreshToken");
  return res.status(200).json({ message: "Logged out from all devices" });
};
```

## Bonus — "Your active sessions" endpoint

```typescript
// GET /auth/sessions
const getSessionsHandler = async (req, res, next) => {
  const user = await userModel.findById(req.user.id);

  const sessions = user.sessions.map((s) => ({
    sessionId: s.sessionId,
    deviceInfo: s.deviceInfo,
    lastUsed: s.lastUsed,
    createdAt: s.createdAt,
  }));
  // Never expose the hash — that stays internal

  return res.status(200).json({ data: sessions });
};
```

---

# 3. Audit Logging

## Why it exists

Morgan logs HTTP. That's infrastructure.

Audit logging is different — it's a record of *security-relevant events*
at the business logic level. Think of it as the CCTV of your auth system.

If something goes wrong — account takeover, suspicious logins, data breach —
audit logs tell you exactly what happened, when, from where, and to whom.

Without them, you're flying blind.

## What to log

Not everything. Only security-relevant events:

```
✓ Successful login
✓ Failed login attempt
✓ Email verified
✓ Password changed
✓ Password reset requested
✓ Token reuse detected
✓ All sessions force-killed
✓ 2FA enabled / disabled
✗ Normal API requests (that's Morgan's job)
✗ GET requests (mostly)
```

## Schema

```typescript
// src/models/auditLog.model.ts
import { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null, // null for failed logins where user may not exist
    },
    event: {
      type: String,
      required: true,
      enum: [
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "LOGOUT",
        "LOGOUT_ALL",
        "EMAIL_VERIFIED",
        "PASSWORD_CHANGED",
        "PASSWORD_RESET_REQUESTED",
        "TOKEN_REUSE_DETECTED",
        "SESSIONS_REVOKED",
        "2FA_ENABLED",
        "2FA_DISABLED",
        "REGISTER_SUCCESS",
      ],
    },
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: Schema.Types.Mixed }, // any extra context
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const auditLogModel = model("audit_logs", auditLogSchema);
```

## Helper function

```typescript
// src/utils/auditLog.ts
import { auditLogModel } from "../models/auditLog.model";
import { Request } from "express";

interface AuditLogPayload {
  userId?: string | null;
  event: string;
  req: Request;
  meta?: Record<string, unknown>;
}

export const createAuditLog = async ({
  userId = null,
  event,
  req,
  meta = {},
}: AuditLogPayload): Promise<void> => {
  try {
    await auditLogModel.create({
      userId,
      event,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      meta,
    });
  } catch (err) {
    // Audit log failure should NEVER crash your app
    console.error("Audit log failed:", err);
  }
};
```

Note the try/catch — audit logging is a side effect.
If it fails, your main flow must continue. Never let logging break auth.

## Usage in your handlers

```typescript
// loginHandler — success
await createAuditLog({
  userId: user.id,
  event: "LOGIN_SUCCESS",
  req,
  meta: { deviceInfo },
});

// loginHandler — wrong password
await createAuditLog({
  userId: user?.id ?? null,
  event: "LOGIN_FAILED",
  req,
  meta: { reason: "invalid_password", identifier },
});

// refreshHandler — reuse detected
await createAuditLog({
  userId: user.id,
  event: "TOKEN_REUSE_DETECTED",
  req,
  meta: { action: "all sessions killed, tokenVersion incremented" },
});

// logoutAllHandler
await createAuditLog({
  userId: req.user.id,
  event: "LOGOUT_ALL",
  req,
});
```

## What a real audit log looks like in MongoDB

```json
{
  "_id": "664a1f...",
  "userId": "663f2e...",
  "event": "TOKEN_REUSE_DETECTED",
  "ip": "103.21.x.x",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0...)",
  "meta": {
    "action": "all sessions killed, tokenVersion incremented"
  },
  "createdAt": "2026-05-16T03:06:35.000Z"
}
```

That's a proper audit log. In an investigation, this tells you:
- What happened (TOKEN_REUSE_DETECTED)
- Who it happened to (userId)
- When (createdAt)
- From where (ip)
- From what device (userAgent)
- What was done about it (meta.action)

That's the difference between audit logging and Morgan.

---

# Summary — What each one protects

| Feature | Threat it stops |
|---|---|
| Rate Limiting | Brute force attacks on login/refresh |
| Per-Device Sessions | Silent logouts, no granular control |
| Audit Logging | No visibility into security events |

Add these three on top of your rotation + revocation system,
and you have an auth layer that most production apps would be proud of.