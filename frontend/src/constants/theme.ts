/**
 * App Constants
 * =============
 * Centralized design tokens and configuration values.
 * Change colors, fonts, or pricing here and it updates everywhere.
 */

// Brand Colors — Premium dark theme with orange accents
export const COLORS = {
    // Primary brand
    primary: "#FF6B35",       // Warm orange — CTA buttons, highlights
    primaryDark: "#E85A24",   // Darker shade for pressed states
    primaryLight: "#FF8C5A",  // Lighter shade for backgrounds

    // Backgrounds
    background: "#0F0F1A",    // Deep navy-black
    card: "#1A1A2E",          // Card backgrounds
    cardHover: "#22223A",     // Card pressed/hover state
    surface: "#16162A",       // Elevated surfaces

    // Text
    textPrimary: "#FFFFFF",
    textSecondary: "#A0A0B8",
    textMuted: "#6C6C80",

    // Status
    success: "#10B981",       // Green — verified badge
    warning: "#F59E0B",       // Yellow — alerts
    danger: "#EF4444",        // Red — errors
    locked: "#6366F1",        // Indigo — locked/premium content

    // Misc
    border: "#2A2A40",
    star: "#FFC107",          // Star rating color
};

// Consistent spacing scale (in pixels)
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Consistent border radius
export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};

// Service categories with emoji icons (low-literacy friendly)
export const CATEGORIES = [
    { id: "maid", label: "Maid", emoji: "🧹", labelHi: "सफाई वाली" },
    { id: "cook", label: "Cook", emoji: "🍳", labelHi: "रसोइया" },
    { id: "babysitter", label: "Babysitter", emoji: "👶", labelHi: "आया" },
    { id: "driver", label: "Driver", emoji: "🚗", labelHi: "ड्राइवर" },
    { id: "elderly_care", label: "Elder Care", emoji: "🧓", labelHi: "बुज़ुर्गों की देखभाल" },
];

// Supported cities (Tier 2 focus)
export const CITIES = [
    "Lucknow", "Indore", "Jaipur", "Bhopal", "Patna",
    "Chandigarh", "Nagpur", "Vadodara", "Kochi", "Dehradun",
];

// Pricing
export const PRICING = {
    contactUnlock: 99,
    bgvCheck: 499,
};
