## Rotation 🔄

**What:** Every time you use your refreshToken, you get a *brand new one* back. The old one dies immediately.

**Why:** Because refreshTokens live for 7 days. That's a long time to be stolen and quietly abused. Without rotation, an attacker can use your stolen refreshToken for the *entire 7 days* and you'd never know.

With rotation — the moment *anyone* uses a refreshToken, it's consumed. One-time use. Like a scratch card.

**The bonus:** Reuse detection. If attacker uses your token before you do, and then *you* try to use your (now dead) old token — server goes "wait, this was already used" and raises the alarm. That's your signal that something shady happened.

---

## Revocation 🚫

**What:** Instantly killing a user's session — regardless of whether their tokens have expired or not.

**Why:** JWTs are stateless. Normally once issued, they work until they expire. You can't "unsend" them. So if you need to force someone out — suspicious login, password change, account ban — you need a way to say *"none of this user's tokens are valid anymore, right now."*

That's what `tokenVersion` solves. It's like a master switch. Flip it — everything issued before that flip is now trash.

---

## The key difference

| | Rotation | Revocation |
|---|---|---|
| **Protects against** | Stolen refresh tokens | Compromised sessions |
| **Triggered by** | Every `/refresh` call | Explicit action (logout, ban, password change) |
| **Mechanism** | Swap old token for new | Increment `tokenVersion` |
| **Needs DB?** | Yes (to detect reuse) | No (version is already in DB on the user) |

---

## Together they cover the full threat surface

Rotation handles the *"what if someone steals my token quietly"* problem.

Revocation handles the *"I know something is wrong, kill it now"* problem.

One is passive protection, the other is active control. You need both.

---

Does this click? Once you say yes, the code from before will make complete sense — every line of it maps to exactly what we just talked about.