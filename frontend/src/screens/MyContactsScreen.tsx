/**
 * MyContactsScreen
 * ================
 * Shows all workers whose contact the user has unlocked.
 * Displays real phone numbers since user has paid for them.
 */

import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Linking,
    RefreshControl,
} from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { getMyUnlocks, UnlockedContact } from "../services/api";

export default function MyContactsScreen({ navigation }: any) {
    const [contacts, setContacts] = useState<UnlockedContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const data = await getMyUnlocks();
            setContacts(data.unlocks);
        } catch (err) {
            setError("Failed to load contacts. Please try again.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const getCategoryEmoji = (category: string) => {
        const emojis: { [key: string]: string } = {
            maid: "🧹",
            cook: "🍳",
            babysitter: "👶",
            driver: "🚗",
            elderly_care: "🧓",
        };
        return emojis[category] || "👤";
    };

    const renderContactCard = ({ item }: { item: UnlockedContact }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                    <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.worker_category)}</Text>
                    <View style={styles.cardDetails}>
                        <Text style={styles.workerName}>{item.worker_name}</Text>
                        <Text style={styles.categoryCity}>
                            {item.worker_category.charAt(0).toUpperCase() + item.worker_category.slice(1)} • {item.worker_city}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(item.phone)}
                >
                    <Text style={styles.callButtonText}>📞 Call</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.phoneRow}>
                <Text style={styles.phoneLabel}>Phone:</Text>
                <Text style={styles.phoneNumber}>{item.phone}</Text>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.unlockedDate}>
                    Unlocked: {formatDate(item.unlocked_at)}
                </Text>
                <Text style={styles.amountPaid}>
                    Paid: ₹{item.amount_paid}
                </Text>
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📱</Text>
            <Text style={styles.emptyTitle}>No Contacts Yet</Text>
            <Text style={styles.emptySubtitle}>
                Workers you unlock will appear here with their real phone numbers.
            </Text>
            <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate("Home")}
            >
                <Text style={styles.browseButtonText}>Browse Workers</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading your contacts...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Contacts</Text>
                <Text style={styles.contactCount}>
                    {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} unlocked
                </Text>
            </View>

            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => loadContacts()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.unlock_id.toString()}
                    renderItem={renderContactCard}
                    contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : styles.listContainer}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => loadContacts(true)}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
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
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    header: {
        paddingTop: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    contactCount: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    listContainer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    emptyContainer: {
        flex: 1,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.md,
    },
    cardInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    categoryEmoji: {
        fontSize: 32,
        marginRight: SPACING.md,
    },
    cardDetails: {
        flex: 1,
    },
    workerName: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    categoryCity: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    callButton: {
        backgroundColor: COLORS.success,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
    },
    callButtonText: {
        color: COLORS.textPrimary,
        fontWeight: "700",
        fontSize: 14,
    },
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.sm,
        padding: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    phoneLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginRight: SPACING.sm,
    },
    phoneNumber: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    unlockedDate: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    amountPaid: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: SPACING.xl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    emptySubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: SPACING.xl,
    },
    browseButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
    },
    browseButtonText: {
        color: COLORS.textPrimary,
        fontWeight: "700",
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: SPACING.xl,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.danger,
        textAlign: "center",
        marginBottom: SPACING.md,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
    },
    retryButtonText: {
        color: COLORS.textPrimary,
        fontWeight: "600",
    },
});
