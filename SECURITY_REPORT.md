# Security Audit & Implementation Report
## Online Complaint Registration Portal

This document outlines the security architecture and specific mitigations implemented to align with the **OWASP Top 10** and industry best practices for DevSecOps.

---

### 1. Authentication & Session Management (OWASP A07:2021)
- **HTTP-Only Signed Cookies**: Moved from `localStorage` tokens to server-side managed cookies. 
    - `HttpOnly` flag prevents XSS-based token theft.
    - `Signed` cookies (using `SESSION_SECRET`) prevent client-side tampering.
    - `SameSite: Lax` provides naturally robust protection against CSRF.
- **One-Time Password (OTP)**: Registration requires a 6-digit code sent via email, ensuring email ownership before account creation.
- **Secure Password Policy**: Enforced 12–128 characters with requirements for uppercase, lowercase, numbers, and special characters.
- **Bcrypt Hashing**: Passwords are hashed with 12 rounds of salt, making brute-force or rainbow table attacks computationally expensive.
- **Session Revocation**: A dedicated `/api/auth/logout` endpoint clears the cookie and revokes the session server-side.

### 2. Injection Mitigations (OWASP A03:2021)
- **Parameterized Queries**: All database interactions use tagged templates or parameterized arrays via the Neon serverless driver. This completely eliminates SQL Injection (SQLi) risks.
- **NoSQL Injection**: `express-mongo-sanitize` is used to strip out prohibited operators (like `$`) from request bodies.
- **Data Validation & Sanitization**: 
    - `express-validator` is used for strict schema enforcement.
    - `.escape()` is applied to all string inputs to prevent stored Cross-Site Scripting (XSS).
- **HTTP Parameter Pollution (HPP)**: Protected against HPP attacks using the `hpp` middleware.

### 3. Application Hardening (OWASP A05:2021)
- **Helmet.js Integration**: Sets 11 security-related HTTP headers, including:
    - `X-Frame-Options: SAMEORIGIN` (Clickjacking protection).
    - `X-Content-Type-Options: nosniff` (MIME sniffing protection).
    - `Referrer-Policy`.
- **Content Security Policy (CSP)**: A strict CSP is defined to restrict where scripts and styles can be loaded from, significantly reducing the surface area for XSS.
- **CORS Allowlist**: Access is restricted to the specific `CLIENT_URL` with `credentials: true` enabled for secure session handling.
- **Information Disclosure**: `x-powered-by` headers are disabled to prevent tech stack fingerprinting.

### 4. Rate Limiting & Denial of Service (OWASP A04:2021)
- **Global Rate Limiter**: Caps requests per IP (100 per 15 mins) to prevent automated scraping or DoS.
- **OTP Rate Limiting**: Specifically limits email requests (5 per 15 mins) to prevent mail server abuse and cost spikes.
- **Submission Limits**: Login and registration attempts are strictly throttled to slow down brute-force attacks.
- **Payload Limits**: JSON bodies are capped (48kb for auth, 3mb for complaints with attachments) to prevent memory exhaustion attacks.

### 5. Data Protection
- **Attachment Security**: Files are validated for specific MIME types (`PDF`, `JPG`, `PNG`) and size (max 2MB) before being converted to Base64 and stored.
- **Environment Isolation**: Sensitive keys (SMTP credentials, Database URLs, Session Secrets) are managed via `.env` files and never committed to version control.

---
> [!IMPORTANT]
> **Production Recommendation**: Ensure `NODE_ENV` is set to `production` in your hosting environment. This will automatically enable the `Secure` flag on cookies, ensuring they are only transmitted over HTTPS.
