/**
 * WorkerProfileScreen
 * ===================
 * The detailed profile page for a single worker.
 * This is where the user decides whether to PAY ₹99 to unlock their phone number.
 *
 * CONVERSION STRATEGY:
 * - Show rich profile info (video link, languages, experience) to build trust.
 * - Display the "Unlock Contact" button as a large, prominent CTA at the bottom.
 * - Show the disclaimer BEFORE payment to protect us legally.
 * - After unlock, show the real phone number with a "Call Now" button.
 */

import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StatusBar,
    Linking,
} from "react-native";
import { COLORS, SPACING, RADIUS, PRICING } from "../constants/theme";
import { getWorkerProfile, unlockContact, Worker } from "../services/api";

export default function WorkerProfileScreen({ route, navigation }: any) {
    const { workerId } = route.params;
    const [worker, setWorker] = useState<Worker | null>(null);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);
    const [unlockedPhone, setUnlockedPhone] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getWorkerProfile(workerId);
            setWorker(data);
        } catch (err) {
            Alert.alert("Error", "Could not load profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async () => {
        Alert.alert(
            "Unlock Contact — ₹99",
            "You will see this worker's real phone number.\n\n⚠️ Disclaimer: House Help is a discovery platform. We do NOT verify skills, conduct, or salary. Please verify the worker independently before hiring.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Pay ₹99 & Unlock",
                    onPress: async () => {
                        try {
                            setUnlocking(true);
                            // In production, this would first trigger Razorpay SDK
                            // and pass the real payment_id from the callback.
                            const mockPaymentId = "pay_mock_" + Date.now();
                            const result = await unlockContact(1, workerId, mockPaymentId);
                            setUnlockedPhone(result.real_phone_number);
                            Alert.alert("✅ Unlocked!", `You can now call ${result.worker_name}.`);
                        } catch (err) {
                            Alert.alert("Error", "Unlock failed. Please try again.");
                        } finally {
                            setUnlocking(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCallWorker = () => {
        if (unlockedPhone) {
            Linking.openURL(`tel:${unlockedPhone}`);
        }
    };

    const renderStars = (rating: number | null) => {
        const stars = rating || 0;
        return "★".repeat(Math.round(stars)) + "☆".repeat(5 - Math.round(stars));
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!worker) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>Worker not found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Back Button */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtn}>← Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroAvatar}>
                        <Text style={styles.heroAvatarText}>{worker.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.heroName}>{worker.name}</Text>
                    <Text style={styles.heroCategory}>
                        {worker.category.charAt(0).toUpperCase() + worker.category.slice(1)}
                        {worker.experience_years ? ` · ${worker.experience_years} years experience` : ""}
                    </Text>
                    {worker.is_verified && (
                        <View style={styles.verifiedBadgeLarge}>
                            <Text style={styles.verifiedBadgeText}>✓ Background Verified</Text>
                        </View>
                    )}
                    <Text style={styles.heroRating}>
                        <Text style={{ color: COLORS.star, fontSize: 20 }}>
                            {renderStars(worker.rating_avg)}
                        </Text>
                        {"  "}{worker.rating_avg?.toFixed(1) || "0.0"} ({worker.rating_count} reviews)
                    </Text>
                </View>

                {/* Info Cards */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>💰 Expected Salary</Text>
                        <Text style={styles.infoValue}>₹{worker.expected_salary.toLocaleString()}/month</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>📍 Location</Text>
                        <Text style={styles.infoValue}>{worker.locality || worker.city}</Text>
                    </View>
                    {worker.languages && (
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>🗣️ Languages</Text>
                            <Text style={styles.infoValue}>{worker.languages}</Text>
                        </View>
                    )}
                    {worker.bio_video_url && (
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>🎥 Intro Video</Text>
                            <Text style={[styles.infoValue, { color: COLORS.primary }]}>Watch Video →</Text>
                        </View>
                    )}
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerTitle}>⚠️ Important</Text>
                    <Text style={styles.disclaimerText}>
                        House Help is a discovery platform. We help you find domestic workers but do NOT
                        employ, manage, or guarantee the conduct of any worker. Salary negotiation,
                        terms of work, and hiring decisions are solely between you and the worker.
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
                {unlockedPhone ? (
                    <TouchableOpacity style={styles.callBtn} onPress={handleCallWorker}>
                        <Text style={styles.callBtnText}>📞 Call {unlockedPhone}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.unlockMainBtn}
                        onPress={handleUnlock}
                        disabled={unlocking}
                    >
                        {unlocking ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.unlockMainBtnText}>
                                🔓 Unlock Contact — ₹{PRICING.contactUnlock}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { color: COLORS.danger, fontSize: 16 },
    topBar: {
        paddingTop: SPACING.xxl, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
    },
    backBtn: { color: COLORS.primary, fontSize: 16, fontWeight: "600" },

    // Hero
    heroSection: { alignItems: "center", paddingVertical: SPACING.lg },
    heroAvatar: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: COLORS.primary + "30",
        justifyContent: "center", alignItems: "center",
        marginBottom: SPACING.md,
    },
    heroAvatarText: { color: COLORS.primary, fontSize: 36, fontWeight: "800" },
    heroName: { color: COLORS.textPrimary, fontSize: 26, fontWeight: "800" },
    heroCategory: { color: COLORS.textSecondary, fontSize: 15, marginTop: SPACING.xs },
    verifiedBadgeLarge: {
        backgroundColor: COLORS.success + "20",
        paddingHorizontal: 16, paddingVertical: 6,
        borderRadius: RADIUS.full, marginTop: SPACING.sm,
    },
    verifiedBadgeText: { color: COLORS.success, fontSize: 13, fontWeight: "700" },
    heroRating: { color: COLORS.textSecondary, fontSize: 15, marginTop: SPACING.sm },

    // Info Cards
    infoSection: { paddingHorizontal: SPACING.lg },
    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md, padding: SPACING.md,
        marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    infoLabel: { color: COLORS.textMuted, fontSize: 14 },
    infoValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" },

    // Disclaimer
    disclaimerBox: {
        margin: SPACING.lg, backgroundColor: COLORS.warning + "10",
        borderRadius: RADIUS.md, padding: SPACING.md,
        borderWidth: 1, borderColor: COLORS.warning + "30",
    },
    disclaimerTitle: { color: COLORS.warning, fontSize: 14, fontWeight: "700", marginBottom: SPACING.xs },
    disclaimerText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },

    // Bottom CTA
    bottomCTA: {
        padding: SPACING.lg, backgroundColor: COLORS.surface,
        borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    unlockMainBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
        alignItems: "center",
    },
    unlockMainBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
    callBtn: {
        backgroundColor: COLORS.success,
        paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
        alignItems: "center",
    },
    callBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
});
