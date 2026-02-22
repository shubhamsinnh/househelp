/**
 * API Service Layer
 * =================
 * This file handles ALL communication between the mobile app and the FastAPI backend.
 * Every API call goes through here — no screen should call `fetch()` directly.
 *
 * WHY: Centralizing API calls makes it easy to:
 *   1. Change the backend URL in ONE place (when moving from local to AWS).
 *   2. Add auth headers globally (JWT tokens).
 *   3. Handle errors consistently across the app.
 *
 * AUTHENTICATION:
 *   - Use authFetch() for endpoints that require authentication
 *   - Token is automatically added and refreshed
 */

import { getUser, authFetch } from "./auth";

// Change this when deploying to production
export const BASE_URL = "http://10.0.2.2:8000"; // Android Emulator → localhost alias
// export const BASE_URL = "http://localhost:8000"; // iOS Simulator
// export const BASE_URL = "https://your-api.onrender.com"; // Production

export interface Worker {
    id: number;
    name: string;
    category: string;
    city: string;
    locality: string | null;
    expected_salary: number;
    experience_years: number | null;
    languages: string | null;
    is_verified: boolean;
    bio_video_url: string | null;
    photo_url: string | null;
    rating_avg: number | null;
    rating_count: number;
    phone: string;
}

export interface UnlockResponse {
    status: string;
    message: string;
    worker_name: string;
    real_phone_number: string;
    disclaimer?: string;
}

export interface UnlockedContact {
    unlock_id: number;
    worker_id: number;
    worker_name: string;
    worker_category: string;
    worker_city: string;
    phone: string;
    unlocked_at: string;
    amount_paid: number;
}

// --------------------------------------------------------------------------
// Public Endpoints (no auth required)
// --------------------------------------------------------------------------

/**
 * Search for workers by city and optional filters.
 * Phone numbers will always be masked in results.
 */
export async function searchWorkers(
    city: string,
    category?: string,
    maxSalary?: number,
    verifiedOnly?: boolean
): Promise<Worker[]> {
    let url = `${BASE_URL}/api/workers/?city=${encodeURIComponent(city)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (maxSalary) url += `&max_salary=${maxSalary}`;
    if (verifiedOnly) url += `&verified_only=true`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch workers");
    return response.json();
}

/**
 * Get a single worker's profile (phone still masked).
 */
export async function getWorkerProfile(workerId: number): Promise<Worker> {
    const response = await fetch(`${BASE_URL}/api/workers/${workerId}`);
    if (!response.ok) throw new Error("Worker not found");
    return response.json();
}

// --------------------------------------------------------------------------
// Authenticated Endpoints
// --------------------------------------------------------------------------

/**
 * Unlock a worker's real phone number after payment.
 * This is the REVENUE endpoint.
 *
 * Now uses the authenticated user's ID from stored session.
 */
export async function unlockContact(
    workerId: number,
    paymentId: string
): Promise<UnlockResponse> {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const response = await fetch(`${BASE_URL}/api/unlocks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: user.id,
            worker_id: workerId,
            payment_id: paymentId,
        }),
    });

    if (!response.ok) throw new Error("Unlock failed");
    return response.json();
}

/**
 * Submit a review for a worker (only after unlocking).
 *
 * Now uses the authenticated user's ID from stored session.
 */
export async function submitReview(
    workerId: number,
    rating: number,
    comment?: string,
    tags?: string
): Promise<{ status: string; message: string }> {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");

    const response = await fetch(`${BASE_URL}/api/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: user.id,
            worker_id: workerId,
            rating,
            comment,
            tags,
        }),
    });

    if (!response.ok) throw new Error("Review submission failed");
    return response.json();
}

/**
 * Get the current user's unlocked contacts.
 */
export async function getMyUnlocks(): Promise<{
    count: number;
    unlocks: UnlockedContact[];
}> {
    const response = await authFetch(`${BASE_URL}/api/users/me/unlocks`);
    if (!response.ok) throw new Error("Failed to fetch unlocks");
    return response.json();
}

/**
 * Get the current user's favorite workers.
 */
export async function getMyFavorites(): Promise<{
    count: number;
    favorites: Worker[];
}> {
    const response = await authFetch(`${BASE_URL}/api/users/me/favorites`);
    if (!response.ok) throw new Error("Failed to fetch favorites");
    return response.json();
}

/**
 * Add a worker to favorites.
 */
export async function addFavorite(workerId: number): Promise<{
    status: string;
    message: string;
}> {
    const response = await authFetch(
        `${BASE_URL}/api/users/me/favorites/${workerId}`,
        { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to add favorite");
    return response.json();
}

/**
 * Remove a worker from favorites.
 */
export async function removeFavorite(workerId: number): Promise<{
    status: string;
    message: string;
}> {
    const response = await authFetch(
        `${BASE_URL}/api/users/me/favorites/${workerId}`,
        { method: "DELETE" }
    );
    if (!response.ok) throw new Error("Failed to remove favorite");
    return response.json();
}

/**
 * Check if user has unlocked a specific worker.
 * Returns the phone number if unlocked, null otherwise.
 */
export async function checkUnlockStatus(workerId: number): Promise<string | null> {
    try {
        const data = await getMyUnlocks();
        const unlock = data.unlocks.find(u => u.worker_id === workerId);
        return unlock ? unlock.phone : null;
    } catch {
        return null;
    }
}

// --------------------------------------------------------------------------
// Worker Dashboard Endpoints
// --------------------------------------------------------------------------

export interface WorkerProfile {
    id: number;
    name: string;
    phone: string;
    category: string;
    city: string;
    locality: string | null;
    expected_salary: number;
    experience_years: number | null;
    languages: string | null;
    is_verified: boolean;
    bio_video_url: string | null;
    photo_url: string | null;
    rating_avg: number | null;
    rating_count: number;
    is_active: boolean;
    is_available: boolean;
    available_from: string | null;
    available_to: string | null;
}

export interface Lead {
    id: number;
    employer_name: string;
    employer_city: string | null;
    unlocked_at: string;
}

export interface WorkerReview {
    id: number;
    rating: number;
    comment: string | null;
    tags: string | null;
    reviewer_name: string;
    created_at: string;
}

/**
 * Register the current user as a worker.
 */
export async function registerAsWorker(data: {
    name: string;
    category: string;
    city: string;
    locality?: string;
    expected_salary: number;
    experience_years?: number;
    languages?: string;
}): Promise<{ success: boolean; message: string; worker_id?: number }> {
    try {
        const response = await authFetch(`${BASE_URL}/api/auth/register-worker`, {
            method: "POST",
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, message: result.detail || "Registration failed" };
        }

        return { success: true, message: result.message, worker_id: result.worker_id };
    } catch {
        return { success: false, message: "Network error" };
    }
}

/**
 * Get the current worker's profile.
 */
export async function getMyWorkerProfile(): Promise<WorkerProfile | null> {
    try {
        const response = await authFetch(`${BASE_URL}/api/workers/me`);
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

/**
 * Update worker profile.
 */
export async function updateWorkerProfile(updates: {
    name?: string;
    category?: string;
    city?: string;
    locality?: string;
    expected_salary?: number;
    experience_years?: number;
    languages?: string;
}): Promise<{ success: boolean; message: string; profile?: WorkerProfile }> {
    try {
        const response = await authFetch(`${BASE_URL}/api/workers/me`, {
            method: "PUT",
            body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, message: result.detail || "Update failed" };
        }

        return { success: true, message: "Profile updated", profile: result };
    } catch {
        return { success: false, message: "Network error" };
    }
}

/**
 * Toggle worker availability.
 */
export async function updateWorkerAvailability(data: {
    is_available: boolean;
    available_from?: string;
    available_to?: string;
}): Promise<{ success: boolean; message: string }> {
    try {
        const response = await authFetch(`${BASE_URL}/api/workers/me/availability`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, message: result.detail || "Update failed" };
        }

        return { success: true, message: result.message };
    } catch {
        return { success: false, message: "Network error" };
    }
}

/**
 * Get list of users who unlocked this worker's contact (leads).
 */
export async function getMyLeads(): Promise<{
    count: number;
    leads: Lead[];
}> {
    const response = await authFetch(`${BASE_URL}/api/workers/me/leads`);
    if (!response.ok) throw new Error("Failed to fetch leads");
    return response.json();
}

/**
 * Get all reviews for this worker.
 */
export async function getMyWorkerReviews(): Promise<{
    count: number;
    average_rating: number;
    reviews: WorkerReview[];
}> {
    const response = await authFetch(`${BASE_URL}/api/workers/me/reviews`);
    if (!response.ok) throw new Error("Failed to fetch reviews");
    return response.json();
}
