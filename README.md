# NEXVAULT — Next-Generation Financial Intelligence

NEXVAULT is a cinematic, premium fintech SaaS application that empowers users with next-generation financial intelligence, transactional bookkeeping, credit utilization analysis, smart discount/coupon monitoring, and encrypted card storage.

---

## 🏛️ Ecosystem Architecture

NEXVAULT operates as a decoupled client-server architecture:

1.  **Frontend SPA (`/frontend`)**: Developed with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **Framer Motion v12** for smooth, hardware-accelerated animations and high-fidelity dark glassmorphic styling. Host on **Vercel** with full client-side routing rewrites.
2.  **API Services (`/backend`)**: Developed with **FastAPI**, **Uvicorn**, **SQLAlchemy**, and **Pydantic Settings** to provide asynchronous, high-concurrency endpoints secured via JWT (HS256) auth. Host on **Railway** connected to a **Neon PostgreSQL** database.

---

## ⚙️ Environment Variables Specification

NEXVAULT separates developer parameters and production secrets cleanly. Never commit `.env` files to Git.

### 🎨 1. Frontend Environment (`/frontend/.env`)
Set these variables inside your Vercel deployment settings:

| Parameter | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | String | `http://localhost:8000/api/v1` | The absolute gateway endpoint pointing to your Railway backend (e.g. `https://api.nexvault.com/api/v1`). |

### 🛡️ 2. Backend Environment (`/backend/.env`)
Set these sensitive secrets inside your Railway dashboard:

| Parameter | Type | Default Value / Action | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String | `postgresql://neondb_owner:...` | Neon PostgreSQL cloud connection string. |
| `SECRET_KEY` | String | *Generate 64-char Hex* | Cryptographic signing key for JWT tokens. **Strictly enforced in production.** |
| `VAULT_ENCRYPTION_KEY` | String | *Generate 32-byte Hex* | AES-256-GCM symmetric key to encrypt/decrypt sensitive coupons at rest. **Strictly enforced in production.** |
| `BREVO_API_KEY` | String | *Your Brevo SMTP key* | Brevo SMTP transactional API key to trigger transactional notifications. |
| `SMTP_FROM_EMAIL` | String | `no-reply@nexvault.com` | Transactional sender address. |
| `FRONTEND_URL` | String | `https://nexvault.vercel.app` | Absolute URL of your hosted React client. |
| `BACKEND_CORS_ORIGINS` | CSV | `https://nexvault.vercel.app` | Comma-separated list containing your exact Vercel client origin. |
| `COOKIE_SECURE` | Boolean | `True` | Enforce HTTPS-only cookie transmission. Automatically forced to `True` when PostgreSQL is active. |
| `COOKIE_SAMESITE` | String | `"lax"` | CSRF protection cookie setting. |

---

## 🚀 Local Development Setup

### Prerequisite Checklist
*   **Python**: Version 3.10+
*   **Node.js**: Version 18+ (npm v9+)

### Step 1: Run the Backend Services
1.  Navigate into the backend directory:
    ```bash
    cd backend
    ```
2.  Set up your virtual environment and activate it:
    ```bash
    python -m venv venv
    # Windows PowerShell
    .\venv\Scripts\Activate.ps1
    # macOS / Linux
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure local environment keys by copying the template:
    ```bash
    cp .env.example .env
    ```
5.  Start the FastAPI Uvicorn server:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    The backend is now running at `http://localhost:8000`. You can inspect the interactive Swagger docs at `http://localhost:8000/docs`.

### Step 2: Run the Frontend Client
1.  Navigate into the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure local environment by copying the template:
    ```bash
    cp .env.example .env
    ```
4.  Start the Vite developer server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to run NEXVAULT.

---

## 🛡️ Production Hardening & Deployment Flow

NEXVAULT implements advanced production-safe gates and structured build environments to ensure high-fidelity fintech grade stability:

### 1. Database Schema Auto-Initialization (Railway + Neon)
To bypass manual database setups, [railway.json](file:///f:/Vaultify/backend/railway.json) leverages `RAILPACK V3` and executes Alembic migrations prior to web worker initialization:
```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers
```
Your Neon database tables, credit pools, and ledger schemas will dynamically bootstrap and update upon every code push to Railway.

### 2. Strict Security Boot Gates (`config.py`)
To prevent severe credentials leakage or token forgery, the backend server implements active checks inside `Settings.__init__`:
*   If your `DATABASE_URL` is configured for **PostgreSQL** (production mode), the system will **refuse to boot** and raise a `ValueError` if:
    *   `SECRET_KEY` equals `"supersecretkey_change_in_production"`.
    *   `VAULT_ENCRYPTION_KEY` matches `"default_vaultify_aes_gcm_secret_key_32bytes_!"`.
*   Additionally, standard session cookies are dynamically forced to `COOKIE_SECURE = True` to mandate SSL-only transmission.

### 3. Git Index & Exposure Exclusion Hardening
The repository contains robust exclusions defined inside `.gitignore` and `.railwayignore` to ensure local databases, developer test configs, and logs are never uploaded to Vercel/Railway or committed to Github. 

If local databases are already tracked in Git, run the following command to strip them from tracking before pushing:
```bash
git rm --cached backend/test.db backend/vaultify.db
```

### 4. Client Routing Stability (Vercel)
To protect React SPA page refreshes (`/docs`, `/help`, `/status`, `/trust`) from returning Vercel `404 Not Found` errors, the [vercel.json](file:///f:/Vaultify/frontend/vercel.json) rewrite rule preserves frontend routing under all conditions:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
