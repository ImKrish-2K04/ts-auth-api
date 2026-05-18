# The Complete Auth Lifecycle — Login to Logout

---

## Stage 1 — User Logs In

User sends `POST /auth/login` with their credentials (email/username + password).

Server does the following checks in order:

1. Does the user exist? → if not, 404
2. Is the password correct? → if not, 400
3. Is the email verified? → if not, 403

All checks pass? Good. Now server creates two tokens.

---

## Stage 2 — Token Creation

### AccessToken
- Short-lived: **15 minutes**
- Stored: **nowhere on server** (stateless)
- Client stores it: **in memory** (not localStorage, not cookie)
- Contains: `{ id, role, tokenVersion }`

### RefreshToken
- Long-lived: **7 days**
- Stored: **httpOnly cookie** (client can't touch it via JS)
- Server stores: **hash of it** in the DB against the user
- Contains: `{ id, tokenVersion }`

Server responds with:
```
{
  accessToken: "eyJ...",   ← client stores this in memory
  data: { userId, email, userName, role, ... }
}
Set-Cookie: refreshToken=eyJ...; HttpOnly; Secure; SameSite=Lax
```

---

## Stage 3 — Making Authenticated Requests

Every protected API request from the client looks like this:

```
GET /api/some-protected-route
Authorization: Bearer <accessToken>
```

Server middleware does:

1. Extract token from `Authorization` header
2. `jwt.verify(token, ACCESS_SECRET)` → checks signature + expiry
3. Extract `{ id, role, tokenVersion }` from payload
4. Fetch user from DB
5. Compare `payload.tokenVersion === user.tokenVersion` → if mismatch, reject (revocation check)
6. Attach user to `req.user`
7. Move on to the actual route handler

If all good → request proceeds normally.

---

## Stage 4 — AccessToken Expires (The Normal Path)

AccessToken lives 15 minutes. After that, any request returns `401 Unauthorized`.

Client catches this 401 and automatically hits:

```
POST /auth/refresh
Cookie: refreshToken=eyJ...   ← sent automatically by browser
```

Server does the following in `/refresh`:

### Step 1 — Verify the refreshToken signature + expiry
```
jwt.verify(refreshToken, REFRESH_SECRET)
```
Fails? → 401, force re-login.

### Step 2 — Find the user
Fetch user from DB using `id` from payload.
Not found? → 404.

### Step 3 — tokenVersion check (Revocation)
```
payload.tokenVersion === user.tokenVersion?
```
Mismatch? → Someone forced a logout (password change, ban, suspicious activity).
→ 401, force re-login.

### Step 4 — refreshToken hash check (Reuse Detection)
```
hash(incomingToken) === user.refreshTokenHash?
```
Mismatch? → This token was already used (or stolen + used by attacker before you).
→ Increment `tokenVersion`, wipe `refreshTokenHash`, save user.
→ 401, force re-login. All sessions killed.

### Step 5 — Rotation (Everything checks out)
Issue brand new tokens:
- New `accessToken` with same `tokenVersion`
- New `refreshToken` with same `tokenVersion`

Store hash of new refreshToken in DB. Clear old one.
Set new cookie. Return new accessToken.

Client is back in business — transparently. User felt nothing.

---

## Stage 5 — Unexpected Events (The Forced Re-login Path)

These are situations where the server *actively* decides to kill a session:

| Event | What happens |
|---|---|
| Password changed | `tokenVersion += 1`, `refreshTokenHash = null` |
| User banned / suspended | `tokenVersion += 1`, `refreshTokenHash = null` |
| Suspicious login detected | `tokenVersion += 1`, `refreshTokenHash = null` |
| User clicks "logout all devices" | `tokenVersion += 1`, `refreshTokenHash = null` |

One increment. That's all it takes. Every token ever issued to that user — access or refresh — is now mathematically invalid. Even if attacker has a valid non-expired token, it carries the old `tokenVersion`. Server rejects it instantly.

---

## Stage 6 — Normal Logout

User clicks logout.

```
POST /auth/logout
Cookie: refreshToken=eyJ...
```

Server does:
1. Wipe `refreshTokenHash` from DB (that specific token is now orphaned)
2. `res.clearCookie("refreshToken")`
3. Return 200

Client does:
1. Clear `accessToken` from memory
2. Redirect to login

Note: The accessToken technically still "works" for up to 15 minutes after logout. That's acceptable — it's stateless, and the window is tiny. If you need instant kill here too, increment `tokenVersion` on logout as well.

---

## Stage 7 — RefreshToken Also Expires

After 7 days of no activity, the refreshToken itself expires.

Client hits `/refresh`, server does `jwt.verify()` → throws `TokenExpiredError`.

Response: 401.

Client has no valid tokens at all now. Forces user to the login page. They log in fresh, whole cycle starts again from Stage 1.

---

## The Full Flow — One View

```
LOGIN
  ↓
Create accessToken (15m) + refreshToken (7d)
Store refreshToken hash in DB
  ↓
CLIENT stores accessToken in memory
COOKIE stores refreshToken (httpOnly)
  ↓
Make requests with accessToken
  ↓ (every request)
Middleware: verify signature → check tokenVersion → proceed
  ↓
accessToken expires (15m)
  ↓
Client hits /refresh automatically
  ↓
Server: verify signature
      → check tokenVersion     (revocation gate)
      → check hash match       (reuse detection gate)
      → rotate tokens          (new access + new refresh)
      → store new hash in DB
  ↓
Client gets new accessToken silently
  ↓
Cycle repeats...
  ↓
Unexpected event?
  → tokenVersion++ → all tokens dead → force re-login
  ↓
Normal logout?
  → wipe hash + clear cookie → soft logout
  ↓
RefreshToken expires naturally after 7 days?
  → /refresh fails → force re-login
```

---

## The Three Guards — Summary

| Guard | What it stops | Where it lives |
|---|---|---|
| `jwt.verify()` | Tampered or expired tokens | JWT library |
| `tokenVersion` check | Revoked sessions (force logout) | DB field on user |
| `refreshTokenHash` check | Stolen + replayed refresh tokens | DB field on user |

Each one catches what the previous one misses. Together they're airtight.

---

*That's the complete lifecycle. Every line of code in the refresh handler maps to one of these stages.*