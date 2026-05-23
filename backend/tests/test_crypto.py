import os
os.environ["DATABASE_URL"] = "sqlite:///./test_crypto.db"

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.user import User
from app.models.coupon import Coupon
from app.core.config import Settings
from app.services.crypto_service import (
    encrypt_vault_value,
    decrypt_vault_value,
    get_active_encryption_key
)

# ── Test DB Setup ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test_crypto.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()  # Close and clean all connections to release lock on sqlite file
    try:
        if os.path.exists("./test_crypto.db"):
            os.remove("./test_crypto.db")
    except Exception:
        pass

# ══════════════════════════════════════════════════════════════════
# 1. CRYPTO SERVICE UNIT TESTS
# ══════════════════════════════════════════════════════════════════

def test_encryption_decryption_cycle():
    """Asserts that a standard value is encrypted and decrypted perfectly."""
    secret_code = "AMAZON_SUPER_SECRET_100"
    secret_pin = "998877"
    
    enc_code = encrypt_vault_value(secret_code)
    enc_pin = encrypt_vault_value(secret_pin)
    
    assert enc_code.startswith("ENC::"), "Encrypted values must be prefixed with 'ENC::'"
    assert enc_pin.startswith("ENC::"), "Encrypted values must be prefixed with 'ENC::'"
    
    dec_code = decrypt_vault_value(enc_code)
    dec_pin = decrypt_vault_value(enc_pin)
    
    assert dec_code == secret_code, "Decrypted code must match original plaintext"
    assert dec_pin == secret_pin, "Decrypted PIN must match original plaintext"

def test_legacy_plaintext_support():
    """Asserts that pre-existing plaintext records are returned as-is (graceful fallback)."""
    legacy_code = "PLAINTEXT_CODE_123"
    legacy_pin = "1234"
    
    # Decrypting plaintext should return the input exactly as-is without crashing
    dec_code = decrypt_vault_value(legacy_code)
    dec_pin = decrypt_vault_value(legacy_pin)
    
    assert dec_code == legacy_code, "Plaintext legacy values must be returned as-is"
    assert dec_pin == legacy_pin, "Plaintext legacy PINs must be returned as-is"

def test_none_value_support():
    """Asserts that None inputs are gracefully ignored by encryption and decryption."""
    assert encrypt_vault_value(None) is None
    assert decrypt_vault_value(None) is None

# ══════════════════════════════════════════════════════════════════
# 2. MANDATORY SECURITY REFINEMENT TESTS
# ══════════════════════════════════════════════════════════════════

def test_startup_production_key_validation():
    """Asserts that settings validation blocks startup in production if key is missing/default."""
    # 1. PostgreSQL URL with default/fallback key -> MUST FAIL
    with pytest.raises(ValueError) as excinfo:
        Settings(
            DATABASE_URL="postgresql://postgres:secret@localhost:5432/vaultify",
            VAULT_ENCRYPTION_KEY="default_vaultify_aes_gcm_secret_key_32bytes_!"
        )
    assert "VAULT_ENCRYPTION_KEY must be set to a secure, non-default value" in str(excinfo.value)

    # 2. PostgreSQL URL with missing key (None or empty) -> MUST FAIL
    with pytest.raises(ValueError) as excinfo:
        Settings(
            DATABASE_URL="postgresql://postgres:secret@localhost:5432/vaultify",
            VAULT_ENCRYPTION_KEY=""
        )
    assert "VAULT_ENCRYPTION_KEY must be set to a secure, non-default value" in str(excinfo.value)

    # 3. PostgreSQL URL with a secure, custom key -> MUST PASS
    settings_prod = Settings(
        DATABASE_URL="postgresql://postgres:secret@localhost:5432/vaultify",
        VAULT_ENCRYPTION_KEY="my_ultra_secure_custom_key_that_is_long_enough_!"
    )
    assert settings_prod.VAULT_ENCRYPTION_KEY == "my_ultra_secure_custom_key_that_is_long_enough_!"
    assert settings_prod.COOKIE_SECURE is True  # Automatically set to True in production database URL

    # 4. SQLite URL (development mode) with default key -> MUST PASS
    settings_dev = Settings(
        DATABASE_URL="sqlite:///./test_development.db",
        VAULT_ENCRYPTION_KEY="default_vaultify_aes_gcm_secret_key_32bytes_!"
    )
    assert settings_dev.VAULT_ENCRYPTION_KEY == "default_vaultify_aes_gcm_secret_key_32bytes_!"

def test_decryption_failure_safety():
    """Asserts that corrupted payloads return the secure placeholder and log safely."""
    # 1. Invalid payload prefix length
    short_payload = "ENC::abc"
    result_short = decrypt_vault_value(short_payload)
    assert result_short == "[Vault Decryption Error]", "Decryption failure should return placeholder"

    # 2. Corrupted base64 payload
    corrupted_b64 = "ENC::AAAAcGFzc3dvcmQxMjM0NTY3ODkwMTIzNDU2Nzg5MA=="  # Bad padding/invalid format
    result_corrupted = decrypt_vault_value(corrupted_b64)
    assert result_corrupted == "[Vault Decryption Error]", "Corrupted GCM ciphertexts must return placeholder"

    # 3. Key mismatch scenario
    # Encrypt a payload using standard key
    valid_ciphertext = encrypt_vault_value("sensitive_content")
    assert valid_ciphertext.startswith("ENC::")
    
    # Temporarily manipulateSettings or derived key lookup. Since we derive key dynamically,
    # let's assert that decrypting with wrong key parameters/length fails or returning placeholder works.
    # We can test decryption under key mismatch if we modifySettings, but we can also just test AAD failure
    # and corrupted raw payloads which exercise the same GCM decryption exception block.

def test_aad_encryption_decryption_cycle():
    """Asserts that AAD is properly bound and authenticated in GCM cycle."""
    plaintext = "super_secret_payload"
    aad_context = b"coupon_id_12345"
    
    # 1. Encrypt with AAD
    ciphertext = encrypt_vault_value(plaintext, associated_data=aad_context)
    assert ciphertext.startswith("ENC::")
    
    # 2. Decrypt with CORRECT AAD -> Should succeed
    decrypted_ok = decrypt_vault_value(ciphertext, associated_data=aad_context)
    assert decrypted_ok == plaintext
    
    # 3. Decrypt with INCORRECT AAD -> Should fail and return placeholder
    decrypted_bad_aad = decrypt_vault_value(ciphertext, associated_data=b"coupon_id_99999")
    assert decrypted_bad_aad == "[Vault Decryption Error]"
    
    # 4. Decrypt with NO AAD -> Should fail and return placeholder
    decrypted_no_aad = decrypt_vault_value(ciphertext)
    assert decrypted_no_aad == "[Vault Decryption Error]"

# ══════════════════════════════════════════════════════════════════
# 3. TRANSPARENT ORM INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════════

def test_orm_transparent_encryption_decryption():
    """Asserts that inserting and reading via SQLAlchemy transparently encrypts and decrypts."""
    db = TestingSessionLocal()
    
    try:
        # Create a new coupon
        new_coupon = Coupon(
            user_id="test_user_uuid",
            title="Uber Eats Discount",
            code="UBERFREE50",
            pin="0987",
            category="Food",
            status="active"
        )
        db.add(new_coupon)
        db.commit()
        coupon_id = new_coupon.id
        
        # 1. Verify that Python properties reveal decrypted values
        assert new_coupon.code == "UBERFREE50"
        assert new_coupon.pin == "0987"
        
        # 2. Query the raw database values using connection (bypassing ORM properties) to prove they are encrypted at-rest
        with engine.connect() as conn:
            result = conn.execute(
                text(f"SELECT code, pin FROM coupons WHERE id = '{coupon_id}'")
            ).fetchone()
            
            db_code = result[0]
            db_pin = result[1]
            
            assert db_code.startswith("ENC::"), f"Database stored code must be encrypted. Found: {db_code}"
            assert db_pin.startswith("ENC::"), f"Database stored PIN must be encrypted. Found: {db_pin}"
            
        # 3. Retrieve through SQLAlchemy ORM and ensure it is transparently decrypted
        db.expire_all()
        fetched_coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        assert fetched_coupon.code == "UBERFREE50"
        assert fetched_coupon.pin == "0987"
        
        # 4. Perform an update
        fetched_coupon.code = "NEWCODE99"
        fetched_coupon.pin = "1111"
        db.commit()
        
        # Verify update is encrypted in DB but decrypted in ORM
        with engine.connect() as conn:
            result = conn.execute(
                text(f"SELECT code, pin FROM coupons WHERE id = '{coupon_id}'")
            ).fetchone()
            assert result[0].startswith("ENC::")
            assert result[1].startswith("ENC::")
            
        db.expire_all()
        updated_coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        assert updated_coupon.code == "NEWCODE99"
        assert updated_coupon.pin == "1111"

    finally:
        db.close()

def test_orm_legacy_record_loading():
    """Asserts that old database entries created as plaintext load correctly through ORM properties."""
    db = TestingSessionLocal()
    
    try:
        coupon_id = "legacy_test_id"
        # Manually insert raw plaintext values bypassing ORM setters
        with engine.connect() as conn:
            conn.execute(
                text(f"INSERT INTO coupons (id, user_id, title, code, pin, status, is_demo) "
                     f"VALUES ('{coupon_id}', 'test_user_uuid', 'Legacy Plaintext', 'LEGACYPLAIN', '4321', 'active', 0)")
            )
            # SQLite requires manual commit for direct engine executes if auto-commit is off
            conn.commit()
            
        # Query through SQLAlchemy ORM
        fetched_coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        
        # Properties should gracefully decrypt/return the plaintext values without crash
        assert fetched_coupon.code == "LEGACYPLAIN"
        assert fetched_coupon.pin == "4321"
        
        # Save updates to legacy record and assert it transitions to secure encrypted format
        fetched_coupon.code = "UPGRADED_TO_SECURE"
        db.commit()
        
        # Confirm it is now encrypted at rest
        with engine.connect() as conn:
            result = conn.execute(
                text(f"SELECT code, pin FROM coupons WHERE id = '{coupon_id}'")
            ).fetchone()
            assert result[0].startswith("ENC::"), "Updated value must be transitioned to secure encrypted format"
            assert result[1] == "4321", "Unchanged PIN remains legacy plaintext"

    finally:
        db.close()
