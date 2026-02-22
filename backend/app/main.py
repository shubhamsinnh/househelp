"""
House Help - Main API Application
===================================
This is the entry point for the entire backend.

HOW TO RUN:
    uvicorn app.main:app --reload

WHAT THIS FILE DOES:
    1. Connects to the PostgreSQL (or SQLite) database.
    2. Creates all tables on first run.
    3. Exposes API endpoints that the mobile app calls.

API ENDPOINTS SUMMARY:
    GET  /                     → Health check (is the server alive?)
    POST /api/workers/         → Register a new worker profile
    GET  /api/workers/         → Search workers by city & category (phone is MASKED)
    GET  /api/workers/{id}     → Get a single worker's profile (phone is MASKED)
    POST /api/unlocks/         → Pay ₹99 to unlock a worker's real phone number
    POST /api/reviews/         → Leave a rating for a worker after hiring
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status
from sqlmodel import Session, select, SQLModel, create_engine, func
from typing import List, Optional
from pydantic import BaseModel, Field
import os

from app.models.database import User, Worker, Unlock, BGVRequest, Review

# ---------------------------------------------------------------------------
# DATABASE CONNECTION
# ---------------------------------------------------------------------------
# HOW IT WORKS:
#   - In development, we use SQLite (a simple file-based database).
#     No PostgreSQL installation needed. The file "househelp.db" is created
#     automatically in the backend/ folder.
#   - In production (AWS), we just change this one line to point to a
#     real PostgreSQL URL. NOTHING else in the code changes.
#
# To switch to Postgres, set the DATABASE_URL environment variable:
#   export DATABASE_URL="postgresql://user:password@host:5432/househelp"
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./househelp.db")

# SQLite needs "check_same_thread=False" to work with FastAPI.
# PostgreSQL does not need this, so we only add it for SQLite.
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def get_session():
    """
    Creates a database session for each API request.
    Think of a "session" as opening and closing a connection to the database.
    FastAPI automatically opens one when a request arrives and closes it when done.
    """
    with Session(engine) as session:
        yield session


# ---------------------------------------------------------------------------
# APP STARTUP (Modern "lifespan" pattern, replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs ONCE when the server starts.
    # It creates all tables defined in database.py if they don't exist.
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created / verified.")
    yield
    # This runs ONCE when the server shuts down (cleanup if needed).
    print("🛑 Server shutting down.")


app = FastAPI(
    title="House Help - Domestic Help Discovery API",
    description="A lean discovery marketplace connecting Indian families with domestic workers.",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# REQUEST / RESPONSE SCHEMAS (Pydantic DTOs)
# ---------------------------------------------------------------------------
# These define WHAT data the mobile app sends to us, and WHAT we send back.
# They are NOT database tables — they are "data transfer objects" (DTOs).
# ---------------------------------------------------------------------------

class WorkerCreateRequest(BaseModel):
    """What the worker app sends when creating a new profile."""
    name: str
    phone: str
    category: str               # "cook", "maid", "driver", "babysitter", "elderly_care"
    city: str                   # "Lucknow", "Indore", "Jaipur", etc.
    locality: Optional[str] = None
    expected_salary: int        # Monthly salary expectation in ₹
    experience_years: Optional[int] = None
    languages: Optional[str] = None
    bio_video_url: Optional[str] = None
    photo_url: Optional[str] = None


class WorkerPublicResponse(BaseModel):
    """What the customer app sees when browsing workers. Phone is ALWAYS masked."""
    id: int
    name: str
    category: str
    city: str
    locality: Optional[str]
    expected_salary: int
    experience_years: Optional[int]
    languages: Optional[str]
    is_verified: bool
    bio_video_url: Optional[str]
    photo_url: Optional[str]
    rating_avg: Optional[float]
    rating_count: int
    phone: str = "🔒 Locked — Pay ₹99 to Unlock"   # ALWAYS masked in list view


class UnlockRequest(BaseModel):
    """What the mobile app sends after Razorpay payment succeeds."""
    user_id: int                # In production, this comes from the auth token (JWT)
    worker_id: int
    payment_id: str             # The Razorpay payment_id string


class ReviewCreateRequest(BaseModel):
    """What the employer sends when leaving a review."""
    user_id: int
    worker_id: int
    rating: int = Field(ge=1, le=5)    # Must be between 1 and 5
    comment: Optional[str] = None
    tags: Optional[str] = None          # e.g., "punctual,honest"


# ---------------------------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/")
def health_check():
    """
    WHAT: A simple 'ping' to check if the server is running.
    WHO CALLS THIS: DevOps monitoring tools, or a developer testing manually.
    """
    return {
        "status": "ok",
        "app": "House Help",
        "message": "Domestic Help Discovery API is running."
    }


@app.post("/api/workers/", response_model=WorkerPublicResponse, status_code=status.HTTP_201_CREATED)
def create_worker(worker: WorkerCreateRequest, session: Session = Depends(get_session)):
    """
    WHAT: Registers a new worker (maid/cook/driver) in our database.
    WHO CALLS THIS: The Worker App (during profile creation).
    WHY WE MASK THE PHONE: Even when creating a worker, we never return
        the real phone number in the API response. This prevents any
        accidental data leaks.
    """
    # Check if this phone number is already registered
    existing = session.exec(select(Worker).where(Worker.phone == worker.phone)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A worker with this phone number is already registered."
        )

    db_worker = Worker.model_validate(worker)
    session.add(db_worker)
    session.commit()
    session.refresh(db_worker)

    # Return the profile with the phone MASKED
    response_data = db_worker.model_dump()
    response_data["phone"] = "🔒 Locked — Pay ₹99 to Unlock"
    return WorkerPublicResponse(**response_data)


@app.get("/api/workers/", response_model=List[WorkerPublicResponse])
def search_workers(
    city: str = Query(..., description="City to search in, e.g. 'Lucknow'"),
    category: Optional[str] = Query(None, description="Filter by type: cook, maid, driver, etc."),
    max_salary: Optional[int] = Query(None, description="Maximum monthly salary in ₹"),
    verified_only: bool = Query(False, description="Show only BGV-verified workers"),
    session: Session = Depends(get_session),
):
    """
    WHAT: Search for domestic workers by city, category, salary, etc.
    WHO CALLS THIS: The Customer App (the main discovery screen).
    IMPORTANT: Phone numbers are ALWAYS masked in search results.
        Users must pay ₹99 via the /api/unlocks/ endpoint to see the real number.
    """
    query = select(Worker).where(Worker.city == city, Worker.is_active == True)

    if category:
        query = query.where(Worker.category == category)
    if max_salary:
        query = query.where(Worker.expected_salary <= max_salary)
    if verified_only:
        query = query.where(Worker.is_verified == True)

    query = query.order_by(Worker.rating_avg.desc())
    workers = session.exec(query).all()

    results = []
    for w in workers:
        data = w.model_dump()
        data["phone"] = "🔒 Locked — Pay ₹99 to Unlock"
        results.append(WorkerPublicResponse(**data))

    return results


@app.get("/api/workers/{worker_id}", response_model=WorkerPublicResponse)
def get_worker_profile(worker_id: int, session: Session = Depends(get_session)):
    """
    WHAT: Get a single worker's full profile page.
    WHO CALLS THIS: The Customer App (when user taps on a worker card).
    PHONE IS STILL MASKED here. User must unlock separately.
    """
    worker = session.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")

    data = worker.model_dump()
    data["phone"] = "🔒 Locked — Pay ₹99 to Unlock"
    return WorkerPublicResponse(**data)


@app.post("/api/unlocks/")
def unlock_contact(request: UnlockRequest, session: Session = Depends(get_session)):
    """
    WHAT: The CORE revenue endpoint. User pays ₹99, we reveal the worker's real phone number.
    WHO CALLS THIS: The Customer App, AFTER Razorpay payment is confirmed on the client side.

    LOGIC:
        1. Check if user already unlocked this worker (prevent double-charging).
        2. Verify the Razorpay payment signature (mocked for now).
        3. Record the transaction in the 'unlocks' table.
        4. Return the REAL, unmasked phone number.

    SECURITY NOTE:
        In production, user_id will come from the authenticated JWT token,
        NOT from the request body. This prevents users from faking another user's ID.
    """
    # STEP 1: Check for duplicate unlock (don't charge twice)
    existing_unlock = session.exec(
        select(Unlock).where(
            Unlock.user_id == request.user_id,
            Unlock.worker_id == request.worker_id,
        )
    ).first()

    if existing_unlock:
        # User already paid for this worker — return the number for free
        worker = session.get(Worker, request.worker_id)
        return {
            "status": "already_unlocked",
            "message": "You have already unlocked this contact.",
            "worker_name": worker.name if worker else "Unknown",
            "real_phone_number": worker.phone if worker else "Unknown",
        }

    # STEP 2: Verify Razorpay payment (MOCKED — replace with real verification in production)
    # import razorpay
    # client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))
    # payment = client.payment.fetch(request.payment_id)
    # if payment["status"] != "captured":
    #     raise HTTPException(status_code=400, detail="Payment not captured.")

    # STEP 3: Record the transaction
    unlock_txn = Unlock(
        user_id=request.user_id,
        worker_id=request.worker_id,
        payment_id=request.payment_id,
    )
    session.add(unlock_txn)
    session.commit()

    # STEP 4: Fetch and return the real phone number
    worker = session.get(Worker, request.worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")

    return {
        "status": "success",
        "message": "Contact Unlocked Successfully!",
        "worker_name": worker.name,
        "real_phone_number": worker.phone,
        "disclaimer": "House Help is a discovery platform. Please verify the worker independently before hiring.",
    }


@app.post("/api/reviews/", status_code=status.HTTP_201_CREATED)
def create_review(review: ReviewCreateRequest, session: Session = Depends(get_session)):
    """
    WHAT: Allows an employer to leave a star rating + comment for a worker.
    WHO CALLS THIS: The Customer App, after the employer has contacted/hired the worker.

    BUSINESS RULE: Only users who have UNLOCKED a worker can review them.
        This prevents fake reviews from people who never interacted with the worker.
    """
    # Check that this user actually unlocked this worker
    unlock_exists = session.exec(
        select(Unlock).where(
            Unlock.user_id == review.user_id,
            Unlock.worker_id == review.worker_id,
        )
    ).first()

    if not unlock_exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review workers whose contact you have unlocked.",
        )

    # Check for duplicate review
    existing_review = session.exec(
        select(Review).where(
            Review.user_id == review.user_id,
            Review.worker_id == review.worker_id,
        )
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this worker.",
        )

    # Save the review
    db_review = Review.model_validate(review)
    session.add(db_review)
    session.commit()

    # Update the worker's average rating
    avg_result = session.exec(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.worker_id == review.worker_id
        )
    ).first()

    if avg_result:
        avg_rating, count = avg_result
        worker = session.get(Worker, review.worker_id)
        if worker:
            worker.rating_avg = round(float(avg_rating), 1)
            worker.rating_count = count
            session.add(worker)
            session.commit()

    return {"status": "success", "message": "Review submitted. Thank you!"}
