from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

# --- Employer/User Model ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(unique=True, index=True)
    role: str = Field(default="employer")
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Worker/Help Model ---
class Worker(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    phone: str = Field(unique=True) # Masked in API responses, actual stored here
    category: str = Field(index=True) # e.g., "cook", "maid", "driver"
    city: str = Field(index=True)     # Tier 2 focused e.g., "Lucknow"
    expected_salary: int
    is_verified: bool = Field(default=False)
    bio_video_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Monetization: Transaction/Unlock Model ---
class Unlock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    worker_id: int = Field(foreign_key="worker.id")
    payment_id: str # From Razorpay
    amount: int = Field(default=99)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Monetization: Background Verification ---
class BGVRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id") # Person who requested/paid for the check
    worker_id: int = Field(foreign_key="worker.id")
    status: str = Field(default="pending") # pending, completed, failed
    report_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
