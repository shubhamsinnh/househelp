from fastapi import FastAPI, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel, create_engine
from typing import List, Optional
from pydantic import BaseModel
import os

from app.models.database import User, Worker, Unlock, BGVRequest

# In a real app, load from ENV: os.getenv("DATABASE_URL")
# SQLite for local dev placeholder; easily swaps to Postgres URL later.
DATABASE_URL = "sqlite:///./sahayak.db"
# DATABASE_URL = "postgresql://user:password@localhost/sahayak"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

app = FastAPI(title="Sahayak - Domestic Help Discovery API")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# --- Pydantic DTOs ---
class WorkerCreate(BaseModel):
    name: str
    phone: str
    category: str
    city: str
    expected_salary: int
    bio_video_url: Optional[str] = None

class WorkerResponse(BaseModel):
    id: int
    name: str
    category: str
    city: str
    expected_salary: int
    is_verified: bool
    bio_video_url: Optional[str]
    phone: str # Will return "Locked" unless user unlocked it

class UnlockRequestParams(BaseModel):
    user_id: int # In prod, extract from JWT Auth Token
    worker_id: int
    payment_id: str # From Razorpay SDK on mobile

# --- Endpoints ---
@app.post("/api/workers/", response_model=WorkerResponse)
def create_worker(worker: WorkerCreate, session: Session = Depends(get_session)):
    db_worker = Worker.from_orm(worker)
    session.add(db_worker)
    session.commit()
    session.refresh(db_worker)
    
    # Mask phone before returning
    res = WorkerResponse(**db_worker.dict())
    res.phone = "*****"
    return res

@app.get("/api/workers/", response_model=List[WorkerResponse])
def search_workers(city: str, category: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(Worker).where(Worker.city == city)
    if category:
        query = query.where(Worker.category == category)
        
    workers = session.exec(query).all()
    
    # MASK ALL PHONE NUMBERS IN SEARCH RESULTS
    results = []
    for w in workers:
        data = w.dict()
        data['phone'] = "Locked (Pay ₹99 to Unlock)"
        results.append(WorkerResponse(**data))
        
    return results

@app.post("/api/unlocks/")
def unlock_contact(request: UnlockRequestParams, session: Session = Depends(get_session)):
    """
    1. Verifies Razorpay Payment Signature (Mocked here)
    2. Records the transaction in DB
    3. Returns the REAL unmasked phone number
    """
    # [Mock Auth/Payment Verification Logic]
    # if not verify_razorpay_signature(payment_id): raise HTTP 400
    
    # Create Transaction Log
    unlock_txn = Unlock(
        user_id=request.user_id,
        worker_id=request.worker_id,
        payment_id=request.payment_id
    )
    session.add(unlock_txn)
    session.commit()
    
    # Fetch real phone number
    worker = session.get(Worker, request.worker_id)
    if not worker: raise HTTPException(status_code=404, detail="Worker not found")
    
    return {
        "status": "success",
        "message": "Contact Unlocked Successfully",
        "worker_name": worker.name,
        "real_phone_number": worker.phone # VITAL: This only runs AFTER payment
    }
