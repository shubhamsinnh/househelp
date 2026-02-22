"""
Firebase Authentication Service
================================
Handles Firebase Admin SDK initialization and token verification.

This service bridges Firebase Phone Auth with our backend:
1. Firebase handles OTP delivery and verification on the client
2. Client receives Firebase ID token after successful OTP
3. Client sends ID token to our backend
4. We verify the token here and extract user info (phone, UID)
5. Backend creates/links user account and issues JWT tokens

WHY FIREBASE?
- FREE for 10,000 verifications/month
- Better SMS delivery than MSG91/Twilio in Tier 2 cities
- No rate limiting headaches
- Auto-SMS reading on Android (better UX)
"""

import os
import firebase_admin
from firebase_admin import credentials, auth
from typing import Optional, Dict

# Global flag to track if Firebase is initialized (singleton pattern)
_firebase_initialized = False


def initialize_firebase():
    """
    Initialize Firebase Admin SDK once when the server starts.

    This must be called before any Firebase operations.
    Uses service account JSON file for authentication.
    """
    global _firebase_initialized

    if _firebase_initialized:
        return

    # Path to service account key (download from Firebase Console)
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")

    if not os.path.exists(cred_path):
        print("\n" + "="*70)
        print("⚠️  WARNING: Firebase service account file not found!")
        print(f"   Looking for: {cred_path}")
        print("   Firebase authentication will NOT work.")
        print("   Download from: Firebase Console → Project Settings → Service Accounts")
        print("="*70 + "\n")
        return

    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        print("✅ Firebase Admin SDK initialized successfully.")
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize Firebase: {e}")


def verify_firebase_token(id_token: str) -> Optional[Dict]:
    """
    Verify a Firebase ID token from the client.

    This is the CRITICAL security function. We MUST verify tokens server-side
    because client-provided data can never be trusted.

    Args:
        id_token: The Firebase ID token received from React Native app

    Returns:
        Dict with user info if valid:
        {
            "uid": "firebase_user_id_abc123",
            "phone": "+919876543210",
            "firebase_claims": {...}  # Full decoded token
        }

        None if token is invalid/expired

    Security Notes:
        - This verifies the token signature (can't be faked)
        - Checks expiration (tokens expire after 1 hour)
        - Confirms the token was issued by OUR Firebase project
    """
    if not _firebase_initialized:
        print("⚠️  Firebase not initialized. Call initialize_firebase() first.")
        return None

    try:
        # Verify token with Firebase Admin SDK
        decoded_token = auth.verify_id_token(id_token)

        # Extract relevant user info
        return {
            "uid": decoded_token.get("uid"),           # Firebase user ID
            "phone": decoded_token.get("phone_number"), # Phone with country code (+91...)
            "firebase_claims": decoded_token           # Full token payload
        }

    except auth.InvalidIdTokenError:
        print("❌ Invalid Firebase token (malformed or tampered)")
        return None

    except auth.ExpiredIdTokenError:
        print("❌ Firebase token expired (tokens last 1 hour)")
        return None

    except auth.RevokedIdTokenError:
        print("❌ Firebase token has been revoked")
        return None

    except Exception as e:
        print(f"❌ Firebase token verification failed: {e}")
        return None


def create_custom_token(uid: str) -> Optional[str]:
    """
    Create a custom Firebase token for a user.

    This is useful for:
    - Migrating users from old auth to Firebase
    - Admin impersonation (support tool)
    - Testing

    Args:
        uid: Firebase user ID

    Returns:
        Custom token string that can be used to sign in via Firebase SDK
    """
    if not _firebase_initialized:
        return None

    try:
        token = auth.create_custom_token(uid)
        return token.decode('utf-8')
    except Exception as e:
        print(f"❌ Failed to create custom token: {e}")
        return None
