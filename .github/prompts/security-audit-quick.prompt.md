---
description: "Run a quick security audit with standardized scope and output."
name: "Security Audit Quick"
argument-hint: "Optional: narrow scope, choose depth (quick/standard/deep), set report-only if needed."
agent: "System Security Auditor"
---
Run a security audit for this repository with the following defaults:
- Scope: API auth/session, file upload/media, payment/webhooks, secret exposure, and frontend XSS/CSRF/CSP
- Depth: quick (5-10 minutes)
- Output: prioritized findings with evidence, quick wins, and validation steps
- Behavior: if High/Critical issues are found, include minimal patch proposals

If I provide extra constraints in this prompt input, apply them and state the final scope before starting.