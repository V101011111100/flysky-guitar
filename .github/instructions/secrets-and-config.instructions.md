---
description: "Use when editing environment files, config files, auth/session settings, storage keys, or payment credentials. Prevent secret leakage and enforce secure configuration defaults."
name: "Secrets And Config Hygiene"
applyTo: ["**/.env*", "**/*config*.{js,mjs,cjs,ts,json}", "src/lib/supabase.ts", "src/lib/session-manager.ts", "src/lib/storage.ts", "src/lib/r2.ts"]
---
# Secrets And Config Hygiene

Apply these rules whenever touching environment or security-sensitive configuration.

- Never hardcode secrets, API keys, tokens, private keys, or webhook secrets.
- Keep all sensitive values in environment variables with clear names.
- Do not expose server-only secrets to client-side bundles.
- Rotate and revoke leaked secrets immediately if exposure is suspected.
- Prefer fail-closed behavior when required security env vars are missing.
- Validate config at startup and stop boot when critical values are invalid.
- Avoid unsafe defaults for production (debug, broad CORS, weak cookie settings).
- Separate dev and production settings explicitly.
- Do not commit real secrets in sample files; use placeholders in .env.example.
- Redact sensitive values from logs, errors, and telemetry.

Quick self-check before finishing:
- "Could any secret in this change be abused if repository is public?"
- "Could this config accidentally disable auth, signature checks, or HTTPS-only cookies?"
- "Did I add or update .env.example keys without real values?"