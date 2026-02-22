"""
House Help - Automated API Test Script
=======================================
This script acts like a "fake mobile app" that talks to the backend API.
It tests every critical flow to make sure nothing is broken.

HOW TO RUN:
    1. Start the server:  uvicorn app.main:app --reload
    2. Run this script:   python test_api.py

WHAT IT TESTS:
    Test 1: Health check (is the server alive?)
    Test 2: Register a new worker (POST /api/workers/)
    Test 3: Search for workers & verify phone masking (GET /api/workers/)
    Test 4: Pay ₹99 to unlock a worker's phone (POST /api/unlocks/)
    Test 5: Try unlocking AGAIN (should NOT charge twice)
    Test 6: Leave a review (POST /api/reviews/)
    Test 7: Get single worker profile (GET /api/workers/{id})
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"


def print_result(label, passed, detail=""):
    icon = "✅" if passed else "❌"
    print(f"  {icon} {label}")
    if detail:
        print(f"     → {detail}")


def test_backend():
    print("\n" + "=" * 60)
    print("  HOUSE HELP — Backend API Test Suite")
    print("=" * 60)

    # ---- TEST 1: Health Check ----
    print("\n[Test 1] Health Check - GET /")
    try:
        r = requests.get(f"{BASE_URL}/")
        data = r.json()
        print_result("Server is alive", data.get("status") == "ok", data.get("message"))
    except Exception as e:
        print_result("Server is alive", False, str(e))
        print("\n⛔ Server is not running. Start it with: uvicorn app.main:app --reload")
        return

    # ---- TEST 2: Create Worker ----
    print("\n[Test 2] Create Worker - POST /api/workers/")
    new_worker = {
        "name": "Rani Devi",
        "phone": "9876543210",
        "category": "cook",
        "city": "Lucknow",
        "locality": "Gomti Nagar",
        "expected_salary": 8000,
        "experience_years": 5,
        "languages": "Hindi, Awadhi",
    }
    try:
        r = requests.post(f"{BASE_URL}/api/workers/", json=new_worker)
        if r.status_code == 201:
            data = r.json()
            worker_id = data.get("id")
            is_masked = "Locked" in data.get("phone", "")
            print_result("Worker created", True, f"ID: {worker_id}, Name: {data['name']}")
            print_result("Phone is masked in response", is_masked, data.get("phone"))
        elif r.status_code == 409:
            print_result("Worker already exists (expected on re-run)", True, r.json().get("detail"))
            # Fetch the existing worker ID for subsequent tests
            search = requests.get(f"{BASE_URL}/api/workers/?city=Lucknow&category=cook")
            workers_list = search.json()
            worker_id = workers_list[0]["id"] if workers_list else None
        else:
            print_result("Worker created", False, r.text)
            return
    except Exception as e:
        print_result("Worker created", False, str(e))
        return

    # ---- TEST 3: Search Workers ----
    print("\n[Test 3] Search Workers - GET /api/workers/?city=Lucknow&category=cook")
    try:
        r = requests.get(f"{BASE_URL}/api/workers/?city=Lucknow&category=cook")
        data = r.json()
        found = len(data) > 0
        all_masked = all("Locked" in w.get("phone", "") for w in data) if data else False
        print_result(f"Found {len(data)} worker(s)", found)
        print_result("ALL phone numbers are masked", all_masked)
    except Exception as e:
        print_result("Search works", False, str(e))

    # ---- TEST 4: Unlock Contact ----
    print("\n[Test 4] Unlock Contact - POST /api/unlocks/")
    unlock_payload = {
        "user_id": 1,
        "worker_id": worker_id,
        "payment_id": "pay_mock_razorpay_001",
    }
    try:
        r = requests.post(f"{BASE_URL}/api/unlocks/", json=unlock_payload)
        data = r.json()
        is_success = data.get("status") in ["success", "already_unlocked"]
        has_phone = data.get("real_phone_number") == "9876543210"
        print_result("Unlock processed", is_success, data.get("message"))
        print_result("Real phone number returned", has_phone, data.get("real_phone_number"))
    except Exception as e:
        print_result("Unlock processed", False, str(e))

    # ---- TEST 5: Duplicate Unlock Prevention ----
    print("\n[Test 5] Duplicate Unlock Prevention - POST /api/unlocks/ (same user+worker)")
    try:
        r = requests.post(f"{BASE_URL}/api/unlocks/", json=unlock_payload)
        data = r.json()
        is_duplicate = data.get("status") == "already_unlocked"
        print_result("Duplicate detected (not charged twice)", is_duplicate, data.get("message"))
    except Exception as e:
        print_result("Duplicate check works", False, str(e))

    # ---- TEST 6: Leave Review ----
    print("\n[Test 6] Leave Review - POST /api/reviews/")
    review_payload = {
        "user_id": 1,
        "worker_id": worker_id,
        "rating": 5,
        "comment": "Excellent cook, very punctual.",
        "tags": "punctual,good_cooking",
    }
    try:
        r = requests.post(f"{BASE_URL}/api/reviews/", json=review_payload)
        data = r.json()
        if r.status_code == 201:
            print_result("Review submitted", True, data.get("message"))
        elif r.status_code == 409:
            print_result("Duplicate review blocked (expected on re-run)", True, data.get("detail"))
        else:
            print_result("Review submitted", False, data.get("detail"))
    except Exception as e:
        print_result("Review submitted", False, str(e))

    # ---- TEST 7: Single Worker Profile ----
    print("\n[Test 7] Single Worker Profile - GET /api/workers/{id}")
    try:
        r = requests.get(f"{BASE_URL}/api/workers/{worker_id}")
        data = r.json()
        print_result("Profile fetched", r.status_code == 200, f"Name: {data.get('name')}")
        print_result("Phone is still masked", "Locked" in data.get("phone", ""))
        print_result("Rating updated from review", data.get("rating_avg", 0) > 0,
                      f"Avg: {data.get('rating_avg')}, Count: {data.get('rating_count')}")
    except Exception as e:
        print_result("Profile fetched", False, str(e))

    print("\n" + "=" * 60)
    print("  All tests completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    test_backend()
