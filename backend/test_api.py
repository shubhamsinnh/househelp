import requests
import json
import time
import subprocess

BASE_URL = "http://127.0.0.1:8000"

def test_backend():
    print("--- Starting Backend Test ---")
    
    # 1. Start the server (assuming it's running via uvicorn in another terminal)
    # Give it a second if just started
    time.sleep(1)

    # 2. Add a sample worker
    print("\n[1] Testing POST /api/workers/")
    new_worker = {
        "name": "Rani Devi",
        "phone": "9876543210",
        "category": "cook",
        "city": "Lucknow",
        "expected_salary": 8000,
        "bio_video_url": "https://s3.aws.com/intro-video"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/workers/", json=new_worker)
        response.raise_for_status()
        print("✅ Worker added successfully:")
        print(json.dumps(response.json(), indent=2))
        worker_id = response.json().get("id")
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to add worker: {e}")
        return

    # 3. Search for workers (to check phone masking)
    print("\n[2] Testing GET /api/workers/ (Search & Masking Check)")
    try:
        search_resp = requests.get(f"{BASE_URL}/api/workers/?city=Lucknow&category=cook")
        search_resp.raise_for_status()
        search_data = search_resp.json()
        print(f"✅ Found {len(search_data)} workers.")
        
        # Verify masking
        if search_data and search_data[0].get("phone") == "Locked (Pay ₹99 to Unlock)":
             print("✅ Phone number masking logic is WORKING correctly in search results.")
        else:
             print("❌ Warning: Phone number masking might have failed.")
             print(json.dumps(search_data, indent=2))
    except requests.exceptions.RequestException as e:
        print(f"❌ Search failed: {e}")
        
    # 4. Process an unlock
    print("\n[3] Testing POST /api/unlocks/ (Payment Logic)")
    unlock_payload = {
        "user_id": 1, # Simulated user ID
        "worker_id": worker_id,
        "payment_id": "pay_mock_razorpay_123"
    }
    
    try:
        unlock_resp = requests.post(f"{BASE_URL}/api/unlocks/", json=unlock_payload)
        unlock_resp.raise_for_status()
        unlock_data = unlock_resp.json()
        print("✅ Unlock processed successfully:")
        print(json.dumps(unlock_data, indent=2))
        
        if unlock_data.get("real_phone_number") == "9876543210":
            print("✅ Verified: Unmasked phone number correctly returned after payment.")
        else:
            print("❌ Verified: Unmasked phone number NOT correctly returned.")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Unlock failed: {e}")

if __name__ == "__main__":
    test_backend()
