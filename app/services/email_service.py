"""Minimal transactional email service using Resend."""
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Send billing notification emails to customers and admins."""

    BASE_URL = "https://api.resend.com/emails"

    def __init__(self) -> None:
        self.api_key = settings.resend_api_key
        self.sender = settings.billing_sender_email or "billing@automifyyai.com"
        self.admin_email = settings.billing_admin_email

    async def send_email(self, to_email: str, subject: str, html: str, text: Optional[str] = None) -> bool:
        """Send one email via Resend API."""
        if not self.api_key:
            logger.warning("RESEND_API_KEY is not configured; skipping email send.")
            return False
        if not to_email:
            return False

        payload = {
            "from": self.sender,
            "to": [to_email],
            "subject": subject,
            "html": html,
            "text": text or "",
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(self.BASE_URL, json=payload, headers=headers)
                response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_billing_event_emails(
        self,
        *,
        event_name: str,
        customer_email: Optional[str],
        business_name: str,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        details: Optional[str] = None,
    ) -> None:
        """Send paired customer/admin emails for billing events."""
        amount_text = ""
        if amount is not None and currency:
            amount_text = f"{amount:.2f} {currency}"
        elif amount is not None:
            amount_text = f"{amount:.2f}"

        customer_subject = f"Automify Billing Update: {event_name}"
        customer_body = (
            f"<p>Hello,</p>"
            f"<p>This is an update about your Automify billing event: <strong>{event_name}</strong>.</p>"
            f"<p><strong>Business:</strong> {business_name}</p>"
            f"{f'<p><strong>Amount:</strong> {amount_text}</p>' if amount_text else ''}"
            f"{f'<p><strong>Details:</strong> {details}</p>' if details else ''}"
            f"<p>If you need help, reply to this email.</p>"
        )

        admin_subject = f"[Billing] {event_name} - {business_name}"
        admin_body = (
            f"<p>Billing event received.</p>"
            f"<p><strong>Event:</strong> {event_name}</p>"
            f"<p><strong>Business:</strong> {business_name}</p>"
            f"<p><strong>Customer Email:</strong> {customer_email or 'N/A'}</p>"
            f"{f'<p><strong>Amount:</strong> {amount_text}</p>' if amount_text else ''}"
            f"{f'<p><strong>Details:</strong> {details}</p>' if details else ''}"
        )

        if customer_email:
            await self.send_email(customer_email, customer_subject, customer_body)

        if self.admin_email:
            await self.send_email(self.admin_email, admin_subject, admin_body)
