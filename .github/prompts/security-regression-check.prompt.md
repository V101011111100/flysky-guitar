---
description: "Run a pre-release security regression check and compare against a previous baseline."
name: "Security Regression Check"
argument-hint: "Provide release scope and optional baseline notes from previous audit."
agent: "System Security Auditor"
---
Run a security regression check for this repository before release.

Checklist and defaults:
- Focus on changes that can reintroduce known issues in auth/session, upload/media, payment/webhooks, secrets/config, and frontend XSS/CSRF/CSP
- Depth: standard unless I explicitly request quick or deep
- Highlight: newly introduced High/Critical findings first
- Compare: if baseline notes are provided in my prompt input, classify findings as New, Existing, or Resolved
- Output: findings with evidence, risk, and minimal patch proposals for High/Critical

At the end, provide a clear go/no-go recommendation for release and list blockers.