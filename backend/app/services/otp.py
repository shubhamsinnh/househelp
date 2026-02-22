"""
OTP Service
===========
Handles OTP generation, storage, verification, and rate limiting.

In production, this would integrate with SMS providers like:
- MSG91 (India-focused, good for Tier 2 cities)
- Twilio (global, reliable)
- TextLocal (India)

For development, we print the OTP to console and always allow verification.
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlmodel import Session, select
import os

from app.models.database import OTPCode


# Configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 3  # Max wrong attempts before OTP is invalidated
RATE_LIMIT_MINUTES = 10
RATE_LIMIT_COUNT = 3  # Max OTPs per phone in RATE_LIMIT_MINUTES

# Environment-based SMS provider config
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "console")  # "console", "msg91", "twilio"
MSG91_API_KEY = os.getenv("MSG91_API_KEY", "")
MSG91_SENDER_ID = os.getenv("MSG91_SENDER_ID", "HHELP")
MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID", "")


def generate_otp() -> str:
    """Generate a random 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=OTP_LENGTH))


def is_rate_limited(session: Session, phone: str) -> bool:
    """
    Check if this phone number has requested too many OTPs recently.
    Returns True if rate limited, False if OK to send.
    """
    cutoff_time = datetime.utcnow() - timedelta(minutes=RATE_LIMIT_MINUTES)

    recent_count = session.exec(
        select(OTPCode).where(
            OTPCode.phone == phone,
            OTPCode.created_at >= cutoff_time
        )
    ).all()

    return len(recent_count) >= RATE_LIMIT_COUNT


def send_otp(session: Session, phone: str) -> Tuple[bool, str]:
    """
    Generate and send an OTP to the given phone number.

    Returns:
        (success: bool, message: str)
    """
    # Normalize phone number (remove spaces, leading +91)
    phone = normalize_phone(phone)

    # Validate phone format
    if not is_valid_indian_phone(phone):
        return False, "Invalid phone number format. Please enter a 10-digit Indian mobile number."

    # Check rate limiting
    if is_rate_limited(session, phone):
        return False, f"Too many OTP requests. Please wait {RATE_LIMIT_MINUTES} minutes."

    # Generate OTP
    code = generate_otp()

    # Store in database
    otp_record = OTPCode(
        phone=phone,
        code=code,
        expires_at=OTPCode.generate_expiry()
    )
    session.add(otp_record)
    session.commit()

    # Send via SMS provider
    sent = _send_sms(phone, code)

    if sent:
        return True, "OTP sent successfully."
    else:
        return False, "Failed to send OTP. Please try again."


def verify_otp(session: Session, phone: str, code: str) -> Tuple[bool, str]:
    """
    Verify an OTP code for a phone number.

    Returns:
        (success: bool, message: str)
    """
    phone = normalize_phone(phone)

    # Find the most recent unexpired OTP for this phone
    now = datetime.utcnow()
    otp_record = session.exec(
        select(OTPCode).where(
            OTPCode.phone == phone,
            OTPCode.expires_at > now,
            OTPCode.verified == False
        ).order_by(OTPCode.created_at.desc())
    ).first()

    if not otp_record:
        return False, "OTP expired or not found. Please request a new one."

    # Check if too many failed attempts
    if otp_record.attempts >= MAX_OTP_ATTEMPTS:
        return False, "Too many failed attempts. Please request a new OTP."

    # Verify the code
    if otp_record.code != code:
        otp_record.attempts += 1
        session.add(otp_record)
        session.commit()
        remaining = MAX_OTP_ATTEMPTS - otp_record.attempts
        return False, f"Incorrect OTP. {remaining} attempts remaining."

    # Success! Mark as verified
    otp_record.verified = True
    session.add(otp_record)
    session.commit()

    return True, "OTP verified successfully."


def normalize_phone(phone: str) -> str:
    """
    Normalize phone number to 10 digits.
    Handles: +919876543210, 919876543210, 09876543210, 9876543210
    """
    # Remove all non-digits
    digits = ''.join(filter(str.isdigit, phone))

    # Remove leading 91 (country code) if present
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    return digits


def is_valid_indian_phone(phone: str) -> bool:
    """Check if phone is a valid 10-digit Indian mobile number."""
    if len(phone) != 10:
        return False
    if not phone.isdigit():
        return False
    # Indian mobile numbers start with 6, 7, 8, or 9
    if phone[0] not in "6789":
        return False
    return True


def _send_sms(phone: str, code: str) -> bool:
    """
    Internal function to send SMS via configured provider.
    """
    message = f"Your House Help verification code is: {code}. Valid for {OTP_EXPIRY_MINUTES} minutes. Do not share this code."

    if SMS_PROVIDER == "console":
        # Development mode - just print to console
        print(f"\n{'='*50}")
        print(f"[DEV MODE] OTP for {phone}: {code}")
        print(f"{'='*50}\n")
        return True

    elif SMS_PROVIDER == "msg91":
        return _send_msg91(phone, code)

    elif SMS_PROVIDER == "twilio":
        return _send_twilio(phone, message)

    else:
        print(f"[ERROR] Unknown SMS provider: {SMS_PROVIDER}")
        return False


def _send_msg91(phone: str, code: str) -> bool:
    """Send OTP via MSG91 (India-specific provider)."""
    try:
        import requests

        url = "https://api.msg91.com/api/v5/otp"
        headers = {
            "authkey": MSG91_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "template_id": MSG91_TEMPLATE_ID,
            "mobile": f"91{phone}",
            "otp": code
        }

        response = requests.post(url, json=payload, headers=headers)
        return response.status_code == 200

    except Exception as e:
        print(f"[MSG91 ERROR] {e}")
        return False


def _send_twilio(phone: str, message: str) -> bool:
    """Send SMS via Twilio."""
    try:
        from twilio.rest import Client

        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_PHONE_NUMBER")

        client = Client(account_sid, auth_token)

        client.messages.create(
            body=message,
            from_=from_number,
            to=f"+91{phone}"
        )
        return True

    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
        return False
