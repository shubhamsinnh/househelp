/**
 * Firebase Configuration
 * ======================
 * This file initializes Firebase for the House Help app.
 *
 * TO GET YOUR FIREBASE CONFIG:
 * 1. Go to https://console.firebase.google.com/
 * 2. Select your "House Help" project (or create one)
 * 3. Click the gear icon → Project Settings
 * 4. Scroll down to "Your apps" → Web app
 * 5. Copy the firebaseConfig object
 * 6. Paste it below, replacing the placeholder values
 *
 * SECURITY NOTE:
 * - These values are NOT secrets (they're designed to be public)
 * - Firebase security is enforced by Security Rules, not by hiding config
 * - It's safe to commit this file to git
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your Firebase project configuration
// Get this from Firebase Console → Project Settings → General → Your apps
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and export it
export const auth = getAuth(app);

// For debugging: Log when Firebase is initialized
console.log("✅ Firebase initialized for project:", firebaseConfig.projectId);
