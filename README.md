# NEXVAULT — Next-Generation Financial Intelligence

NEXVAULT is a cinematic, premium fintech SaaS application that empowers users with next-generation financial intelligence, transactional bookkeeping, credit utilization analysis, and smart discount/coupon monitoring.

---

## 🏛️ Ecosystem Architecture

NEXVAULT operates as a decoupled client-server architecture:

1.  **Frontend SPA (`/frontend`)**: Developed with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **Framer Motion v12** for smooth, hardware-accelerated animations and high-fidelity dark glassmorphic styling.
2.  **API Services (`/backend`)**: Developed with **FastAPI**, **Uvicorn**, **SQLAlchemy**, and **Pydantic Settings** to provide asynchronous, high-concurrency endpoints secured via JWT (HS256) auth.

---

## ⚙️ Environment Variables Specification

NEXVAULT separates developer parameters and production secrets cleanly using standard `.env` files.

### 🎨 1. Frontend Environment (`/frontend/.env`)
Create a `.env` file in the `/frontend` directory or duplicate `/frontend/.env.example`:

| Parameter | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | String | `http://localhost:8000/api/v1` | The root gateway URL of the hosted/local REST API. |

### 🛡️ 2. Backend Environment (`/backend/.env`)
Create a `.env` file in the `/backend` directory or duplicate `/backend/.env.example`:

| Parameter | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PROJECT_NAME` | String | `"NEXVAULT API"` | The name of the API gateway service. |
| `API_V1_STR` | String | `"/api/v1"` | The API version router prefix path. |
| `DATABASE_URL` | String | `"sqlite:///./vaultify.db"` | Relational database connection URL (PostgreSQL in production). |
| `SECRET_KEY` | String | `"supersecretkey_change_in_production"` | Symmetric HMAC-SHA256 signature key for JWT validation. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Integer | `10080` (7 days) | Token duration lifespan before forcing session re-auth. |
| `BACKEND_CORS_ORIGINS` | List/CSV | `"http://localhost:5173,http://localhost:3000"` | Allowed cross-origins permitted to execute API queries. |
| `COOKIE_SECURE` | Boolean | `False` | Enforce SSL-only Secure cookie transmission in production. |
| `COOKIE_SAMESITE` | String | `"lax"` | CSRF protection policy ('lax', 'strict', or 'none'). |

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
    The backend is now running at `http://localhost:8000`. You can inspect the interactive swagger documentation at `http://localhost:8000/docs`.

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
    Open your browser and navigate to the local address (typically `http://localhost:5173`) to experience NEXVAULT.

---

## 🛡️ Production Deployment Expectations

*   **Secret Separation**: Never commit `.env` files to git repositories. Ensure that cloud hosts (such as Vercel, Netlify, Render, or AWS ECS) inject variables directly into system environment variables.
*   **Database Migration**: In production, override `DATABASE_URL` with a high-availability **PostgreSQL** cluster to prevent SQLite database locks.
*   **JWT Security**: Always override the fallback `SECRET_KEY` with a securely generated 64-character hexadecimal key in your production environment settings.
