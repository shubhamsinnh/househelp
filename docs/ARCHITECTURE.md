# Project Sahayak Architecture

## Overview
Sahayak is a discovery marketplace for domestic help in India. It acts as a facilitator connecting users with workers (maids, cooks, etc.). The platform monetizes through "Contact Unlocks" (₹99) and "Background Verification (BGV) Upsells" (₹499).

## Tech Stack
### Frontend (Mobile App)
*   **Framework:** React Native (via Expo)
    *   *Why:* Allows for rapid UI development, code sharing between iOS and Android, and OTA (Over-The-Air) updates to bypass app store review times for critical bug fixes.
*   **Styling:** NativeWind (Tailwind CSS for React Native)
    *   *Why:* Enables a premium, modern aesthetic (Glassmorphism, gradients) with minimal custom CSS.

### Backend (API & Logic)
*   **Framework:** Python FastAPI
    *   *Why:* Excellent for AI/Chatbot integration later. Superior data validation out-of-the-box (Pydantic). Extremely fast development speed and auto-generated API documentation (Swagger).
*   **Database:** PostgreSQL
    *   *Why:* Marketplace data is highly relational (Users -> Unlocks -> Workers -> Reviews). SQL excels at complex filtering (e.g., "Cooks within 5km expecting < 8000/mo").

### Infrastructure & Deployment Pipeline
We are designing the system to be cloud-agnostic but AWS-ready.
1.  **Phase 1 (Zero-Burn Prototyping):**
    *   **DB:** Free tier managed PostgreSQL (e.g., Neon Tech or Supabase Postgres).
    *   **API Hosting:** Render.com (Free Tier Web Service).
    *   *Why:* To keep costs at absolute $0 while proving the model in the first city.
2.  **Phase 2 (AWS Scale-Up):**
    *   *Containerization:* We will use `Docker` to package the FastAPI app. This makes moving from Render to AWS seamless.
    *   **DB:** Amazon RDS for PostgreSQL.
    *   **API Hosting:** AWS ECS (Fargate) or EC2.
    *   **Storage:** AWS S3 (for worker photos and videos).

## Core Logic & Data Flow
*(To be expanded as development progresses)*

### 1. The "Unlock" Mechanism
To prevent data scraping and monetize discovery, worker phone numbers are masked.
*   **Action:** User clicks "Unlock Contact".
*   **Logic:** 
    1. App initiates Razorpay intent.
    2. Upon success, FastAPI verifies the payment signature.
    3. The `unlocks` table records the transaction linking `user_id` and `worker_id`.
    4. The API returns the unmasked phone number to exactly that user.

### 2. Authentication (Truecaller)
To minimize the exorbitant cost of SMS OTPs in India, we prioritize Truecaller's 1-Tap Login SDK.
*   *Why:* Near 100% adoption in Tier 2 India. Free verification. Faster conversion than waiting for an SMS.

## Database Schema (Draft V1)
We use SQLAlchemy/SQLModel to define these tables.

*   `users`: ID, Phone, Role (Employer), CreatedAt
*   `workers`: ID, Name, Category, City, ExpectedSalary, IsVerified, Phone (Masked), BioVideoURL, Location (Geo)
*   `unlocks`: ID, UserID (FK), WorkerID (FK), PaymentRef, Amount, Timestamp
*   `bgv_requests`: ID, UserID (FK), WorkerID (FK), Status, ReportURL
