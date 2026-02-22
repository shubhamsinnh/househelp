/**
 * SearchScreen
 * ============
 * Shows a list of workers filtered by city and category.
 * 
 * FLOW: User arrives from HomeScreen → sees worker cards → taps one → WorkerProfile.
 *
 * KEY DESIGN DECISIONS:
 * - Phone numbers are shown as "🔒 Locked" to create curiosity and drive unlocks.
 * - Verified workers get a green badge to boost trust.
 * - Star ratings shown prominently to help users decide.
 * - Salary displayed upfront to reduce friction (no surprises).
 */

import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
} from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { searchWorkers, Worker } from "../services/api";

export default function SearchScreen({ route, navigation }: any) {
    const { city, category, categoryLabel } = route.params;
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadWorkers();
    }, []);

    const loadWorkers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await searchWorkers(city, category);
            setWorkers(data);
        } catch (err) {
            setError("Could not load workers. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating: number | null) => {
        const stars = rating || 0;
        return "★".repeat(Math.round(stars)) + "☆".repeat(5 - Math.round(stars));
    };

    const renderWorkerCard = ({ item }: { item: Worker }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("WorkerProfile", { workerId: item.id })}
        >
            {/* Top row: Name + Verified Badge */}
            <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.workerName}>{item.name}</Text>
                        {item.is_verified && (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>✓ Verified</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.workerCategory}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        {item.experience_years ? ` · ${item.experience_years}yr exp` : ""}
                    </Text>
                    <Text style={styles.workerRating}>
                        <Text style={{ color: COLORS.star }}>{renderStars(item.rating_avg)}</Text>
                        {" "}({item.rating_count} reviews)
                    </Text>
                </View>
            </View>

            {/* Details Row */}
            <View style={styles.detailsRow}>
                <View style={styles.detailChip}>
                    <Text style={styles.detailLabel}>💰 Salary</Text>
                    <Text style={styles.detailValue}>₹{item.expected_salary.toLocaleString()}/mo</Text>
                </View>
                {item.locality && (
                    <View style={styles.detailChip}>
                        <Text style={styles.detailLabel}>📍 Area</Text>
                        <Text style={styles.detailValue}>{item.locality}</Text>
                    </View>
                )}
                {item.languages && (
                    <View style={styles.detailChip}>
                        <Text style={styles.detailLabel}>🗣️ Lang</Text>
                        <Text style={styles.detailValue}>{item.languages}</Text>
                    </View>
                )}
            </View>

            {/* Locked Phone CTA */}
            <View style={styles.lockedRow}>
                <Text style={styles.lockedText}>🔒 Contact Locked</Text>
                <TouchableOpacity
                    style={styles.unlockBtn}
                    onPress={() => navigation.navigate("WorkerProfile", { workerId: item.id })}
                >
                    <Text style={styles.unlockBtnText}>Unlock ₹99 →</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Finding {categoryLabel}s in {city}...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadWorkers}>
                    <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {categoryLabel}s in {city}
                </Text>
                <Text style={styles.resultCount}>{workers.length} found</Text>
            </View>

            {workers.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyEmoji}>🔍</Text>
                    <Text style={styles.emptyText}>
                        No {categoryLabel}s found in {city} yet.
                    </Text>
                    <Text style={styles.emptySubtext}>
                        We're expanding here soon. Check back later!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={workers}
                    renderItem={renderWorkerCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: SPACING.md }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.lg },
    header: {
        paddingTop: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { color: COLORS.primary, fontSize: 16, fontWeight: "600" },
    headerTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800", marginTop: SPACING.sm },
    resultCount: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
    loadingText: { color: COLORS.textSecondary, marginTop: SPACING.md, fontSize: 15 },
    errorText: { color: COLORS.danger, fontSize: 16, textAlign: "center" },
    retryBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: RADIUS.md, marginTop: SPACING.md },
    retryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
    emptyEmoji: { fontSize: 48 },
    emptyText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "600", marginTop: SPACING.md, textAlign: "center" },
    emptySubtext: { color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.sm, textAlign: "center" },

    // Worker Card
    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: { flexDirection: "row", marginBottom: SPACING.md },
    avatarCircle: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: COLORS.primary + "25",
        justifyContent: "center", alignItems: "center",
        marginRight: SPACING.md,
    },
    avatarText: { color: COLORS.primary, fontSize: 22, fontWeight: "800" },
    cardInfo: { flex: 1 },
    nameRow: { flexDirection: "row", alignItems: "center" },
    workerName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
    verifiedBadge: {
        backgroundColor: COLORS.success + "20",
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: RADIUS.full, marginLeft: SPACING.sm,
    },
    verifiedText: { color: COLORS.success, fontSize: 11, fontWeight: "700" },
    workerCategory: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
    workerRating: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },

    detailsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: SPACING.md },
    detailChip: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        marginRight: SPACING.sm, marginBottom: SPACING.xs,
    },
    detailLabel: { color: COLORS.textMuted, fontSize: 11 },
    detailValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "600" },

    lockedRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: COLORS.locked + "15",
        borderRadius: RADIUS.md, padding: SPACING.sm,
    },
    lockedText: { color: COLORS.locked, fontSize: 14, fontWeight: "600" },
    unlockBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
    },
    unlockBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
