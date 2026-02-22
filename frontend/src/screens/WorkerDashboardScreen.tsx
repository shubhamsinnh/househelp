/**
 * WorkerDashboardScreen.tsx
 * =========================
 * Main dashboard for workers showing:
 * - Profile summary with availability toggle
 * - Leads (who unlocked their contact)
 * - Quick stats
 */

import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Switch,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, CATEGORIES } from "../constants/theme";
import {
    getMyWorkerProfile,
    getMyLeads,
    updateWorkerAvailability,
    WorkerProfile,
    Lead,
} from "../services/api";

interface WorkerDashboardScreenProps {
    navigation: any;
}

export default function WorkerDashboardScreen({ navigation }: WorkerDashboardScreenProps) {
    const [profile, setProfile] = useState<WorkerProfile | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [profileData, leadsData] = await Promise.all([
                getMyWorkerProfile(),
                getMyLeads(),
            ]);

            setProfile(profileData);
            setLeads(leadsData?.leads || []);
        } catch (error) {
            console.error("Failed to load worker data:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    const handleToggleAvailability = async (value: boolean) => {
        if (!profile) return;

        setIsTogglingAvailability(true);
        const result = await updateWorkerAvailability({ is_available: value });
        setIsTogglingAvailability(false);

        if (result.success) {
            setProfile({ ...profile, is_available: value });
        } else {
            Alert.alert("Error", result.message);
        }
    };

    const getCategoryEmoji = (categoryId: string) => {
        const category = CATEGORIES.find((c) => c.id === categoryId);
        return category?.emoji || "👤";
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const renderLeadItem = ({ item }: { item: Lead }) => (
        <View style={styles.leadCard}>
            <View style={styles.leadAvatar}>
                <Text style={styles.leadAvatarText}>
                    {item.employer_name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={styles.leadInfo}>
                <Text style={styles.leadName}>{item.employer_name}</Text>
                <Text style={styles.leadMeta}>
                    {item.employer_city ? `${item.employer_city} • ` : ""}
                    {formatDate(item.unlocked_at)}
                </Text>
            </View>
            <View style={styles.leadBadge}>
                <Text style={styles.leadBadgeText}>May call</Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorEmoji}>😕</Text>
                    <Text style={styles.errorText}>
                        Could not load your worker profile
                    </Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={leads}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderLeadItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                    />
                }
                ListHeaderComponent={
                    <>
                        {/* Profile Summary */}
                        <View style={styles.profileCard}>
                            <View style={styles.profileHeader}>
                                <View style={styles.profileAvatar}>
                                    <Text style={styles.profileAvatarText}>
                                        {getCategoryEmoji(profile.category)}
                                    </Text>
                                </View>
                                <View style={styles.profileInfo}>
                                    <Text style={styles.profileName}>{profile.name}</Text>
                                    <Text style={styles.profileCategory}>
                                        {CATEGORIES.find((c) => c.id === profile.category)?.label ||
                                            profile.category}
                                    </Text>
                                    <Text style={styles.profileLocation}>
                                        {profile.locality ? `${profile.locality}, ` : ""}
                                        {profile.city}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => navigation.navigate("WorkerEditProfile")}
                                >
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Availability Toggle */}
                            <View style={styles.availabilityRow}>
                                <View>
                                    <Text style={styles.availabilityLabel}>
                                        {profile.is_available
                                            ? "You are Available for Work"
                                            : "You are Unavailable"}
                                    </Text>
                                    <Text style={styles.availabilityHint}>
                                        {profile.is_available
                                            ? "Families can contact you"
                                            : "Your profile is hidden from searches"}
                                    </Text>
                                </View>
                                {isTogglingAvailability ? (
                                    <ActivityIndicator color={COLORS.primary} />
                                ) : (
                                    <Switch
                                        value={profile.is_available}
                                        onValueChange={handleToggleAvailability}
                                        trackColor={{
                                            false: COLORS.border,
                                            true: COLORS.success,
                                        }}
                                        thumbColor="#fff"
                                    />
                                )}
                            </View>
                        </View>

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{leads.length}</Text>
                                <Text style={styles.statLabel}>Total Leads</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.statCard}
                                onPress={() => navigation.navigate("WorkerReviews")}
                            >
                                <Text style={styles.statValue}>
                                    {profile.rating_avg?.toFixed(1) || "0.0"} ★
                                </Text>
                                <Text style={styles.statLabel}>
                                    {profile.rating_count} Reviews
                                </Text>
                            </TouchableOpacity>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>
                                    ₹{profile.expected_salary.toLocaleString()}
                                </Text>
                                <Text style={styles.statLabel}>Salary</Text>
                            </View>
                        </View>

                        {/* Leads Header */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Leads</Text>
                            <Text style={styles.sectionSubtitle}>
                                Families who unlocked your contact
                            </Text>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={styles.emptyTitle}>No leads yet</Text>
                        <Text style={styles.emptyText}>
                            When families unlock your contact, they will appear here.
                            Make sure you're marked as available!
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: SPACING.xl,
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: SPACING.md,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: SPACING.lg,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
    },
    retryButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    listContent: {
        padding: SPACING.md,
    },
    profileCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    profileHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: SPACING.lg,
    },
    profileAvatar: {
        width: 60,
        height: 60,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    profileAvatarText: {
        fontSize: 28,
    },
    profileInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    profileName: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    profileCategory: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "600",
    },
    profileLocation: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    editButton: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
    },
    editButtonText: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    availabilityRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    availabilityLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    availabilityHint: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: "row",
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    sectionHeader: {
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    leadCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
    leadAvatar: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    leadAvatarText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    leadInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    leadName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    leadMeta: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    leadBadge: {
        backgroundColor: COLORS.success + "20",
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
    },
    leadBadgeText: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: SPACING.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: SPACING.md,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 20,
        paddingHorizontal: SPACING.xl,
    },
});
