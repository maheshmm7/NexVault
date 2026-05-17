import sys
import time
import logging
from sqlalchemy import create_engine, text
from app.core.config import settings

# Setup clean, structured logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("db_healthcheck")

def run_healthcheck() -> bool:
    """
    Performs a pre-flight connection test to the configured database.
    Verifies network reachability, authentication handshake, and basic query execution.
    """
    db_url = settings.DATABASE_URL
    # Redact credentials in log output for security hardening
    if "@" in db_url:
        parts = db_url.split("@")
        redacted_url = f"{db_url.split('://')[0]}://****:****@{parts[-1]}"
    else:
        redacted_url = db_url

    logger.info(f"Initiating pre-flight database connection handshake...")
    logger.info(f"Target Connection: {redacted_url}")

    start_time = time.time()
    try:
        # SQLite check_same_thread safe logic and PostgreSQL connection parameters
        connect_args = {}
        if db_url.startswith("sqlite"):
            connect_args = {"check_same_thread": False}
        else:
            connect_args = {"connect_timeout": 10}

        engine = create_engine(db_url, connect_args=connect_args)
        
        # Open connection and execute a safe ping
        with engine.connect() as conn:
            latency = (time.time() - start_time) * 1000
            
            # Execute ping query
            result = conn.execute(text("SELECT 1")).scalar()
            if result != 1:
                raise ValueError("Database returned invalid scalar result for validation query.")

            logger.info("✓ Database connection test passed successfully!")
            logger.info(f"✓ Latency/Handshake duration: {latency:.2f}ms")

            # Fetch extra server info if not SQLite
            try:
                if not db_url.startswith("sqlite"):
                    db_version = conn.execute(text("SELECT version()")).scalar()
                    logger.info(f"✓ Database server version info: {db_version}")
            except Exception:
                pass # Fail silently for database version info fetches
            
            return True

    except Exception as e:
        latency = (time.time() - start_time) * 1000
        logger.error("✗ DATABASE CONNECTION FAILED!")
        logger.error(f"✗ Failed handshake attempt duration: {latency:.2f}ms")
        logger.error(f"✗ Exception details: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_healthcheck()
    sys.exit(0 if success else 1)
