"""
Sends transactional email (sign-in codes) over SMTP. Works with any SMTP service:
the company mail server, Amazon SES, SendGrid, Brevo, Zoho, Gmail/Workspace, ...

EMAIL_BACKEND=console (local development only) prints the email to the server log instead.
"""
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from backend.config import (
    EMAIL_BACKEND, EMAIL_FROM, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_SECURITY, SMTP_USERNAME,
)


class EmailNotConfigured(Exception):
    """SMTP settings are missing, so email can't be sent."""


class EmailSendError(Exception):
    """The SMTP server rejected the message or couldn't be reached."""


def is_configured() -> bool:
    return EMAIL_BACKEND == "console" or bool(SMTP_HOST and EMAIL_FROM)


def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> None:
    if EMAIL_BACKEND == "console":
        print(f"[Email:console] To: {to}\nSubject: {subject}\n\n{text}\n")
        return
    if not is_configured():
        raise EmailNotConfigured("SMTP_HOST and EMAIL_FROM must be set to send email")

    msg = EmailMessage()
    msg["From"] = EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        context = ssl.create_default_context()
        if SMTP_SECURITY == "ssl":
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15, context=context)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
        with server:
            if SMTP_SECURITY == "starttls":
                server.starttls(context=context)
            if SMTP_USERNAME:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
    except (smtplib.SMTPException, OSError) as e:
        raise EmailSendError(str(e)) from e
