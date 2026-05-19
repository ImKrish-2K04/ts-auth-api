# 🔐 ts-auth-api

> A production-grade authentication REST API — built from scratch with **Node.js**, **Express**, **MongoDB**, and **TypeScript**. No shortcuts, no magic packages. Just clean, secure, well-thought-out auth.

---

## ⚠️ Active Development Notice

> **This project is currently ~60–70% complete and is actively being worked on.**
>
> Routes may be renamed, controllers may be restructured, and new features will be added as development continues. If you're using this as a reference or learning resource, keep an eye on this repo — it will only get better.
>
> **Star ⭐ the repo to stay updated!**

---

## ✨ What's Inside

This isn't just a basic JWT login. This is a full auth system you'd actually ship to production:

- 🔑 **JWT Authentication** — short-lived access tokens + long-lived refresh tokens via HttpOnly cookies
- 🔁 **Secure Token Rotation** — refresh token reuse detection with automatic session revocation
- 📧 **Email Verification** — unverified users can't log in, period
- 🔒 **Forgot & Reset Password** — SHA256-hashed, time-expiring reset tokens (15 min window)
- 🌐 **Google OAuth** — social login wired into the same JWT infrastructure
- 📱 **Two-Factor Authentication (TOTP)** — Google Authenticator & Authy support
- 👮 **Role-Based Access Control (RBAC)** — user vs admin, cleanly separated
- 🧑‍💼 **Admin API** — securely list and manage users (admin-only)
- 👤 **User API** — authenticated `/me` endpoint
- 📝 **Smart Logging** — Morgan with rotating log files and automatic `?token=` redaction
- 🔷 **100% TypeScript** — fully typed, no shortcuts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Language | TypeScript |
| Auth Tokens | jsonwebtoken |
| Password Hashing | bcryptjs |
| Validation | Zod v4 |
| Email (Dev) | Mailtrap SMTP |
| Email (Prod) | Any SMTP provider |
| Logging | Morgan + rotating-file-stream |
| 2FA | TOTP (speakeasy / otplib) |
| OAuth | Google OAuth 2.0 |

---

## 📁 Project Structure

```
src/
├── configs/
│   ├── config.ts           # Environment variable validation & export
│   └── db.ts               # MongoDB connection
├── controllers/
│   └── auth/
│       └── auth.controller.ts  # All auth handlers
├── lib/
│   ├── templates/          # HTML email templates
│   ├── appError.ts         # Custom AppError class
│   ├── asyncWrapper.ts     # catchAsync wrapper
│   ├── email.ts            # Nodemailer transporter
│   ├── hash.ts             # hashPassword, checkPassword, hashToken
│   └── token.ts            # createAccessToken, createRefreshToken
├── middlewares/
│   ├── logger.middleware.ts  # Morgan rotating logger
│   ├── requireAuth.ts        # JWT verification middleware
│   └── requireRole.ts        # RBAC middleware
├── models/
│   └── user.model.ts       # Mongoose user schema & model
├── routes/
│   ├── auth.routes.ts      # Auth routes
│   ├── user.routes.ts      # User routes
│   ├── admin.routes.ts     # Admin routes
│   └── index.routes.ts     # Root router
├── schemas/
│   └── auth.schema.ts      # Zod validation schemas
├── types/
│   └── express.d.ts        # Express Request type augmentation
├── app.ts                  # Express app setup
└── server.ts               # Server entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- A [Mailtrap](https://mailtrap.io) account for development email testing

### 1. Clone the repo

```bash
git clone https://github.com/ImKrish-2K04/ts-auth-api.git
cd ts-auth-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root and fill in your values:

```env
# App
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000/api/v1

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secrets — use long, random strings
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_VERIFY_SECRET=your_verify_secret

# Email — Mailtrap (for development)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_password
EMAIL_FROM=noreply@ts-auth-api.dev
MAILTRAP_API_TOKEN=your_mailtrap_api_token

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> **Note:** For production, replace Mailtrap credentials with a real SMTP provider like Gmail, Resend, or SendGrid.

### 4. Run in development

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
npm start
```

---

## 📡 API Reference

> **Note:** Routes and structure are subject to change as the project evolves. Always refer to the latest version of this README.

### Base URL
```
http://localhost:5000/api/v1
```

### Auth — `/api/v1/auth`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `POST` | `/sign-up` | Register a new user | ❌ |
| `GET` | `/verify-email?token=` | Verify email address | ❌ |
| `POST` | `/sign-in` | Login with email or username | ❌ |
| `POST` | `/refresh` | Get a new access token via cookie | ❌ |
| `POST` | `/logout` | Logout and invalidate refresh token | ❌ |
| `POST` | `/forgot-password` | Request a password reset email | ❌ |
| `POST` | `/reset-password?token=` | Reset password with token | ❌ |
| `GET` | `/google` | Initiate Google OAuth flow | ❌ |
| `GET` | `/google/callback` | Google OAuth callback handler | ❌ |

### User — `/api/v1/user`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/` | Get current authenticated user | ✅ User |

### Admin — `/api/v1/admin`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/users` | Fetch all users (`?includeAdmin=true` for all) | ✅ Admin only |

---

## 🛡️ Security Highlights

- **Passwords** hashed with `bcryptjs` — never stored in plain text
- **Reset tokens** hashed with SHA256 before storing — only the raw token goes in the email, never in the DB
- **Refresh tokens** hashed and stored — token reuse detected and triggers automatic session revocation
- **`tokenVersion`** on every user — instantly invalidates all tokens on password reset or suspicious activity
- **HttpOnly + Secure + SameSite** cookies for refresh tokens — immune to XSS
- **`crypto.timingSafeEqual`** for token comparison — prevents timing attacks
- **Morgan** redacts `?token=` from all log files — no secrets in logs, ever

---

## 🗺️ Roadmap

- [x] JWT access + refresh token flow
- [x] Secure token rotation + reuse detection
- [x] Email verification
- [x] Forgot & reset password
- [x] RBAC middleware
- [x] User `/me` endpoint
- [x] Admin users API
- [ ] Google OAuth *(in progress)*
- [ ] Two-factor authentication / TOTP *(in progress)*
- [ ] Route & naming cleanup *(planned)*
- [ ] VPS deployment — PM2 + Nginx + HTTPS *(planned)*

---

## 🤝 Contributing

This is primarily a learning project but contributions, suggestions, and bug reports are always welcome.

1. Fork the repo
2. Create a new branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m "add your feature"`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## 📌 A Note to Visitors

This repo is a **work in progress** — actively developed and improved. APIs, folder structure, and naming conventions may change between commits as things get refined.

If something looks different from what you remember — that's intentional. The goal is to ship something clean, not something fast.

**Watch / Star ⭐ the repo to follow the journey.**

---

## 📄 License

MIT — do whatever you want with it, just don't blame me if your production auth breaks. 😄