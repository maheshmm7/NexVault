# NEXVAULT — Frontend Auth Alignment & Production Validation

The backend production infrastructure is confirmed fully operational:

- Railway deployment stable
- Neon PostgreSQL connected
- Alembic migrations applied
- User persistence verified
- bcrypt password hashing working
- HTTPOnly cookie auth enabled
- Production database writes successful

The remaining issue is frontend/backend auth integration alignment.

This implementation must ONLY stabilize production auth integration WITHOUT breaking:
- UI
- animations
- landing page
- responsive layouts
- dashboard rendering
- auth architecture

---

# VERIFIED BACKEND CONTRACTS

## Signup Endpoint

POST:
```txt
/api/v1/users/signup
```

Expected JSON payload:

```json
{
  "email": "",
  "full_name": "",
  "display_name": "",
  "avatar_url": "",
  "password": ""
}
```

---

## Login Endpoint

POST:
```txt
/api/v1/auth/login
```

Content-Type:
```txt
application/x-www-form-urlencoded
```

Required fields:
```txt
username
password
```

---

## Current Problems

### 1. Signup frontend payload mismatch
Frontend is still sending outdated field structure.

### 2. Login frontend payload mismatch
OAuth2PasswordRequestForm formatting not aligned.

### 3. Generic error handling
Frontend displays:
- "Not Found"
- vague auth errors

instead of backend response messages.

### 4. Production validation incomplete
Need end-to-end auth persistence validation.

---

# REQUIRED IMPLEMENTATION

---

# 1. FIX SIGNUP PAYLOAD

Locate signup API submission logic.

Replace ALL legacy payload structures.

Correct payload MUST be:

```js
{
  email,
  full_name: fullName,
  display_name: fullName,
  avatar_url: null,
  password
}
```

DO NOT send:
- name
- username
- confirmPassword
- legacy auth fields

Confirm request hits:

```txt
/api/v1/users/signup
```

---

# 2. FIX LOGIN PAYLOAD

Login must use:

```txt
application/x-www-form-urlencoded
```

Implementation:

```js
const formData = new URLSearchParams();

formData.append("username", email);
formData.append("password", password);
```

Correct endpoint:

```txt
/api/v1/auth/login
```

DO NOT send JSON body.

---

# 3. VERIFY AXIOS CONFIGURATION

Ensure centralized Axios instance:

```js
withCredentials: true
```

remains enabled globally.

DO NOT:
- manually inject JWT
- read token from localStorage
- store auth token anywhere browser-accessible

HTTPOnly cookie architecture must remain untouched.

---

# 4. IMPROVE ERROR HANDLING

Replace generic frontend auth error rendering.

Priority extraction:

```js
error.response?.data?.detail
```

fallback:
```js
error.response?.data?.message
```

final fallback:
```js
"Something went wrong"
```

Expected frontend messages:
- "Incorrect email or password"
- "Email already registered"
- validation messages

NOT:
- "Not Found"
- raw 404
- generic server errors

---

# 5. VERIFY AUTH PERSISTENCE FLOW

After successful login:

Immediately hydrate session using:

```txt
GET /api/v1/users/me
```

Frontend auth context must:
- restore session automatically
- survive refresh
- remain cookie-driven only

---

# 6. REMOVE ALL HARDCODED LOCALHOST REFERENCES

Search entire frontend codebase for:
- localhost
- 127.0.0.1
- hardcoded Railway URLs

ALL API requests must use:

```env
VITE_API_URL
```

through centralized env config only.

---

# 7. PRODUCTION CORS HARDENING

Backend currently must NOT use:

```python
allow_origins=["*"]
```

Replace with explicit Vercel domain whitelist.

Required structure:

```python
allow_origins=[
    "https://YOUR-VERCEL-DOMAIN.vercel.app"
]
```

Preserve:
```python
allow_credentials=True
```

---

# 8. HEALTHCHECK ENDPOINT

Ensure:

```txt
GET /health
```

returns:

```json
{
  "status": "ok",
  "service": "nexvault-api"
}
```

without requiring authentication.

---

# 9. FRONTEND POST-LOGIN FLOW

After login:
- redirect cleanly
- no flicker
- no auth race conditions
- no dashboard blank states
- no infinite loaders

Preserve current animations and transitions.

---

# 10. VALIDATE COOKIE FLOW

Browser expectations after login:
- HTTPOnly access_token cookie exists
- localStorage contains NO auth tokens
- session survives hard refresh

---

# 11. FUTURE STORAGE OPTIMIZATION PREP

DO NOT implement yet.

But isolate avatar handling layer for future migration from:
- base64 DB storage

to:
- Cloudinary
- S3
- Supabase Storage

Keep current behavior functional.

---

# REQUIRED FINAL RESULT

Production system must support:

## Signup
- successful user creation
- proper validation errors

## Login
- successful authentication
- cookie session creation

## Persistence
- refresh-safe auth
- dashboard survives reload

## Security
- zero JWT storage exposure
- HTTPOnly-only sessions

## Stability
- no console auth errors
- no CORS issues
- no broken routes

DO NOT redesign UI.
DO NOT modify landing page styling.
DO NOT alter animations.
ONLY stabilize production auth architecture and integration.