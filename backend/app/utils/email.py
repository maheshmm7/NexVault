import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("app.utils.email")

def send_smtp_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """
    Sends a transactional email using Brevo SMTP.
    Includes timeout protection, context manager safety, and safe error logging.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP configuration is incomplete. Skipping email delivery.")
        raise ValueError("SMTP configuration is incomplete.")

    # Create message container
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    msg['To'] = to_email

    # Plain text fallback body
    if not text_content:
        text_content = "Please view this email in an HTML-compatible client."
        
    msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_content, 'html', 'utf-8'))

    try:
        # Establish secure SSL connection with a 15-second timeout protection to prevent hanging
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg['From'], to_email, msg.as_string())
            
        logger.info(f"Successfully sent email to {to_email}")
        return True
    except Exception as e:
        # Logging hygiene: NEVER print settings.SMTP_PASSWORD or other credentials
        logger.error(f"SMTP transport failure occurred during email dispatch to {to_email}: {str(e)}")
        raise RuntimeError("SMTP transport failure occurred during email dispatch.")
