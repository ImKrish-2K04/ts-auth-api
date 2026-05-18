## Headers — The Big Picture

Think of headers as **metadata attached to every request and response.** Like the envelope around a letter — the actual letter is the body, but the envelope tells you *who sent it, what's inside, how to handle it.*

```
[Browser] ——— request + headers ———→ [Server]
[Browser] ←—— response + headers ——— [Server]
```

---

## Request Headers (what browser sends to server)

These are the most important ones you'll actually use:

**`Content-Type`**
Tells server *what format* the body is in.
```http
Content-Type: application/json
```
Without this, Express won't parse your JSON body. That's why `express.json()` middleware exists — it reads this header and parses accordingly.

---

**`Authorization`**
This is how you send JWT tokens.
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```
Your auth middleware reads exactly this header to verify who's making the request.

---

**`Cookie`**
Browser **automatically** attaches this on every request if a cookie exists for that domain. You don't set this manually — browser handles it.
```http
Cookie: accessToken=eyJhbG...
```
This is why HttpOnly cookies are powerful — JS can't touch them, but browser sends them automatically. 🔒

---

**`Origin`**
Browser automatically adds this on cross-origin requests. This is what CORS reads.
```http
Origin: http://localhost:5173
```

---

## Response Headers (what server sends back to browser)

**`Content-Type`**
Server telling browser *what format* the response body is.
```http
Content-Type: application/json
```

---

**`Set-Cookie`**
This is how your server **plants a cookie** in the browser.
```http
Set-Cookie: accessToken=eyJhbG...; HttpOnly; Secure; SameSite=Strict
```
Those flags are crucial for auth —
- `HttpOnly` → JS cannot read it, only browser sends it. Prevents XSS attacks.
- `Secure` → only sent over HTTPS
- `SameSite=Strict` → only sent to same site, prevents CSRF attacks

---

**`Access-Control-Allow-Origin`**
You saw this in CORS — server telling browser who's allowed.
```http
Access-Control-Allow-Origin: http://localhost:5173
```

---

## How they all flow together in a real auth scenario

Let me paint the full picture with a login + protected route flow:

**Step 1 — Login request**
```http
POST /api/auth/login
Content-Type: application/json        ← "my body is JSON"

{ "email": "...", "password": "..." }
```

**Step 2 — Server responds, plants cookie**
```http
200 OK
Content-Type: application/json
Set-Cookie: accessToken=eyJhbG...; HttpOnly; Secure   ← plants token in browser
Set-Cookie: refreshToken=dkfj...; HttpOnly; Secure

{ "message": "logged in successfully" }
```

**Step 3 — Browser hits a protected route**
```http
GET /api/songs
Cookie: accessToken=eyJhbG...    ← browser auto-sends this, no JS needed
Origin: http://localhost:5173
```

**Step 4 — Your auth middleware reads it**
```javascript
const token = req.cookies.accessToken  // reading that cookie header
// verify token, attach user to req.user
// if valid → next()
// if invalid → 401 Unauthorized
```

---

## The alternative — Authorization header approach

Some apps send token manually in headers instead of cookies:
```javascript
// frontend manually sets this
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```
```javascript
// backend reads it
const token = req.headers.authorization?.split(' ')[1]
```

Cookie approach is more secure (HttpOnly = XSS proof). Header approach is more flexible (works easily with mobile apps). Tutorial 2 uses **cookies** — which is the more production-grade pattern. 👌

---

## 30-second mental summary

> **Request headers** = browser telling server *who I am, what I'm sending, where I'm from.* **Response headers** = server telling browser *here's what I'm sending back, store this cookie, here are your CORS permissions.*
> 
> Auth lives in `Authorization` header or `Cookie` header on requests, and `Set-Cookie` on responses. That's 90% of what you'll deal with in Tutorial 2.

---