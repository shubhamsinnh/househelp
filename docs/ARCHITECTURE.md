# 🏠 House Help — Project Documentation

> **One-liner:** House Help is a mobile app that helps Indian families find domestic workers (maids, cooks, drivers, etc.) near them — like "OLX for domestic help."

---

## 📌 What Does This App Do?

Imagine you just moved to a new city and need a cook. Today, you would ask your neighbors, the building guard, or post on Facebook. That takes days.

**House Help** solves this by giving you a searchable directory of local domestic workers — complete with photos, intro videos, experience, expected salary, and verified reviews.

**How we make money:**
| Revenue Stream | Price | What the user gets |
| :--- | :--- | :--- |
| **Contact Unlock** | ₹99 | See the worker's real phone number to call them directly. |
| **Background Verification (BGV)** | ₹499 | Get a third-party Aadhaar + criminal record + address check on the worker. |
| **Premium Listing** (Future) | ₹199/mo | Workers pay to appear higher in search results. |

**What we are NOT:**
- ❌ We are NOT an employer. We don't hire or manage workers.
- ❌ We do NOT decide salaries. The family and worker negotiate directly.
- ❌ We do NOT take commission from salaries.
- ✅ We ARE a discovery platform — like a digital "notice board."

---

## 🛠️ How Is It Built? (Tech Stack for Non-Engineers)

Think of the app like a restaurant:
- **The Menu (Frontend)** = The mobile app that users see and interact with. Built with **React Native** (works on both Android and iPhone from a single codebase).
- **The Kitchen (Backend)** = The server that processes requests (searches, payments, unlocks). Built with **Python FastAPI** — a modern, fast, and easy-to-understand framework.
- **The Notebook (Database)** = Where all the data is stored (worker profiles, user accounts, payment records). We use **PostgreSQL** — the world's most reliable database.

### Why These Choices?

| Choice | Why? |
| :--- | :--- |
| **React Native** | Write code once, run on both Android & iOS. Saves 50% development time. |
| **Python FastAPI** | Python is the best language for AI features we plan to add later (recommendations, chatbots). FastAPI is modern and extremely fast. |
| **PostgreSQL** | Our data is relational (users connect to workers via payments). SQL databases handle this beautifully. NoSQL (like Firebase) would make complex searches painful. |
| **AWS (Future)** | We start on free hosting, then move to AWS when we scale. Our code is designed to make this switch painless. |

---

## 📂 Project Folder Structure

```
House Help/
├── backend/                    ← The "Kitchen" (Server + Database)
│   ├── app/
│   │   ├── main.py             ← THE main file. All API routes are here.
│   │   ├── models/
│   │   │   └── database.py     ← Database table definitions (like a spreadsheet schema).
│   │   └── __init__.py
│   ├── test_api.py             ← A script that tests if the backend is working correctly.
│   ├── requirements.txt        ← List of Python libraries we need.
│   └── venv/                   ← Python virtual environment (isolated dependencies).
├── docs/
│   └── ARCHITECTURE.md         ← This file! The master documentation.
└── frontend/                   ← The "Menu" (Mobile App) — Coming Soon.
```

---

## 🔌 API Endpoints (What the Mobile App Talks To)

### 1. `GET /` — Health Check
**Purpose:** Check if the server is running.
**Who uses it:** Developers, monitoring tools.
**Returns:** `{ "status": "ok", "app": "House Help" }`

### 2. `POST /api/workers/` — Register a Worker
**Purpose:** When a new maid/cook/driver signs up, their profile is saved here.
**Who uses it:** The Worker App.
**Key Rule:** The phone number is stored securely but NEVER returned in the response. Even the worker themselves sees `🔒 Locked` in the API response — this prevents accidental data leaks.

### 3. `GET /api/workers/?city=Lucknow&category=cook` — Search Workers
**Purpose:** The main discovery screen. Families search for domestic help near them.
**Who uses it:** The Customer App.
**Filters available:**
- `city` (required) — Which city to search in.
- `category` — "cook", "maid", "driver", "babysitter", "elderly_care".
- `max_salary` — Only show workers expecting ≤ this salary.
- `verified_only` — Only show workers who passed background verification.
**Key Rule:** ALL phone numbers are replaced with `🔒 Locked — Pay ₹99 to Unlock`. This is the monetization wall.

### 4. `GET /api/workers/{id}` — Worker Profile Page
**Purpose:** When a user taps on a worker card, they see the full profile.
**Who uses it:** The Customer App.
**Key Rule:** Phone is STILL masked. User must go through the unlock flow.

### 5. `POST /api/unlocks/` — 💰 Unlock Contact (Revenue Endpoint)
**Purpose:** The user has paid ₹99 via Razorpay. Now we reveal the real phone number.
**Who uses it:** The Customer App, after payment confirmation.
**Key Rules:**
- **Duplicate Prevention:** If the user has already unlocked this worker before, we return the number for free (no double-charging).
- **Disclaimer:** Every unlock response includes a legal disclaimer that House Help is a platform, not an employer.

### 6. `POST /api/reviews/` — Leave a Review
**Purpose:** After contacting/hiring a worker, the employer can leave a 1-5 star rating.
**Who uses it:** The Customer App.
**Key Rules:**
- **Only unlocked users can review.** You can't review a worker you never contacted. This prevents fake reviews.
- **One review per user per worker.** No spam.
- **Automatic rating update:** When a review is submitted, the worker's average rating is recalculated instantly.

---

## 💾 Database Tables (The "Spreadsheets")

### Table: `users`
Stores every person who downloads and signs up on the app.

| Column | Type | What it stores |
| :--- | :--- | :--- |
| `id` | Integer | Auto-generated unique ID |
| `phone` | Text | Indian mobile number (unique) |
| `name` | Text | Optional display name |
| `city` | Text | User's city |
| `role` | Text | "employer" (default) or "admin" |
| `created_at` | Timestamp | When they signed up |

### Table: `workers`
Every maid, cook, driver, babysitter, and elderly caretaker registered on the platform.

| Column | Type | What it stores |
| :--- | :--- | :--- |
| `id` | Integer | Auto-generated unique ID |
| `name` | Text | Worker's name |
| `phone` | Text | Their REAL phone number (hidden from API) |
| `category` | Text | "cook", "maid", "driver", etc. |
| `city` | Text | City they work in |
| `locality` | Text | Specific area/colony (e.g., "Gomti Nagar") |
| `expected_salary` | Integer | Monthly salary expectation in ₹ |
| `experience_years` | Integer | How many years of experience |
| `languages` | Text | Languages spoken (e.g., "Hindi, Bhojpuri") |
| `is_verified` | Boolean | True if background verification is done |
| `bio_video_url` | Text | Link to their 15-second intro video |
| `photo_url` | Text | Link to their profile photo |
| `rating_avg` | Float | Average star rating (1.0 to 5.0) |
| `rating_count` | Integer | Total number of reviews |
| `is_active` | Boolean | Can be deactivated by admin |

### Table: `unlocks`
A log of every time someone paid ₹99 to see a worker's phone number. This is our revenue ledger.

| Column | Type | What it stores |
| :--- | :--- | :--- |
| `id` | Integer | Auto-generated unique ID |
| `user_id` | Integer | Who paid (links to `users` table) |
| `worker_id` | Integer | Whose number was unlocked (links to `workers` table) |
| `payment_id` | Text | Razorpay transaction ID |
| `amount` | Integer | ₹99 (default) |
| `created_at` | Timestamp | When the unlock happened |

### Table: `bgv_requests`
Background verification requests and their status.

### Table: `reviews`
Star ratings and comments left by employers.

---

## 🚀 How to Run the Project Locally

```bash
# 1. Navigate to the backend folder
cd "d:\first-project\House Help\backend"

# 2. Activate the Python environment
.\venv\Scripts\activate

# 3. Start the server
uvicorn app.main:app --reload

# 4. Open the auto-generated API docs in your browser
#    http://127.0.0.1:8000/docs

# 5. Run the automated tests (in a separate terminal)
python test_api.py
```

---

## 🛡️ Legal & Disclaimer Strategy

Every interaction where we reveal a worker's contact includes:
> *"House Help is a discovery platform. We facilitate connections but do not employ, manage, or guarantee the conduct of any worker. Please verify the worker independently before hiring."*

This protects us from being classified as a "staffing agency" under Indian labor law.

---

## 🗺️ Deployment Roadmap

| Phase | Hosting | Database | Cost |
| :--- | :--- | :--- | :--- |
| **Phase 1** (Now) | Free tier (Render / Railway) | SQLite (local) / Neon (cloud) | ₹0 |
| **Phase 2** (100+ users) | AWS EC2 / ECS | AWS RDS PostgreSQL | ~₹2,000/mo |
| **Phase 3** (Scale) | AWS ECS + Load Balancer | RDS Multi-AZ | Based on traffic |

The migration from Phase 1 → Phase 2 requires **only changing the `DATABASE_URL` environment variable**. No code changes needed.
