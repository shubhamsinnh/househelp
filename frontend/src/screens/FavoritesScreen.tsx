/**
 * FavoritesScreen
 * ===============
 * Shows all workers the user has saved/favorited.
 * Allows quick access to worker profiles.
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
    RefreshControl,
    Alert,
} from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { getMyFavorites, removeFavorite, Worker } from "../services/api";

export default function FavoritesScreen({ navigation }: any) {
    const [favorites, setFavorites] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const data = await getMyFavorites();
            setFavorites(data.favorites);
        } catch (err) {
            setError("Failed to load favorites. Please try again.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRemoveFavorite = async (workerId: number, workerName: string) => {
        Alert.alert(
            "Remove from Favorites?",
            `Are you sure you want to remove ${workerName} from your favorites?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeFavorite(workerId);
                            setFavorites(favorites.filter((f) => f.id !== workerId));
                        } catch (err) {
                            Alert.alert("Error", "Failed to remove from favorites.");
                        }
                    },
                },
            ]
        );
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

    const renderStars = (rating: number | null) => {
        if (!rating) return null;
        const fullStars = Math.floor(rating);
        return (
            <View style={styles.starsContainer}>
                {[...Array(5)].map((_, i) => (
                    <Text key={i} style={styles.star}>
                        {i < fullStars ? "★" : "☆"}
                    </Text>
                ))}
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
        );
    };

    const renderFavoriteCard = ({ item }: { item: Worker }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("WorkerProfile", { workerId: item.id })}
            activeOpacity={0.8}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                    <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
                </View>

                <View style={styles.cardCenter}>
                    <View style={styles.nameRow}>
                        <Text style={styles.workerName}>{item.name}</Text>
                        {item.is_verified && (
                            <Text style={styles.verifiedBadge}>✓ Verified</Text>
                        )}
                    </View>
                    <Text style={styles.categoryCity}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)} • {item.city}
                    </Text>
                    {renderStars(item.rating_avg)}
                    <Text style={styles.salary}>₹{item.expected_salary.toLocaleString()}/month</Text>
                </View>

                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFavorite(item.id, item.name)}
                >
                    <Text style={styles.removeButtonText}>♥</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💝</Text>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
                Save workers you like for quick access later. Tap the heart icon on any worker profile.
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
                <Text style={styles.loadingText}>Loading your favorites...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Favorites</Text>
                <Text style={styles.favoritesCount}>
                    {favorites.length} {favorites.length === 1 ? "worker" : "workers"} saved
                </Text>
            </View>

            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => loadFavorites()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderFavoriteCard}
                    contentContainerStyle={favorites.length === 0 ? styles.emptyContainer : styles.listContainer}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => loadFavorites(true)}
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
    favoritesCount: {
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
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
    },
    cardContent: {
        flexDirection: "row",
        padding: SPACING.md,
    },
    cardLeft: {
        marginRight: SPACING.md,
    },
    categoryEmoji: {
        fontSize: 36,
    },
    cardCenter: {
        flex: 1,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    workerName: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    verifiedBadge: {
        fontSize: 11,
        color: COLORS.success,
        backgroundColor: COLORS.success + "20",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: SPACING.sm,
        fontWeight: "600",
    },
    categoryCity: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    starsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    star: {
        fontSize: 14,
        color: COLORS.star,
    },
    ratingText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    salary: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.primary,
    },
    removeButton: {
        padding: SPACING.sm,
    },
    removeButtonText: {
        fontSize: 24,
        color: COLORS.danger,
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
