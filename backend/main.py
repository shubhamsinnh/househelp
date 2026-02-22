from fastapi import FastAPI, Depends, HTTPException, status, Header
import firebase_admin
from firebase_admin import credentials, auth, firestore
from pydantic import BaseModel
from typing import Optional, List
import os

# Initialize Firebase Admin (Assumes GOOGLE_APPLICATION_CREDENTIALS is set in env)
# If local, point to a downloaded service account JSON key: 
# cred = credentials.Certificate('path/to/serviceAccountKey.json')
# default_app = firebase_admin.initialize_app(cred)
if not firebase_admin._apps:
    default_app = firebase_admin.initialize_app()
    db = firestore.client()
else:
    db = firestore.client()

app = FastAPI(title="Sahayak Backend (Python/FastAPI)", version="1.0.0")

# --- Security/Auth Dependency ---
def verify_firebase_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token"
        )
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )

# --- Models ---
class WorkerProfile(BaseModel):
    name: str
    category: str
    city: str
    expected_salary: int
    is_verified: bool = False
    intro_video_url: Optional[str] = None
    geohash: Optional[str] = None

class UnlockRequest(BaseModel):
    worker_id: str
    payment_id: str

# --- Endpoints ---
@app.get("/")
def health_check():
    return {"status": "ok", "message": "FastAPI Mobile Backend is running!"}

@app.post("/workers/", status_code=status.HTTP_201_CREATED)
def create_worker_profile(profile: WorkerProfile, user_token: dict = Depends(verify_firebase_token)):
    # The UID from the verified token
    uid = user_token.get('uid')
    
    # Save to Firestore
    doc_ref = db.collection('workers').document(uid)
    doc_ref.set(profile.dict())
    return {"message": "Profile created", "id": uid}

@app.get("/workers/")
def search_workers(city: str, category: Optional[str] = None):
    # Query Firestore
    workers_ref = db.collection('workers').where('city', '==', city)
    
    if category:
        workers_ref = workers_ref.where('category', '==', category)
    
    docs = workers_ref.stream()
    
    results = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        # Mask phone number/critical info unless unlocked
        if 'phone_number' in data:
            data['phone_number'] = "Locked (Pay to Unlock)"
        results.append(data)
        
    return {"data": results}

@app.post("/unlocks/")
def process_unlock(request: UnlockRequest, user_token: dict = Depends(verify_firebase_token)):
    uid = user_token.get('uid')
    
    # 1. Verify Payment ID with Razorpay (Mocked here)
    # response = razorpay_client.payment.fetch(request.payment_id)
    # if response['status'] != 'captured': raise HTTPException()
    
    # 2. Record Unlock in Firestore
    unlock_ref = db.collection('unlocks').document()
    unlock_ref.set({
        "user_id": uid,
        "worker_id": request.worker_id,
        "payment_id": request.payment_id,
        "amount": 99,
        "timestamp": firestore.SERVER_TIMESTAMP
    })
    
    # 3. Add to user's unlocked_ids
    user_ref = db.collection('users').document(uid)
    user_ref.set({"unlocked_ids": firestore.ArrayUnion([request.worker_id])}, merge=True)
    
    # 4. Fetch the real phone number
    worker_doc = db.collection('workers').document(request.worker_id).get()
    worker_data = worker_doc.to_dict() or {}
    real_phone = worker_data.get('phone_number', "Unknown")
    
    return {"message": "Unlock successful", "phone_number": real_phone}

