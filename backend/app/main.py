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
    GET  /                      → Health check (is the server alive?)

    AUTH ENDPOINTS:
    POST /api/auth/send-otp     → Send OTP to phone number
    POST /api/auth/verify-otp   → Verify OTP and get JWT tokens
    POST /api/auth/refresh      → Refresh access token
    GET  /api/auth/me           → Get current user profile

    WORKER ENDPOINTS:
    POST /api/workers/          → Register a new worker profile
    GET  /api/workers/          → Search workers by city & category (phone is MASKED)
    GET  /api/workers/{id}      → Get a single worker's profile (phone is MASKED)

    USER ENDPOINTS:
    POST /api/unlocks/          → Pay ₹99 to unlock a worker's real phone number
    POST /api/reviews/          → Leave a rating for a worker after hiring
    GET  /api/users/me/unlocks  → Get user's unlocked contacts
    GET  /api/users/me/favorites → Get user's saved workers
    POST /api/users/me/favorites/{worker_id} → Save a worker
    DELETE /api/users/me/favorites/{worker_id} → Remove saved worker
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel, create_engine, func
from typing import List, Optional
from pydantic import BaseModel, Field
import os

from app.models.database import User, Worker, Unlock, BGVRequest, Review, OTPCode, Favorite
from app.services.otp import send_otp, verify_otp, normalize_phone
from app.services.auth import create_tokens, refresh_access_token, get_user_from_token, TokenResponse
from app.services.firebase_auth import initialize_firebase, verify_firebase_token

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
    # Initialize Firebase Admin SDK
    initialize_firebase()

    # Create all tables defined in database.py if they don't exist.
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

# Enable CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
# AUTH SCHEMAS
# ---------------------------------------------------------------------------
class SendOTPRequest(BaseModel):
    """Request to send OTP to a phone number."""
    phone: str = Field(..., description="10-digit Indian mobile number")


class VerifyOTPRequest(BaseModel):
    """Request to verify OTP and get tokens."""
    phone: str = Field(..., description="10-digit Indian mobile number")
    code: str = Field(..., description="6-digit OTP code")


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class FirebaseSignInRequest(BaseModel):
    """Request to sign in with Firebase ID token."""
    id_token: str = Field(..., description="Firebase ID token from phone auth")


class UserProfileResponse(BaseModel):
    """User profile information."""
    id: int
    phone: str
    name: Optional[str]
    city: Optional[str]
    role: str
    is_worker: bool
    worker_id: Optional[int]


class UserUpdateRequest(BaseModel):
    """Update user profile."""
    name: Optional[str] = None
    city: Optional[str] = None


# ---------------------------------------------------------------------------
# WORKER DASHBOARD SCHEMAS
# ---------------------------------------------------------------------------
class WorkerProfileResponse(BaseModel):
    """Full worker profile for the worker themselves."""
    id: int
    name: str
    phone: str  # Real phone for the worker
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
    is_active: bool
    is_available: bool
    available_from: Optional[str]
    available_to: Optional[str]


class WorkerUpdateRequest(BaseModel):
    """Update worker profile fields."""
    name: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    expected_salary: Optional[int] = None
    experience_years: Optional[int] = None
    languages: Optional[str] = None
    bio_video_url: Optional[str] = None
    photo_url: Optional[str] = None


class WorkerAvailabilityRequest(BaseModel):
    """Toggle worker availability."""
    is_available: bool
    available_from: Optional[str] = None  # e.g., "09:00"
    available_to: Optional[str] = None    # e.g., "18:00"


class WorkerRegistrationRequest(BaseModel):
    """Register user as a worker."""
    name: str
    category: str
    city: str
    locality: Optional[str] = None
    expected_salary: int
    experience_years: Optional[int] = None
    languages: Optional[str] = None


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


# ---------------------------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# ---------------------------------------------------------------------------

@app.post("/api/auth/send-otp")
def api_send_otp(request: SendOTPRequest, session: Session = Depends(get_session)):
    """
    WHAT: Send a 6-digit OTP to the user's phone number.
    WHO CALLS THIS: Mobile app login/signup screen.

    FLOW:
        1. Validate phone number format
        2. Check rate limiting (max 3 OTPs per 10 minutes)
        3. Generate and store OTP
        4. Send via SMS (MSG91/Twilio in production, console in dev)

    NOTE: In development mode, OTP is printed to console.
    """
    success, message = send_otp(session, request.phone)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    return {
        "status": "success",
        "message": message,
        "phone": normalize_phone(request.phone)
    }


@app.post("/api/auth/verify-otp")
def api_verify_otp(request: VerifyOTPRequest, session: Session = Depends(get_session)):
    """
    WHAT: Verify OTP and issue JWT tokens.
    WHO CALLS THIS: Mobile app after user enters OTP.

    FLOW:
        1. Verify OTP is correct and not expired
        2. Create or fetch user account
        3. Generate access + refresh tokens
        4. Return tokens to client

    RETURNS:
        - access_token: Short-lived (15 min), used for API requests
        - refresh_token: Long-lived (7 days), used to get new access tokens
        - user: Basic user info
    """
    phone = normalize_phone(request.phone)
    success, message = verify_otp(session, phone, request.code)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message
        )

    # Get or create user
    from app.services.auth import get_or_create_user
    user, is_new = get_or_create_user(session, phone)

    # Generate tokens
    tokens = create_tokens(user)

    return {
        "status": "success",
        "message": "Login successful!" if not is_new else "Welcome to House Help!",
        "is_new_user": is_new,
        **tokens.model_dump()
    }


@app.post("/api/auth/refresh")
def api_refresh_token(request: RefreshTokenRequest, session: Session = Depends(get_session)):
    """
    WHAT: Get a new access token using a refresh token.
    WHO CALLS THIS: Mobile app when access token expires.

    This allows users to stay logged in for 7 days without re-entering OTP.
    """
    tokens = refresh_access_token(session, request.refresh_token)

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please log in again."
        )

    return {
        "status": "success",
        **tokens.model_dump()
    }


@app.post("/api/auth/firebase-signin")
def api_firebase_signin(request: FirebaseSignInRequest, session: Session = Depends(get_session)):
    """
    WHAT: Exchange Firebase ID token for House Help JWT tokens (NEW FIREBASE AUTH).
    WHO CALLS THIS: Mobile app after Firebase phone auth succeeds.

    FLOW:
        1. Verify Firebase ID token with Firebase Admin SDK
        2. Extract phone number from token
        3. Get or create user account
        4. Link firebase_uid to user account (for migration)
        5. Generate House Help JWT tokens
        6. Return tokens to client

    WHY FIREBASE?
        - FREE for 10,000 verifications/month (vs paid MSG91/Twilio)
        - Better SMS delivery rates
        - Auto-SMS reading on Android
        - No rate limiting headaches

    RETURNS:
        - access_token: Short-lived (15 min), used for API requests
        - refresh_token: Long-lived (7 days), used to get new access tokens
        - user: Basic user info
    """
    # Verify Firebase token
    firebase_data = verify_firebase_token(request.id_token)

    if not firebase_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token."
        )

    firebase_uid = firebase_data["uid"]
    phone = firebase_data["phone"]

    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not found in Firebase token."
        )

    # Normalize phone (remove +91 country code if present)
    phone = normalize_phone(phone)

    # Try to find user by Firebase UID first
    user = session.exec(
        select(User).where(User.firebase_uid == firebase_uid)
    ).first()

    is_new = False

    if user:
        # Existing Firebase user - already linked
        pass
    else:
        # Check if phone already exists (migrating from old OTP auth)
        user = session.exec(
            select(User).where(User.phone == phone)
        ).first()

        if user:
            # Link Firebase UID to existing account (migration)
            user.firebase_uid = firebase_uid
            session.add(user)
            session.commit()
            session.refresh(user)
        else:
            # Create new user with Firebase UID
            user = User(phone=phone, firebase_uid=firebase_uid)
            session.add(user)
            session.commit()
            session.refresh(user)
            is_new = True

    # Generate JWT tokens (reuse existing function)
    tokens = create_tokens(user)

    return {
        "status": "success",
        "message": "Login successful!" if not is_new else "Welcome to House Help!",
        "is_new_user": is_new,
        **tokens.model_dump()
    }


@app.get("/api/auth/me", response_model=UserProfileResponse)
def api_get_current_user(
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Get the current user's profile.
    WHO CALLS THIS: Mobile app to verify auth status and get user info.

    REQUIRES: Valid access token in Authorization header.
    """
    from app.services.auth import extract_token_from_header

    # For now, accept token via query param or header
    # In production, this should only use the header
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use 'Bearer <token>'."
        )

    user = get_user_from_token(session, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    return UserProfileResponse(
        id=user.id,
        phone=user.phone,
        name=user.name,
        city=user.city,
        role=user.role,
        is_worker=user.is_worker,
        worker_id=user.worker_id
    )


@app.put("/api/auth/me", response_model=UserProfileResponse)
def api_update_current_user(
    updates: UserUpdateRequest,
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Update the current user's profile.
    WHO CALLS THIS: Mobile app settings screen.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    # Update fields
    if updates.name is not None:
        user.name = updates.name
    if updates.city is not None:
        user.city = updates.city

    session.add(user)
    session.commit()
    session.refresh(user)

    return UserProfileResponse(
        id=user.id,
        phone=user.phone,
        name=user.name,
        city=user.city,
        role=user.role,
        is_worker=user.is_worker,
        worker_id=user.worker_id
    )


# ---------------------------------------------------------------------------
# WORKER ENDPOINTS
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# USER DASHBOARD ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/api/users/me/unlocks")
def get_my_unlocks(
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Get all workers the current user has unlocked.
    WHO CALLS THIS: User dashboard in mobile app.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    # Get all unlocks for this user
    unlocks = session.exec(
        select(Unlock).where(Unlock.user_id == user.id).order_by(Unlock.created_at.desc())
    ).all()

    results = []
    for unlock in unlocks:
        worker = session.get(Worker, unlock.worker_id)
        if worker:
            results.append({
                "unlock_id": unlock.id,
                "worker_id": worker.id,
                "worker_name": worker.name,
                "worker_category": worker.category,
                "worker_city": worker.city,
                "phone": worker.phone,  # Real phone since they unlocked
                "unlocked_at": unlock.created_at.isoformat(),
                "amount_paid": unlock.amount
            })

    return {
        "count": len(results),
        "unlocks": results
    }


@app.get("/api/users/me/favorites")
def get_my_favorites(
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Get all workers saved/favorited by the current user.
    WHO CALLS THIS: User favorites screen in mobile app.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    # Get all favorites for this user
    favorites = session.exec(
        select(Favorite).where(Favorite.user_id == user.id).order_by(Favorite.created_at.desc())
    ).all()

    results = []
    for fav in favorites:
        worker = session.get(Worker, fav.worker_id)
        if worker:
            data = worker.model_dump()
            data["phone"] = "🔒 Locked — Pay ₹99 to Unlock"
            data["favorited_at"] = fav.created_at.isoformat()
            results.append(data)

    return {
        "count": len(results),
        "favorites": results
    }


@app.post("/api/users/me/favorites/{worker_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    worker_id: int,
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Save a worker to favorites.
    WHO CALLS THIS: When user taps heart icon on worker card.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    # Check if worker exists
    worker = session.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")

    # Check if already favorited
    existing = session.exec(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.worker_id == worker_id
        )
    ).first()

    if existing:
        return {"status": "already_favorited", "message": "Worker is already in your favorites."}

    # Add favorite
    favorite = Favorite(user_id=user.id, worker_id=worker_id)
    session.add(favorite)
    session.commit()

    return {"status": "success", "message": f"{worker.name} added to favorites."}


@app.delete("/api/users/me/favorites/{worker_id}")
def remove_favorite(
    worker_id: int,
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Remove a worker from favorites.
    WHO CALLS THIS: When user untaps heart icon on worker card.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    # Find and delete favorite
    favorite = session.exec(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.worker_id == worker_id
        )
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found.")

    session.delete(favorite)
    session.commit()

    return {"status": "success", "message": "Removed from favorites."}


# ---------------------------------------------------------------------------
# WORKER DASHBOARD ENDPOINTS
# ---------------------------------------------------------------------------

@app.post("/api/auth/register-worker", status_code=status.HTTP_201_CREATED)
def register_as_worker(
    request: WorkerRegistrationRequest,
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Register the current user as a worker.
    WHO CALLS THIS: Mobile app when user wants to become a worker.

    This creates a worker profile linked to the user account.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    # Check if user already has a worker profile
    if user.is_worker and user.worker_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already registered as a worker."
        )

    # Check if phone number is already used by another worker
    existing = session.exec(select(Worker).where(Worker.phone == user.phone)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A worker profile with your phone number already exists."
        )

    # Create worker profile
    worker = Worker(
        name=request.name,
        phone=user.phone,
        category=request.category,
        city=request.city,
        locality=request.locality,
        expected_salary=request.expected_salary,
        experience_years=request.experience_years,
        languages=request.languages
    )
    session.add(worker)
    session.commit()
    session.refresh(worker)

    # Link worker to user
    user.is_worker = True
    user.worker_id = worker.id
    user.role = "worker"
    session.add(user)
    session.commit()

    return {
        "status": "success",
        "message": "Worker profile created successfully!",
        "worker_id": worker.id
    }


@app.get("/api/workers/me", response_model=WorkerProfileResponse)
def get_my_worker_profile(
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Get the current user's worker profile.
    WHO CALLS THIS: Worker dashboard screen.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    if not user.is_worker or not user.worker_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a worker."
        )

    worker = session.get(Worker, user.worker_id)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found."
        )

    return WorkerProfileResponse(
        id=worker.id,
        name=worker.name,
        phone=worker.phone,
        category=worker.category,
        city=worker.city,
        locality=worker.locality,
        expected_salary=worker.expected_salary,
        experience_years=worker.experience_years,
        languages=worker.languages,
        is_verified=worker.is_verified,
        bio_video_url=worker.bio_video_url,
        photo_url=worker.photo_url,
        rating_avg=worker.rating_avg,
        rating_count=worker.rating_count,
        is_active=worker.is_active,
        is_available=worker.is_available,
        available_from=worker.available_from,
        available_to=worker.available_to
    )


@app.put("/api/workers/me", response_model=WorkerProfileResponse)
def update_my_worker_profile(
    updates: WorkerUpdateRequest,
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Update the current user's worker profile.
    WHO CALLS THIS: Worker edit profile screen.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    if not user.is_worker or not user.worker_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a worker."
        )

    worker = session.get(Worker, user.worker_id)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found."
        )

    # Update fields
    if updates.name is not None:
        worker.name = updates.name
    if updates.category is not None:
        worker.category = updates.category
    if updates.city is not None:
        worker.city = updates.city
    if updates.locality is not None:
        worker.locality = updates.locality
    if updates.expected_salary is not None:
        worker.expected_salary = updates.expected_salary
    if updates.experience_years is not None:
        worker.experience_years = updates.experience_years
    if updates.languages is not None:
        worker.languages = updates.languages
    if updates.bio_video_url is not None:
        worker.bio_video_url = updates.bio_video_url
    if updates.photo_url is not None:
        worker.photo_url = updates.photo_url

    session.add(worker)
    session.commit()
    session.refresh(worker)

    return WorkerProfileResponse(
        id=worker.id,
        name=worker.name,
        phone=worker.phone,
        category=worker.category,
        city=worker.city,
        locality=worker.locality,
        expected_salary=worker.expected_salary,
        experience_years=worker.experience_years,
        languages=worker.languages,
        is_verified=worker.is_verified,
        bio_video_url=worker.bio_video_url,
        photo_url=worker.photo_url,
        rating_avg=worker.rating_avg,
        rating_count=worker.rating_count,
        is_active=worker.is_active,
        is_available=worker.is_available,
        available_from=worker.available_from,
        available_to=worker.available_to
    )


@app.patch("/api/workers/me/availability")
def update_worker_availability(
    request: WorkerAvailabilityRequest,
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Toggle worker availability status.
    WHO CALLS THIS: Worker dashboard toggle switch.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    if not user.is_worker or not user.worker_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a worker."
        )

    worker = session.get(Worker, user.worker_id)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found."
        )

    worker.is_available = request.is_available
    if request.available_from is not None:
        worker.available_from = request.available_from
    if request.available_to is not None:
        worker.available_to = request.available_to

    session.add(worker)
    session.commit()

    status_text = "available" if request.is_available else "unavailable"
    return {
        "status": "success",
        "message": f"You are now {status_text} for work.",
        "is_available": worker.is_available
    }


@app.get("/api/workers/me/leads")
def get_my_leads(
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Get list of users who unlocked this worker's contact.
    WHO CALLS THIS: Worker leads/dashboard screen.

    This helps workers see who might contact them.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    if not user.is_worker or not user.worker_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a worker."
        )

    # Get all unlocks for this worker
    unlocks = session.exec(
        select(Unlock).where(Unlock.worker_id == user.worker_id).order_by(Unlock.created_at.desc())
    ).all()

    leads = []
    for unlock in unlocks:
        employer = session.get(User, unlock.user_id)
        if employer:
            leads.append({
                "id": unlock.id,
                "employer_name": employer.name or "House Help User",
                "employer_city": employer.city,
                "unlocked_at": unlock.created_at.isoformat()
            })

    return {
        "count": len(leads),
        "leads": leads
    }


@app.get("/api/workers/me/reviews")
def get_my_worker_reviews(
    authorization: str = Query(None, include_in_schema=False),
    session: Session = Depends(get_session)
):
    """
    WHAT: Get all reviews for this worker.
    WHO CALLS THIS: Worker reviews screen.
    """
    from app.services.auth import extract_token_from_header

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required."
        )

    token = extract_token_from_header(authorization)
    user = get_user_from_token(session, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    if not user.is_worker or not user.worker_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a worker."
        )

    # Get all reviews for this worker
    reviews = session.exec(
        select(Review).where(Review.worker_id == user.worker_id).order_by(Review.created_at.desc())
    ).all()

    result = []
    for review in reviews:
        reviewer = session.get(User, review.user_id)
        result.append({
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "tags": review.tags,
            "reviewer_name": reviewer.name if reviewer else "Anonymous",
            "created_at": review.created_at.isoformat()
        })

    # Get summary stats
    worker = session.get(Worker, user.worker_id)

    return {
        "count": len(result),
        "average_rating": worker.rating_avg if worker else 0,
        "reviews": result
    }
