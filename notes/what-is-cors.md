## The Core Idea (your mental model, sharpened)

Browser is the bodyguard, not the server.

CORS restrictions are **enforced by the browser only**. Postman, curl, your backend calling another backend — none of them care about CORS. It's purely a browser saying *"wait, should I even allow this?"*

---

## Why `OPTIONS` exists — the "Preflight" concept

Okay this is the part that clicks everything.

When your frontend (say `localhost:5173`) tries to hit your backend (`localhost:3000`) with something *non-trivial* — like a `POST` with `Content-Type: application/json` or a `DELETE` request — the browser gets nervous and thinks:

> *"This could modify data. Let me ask the server first if it's okay before I actually send it."*

So the browser **automatically** sends an `OPTIONS` request first, like a scout:

```
OPTIONS /api/songs
Origin: http://localhost:5173
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: Content-Type, Authorization
```

It's basically asking — *"Hey server, is this frontend allowed to send a DELETE with these headers?"*

Your server replies:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

Browser reads that response, says *"cool, permission granted"* — and THEN sends the actual `DELETE` request.

This two-step is called a **Preflight request.**

---

## When does preflight trigger vs not?

| Request Type | Preflight? |
|---|---|
| Simple GET, POST with plain text | ❌ No preflight |
| POST with `application/json` | ✅ Yes preflight |
| PUT, DELETE, PATCH | ✅ Yes preflight |
| Custom headers like `Authorization` | ✅ Yes preflight |

Simple requests go directly. Anything that *could* cause side effects — preflight first.

---

## Real code — how you handle this in Express

```javascript
import cors from 'cors'

app.use(cors({
  origin: 'http://localhost:5173',       // who's allowed
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // what they can do
  allowedHeaders: ['Content-Type', 'Authorization'], // what headers allowed
  credentials: true                      // allow cookies to be sent
}))
```

That `credentials: true` is crucial when you're dealing with **HttpOnly cookies** — which you'll hit immediately in Tutorial 2. Without it, browser will block cookies silently and you'll lose your mind debugging. 😅

---

## The one gotcha everyone hits

If you set `credentials: true`, you **cannot** use `origin: '*'` (wildcard). Browser flat out rejects it. You must specify the exact origin. This trips up literally everyone the first time.

---

## 30-second mental summary

> Browser sees a cross-origin request → checks if it's "complex" → if yes, sends `OPTIONS` preflight to ask server permission → server replies with what's allowed → browser either proceeds or blocks.

CORS is just a **browser-enforced permission handshake.** Server declares the rules, browser enforces them. You're just configuring those rules on your Express server.

---