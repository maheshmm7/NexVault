import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.api import auth, users, categories, sources, transactions, coupons, analytics
from app.core.config import settings

# Configure production logging layout
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexvault")

logger.info("Initializing NEXVAULT Production API Gateway...")
logger.info(f"PROJECT: {settings.PROJECT_NAME}")
logger.info(f"API PREFIX: {settings.API_V1_STR}")

# Startup Environment Safety Audits
if not settings.DATABASE_URL:
    raise ValueError("FATAL STARTUP ERROR: DATABASE_URL environment variable is not configured.")

is_prod = "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL

# Mask database credentials in connection logs
db_url_masked = settings.DATABASE_URL
if "@" in db_url_masked:
    try:
        parts = db_url_masked.split("@")
        prefix = parts[0].split("//")[0]
        db_url_masked = f"{prefix}//****:****@{parts[1]}"
    except Exception:
        db_url_masked = "masked_postgresql_connection"
logger.info(f"DATABASE CONNECTION: {db_url_masked}")

if is_prod:
    logger.info("ENVIRONMENT MODE: PRODUCTION [Secure HTTPS Cookies Activated]")
    if settings.SECRET_KEY == "supersecretkey_change_in_production":
        raise ValueError(
            "SECURITY FATAL ERROR: Default SECRET_KEY cannot be used in a production environment. "
            "Please configure a strong, unique SECRET_KEY in your production environment variables."
        )
else:
    logger.info("ENVIRONMENT MODE: DEVELOPMENT [Local SQLite / Insecure HTTP Allowed]")

app = FastAPI(title=settings.PROJECT_NAME)

# Respect proxy forwarding (Railway runs behind Cloudflare/reverse proxy load balancers)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Unauthenticated, High-Performance Healthcheck Endpoint
@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": "nexvault-api"}

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(sources.router, prefix=f"{settings.API_V1_STR}/sources", tags=["sources"])
app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(coupons.router, prefix=f"{settings.API_V1_STR}/coupons", tags=["coupons"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])

@app.get("/")
def root():
    return {"message": "Welcome to Vaultify API"}
