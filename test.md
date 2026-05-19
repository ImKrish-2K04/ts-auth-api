# 🔐 ts-auth-api

> A production-grade authentication REST API — built from scratch with **Node.js**, **Express**, **MongoDB**, and **TypeScript**. No shortcuts, no magic packages. Just clean, secure, well-thought-out auth.

---

## ✨ What's Inside

This isn't just a basic JWT login. This is a full-featured auth system you'd actually ship to production:

- 🔑 **JWT Authentication** — short-lived access tokens + long-lived refresh tokens via HttpOnly cookies
- 🔁 **Secure Token Rotation** — refresh token reuse detection with automatic session revocation
- 📧 **Email Verification** — unverified users can't log in, period
- 🔒 **Forgot & Reset Password** — SHA256-hashed, time-expiring reset tokens (15 min window)
- 🌐 **Google OAuth 2.0** — seamless social login integrated into the JWT infrastructure
- 📱 **Two-Factor Authentication (TOTP)** — Google Authenticator & Authy support with QR codes
- 👮 **Role-Based Access Control (RBAC)** — user vs admin roles, cleanly separated
- 🧑‍💼 **Admin API** — securely list and manage users (admin-only)
- 👤 **User API** — authenticated profile endpoint with role-based access
- 📝 **Smart Logging** — Morgan with rotating log files and automatic `?token=` redaction
- ✅ **Input Validation** — Zod schemas for all endpoints with detailed error messages
- 🔷 **100% TypeScript** — fully typed, no shortcuts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express.js v4 |
| Database | MongoDB + Mongoose v9 |
| Language | TypeScript v6 |
| Auth Tokens | jsonwebtoken v9 |
| Password Hashing | bcryptjs v3 |
| Validation | Zod v4 |
| Email | Nodemailer SMTP |
| Logging | Morgan + rotating-file-stream |
| 2FA | TOTP (otplib) with QR codes |
| OAuth | Google OAuth 2.0 (Passport.js) |

---

## 📁 Project Structure

```
src/
├── configs/
│   ├── config.ts                # Environment variable validation & export
│   └── db.ts                    # MongoDB connection
├── controllers/
│   └── auth/
│       ├── auth.controller.ts   # Core auth handlers (sign-up, login, refresh, logout, etc.)
│       ├── oauth.controller.ts  # Google OAuth handlers
│       └── twoFactor.controller.ts  # 2FA/TOTP handlers
├── lib/
│   ├── templates/               # HTML email templates
│   ├── appError.ts              # Custom AppError class
│   ├── asyncWrapper.ts          # catchAsync wrapper for error handling
│   ├── email.ts                 # Nodemailer SMTP transporter
│   ├── hash.ts                  # hashPassword, checkPassword, hashToken utilities
│   └── token.ts                 # createAccessToken, createRefreshToken
├── middlewares/
│   ├── logger.middleware.ts     # Morgan rotating logger with token redaction
│   ├── requireAuth.ts           # JWT verification middleware
│   └── requireRole.ts           # RBAC middleware (role-based access control)
├── models/
│   └── user.model.ts            # Mongoose user schema with 2FA & OAuth fields
├── routes/
│   ├── auth.routes.ts           # Core auth routes
│   ├── oauth.routes.ts          # Google OAuth routes
│   ├── twoFactor.routes.ts      # 2FA setup & verification routes
│   ├── user.routes.ts           # User profile routes
│   ├── admin.routes.ts          # Admin management routes
│   └── index.routes.ts          # Root router
├── schemas/
│   └── auth.schema.ts           # Zod validation schemas for auth endpoints
├── types/
│   └── express.d.ts             # Express Request type augmentation (req.user)
├── app.ts                       # Express app setup & middleware
├── server.ts                    # Server entry point
└── .env                         # Environment variables (git-ignored)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- A [Mailtrap](https://mailtrap.io) account for development email testing
- Google OAuth 2.0 credentials (for social login)

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

Create a `.env` file in the root directory and fill in your values:

```env
# App
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000/api/v1

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secrets — use long, random strings (generate with: openssl rand -hex 32)
JWT_ACCESS_SECRET=your_long_random_access_secret_here
JWT_REFRESH_SECRET=your_long_random_refresh_secret_here
JWT_VERIFY_SECRET=your_long_random_verify_secret_here

# Email — Mailtrap (for development)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_password
EMAIL_FROM=noreply@ts-auth-api.dev

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> **Note:** For production, replace Mailtrap credentials with a real SMTP provider like Gmail, Resend, or SendGrid.

### 4. Run in development

```bash
npm run dev
```

The server will start at `http://localhost:5000` with hot-reload enabled via `ts-node-dev`.

### 5. Build for production

```bash
npm run build
npm start
```

---

## 📋 Available Routes

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Routes — `/auth`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `POST` | `/sign-up` | Register a new user | ❌ |
| `GET` | `/verify-email` | Verify email address | ❌ |
| `POST` | `/sign-in` | Login with email or username | ❌ |
| `POST` | `/refresh` | Get a new access token via cookie | ❌ |
| `POST` | `/logout` | Logout and invalidate refresh token | ❌ |
| `POST` | `/forgot-password` | Request a password reset email | ❌ |
| `POST` | `/reset-password` | Reset password with token | ❌ |
| `GET` | `/google` | Initiate Google OAuth flow | ❌ |
| `GET` | `/google/callback` | Google OAuth callback handler | ❌ |
| `POST` | `/set-password` | Set password for OAuth users | ✅ User |
| `POST` | `/2fa/setup` | Generate TOTP secret & QR code | ✅ User |
| `POST` | `/2fa/verify-setup` | Enable 2FA with TOTP code | ✅ User |
| `POST` | `/2fa/verify-login` | Verify TOTP code during login | ❌ |

### User Routes — `/user`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/` | Get current authenticated user | ✅ User |

### Admin Routes — `/admin`

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/users` | Fetch all users (`?includeAdmin=true` for all) | ✅ Admin only |

---

## 🛡️ Security Architecture

### Password Security
- Passwords hashed with `bcryptjs` (salt rounds: 12) — never stored in plain text
- Password validation enforces strong requirements: 8-20 characters with uppercase, lowercase, number, and special character (!@#$%_-)

### Token Security
- **Access tokens** — short-lived (15 minutes), sent in response headers
- **Refresh tokens** — long-lived (7 days), stored in HttpOnly cookies (immune to XSS)
- **Refresh token rotation** — each refresh generates a new token, invalidating the old one
- **Reuse detection** — any attempt to reuse an old refresh token automatically revokes all user sessions
- **Token hashing** — reset tokens and refresh tokens hashed before storage (only raw token in emails)

### Session Management
- **`tokenVersion`** field on every user — instantly invalidates all tokens on password reset or suspicious activity
- **`crypto.timingSafeEqual`** for token comparison — prevents timing-based attacks
- **HttpOnly + Secure + SameSite** cookies — protects refresh tokens from XSS and CSRF

### Logging Security
- Morgan logger configured with rotating file streams
- Automatic redaction of `?token=` from all log files — no secrets in logs

### Email Verification
- New accounts require email verification before login access
- Verification tokens expire after a set time window
- Unverified users blocked at login

---

## 🔄 Authentication Flows

### Standard Email/Password Login
```
User Registration
  ↓
Email Verification (required before login)
  ↓
Sign In with email/username + password
  ↓
JWT Access Token + Refresh Token (in HttpOnly cookie)
  ↓
Access Token expires → Use Refresh Token
  ↓
New Access Token + New Refresh Token (secure rotation)
```

### Two-Factor Authentication (TOTP)
```
User enables 2FA via /2fa/setup
  ↓
System generates TOTP secret + QR code
  ↓
User scans QR with Google Authenticator or Authy
  ↓
User verifies setup code via /2fa/verify-setup
  ↓
System generates backup codes (for recovery)
  ↓
On future logins: after email/password, verify TOTP code
  ↓
Full authentication successful
```

### Google OAuth 2.0
```
User clicks "Login with Google"
  ↓
Redirected to /auth/google (Passport initiates OAuth flow)
  ↓
User logs in at Google
  ↓
Google redirects to /auth/google/callback
  ↓
Server creates/updates user account (auto-verified email)
  ↓
JWT tokens returned (same as email/password flow)
  ↓
OAuth users can optionally set password later via /set-password
```

---

## ✅ Input Validation

All authentication endpoints validate input using Zod schemas with detailed error feedback.

**Sign Up & Set Password:**
- Email: valid format, automatically lowercased
- Username: 2-16 characters, alphanumeric + underscores only
- Password: 8-20 characters, must contain uppercase, lowercase, number, and special character (!@#$%_-)

**Sign In:**
- Identifier: email or username
- Password: validated against the same strong requirements

Validation errors return `400 Bad Request` with field-level error messages describing what's wrong.

---

## 🗺️ Roadmap

- [x] JWT access + refresh token flow with secure rotation
- [x] Refresh token reuse detection with session revocation
- [x] Email verification (required before login)
- [x] Forgot & reset password (time-expiring tokens)
- [x] RBAC middleware (user vs admin roles)
- [x] User profile endpoint
- [x] Admin users management API
- [x] Google OAuth 2.0 integration
- [x] Two-factor authentication (TOTP + backup codes)
- [x] Set password for OAuth users
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

This repo is a **work in progress** — actively developed and continuously improved. APIs, folder structure, and naming conventions may evolve as the codebase matures.

**Watch / Star ⭐ the repo to follow the journey.**

---

## 📄 License

MIT — do whatever you want with it, just don't blame me if your production auth breaks. 😄