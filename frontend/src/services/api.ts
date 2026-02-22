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
 */

// Change this when deploying to production
const BASE_URL = "http://10.0.2.2:8000"; // Android Emulator → localhost alias
// const BASE_URL = "http://localhost:8000"; // iOS Simulator
// const BASE_URL = "https://your-api.onrender.com"; // Production

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

/**
 * Unlock a worker's real phone number after payment.
 * This is the REVENUE endpoint.
 */
export async function unlockContact(
    userId: number,
    workerId: number,
    paymentId: string
): Promise<UnlockResponse> {
    const response = await fetch(`${BASE_URL}/api/unlocks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: userId,
            worker_id: workerId,
            payment_id: paymentId,
        }),
    });
    if (!response.ok) throw new Error("Unlock failed");
    return response.json();
}

/**
 * Submit a review for a worker (only after unlocking).
 */
export async function submitReview(
    userId: number,
    workerId: number,
    rating: number,
    comment?: string,
    tags?: string
): Promise<{ status: string; message: string }> {
    const response = await fetch(`${BASE_URL}/api/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: userId,
            worker_id: workerId,
            rating,
            comment,
            tags,
        }),
    });
    if (!response.ok) throw new Error("Review submission failed");
    return response.json();
}
