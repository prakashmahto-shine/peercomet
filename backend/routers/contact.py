import html
import random
import time
from pydantic import BaseModel, Field
from fastapi import APIRouter, Request
from backend.config import SUPPORT_EMAIL, BRAND_NAME
from backend.auth.email_sender import send_email

router = APIRouter(prefix="/api/contact", tags=["Contact"])

class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=120)
    category: str = Field("General Inquiry", max_length=100)
    message: str = Field(..., min_length=5, max_length=4000)

@router.post("")
async def submit_contact_form(payload: ContactRequest, request: Request):
    ticket_id = f"PC-{random.randint(100000, 999999)}"
    timestamp = time.strftime("%d %b %Y, %I:%M %p IST")
    client_ip = request.client.host if request.client else "Unknown"

    subject = f"[{BRAND_NAME} Support Ticket #{ticket_id}] {payload.category} - {payload.name}"

    clean_message = html.escape(payload.message).replace("\n", "<br/>")

    text_body = f"""New Support Request from {BRAND_NAME} Website:

Ticket ID: #{ticket_id}
Date/Time: {timestamp}
Sender Name: {payload.name}
Sender Email: {payload.email}
Category: {payload.category}
Client IP: {client_ip}

Message:
{payload.message}

---
You can reply directly to this email to respond to {payload.name} ({payload.email}).
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; }}
        .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #0C3B6E 0%, #1D4ED8 100%); color: #ffffff; padding: 20px 24px; }}
        .header h2 {{ margin: 0 0 6px 0; font-size: 20px; }}
        .header p {{ margin: 0; font-size: 13px; opacity: 0.9; }}
        .content {{ padding: 24px; }}
        .meta-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
        .meta-table td {{ padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }}
        .meta-table td.label {{ font-weight: 700; color: #64748b; width: 130px; }}
        .message-box {{ background: #f8fafc; border-left: 4px solid #1D4ED8; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #0f172a; white-space: pre-wrap; }}
        .footer {{ padding: 16px 24px; background: #f1f5f9; font-size: 12px; color: #64748b; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2>📩 New Support Request (#{ticket_id})</h2>
          <p>{BRAND_NAME} Contact Form Submission</p>
        </div>
        <div class="content">
          <table class="meta-table">
            <tr><td class="label">Ticket ID:</td><td><strong>#{ticket_id}</strong></td></tr>
            <tr><td class="label">Sender Name:</td><td>{html.escape(payload.name)}</td></tr>
            <tr><td class="label">Sender Email:</td><td><a href="mailto:{html.escape(payload.email)}">{html.escape(payload.email)}</a></td></tr>
            <tr><td class="label">Category:</td><td><span style="display:inline-block;padding:2px 8px;background:#eff6ff;color:#1e40af;font-weight:700;border-radius:999px;font-size:12px;">{html.escape(payload.category)}</span></td></tr>
            <tr><td class="label">Received At:</td><td>{timestamp}</td></tr>
          </table>
          <h4 style="margin: 0 0 8px 0; color: #334155;">Customer Message:</h4>
          <div class="message-box">{clean_message}</div>
        </div>
        <div class="footer">
          Hit <strong>Reply</strong> in your mail client to email {html.escape(payload.name)} directly.
        </div>
      </div>
    </body>
    </html>
    """

    try:
        send_email(
            to=SUPPORT_EMAIL,
            subject=subject,
            text=text_body,
            html=html_body,
            reply_to=payload.email
        )
        print(f"[Contact] Support ticket #{ticket_id} from {payload.email} sent to {SUPPORT_EMAIL}")
    except Exception as e:
        print(f"[Contact:Warning] Could not send email to {SUPPORT_EMAIL}: {e}")

    return {
        "success": True,
        "ticketId": ticket_id,
        "message": f"Your request has been received and forwarded to {SUPPORT_EMAIL}."
    }
