# NEXVAULT — Brevo SMTP Migration & Transactional Email Refactor

This implementation replaces the current Resend-based email delivery system with a Brevo SMTP transactional email architecture.

The migration must preserve ALL existing authentication, recovery, reset-password, and recovery-code systems while only replacing the email transport provider.

CRITICAL:
This implementation must be LOW-RISK and ADDITIVE.

DO NOT:
- redesign frontend auth pages
- alter JWT architecture
- modify recovery-code logic
- change reset-token generation
- modify protected routes
- alter Neon database schema unnecessarily
- weaken security
- auto-test
- auto-deploy
- auto-push

The user will manually test locally and in deployed environments.

---

# Migration Goals

1. Remove Resend dependency entirely.
2. Replace transactional email delivery with Brevo SMTP.
3. Preserve all password reset and account recovery flows.
4. Maintain Railway + Vercel compatibility.
5. Maintain localhost compatibility.
6. Preserve all current frontend UX and auth architecture.

---

# Existing Architecture Preservation

The following systems MUST remain untouched:

- JWT authentication persistence
- refresh hydration logic
- recovery-code system
- hashed token storage
- password reset token generation
- password validation system
- protected routes
- session persistence
- settings flows
- delete/reset/export systems
- frontend routes/pages

This migration must ONLY replace:
EMAIL DELIVERY TRANSPORT.

---

# Environment Variable Migration

## REMOVE

Legacy:
- RESEND_API_KEY

## USE

Brevo SMTP variables:

- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM_EMAIL

Assume these are already configured by the user in:
- backend/.env
- Railway Variables

Implementation must consume these variables safely.

---

# Backend Refactor Requirements

## Remove Resend Integration

Safely remove:
- resend package/sdk usage
- resend helper functions
- resend-specific environment references
- resend fallback logic

DO NOT break existing reset/recovery flows.

---

# Create SMTP Email Utility

## [NEW]
Create a reusable SMTP mail sender utility.

Suggested:
- app/utils/email.py
OR equivalent clean architecture location.

The utility should:
- establish SMTP connection securely
- support TLS
- support HTML email bodies
- support plain-text fallback
- safely close connections
- raise controlled/logged exceptions only

---

# SMTP Configuration

Use:
- SMTP host from environment
- SMTP port from environment
- SMTP login from environment
- SMTP password from environment

Must support:
- localhost
- Railway deployment

---

# Reset Password Email Refactor

Replace current Resend transactional sending logic with:
Brevo SMTP email delivery.

Preserve:
- reset token generation
- reset link structure
- expiration handling
- frontend reset page compatibility

---

# Email Content Preservation

Preserve existing:
- branding
- reset messaging
- reset link UX
- email structure

No aggressive redesign required.

---

# Error Handling Requirements

If SMTP sending fails:
- safely log errors
- avoid exposing secrets
- avoid crashing auth endpoints
- return controlled responses

DO NOT:
- print SMTP passwords
- expose credentials in logs
- expose stack traces publicly

---

# Security Requirements

Maintain:
- secure token generation
- expiry validation
- hashed recovery systems
- password reset protections

DO NOT:
- weaken authentication architecture
- bypass existing validations

---

# Frontend Preservation

NO frontend redesign required.

Preserve:
- Forgot Password page
- Recover Account page
- Reset Password page
- Recovery-code flows
- Toast systems
- Current UX

Only backend email transport changes are required.

---

# Local Development Compatibility

Implementation MUST support:
- localhost frontend
- localhost backend
- local SMTP email delivery testing

Assume:
FRONTEND_URL already exists in environment variables.

---

# Railway Deployment Compatibility

Implementation MUST remain fully compatible with:
- Railway environment variables
- Railway deployments
- Railway runtime networking

Avoid hardcoded localhost-only behavior.

---

# Manual Verification ONLY

DO NOT:
- auto-test
- auto-push
- auto-deploy

The user will manually verify:
- forgot password flow
- external Gmail delivery
- reset links
- deployed email delivery
- recovery architecture stability

---

# Expected Final Result

After implementation:

NEXVAULT should:
- send transactional emails using Brevo SMTP
- support real external email delivery
- preserve all existing authentication/recovery flows
- remain stable across localhost and production deployments
- avoid regressions in UI or auth logic