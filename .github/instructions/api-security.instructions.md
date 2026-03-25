---
description: "Use when creating or modifying API endpoints, auth/session logic, upload handlers, payment/webhook handlers, or admin routes. Enforces baseline security checks and safe defaults."
name: "API Security Baseline"
applyTo: "src/pages/api/**/*.ts"
---
# API Security Baseline

Use this checklist whenever editing API handlers.

- Validate and sanitize all external input at the boundary.
- Enforce authentication and role checks before sensitive operations.
- Return generic error messages to clients; avoid leaking internals.
- Avoid trusting client-supplied identifiers for authorization decisions.
- Rate-limit auth, search, and mutation-heavy endpoints.
- Add CSRF protection for cookie-authenticated state-changing actions.
- Verify webhook signatures and reject unsigned or stale requests.
- Restrict upload content type, file size, and destination path.
- Never log secrets, tokens, raw card data, or full PII payloads.
- Use parameterized queries and avoid dynamic SQL string concatenation.
- Set secure cookie flags where relevant: HttpOnly, Secure, SameSite.
- Add explicit allowlist for CORS origins and methods.
- Keep security headers in place (at minimum CSP/X-Content-Type-Options/Referrer-Policy).

Before finishing, quickly self-check:
- "Can this endpoint be called without auth when it should not be?"
- "Could a user access another user's data by changing IDs?"
- "Could malformed input trigger injection, SSRF, or path traversal?"