import requests
import logging
from app.core.config import settings

logger = logging.getLogger("app.utils.email")

def send_smtp_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """
    Sends a transactional email using the Brevo HTTP API.
    Includes timeout protection, secure key handling, and safe error logging.
    """
    if not settings.BREVO_API_KEY:
        logger.warning("Brevo API key configuration is missing. Skipping email delivery.")
        raise ValueError("Brevo API key is not configured.")

    sender_email = settings.SMTP_FROM_EMAIL or "onboarding@resend.dev"
    
    # Plain text fallback body
    if not text_content:
        text_content = "Please view this email in an HTML-compatible client."

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": settings.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "sender": {
            "name": "NEXVAULT",
            "email": sender_email
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content
    }

    try:
        # Secure HTTPS call with a 15-second timeout to prevent route hanging
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        # Check for success status codes
        if response.status_code in [200, 201, 202]:
            logger.info(f"Successfully sent transactional email to {to_email} via Brevo HTTP API.")
            return True
        else:
            logger.error(f"Brevo HTTP API returned status code {response.status_code} during mail delivery to {to_email}")
            raise RuntimeError(f"Brevo API error: {response.status_code}")
            
    except Exception as e:
        # Logging hygiene: NEVER print settings.BREVO_API_KEY or other credentials
        logger.error(f"HTTP delivery transport failure occurred during email dispatch to {to_email}: {str(e)}")
        raise RuntimeError("HTTP delivery transport failure occurred during email dispatch.")
