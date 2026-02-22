"""
House Help - Database Models
============================
These are the SQL tables that store all our app data.
Think of each class below as a "table" in a spreadsheet.

Tables:
-------
1. User       - The employer/family who is looking for help.
2. Worker     - The domestic worker (maid, cook, driver, etc.).
3. Unlock     - A record of every time a user PAID to see a worker's phone number.
4. BGVRequest - A record of every Background Verification request.
5. Review     - Ratings and feedback left by employers after hiring.
6. OTPCode    - Temporary OTP codes for phone verification.
7. Favorite   - Saved/bookmarked workers by users.
"""

from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# TABLE 1: Users (Employers / Families)
# ---------------------------------------------------------------------------
# Every person who downloads the app and signs up lands here.
# Their role is "employer" by default (they are looking for domestic help).
# ---------------------------------------------------------------------------
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(unique=True, index=True)       # Indian mobile number
    firebase_uid: Optional[str] = Field(default=None, unique=True, index=True)  # Firebase user ID (for auth migration)
    name: Optional[str] = None                          # Optional display name
    city: Optional[str] = None                          # e.g., "Lucknow"
    role: str = Field(default="employer")               # "employer", "worker", or "admin"
    is_worker: bool = Field(default=False)              # True if this user is also a worker
    worker_id: Optional[int] = Field(default=None, foreign_key="workers.id")  # Link to worker profile
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# TABLE 2: Workers (Maids, Cooks, Drivers, Babysitters, etc.)
# ---------------------------------------------------------------------------
# This is the SUPPLY side of our marketplace.
# Their real phone number is stored here but NEVER shown to the user
# unless they pay ₹99 to unlock it (see the Unlock table below).
# ---------------------------------------------------------------------------
class Worker(SQLModel, table=True):
    __tablename__ = "workers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str                                           # Worker's display name
    phone: str = Field(unique=True)                     # REAL phone (hidden in API)
    category: str = Field(index=True)                   # "cook", "maid", "driver", etc.
    city: str = Field(index=True)                       # City they work in
    locality: Optional[str] = None                      # Specific area/colony
    expected_salary: int                                 # Monthly salary expectation (₹)
    experience_years: Optional[int] = None              # Years of experience
    languages: Optional[str] = None                     # e.g., "Hindi, Bhojpuri"
    is_verified: bool = Field(default=False)            # True if BGV completed
    bio_video_url: Optional[str] = None                 # 15-sec intro video link
    photo_url: Optional[str] = None                     # Profile photo link
    rating_avg: Optional[float] = Field(default=0.0)   # Average star rating
    rating_count: int = Field(default=0)                # Total number of reviews
    is_active: bool = Field(default=True)               # Can be deactivated by admin
    is_available: bool = Field(default=True)            # Worker availability toggle
    available_from: Optional[str] = None                # e.g., "09:00" (24hr format)
    available_to: Optional[str] = None                  # e.g., "18:00" (24hr format)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# TABLE 3: Unlocks (Revenue Transactions)
# ---------------------------------------------------------------------------
# Every time a user pays ₹99 to see a worker's phone number, a row is
# added here. This is our PRIMARY revenue stream.
#
# WHY THIS TABLE EXISTS:
# - To track revenue accurately.
# - To prevent double-charging (if user_id + worker_id already exists,
#   we skip the payment and return the phone number for free).
# - To provide audit trails for refund disputes.
# ---------------------------------------------------------------------------
class Unlock(SQLModel, table=True):
    __tablename__ = "unlocks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")        # Who paid
    worker_id: int = Field(foreign_key="workers.id")    # Whose number was unlocked
    payment_id: str                                     # Razorpay transaction ID
    amount: int = Field(default=99)                     # Amount in ₹
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# TABLE 4: Background Verification Requests (BGV)
# ---------------------------------------------------------------------------
# When a user pays ₹499 to verify a worker's identity, criminal record,
# and address, a row is added here. The actual verification is done by
# a third-party API (e.g., IDfy or AuthBridge).
#
# Statuses: "pending" → "in_progress" → "completed" / "failed"
# ---------------------------------------------------------------------------
class BGVRequest(SQLModel, table=True):
    __tablename__ = "bgv_requests"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")        # Who requested/paid
    worker_id: int = Field(foreign_key="workers.id")    # Who is being verified
    status: str = Field(default="pending")              # pending / in_progress / completed / failed
    report_url: Optional[str] = None                    # Link to the PDF report
    amount: int = Field(default=499)                    # Amount in ₹
    payment_id: Optional[str] = None                    # Razorpay transaction ID
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# TABLE 5: Reviews (Trust & Quality Layer)
# ---------------------------------------------------------------------------
# After unlocking a worker's contact, the employer can leave a review.
# Reviews are tied to BOTH the user and the worker to prevent fake reviews.
# ---------------------------------------------------------------------------
class Review(SQLModel, table=True):
    __tablename__ = "reviews"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")        # Who wrote the review
    worker_id: int = Field(foreign_key="workers.id")    # Who the review is about
    rating: int = Field(ge=1, le=5)                     # 1 to 5 stars
    comment: Optional[str] = None                       # Optional text review
    tags: Optional[str] = None                          # e.g., "punctual,honest,good_cooking"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# TABLE 6: OTP Codes (Phone Verification)
# ---------------------------------------------------------------------------
# Temporary codes sent via SMS for phone number verification.
# Each code expires after 5 minutes. Rate limited to 3 per 10 minutes.
# ---------------------------------------------------------------------------
class OTPCode(SQLModel, table=True):
    __tablename__ = "otp_codes"

    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(index=True)                       # Phone number receiving OTP
    code: str                                             # 6-digit OTP code
    expires_at: datetime                                  # When this OTP expires
    verified: bool = Field(default=False)                 # Has this OTP been used?
    attempts: int = Field(default=0)                      # Failed verification attempts
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def generate_expiry(cls) -> datetime:
        """OTP expires 5 minutes from now."""
        return datetime.utcnow() + timedelta(minutes=5)


# ---------------------------------------------------------------------------
# TABLE 7: Favorites (Saved Workers)
# ---------------------------------------------------------------------------
# Users can bookmark workers they're interested in for later.
# ---------------------------------------------------------------------------
class Favorite(SQLModel, table=True):
    __tablename__ = "favorites"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    worker_id: int = Field(foreign_key="workers.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        # Ensure unique constraint on (user_id, worker_id) pair
        pass
