import base64
import os
import hashlib
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_active_encryption_key() -> bytes:
    """
    Derives and returns the active symmetric encryption key.
    
    This function is decoupled from module-level imports to cleanly support
    future key rotation or multi-key lookup strategies (e.g. mapping key versions).
    """
    # In the future, key source could be resolved from a rotation manager, 
    # dynamic environment variables, or a key management vault.
    key_source = settings.VAULT_ENCRYPTION_KEY
    if not key_source:
        # Prevent runtime issues if key is empty or not configured
        raise ValueError("Vault encryption key is not configured.")
    
    return hashlib.sha256(key_source.encode('utf-8')).digest()

def encrypt_vault_value(plaintext: str, associated_data: bytes = None) -> str:
    """
    Encrypts a plaintext string using AES-256-GCM.
    
    Generates a unique 12-byte initialization vector (nonce) for every value.
    Supports optional Authenticated Associated Data (AAD) for future contextual verification.
    Returns the output formatted as: 'ENC::[Base64(nonce + ciphertext)]'.
    """
    if plaintext is None:
        return None
    
    try:
        derived_key = get_active_encryption_key()
        aesgcm = AESGCM(derived_key)
        nonce = os.urandom(12)  # Recommended standard GCM nonce length is 95-96 bits (12 bytes)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), associated_data)
        
        # Combine nonce and encrypted content
        combined = nonce + ciphertext
        b64_encoded = base64.b64encode(combined).decode('utf-8')
        
        return f"ENC::{b64_encoded}"
    except Exception:
        # Zero-leak logging safety: logs contain no keys, nonces, plaintext, or ciphertexts.
        logger.error("Failed to encrypt secure vault value due to cryptographic exception.")
        raise

def decrypt_vault_value(ciphertext: str, associated_data: bytes = None) -> str:
    """
    Decrypts an AES-256-GCM encrypted string with 'ENC::' prefix.
    
    If the string lacks the 'ENC::' prefix, it is treated as a legacy plaintext
    value and returned exactly as-is. This guarantees 100% zero-downtime backward-compatibility.
    
    If decryption fails (e.g. ciphertext corruption, key mismatch), it returns the safe
    non-leaking placeholder string "[Vault Decryption Error]".
    """
    if ciphertext is None:
        return None
    
    if not ciphertext.startswith("ENC::"):
        # Zero-downtime fallback for pre-existing plaintext records
        return ciphertext
    
    try:
        # Extract base64 payload
        b64_payload = ciphertext[5:]
        combined = base64.b64decode(b64_payload.encode('utf-8'))
        
        if len(combined) < 12:
            logger.warning("Decryption failed: payload is shorter than the minimum nonce size.")
            return "[Vault Decryption Error]"
            
        nonce = combined[:12]
        raw_ciphertext = combined[12:]
        
        derived_key = get_active_encryption_key()
        aesgcm = AESGCM(derived_key)
        decrypted_bytes = aesgcm.decrypt(nonce, raw_ciphertext, associated_data)
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Zero-leak logging safety: logs contain no keys, nonces, plaintext, or ciphertexts.
        logger.error("Decryption failed due to ciphertext corruption, key mismatch, or incorrect AAD.")
        return "[Vault Decryption Error]"
