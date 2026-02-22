# House Help - Development Plan
## Domestic Worker Discovery Marketplace for India

**Last Updated:** 2026-02-22
**Status:** In Active Development
**Target:** Tier 2 Indian Cities (Lucknow, Indore, Jaipur, etc.)

---

## Executive Summary

House Help is a mobile marketplace connecting households with domestic workers (maids, cooks, drivers, babysitters, elderly care). Revenue model: ₹99 per contact unlock.

### Current State
- ✅ FastAPI backend with SQLite (PostgreSQL-ready)
- ✅ React Native/Expo frontend with 12 screens
- ✅ Worker search & profile viewing
- ✅ Mock payment flow for unlocking contacts
- ✅ Review system
- ✅ Phone masking for worker privacy
- ✅ Dark theme UI with Hindi labels
- ✅ **OTP-based authentication system (Phase 1 COMPLETE)**
- ✅ JWT token management with refresh tokens
- ✅ **User Dashboard (Phase 2 COMPLETE)**
- ✅ Bottom tab navigation (Home, Contacts, Favorites, Settings)
- ✅ User profile editing
- ✅ My unlocked contacts screen
- ✅ Favorites management
- ✅ **Worker Dashboard (Phase 3 COMPLETE)**
- ✅ Worker registration from app
- ✅ Worker leads dashboard (who unlocked me)
- ✅ Worker reviews screen
- ✅ Worker availability toggle
- ✅ Separate worker navigation mode

### Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, FastAPI, SQLModel, Pydantic |
| Database | SQLite (dev) → PostgreSQL (prod) |
| Mobile | React Native, Expo, TypeScript |
| Payments | Razorpay (to be integrated) |
| Auth | ✅ JWT + OTP (IMPLEMENTED) |

---

## Implementation Roadmap

### Phase 1: Authentication System (CRITICAL - Week 1) ✅ COMPLETE
**Priority: 🔴 HIGHEST** - Everything depends on this

| Task | Status | Files |
|------|--------|-------|
| 1.1 OTP Generation & Sending (MSG91/Twilio) | ✅ Done | `backend/app/services/otp.py` |
| 1.2 OTP Verification Endpoint | ✅ Done | `backend/app/main.py` |
| 1.3 JWT Token Generation | ✅ Done | `backend/app/services/auth.py` |
| 1.4 Protected Route Middleware | ✅ Done | `backend/app/middleware/auth.py` |
| 1.5 Frontend Login Screen | ✅ Done | `frontend/src/screens/LoginScreen.tsx` |
| 1.6 Token Storage (SecureStore) | ✅ Done | `frontend/src/services/auth.ts` |
| 1.7 API Client Auth Headers | ✅ Done | `frontend/src/services/api.ts` |

**Technical Details:**
- MSG91/Twilio integration ready (console mode for dev)
- JWT tokens: 15-min access, 7-day refresh
- Phone number as primary identifier (no email)
- Rate limit: 3 OTP requests per 10 minutes per phone

---

### Phase 2: User Dashboard (Week 2) ✅ COMPLETE
**Priority: 🟠 HIGH** - Core user experience

| Task | Status | Files |
|------|--------|-------|
| 2.1 User Profile Screen | ✅ Done | `frontend/src/screens/UserProfileScreen.tsx` |
| 2.2 My Unlocked Contacts List | ✅ Done | `frontend/src/screens/MyContactsScreen.tsx` |
| 2.3 Payment History | ⬜ Deferred | Future enhancement |
| 2.4 My Reviews Given | ⬜ Deferred | Future enhancement |
| 2.5 Favorites/Saved Workers | ✅ Done | `frontend/src/screens/FavoritesScreen.tsx` |
| 2.6 Settings Screen | ✅ Done | `frontend/src/screens/SettingsScreen.tsx` |
| 2.7 Backend: GET /api/users/me endpoints | ✅ Done | `backend/app/main.py` (unlocks, favorites, profile) |
| 2.8 Bottom Tab Navigation | ✅ Done | `frontend/App.tsx` (Home, Contacts, Favorites, Settings) |

---

### Phase 3: Worker Dashboard (Week 2-3) ✅ COMPLETE
**Priority: 🟠 HIGH** - Supply side of marketplace

| Task | Status | Files |
|------|--------|-------|
| 3.1 Worker Registration Flow | ✅ Done | `frontend/src/screens/WorkerRegistrationScreen.tsx` |
| 3.2 Worker Profile Edit | ✅ Done | `frontend/src/screens/WorkerEditProfileScreen.tsx` |
| 3.3 Photo/Video Upload | ⬜ Deferred | S3/Cloudinary integration (future) |
| 3.4 Leads Dashboard (who unlocked me) | ✅ Done | `frontend/src/screens/WorkerDashboardScreen.tsx` |
| 3.5 My Ratings & Reviews | ✅ Done | `frontend/src/screens/WorkerReviewsScreen.tsx` |
| 3.6 Availability Toggle | ✅ Done | Backend: `is_available` field in `database.py` |
| 3.7 Backend: Worker-only endpoints | ✅ Done | `backend/app/main.py` (GET/PUT /api/workers/me, leads, reviews, availability) |

---

### Phase 4: Admin Dashboard (Week 3-4)
**Priority: 🟡 MEDIUM** - Operations & analytics

| Task | Status | Files |
|------|--------|-------|
| 4.1 Admin Web Panel (React) | ⬜ Pending | `admin/` folder |
| 4.2 Revenue Analytics | ⬜ Pending | Daily/monthly unlock revenue |
| 4.3 Worker Approval Queue | ⬜ Pending | Review before listing |
| 4.4 BGV Request Management | ⬜ Pending | Background verification workflow |
| 4.5 User Management | ⬜ Pending | Ban/suspend accounts |
| 4.6 Review Moderation | ⬜ Pending | Flag inappropriate content |
| 4.7 City/Category Management | ⬜ Pending | Add new cities dynamically |

---

### Phase 5: UI/UX Improvements (Week 4)
**Priority: 🟡 MEDIUM** - Based on competitor analysis

| Task | Status | Files |
|------|--------|-------|
| 5.1 Skeleton Loading States | ⬜ Pending | All list screens |
| 5.2 Pull-to-Refresh | ⬜ Pending | Search results |
| 5.3 Search Filters (salary, rating, verified) | ⬜ Pending | `SearchScreen.tsx` |
| 5.4 Worker Photos in Cards | ⬜ Pending | Placeholder → real images |
| 5.5 Favorites Heart Button | ⬜ Pending | Worker cards |
| 5.6 Empty States with Illustrations | ⬜ Pending | All screens |
| 5.7 Success/Error Toast Notifications | ⬜ Pending | Replace Alert.alert |
| 5.8 Haptic Feedback on Actions | ⬜ Pending | Expo Haptics |

---

### Phase 6: Payment Integration (Week 5)
**Priority: 🟠 HIGH** - Revenue generation

| Task | Status | Files |
|------|--------|-------|
| 6.1 Razorpay SDK Integration | ⬜ Pending | `frontend/src/services/razorpay.ts` |
| 6.2 Payment Verification Backend | ⬜ Pending | `backend/app/services/payment.py` |
| 6.3 Webhook for Payment Confirmation | ⬜ Pending | `POST /api/webhooks/razorpay` |
| 6.4 Payment Failure Handling | ⬜ Pending | Retry flow |
| 6.5 Receipt Generation | ⬜ Pending | Email/SMS receipt |

---

### Phase 7: Advanced Features (Week 6+)
**Priority: 🟢 LOW** - Post-launch enhancements

| Task | Status | Files |
|------|--------|-------|
| 7.1 Push Notifications (FCM) | ⬜ Pending | Expo Push |
| 7.2 Call Masking (Exotel) | ⬜ Pending | Privacy protection |
| 7.3 In-App Chat | ⬜ Pending | Socket.io/Firebase |
| 7.4 Worker Referral System | ⬜ Pending | Earn ₹50 per referral |
| 7.5 Multi-language Support | ⬜ Pending | Hindi, Marathi, Tamil |
| 7.6 Offline Mode | ⬜ Pending | Cache last search |
| 7.7 Deep Linking | ⬜ Pending | Share worker profiles |

---

### Phase 8: Legal & Compliance (Week 6)
**Priority: 🟠 HIGH** - Required before launch

| Task | Status | Files |
|------|--------|-------|
| 8.1 Terms of Service | ⬜ Pending | `frontend/src/screens/TermsScreen.tsx` |
| 8.2 Privacy Policy | ⬜ Pending | `frontend/src/screens/PrivacyScreen.tsx` |
| 8.3 Refund Policy | ⬜ Pending | Clear no-refund stance |
| 8.4 GDPR/Data Protection | ⬜ Pending | Data deletion endpoint |
| 8.5 Age Verification | ⬜ Pending | 18+ for workers |

---

## Database Schema Updates Required

```sql
-- New tables needed:

-- 1. OTP Management
CREATE TABLE otp_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Favorites
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    worker_id INTEGER REFERENCES workers(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, worker_id)
);

-- 3. Worker Availability
ALTER TABLE workers ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE workers ADD COLUMN available_from TIME;
ALTER TABLE workers ADD COLUMN available_to TIME;

-- 4. Push Notification Tokens
CREATE TABLE push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    device_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication ✅ IMPLEMENTED
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/auth/send-otp` | Send OTP to phone | ✅ |
| POST | `/api/auth/verify-otp` | Verify OTP, return JWT | ✅ |
| POST | `/api/auth/refresh` | Refresh access token | ✅ |
| GET | `/api/auth/me` | Get current user | ✅ |
| PUT | `/api/auth/me` | Update profile | ✅ |

### User Dashboard ✅ IMPLEMENTED
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/users/me/unlocks` | My unlocked contacts | ✅ |
| GET | `/api/users/me/favorites` | Saved workers | ✅ |
| POST | `/api/users/me/favorites/{worker_id}` | Add favorite | ✅ |
| DELETE | `/api/users/me/favorites/{worker_id}` | Remove favorite | ✅ |
| GET | `/api/users/me/reviews` | Reviews I've written | ⬜ |

### Worker Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workers/me` | My worker profile |
| PUT | `/api/workers/me` | Update my profile |
| GET | `/api/workers/me/leads` | Who unlocked me |
| GET | `/api/workers/me/reviews` | My reviews |
| PATCH | `/api/workers/me/availability` | Toggle availability |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/workers/pending` | Approval queue |
| POST | `/api/admin/workers/{id}/approve` | Approve worker |
| POST | `/api/admin/workers/{id}/reject` | Reject worker |
| GET | `/api/admin/reviews/flagged` | Flagged reviews |

---

## Environment Variables Required

```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/househelp
SECRET_KEY=your-jwt-secret-key-here
MSG91_API_KEY=your-msg91-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Frontend (.env)
EXPO_PUBLIC_API_URL=https://api.househelp.in
EXPO_PUBLIC_RAZORPAY_KEY=your-razorpay-key
```

---

## Testing Checklist

### Backend Tests
- [ ] OTP generation & verification
- [ ] JWT token creation & validation
- [ ] Protected routes reject unauthorized
- [ ] Worker CRUD operations
- [ ] Unlock deduplication
- [ ] Review constraints
- [ ] Payment verification

### Frontend Tests
- [ ] Login flow (happy path)
- [ ] Login flow (wrong OTP)
- [ ] Search & filter workers
- [ ] View worker profile
- [ ] Unlock contact (mock payment)
- [ ] Submit review
- [ ] Favorites add/remove
- [ ] Logout & token cleanup

---

## Deployment Checklist

- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured
- [ ] SSL certificate for API domain
- [ ] Razorpay production keys
- [ ] MSG91/Twilio production keys
- [ ] Expo EAS Build configured
- [ ] App Store / Play Store listings
- [ ] Privacy policy URL for stores
- [ ] Crashlytics / Sentry for errors

---

## Progress Log

| Date | Task Completed | Notes |
|------|----------------|-------|
| 2026-02-22 | Backend v1 complete | All core endpoints working |
| 2026-02-22 | Frontend v1 pushed to GitHub | 3 screens: Home, Search, Profile |
| 2026-02-22 | Development plan created | This document |
| 2026-02-22 | **Phase 1: Auth System COMPLETE** | OTP + JWT fully implemented |
| 2026-02-22 | Backend auth services | otp.py, auth.py, middleware |
| 2026-02-22 | Frontend auth flow | LoginScreen, auth.ts, SecureStore |
| 2026-02-22 | User endpoints added | favorites, unlocks, profile |
| 2026-02-22 | **Phase 2: User Dashboard COMPLETE** | All core screens implemented |
| 2026-02-22 | Bottom tab navigation | Home, Contacts, Favorites, Settings |
| 2026-02-22 | UserProfileScreen | Edit name/city, view account info |
| 2026-02-22 | MyContactsScreen | Unlocked workers with real phones |
| 2026-02-22 | FavoritesScreen | Saved workers list |
| 2026-02-22 | SettingsScreen | Logout, support, legal links |
| 2026-02-22 | **Phase 3: Worker Dashboard COMPLETE** | All worker features implemented |
| 2026-02-22 | Worker registration flow | Register as worker from settings |
| 2026-02-22 | WorkerDashboardScreen | Leads, availability toggle |
| 2026-02-22 | WorkerReviewsScreen | View ratings and reviews |
| 2026-02-22 | WorkerEditProfileScreen | Edit worker profile |
| 2026-02-22 | Backend worker endpoints | /api/workers/me (CRUD, leads, reviews, availability) |
| 2026-02-22 | Worker navigation mode | Separate tab bar for workers |
| | | |

---

## Notes

1. ~~**Authentication is blocking**~~ ✅ **AUTH COMPLETE** - Phase 1 done!
2. ~~**User Dashboard**~~ ✅ **DASHBOARD COMPLETE** - Phase 2 done!
3. ~~**Worker Dashboard**~~ ✅ **WORKER DASHBOARD COMPLETE** - Phase 3 done!
4. **Start simple** - MVP first, then iterate based on user feedback.
5. **Tier 2 focus** - Don't add features Urban Company has unless they solve Tier 2 problems.
6. **Legal first** - Terms & Privacy must be ready before Play Store submission.
7. **Next Priority** - Admin Panel (Phase 4), then UI/UX Improvements (Phase 5).

---

*Document maintained by the development team. Update after each sprint.*
