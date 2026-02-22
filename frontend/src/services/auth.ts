/**
 * Authentication Service
 * ======================
 * Handles all auth-related operations for the mobile app.
 *
 * Features:
 * - Firebase Phone Auth (NEW!) - FREE 10K/month
 * - Legacy OTP-based phone login (MSG91/Twilio)
 * - JWT token management (access + refresh tokens)
 * - Secure token storage using expo-secure-store
 * - Auto token refresh
 * - Session persistence
 */

import * as SecureStore from "expo-secure-store";
import { auth } from "../../firebase.config";
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
} from "firebase/auth";

// Same base URL as api.ts - should be extracted to config
const BASE_URL = "http://10.0.2.2:8000"; // Android Emulator
// const BASE_URL = "http://localhost:8000"; // iOS Simulator

// Storage keys
const TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

// Firebase confirmation result (stored between send OTP and verify OTP steps)
let confirmationResult: ConfirmationResult | null = null;

// Types
export interface User {
    id: number;
    phone: string;
    name: string | null;
    city: string | null;
    role: string;
    is_worker: boolean;
    worker_id: number | null;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    accessToken: string | null;
}

// --------------------------------------------------------------------------
// Token Storage (using expo-secure-store for security)
// --------------------------------------------------------------------------

/**
 * Save tokens securely to device storage.
 */
export async function saveTokens(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

/**
 * Get the current access token from storage.
 */
export async function getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Get the refresh token from storage.
 */
export async function getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Save user data to storage.
 */
export async function saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

/**
 * Get user data from storage.
 */
export async function getUser(): Promise<User | null> {
    const data = await SecureStore.getItemAsync(USER_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Clear all auth data (logout).
 */
export async function clearAuthData(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
}

// --------------------------------------------------------------------------
// API Calls
// --------------------------------------------------------------------------

/**
 * Send OTP to phone number.
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, message: data.detail || "Failed to send OTP" };
        }

        return { success: true, message: data.message };
    } catch (error) {
        return { success: false, message: "Network error. Please check your connection." };
    }
}

/**
 * Verify OTP and get tokens.
 */
export async function verifyOTP(
    phone: string,
    code: string
): Promise<{
    success: boolean;
    message: string;
    user?: User;
    isNewUser?: boolean;
}> {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, code }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, message: data.detail || "Invalid OTP" };
        }

        // Save tokens and user
        await saveTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
        });
        await saveUser(data.user);

        return {
            success: true,
            message: data.message,
            user: data.user,
            isNewUser: data.is_new_user,
        };
    } catch (error) {
        return { success: false, message: "Network error. Please try again." };
    }
}

// --------------------------------------------------------------------------
// Firebase Phone Auth Functions (NEW!)
// --------------------------------------------------------------------------

/**
 * Send OTP using Firebase Phone Auth.
 * FREE for 10,000 verifications/month!
 */
export async function sendOTPFirebase(
    phone: string
): Promise<{ success: boolean; message: string }> {
    try {
        // Format phone for Firebase (must include country code)
        const formattedPhone = `+91${phone}`;

        // Set up reCAPTCHA verifier (invisible, won't show to user)
        // Note: This won't work perfectly in React Native without expo-firebase
        // For production, use @react-native-firebase/auth instead
        const appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
        });

        // Send OTP via Firebase
        const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        confirmationResult = result;

        return {
            success: true,
            message: "OTP sent successfully via Firebase.",
        };
    } catch (error: any) {
        console.error("Firebase OTP error:", error);

        // User-friendly error messages
        if (error.code === "auth/invalid-phone-number") {
            return { success: false, message: "Invalid phone number format." };
        } else if (error.code === "auth/too-many-requests") {
            return {
                success: false,
                message: "Too many requests. Please try again later.",
            };
        } else if (error.code === "auth/network-request-failed") {
            return { success: false, message: "Network error. Check your connection." };
        }

        return { success: false, message: error.message || "Failed to send OTP" };
    }
}

/**
 * Verify Firebase OTP and exchange for backend JWT tokens.
 */
export async function verifyOTPFirebase(
    code: string
): Promise<{
    success: boolean;
    message: string;
    user?: User;
    isNewUser?: boolean;
}> {
    try {
        if (!confirmationResult) {
            return {
                success: false,
                message: "Please request OTP first.",
            };
        }

        // Verify OTP with Firebase
        const userCredential = await confirmationResult.confirm(code);

        // Get Firebase ID token
        const idToken = await userCredential.user.getIdToken();

        // Exchange Firebase token for backend JWT
        const response = await fetch(`${BASE_URL}/api/auth/firebase-signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: idToken }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.detail || "Authentication failed",
            };
        }

        // Save backend JWT tokens and user
        await saveTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
        });
        await saveUser(data.user);

        // Clear confirmation result
        confirmationResult = null;

        return {
            success: true,
            message: data.message,
            user: data.user,
            isNewUser: data.is_new_user,
        };
    } catch (error: any) {
        console.error("Firebase verification error:", error);

        // User-friendly error messages
        if (error.code === "auth/invalid-verification-code") {
            return { success: false, message: "Invalid OTP. Please try again." };
        } else if (error.code === "auth/code-expired") {
            return {
                success: false,
                message: "OTP expired. Please request a new one.",
            };
        }

        return { success: false, message: error.message || "Invalid OTP" };
    }
}

/**
 * Refresh the access token using refresh token.
 */
export async function refreshAccessToken(): Promise<boolean> {
    try {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
            return false;
        }

        const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
            // Refresh token expired - user needs to log in again
            await clearAuthData();
            return false;
        }

        const data = await response.json();

        await saveTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
        });
        await saveUser(data.user);

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Get current auth state (check if user is logged in).
 */
export async function getAuthState(): Promise<AuthState> {
    const accessToken = await getAccessToken();
    const user = await getUser();

    if (!accessToken || !user) {
        return { isAuthenticated: false, user: null, accessToken: null };
    }

    return { isAuthenticated: true, user, accessToken };
}

/**
 * Logout - clear all auth data.
 */
export async function logout(): Promise<void> {
    await clearAuthData();
}

/**
 * Update user profile.
 */
export async function updateProfile(
    updates: { name?: string; city?: string }
): Promise<{ success: boolean; message: string; user?: User }> {
    try {
        const token = await getAccessToken();

        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(`${BASE_URL}/api/auth/me?authorization=Bearer ${token}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, message: data.detail || "Update failed" };
        }

        // Update stored user
        await saveUser(data);

        return { success: true, message: "Profile updated", user: data };
    } catch (error) {
        return { success: false, message: "Network error" };
    }
}

// --------------------------------------------------------------------------
// Authenticated API Helper
// --------------------------------------------------------------------------

/**
 * Make an authenticated API request.
 * Automatically adds auth header and handles token refresh.
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    let token = await getAccessToken();

    // Add auth header
    const headers = {
        ...options.headers,
        "Content-Type": "application/json",
    };

    // Add token to URL as query param (temporary solution until we fix headers)
    const separator = url.includes("?") ? "&" : "?";
    const authUrl = token ? `${url}${separator}authorization=Bearer ${token}` : url;

    let response = await fetch(authUrl, { ...options, headers });

    // If 401, try to refresh token and retry
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
            token = await getAccessToken();
            const newAuthUrl = token
                ? `${url}${separator}authorization=Bearer ${token}`
                : url;
            response = await fetch(newAuthUrl, { ...options, headers });
        }
    }

    return response;
}
