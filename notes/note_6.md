# Auth System — Interview Q&A
### Fresher → Mid-Level → Advanced

---

## SECTION 1 — Fundamentals (Fresher Level)

---

**Q1. What is authentication vs authorization? Give an example.**

Authentication = *Who are you?*
Confirming the identity of a user. Login is authentication.

Authorization = *What are you allowed to do?*
Checking if the authenticated user has permission to access a resource.

Example:
- You log in with email + password → **authentication**
- You try to access `/admin` but you're a regular user → **authorization** check fails

In code terms: authentication happens in your `loginHandler`.
Authorization happens in a middleware that checks `req.user.role`.

---

**Q2. What is a JWT? What's inside it?**

JWT = JSON Web Token. A self-contained, signed token used to transmit
information between client and server securely.

It has three parts separated by dots:
```
header.payload.signature
```

- **Header**: algorithm used (e.g. HS256) and token type
- **Payload**: the actual data (claims) — like `{ id, role, tokenVersion, iat, exp }`
- **Signature**: HMAC of header + payload using a secret key

The signature is what makes it tamper-proof. If someone edits the payload,
the signature won't match and `jwt.verify()` will throw.

Important: JWT payload is **base64 encoded, not encrypted**.
Anyone can decode it. Never put sensitive data (passwords, card numbers) in it.

---

**Q3. What's the difference between `jwt.sign()` and `jwt.verify()`?**

`jwt.sign(payload, secret, options)`:
- Creates a new JWT
- Encodes the payload, signs it with the secret
- Returns the token string

`jwt.verify(token, secret)`:
- Decodes and validates the token
- Checks the signature (was it signed with our secret?)
- Checks expiry (`exp` claim)
- Returns the decoded payload if valid
- Throws if invalid or expired

---

**Q4. Why do we hash passwords before storing them?**

Because if your database leaks — and databases do leak — plain text passwords
expose every user's account, and possibly their accounts on other sites too
(people reuse passwords).

A hash is a one-way function. `bcrypt("password123")` → `$2b$10$...`.
You can't reverse it. On login, you hash the input and compare hashes.

bcrypt also adds a "salt" — random data added before hashing — so
two users with the same password get different hashes. Protects against
rainbow table attacks.

---

**Q5. What is `httpOnly` cookie and why do we use it for the refreshToken?**

`httpOnly` is a cookie flag that prevents JavaScript from accessing the cookie.
`document.cookie` won't see it. No JS code — including malicious injected scripts — can read it.

This protects against **XSS (Cross-Site Scripting)** attacks.

If an attacker injects JS into your page and the refreshToken is in localStorage,
they steal it instantly. If it's in an httpOnly cookie, their JS can't touch it.

That's why refreshToken goes in httpOnly cookie, and accessToken stays in memory
(not localStorage — memory only, lost on page refresh, which is acceptable).

---

**Q6. What is the difference between accessToken and refreshToken?**

| | AccessToken | RefreshToken |
|---|---|---|
| Lifespan | Short (15 mins) | Long (7 days) |
| Stored | Client memory | httpOnly cookie |
| Sent with | Every API request | Only to /refresh |
| Contains | id, role, tokenVersion | id, tokenVersion |
| Purpose | Prove identity on requests | Get new accessTokens |

Short-lived accessToken means even if stolen, the damage window is tiny.
Long-lived refreshToken means user doesn't have to login every 15 minutes.

---

**Q7. What HTTP status codes do you use in your auth system and why?**

- `200` — success (login, verify already verified email)
- `201` — resource created (register)
- `400` — bad request (validation errors, wrong password format)
- `401` — unauthorized (invalid/expired token, wrong credentials)
- `403` — forbidden (authenticated but not allowed — email not verified)
- `404` — not found (user doesn't exist)
- `409` — conflict (email or username already exists)
- `429` — too many requests (rate limiter kicked in)

The distinction between 401 and 403 is important:
401 = you're not logged in. 403 = you're logged in but not allowed.

---

**Q8. What is Zod and why use it for validation?**

Zod is a TypeScript-first schema validation library.

You define the shape and rules of your expected input, then call `.safeParse()`.
It returns either a success with typed data, or an error with detailed field-level messages.

Why not just check manually?
- Zod gives you TypeScript types for free from the schema
- Centralized validation logic
- Detailed, structured error messages
- `.safeParse()` never throws — you handle success/failure explicitly

```typescript
const result = registerSchema.safeParse(req.body);
if (!result.success) { /* handle errors */ }
const { email, password } = result.data; // fully typed
```

---

## SECTION 2 — Intermediate Level

---

**Q9. What is token rotation and why does it matter?**

Token rotation means: every time you use your refreshToken to get a new
accessToken, the refreshToken itself is also replaced with a brand new one.
The old one is immediately invalidated.

Why it matters:
RefreshTokens live 7 days. If someone steals one and you don't rotate,
they silently stay authenticated for up to 7 days — you'd never know.

With rotation, each token is **single-use**. Attacker uses it → it's consumed.
You try to use your (now dead) token → server detects reuse → alarm raised.

---

**Q10. What is refresh token reuse detection? Walk me through how it works.**

Reuse detection catches this scenario:
1. Attacker steals your refreshToken
2. Attacker uses it before you do → gets new tokens, old token is consumed
3. You try to use your old token → it's already been used

Without detection: you just get a 401 and assume token expired. Attacker is in.
With detection: server recognizes "this token was already rotated" and responds
by killing ALL sessions for that user (tokenVersion++) and wiping all hashes.

How it works in code:
- Server stores a SHA-256 hash of the current valid refreshToken in DB
- On /refresh, server hashes the incoming token and compares to stored hash
- Match → valid, rotate normally
- No match → reuse detected, nuke everything, force re-login

---

**Q11. What is `tokenVersion` and what problem does it solve?**

`tokenVersion` is a number stored on the user in DB (default: 0).
It's embedded in both accessToken and refreshToken at creation time.

On every request, middleware compares:
```
payload.tokenVersion === user.tokenVersion (from DB)
```

If they don't match → token is rejected, regardless of expiry.

Problem it solves: **revocation**.

JWTs are stateless — once issued, they work until expiry. You can't "cancel" them.
But by incrementing `tokenVersion` in DB, every previously issued token carries
an outdated version number. They'll never pass the check again.

Use cases: password changed, account banned, force logout, suspicious activity.
One `user.tokenVersion += 1` and every token ever issued to that user is dead.

---

**Q12. Why do you store a hash of the refreshToken instead of the token itself?**

Because if your DB leaks, you don't want attackers to have working refreshTokens.

A SHA-256 hash is one-way — you can't reverse it back to the original token.
So even with full DB access, they can't use the stored value directly.

On /refresh, you hash the incoming token and compare hashes.
The raw token never lives in your DB — only its fingerprint does.

Same principle as password hashing. Never store secrets in plain text.

---

**Q13. What is the difference between `select: false` in Mongoose and just not querying the field?**

`select: false` on a field means it's excluded from query results by default
unless you explicitly opt in with `.select("+fieldName")`.

Why it matters for security:
`passwordHash`, `twoFactorSecret`, `refreshTokenHash` — these should never
accidentally appear in API responses. With `select: false`, even if a developer
forgets to exclude them in a response, they won't be there.

It's a safety net. You have to consciously opt in to see sensitive fields.

```typescript
// Won't include passwordHash
const user = await userModel.findOne({ email });

// Will include passwordHash
const user = await userModel.findOne({ email }).select("+passwordHash");
```

---

**Q14. What is rate limiting and what attack does it prevent?**

Rate limiting caps the number of requests an IP can make in a time window.

Attack it prevents: **brute force**.

Without rate limiting, an attacker can script thousands of login attempts
per second trying different password combinations (or from a leaked password list).

With rate limiting (e.g. 10 attempts per 15 mins per IP):
- Attack is slowed to the point of being useless
- You get visibility into the attempts via logs

Secondary benefit on /refresh: prevents token grinding attacks where
an attacker tries to stay alive by hammering the refresh endpoint.

---

**Q15. What is the difference between `sameSite: "lax"` and `sameSite: "strict"` on cookies?**

Both protect against CSRF (Cross-Site Request Forgery) attacks.

`strict`: Cookie is never sent on cross-site requests at all.
Even clicking a link from another site to yours won't send the cookie.
Maximum protection but can break legitimate flows (OAuth redirects, email links).

`lax`: Cookie is sent on same-site requests AND top-level navigations
(clicking a link). Not sent on cross-origin POST/PUT/DELETE requests.
Good balance of security and usability — the standard choice for refreshTokens.

`none`: Cookie sent everywhere. Requires `Secure: true`. Needed for
embedded iframes or third-party contexts. Avoid unless necessary.

---

## SECTION 3 — Advanced Level

---

**Q16. If an attacker has a valid accessToken and the user force-logs out, the accessToken still works for up to 15 minutes. Is this a problem? How would you fix it?**

Yes, technically it's a gap. But it's an accepted trade-off in most systems.

The reason: accessTokens are stateless. Checking DB on every request defeats
the purpose of JWTs (statelessness = performance).

How to fix it if you need instant revocation:
1. **tokenVersion check in middleware** — you already do this. But this requires
   a DB call on every request, which is the trade-off.
2. **Redis blacklist** — on force-logout, store the accessToken's JTI (JWT ID,
   a unique claim you add) in Redis with TTL matching token expiry.
   Middleware checks Redis before proceeding. Fast, but needs Redis.
3. **Very short expiry** — reduce accessToken to 5 minutes. Smaller window = less risk.

In your system, `tokenVersion` check already requires a DB call per request,
so you actually have instant revocation on access tokens too. That's a good answer.

---

**Q17. What is a JTI claim and when would you use it?**

JTI = JWT ID. A unique identifier you embed in the token payload.

```typescript
jwt.sign({ id, role, tokenVersion, jti: randomUUID() }, secret)
```

Use cases:
- **Blacklisting**: store JTI in Redis on logout. Middleware rejects any token
  whose JTI is in the blacklist.
- **Replay attack prevention**: same token used twice is detectable by JTI.
- **Audit trails**: trace a specific token through logs using its JTI.

Without JTI, tokens of the same user look identical in logs.
With JTI, every token issuance is uniquely trackable.

---

**Q18. What is the difference between audit logging and application logging (Morgan)?**

Application logging (Morgan):
- Logs every HTTP request
- Captures: method, route, status code, response time, IP, user agent
- Purpose: debugging, performance monitoring, traffic analysis
- Level: infrastructure

Audit logging:
- Logs security-relevant business events
- Captures: who did what, to what resource, from where, with what outcome
- Purpose: security investigations, compliance, anomaly detection
- Level: business logic

Example: Morgan sees `POST /login 401`. That's it.
Audit log sees: `LOGIN_FAILED | userId: null | email: john@x.com | ip: 103.x.x.x | reason: wrong_password`.

In a security incident, Morgan tells you *something happened*.
Audit logs tell you *exactly what happened and to whom*.

---

**Q19. Why do you auto-delete audit logs after 90 days using a MongoDB TTL index?**

Two reasons:

1. **Storage cost**: logs accumulate fast. Keeping them forever is expensive
   and usually unnecessary. 90 days covers most security investigation windows.

2. **Data minimization**: a security/privacy principle — don't keep personal
   data longer than needed. Regulations like GDPR require this.

The TTL index in MongoDB automatically deletes documents when `createdAt`
is older than the specified seconds. No cron job needed, MongoDB handles it.

```typescript
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);
```

For compliance-heavy apps, you might increase this to 1-2 years or archive
to cold storage instead of deleting.

---

**Q20. How does per-device session management work and how is it different from your original single refreshToken approach?**

Original approach:
- One `refreshTokenHash` field per user
- Login from laptop overwrites phone's hash → phone silently loses session
- Logout = logout from everywhere
- No visibility into active sessions

Per-device approach:
- `sessions` array on user, one entry per device
- Each entry has: hash, device info, lastUsed, sessionId
- Login from laptop adds to array, doesn't touch phone's entry
- Logout = remove only that session from array
- Logout all = clear array + tokenVersion++
- Bonus: `/auth/sessions` endpoint shows user all their active devices

The schema shift: one field → array of objects.
The logic shift: find by hash in array → rotate in place → save.

The reuse detection also improves: if hash not found in array at all,
that's the signal. Nuke everything.

---

**Q21. If you were to move this to production, what would you change or add?**

This is a "what would you improve" question — shows maturity.

Good answers:

1. **Redis for rate limiting**: current in-memory store resets on restart
   and doesn't work across multiple server instances.

2. **Redis for token blacklisting**: faster than DB check for revoked JTIs.

3. **HTTPS enforced**: `secure: true` on cookies is already conditional on
   NODE_ENV. In production, always HTTPS, never HTTP.

4. **Helmet.js**: sets security-related HTTP headers automatically.
   Protects against clickjacking, MIME sniffing, XSS via headers.

5. **IP reputation / geolocation checks**: flag logins from unusual countries.

6. **Login notification emails**: "New login from Chrome on Windows, India.
   If this wasn't you, click here."

7. **Refresh token expiry sliding window**: reset the 7-day expiry on each
   successful rotation, so active users never get logged out.

8. **Structured logging**: replace `console.error` with a logger like `pino`
   or `winston` that outputs JSON — easier to parse in log aggregators.

---

**Q22. A user says "I didn't log in from that device" — how does your system help investigate?**

Walk through what your system provides:

1. **Audit logs**: `LOGIN_SUCCESS` event with IP, userAgent, timestamp, userId.
   You can pull all login events for that user and see the suspicious one.

2. **Active sessions**: `/auth/sessions` shows deviceInfo + lastUsed for every
   active session. User can see "Chrome on Windows, last used 2 hours ago"
   and know that's not them.

3. **Immediate action**: user hits "logout all devices" → `tokenVersion++`,
   sessions array wiped. Attacker's tokens are dead within milliseconds.

4. **Token reuse detection**: if attacker rotated the token before user noticed,
   when user tries to refresh they'd get a reuse detection alert — which already
   killed all sessions automatically.

This is the answer that shows your system isn't just theoretically secure —
it's practically useful when something actually goes wrong.

---

## Quick Reference — Concepts Cheat Sheet

| Concept | One-line answer |
|---|---|
| JWT | Signed, self-contained token. Not encrypted — don't put secrets in it |
| bcrypt | One-way password hashing with salt. Can't be reversed |
| httpOnly cookie | JS can't read it. XSS-proof storage for refreshToken |
| tokenVersion | Master kill switch. Increment = all tokens dead |
| Token rotation | Each use of refreshToken issues a new one. Old one dies |
| Reuse detection | Hash mismatch on /refresh = token was already used = alarm |
| Rate limiting | Cap requests per IP per window. Stops brute force |
| Audit log | Security event log. Not Morgan. Business-level, not HTTP-level |
| select: false | Field excluded from queries by default. Opt-in for sensitive fields |
| TTL index | MongoDB auto-deletes documents after N seconds. No cron needed |
| sameSite: lax | Cookie not sent on cross-origin POST. CSRF protection |
| JTI | Unique JWT ID. Enables blacklisting and token tracing |
| Per-device sessions | Array of sessions. Granular logout. No cross-device interference |