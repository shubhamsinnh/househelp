/**
 * WorkerReviewsScreen.tsx
 * =======================
 * Shows all reviews received by the worker.
 * Helps workers understand their reputation.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { getMyWorkerReviews, WorkerReview } from "../services/api";

interface WorkerReviewsScreenProps {
    navigation: any;
}

export default function WorkerReviewsScreen({ navigation }: WorkerReviewsScreenProps) {
    const [reviews, setReviews] = useState<WorkerReview[]>([]);
    const [averageRating, setAverageRating] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadReviews = useCallback(async () => {
        try {
            const data = await getMyWorkerReviews();
            setReviews(data.reviews);
            setAverageRating(data.average_rating);
        } catch (error) {
            console.error("Failed to load reviews:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadReviews();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const renderStars = (rating: number) => {
        return "★".repeat(rating) + "☆".repeat(5 - rating);
    };

    const renderReviewItem = ({ item }: { item: WorkerReview }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerAvatarText}>
                        {item.reviewer_name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{item.reviewer_name}</Text>
                    <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{item.rating} ★</Text>
                </View>
            </View>

            {item.comment && (
                <Text style={styles.reviewComment}>{item.comment}</Text>
            )}

            {item.tags && (
                <View style={styles.tagsContainer}>
                    {item.tags.split(",").map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag.trim()}</Text>
                        </View>
                    ))}
                </View>
            )}
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

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={reviews}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderReviewItem}
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
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.backButton}
                            >
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.title}>My Reviews</Text>
                        </View>

                        {/* Rating Summary */}
                        <View style={styles.summaryCard}>
                            <View style={styles.ratingLarge}>
                                <Text style={styles.ratingLargeValue}>
                                    {averageRating.toFixed(1)}
                                </Text>
                                <Text style={styles.ratingLargeStars}>
                                    {renderStars(Math.round(averageRating))}
                                </Text>
                                <Text style={styles.ratingLargeCount}>
                                    Based on {reviews.length} reviews
                                </Text>
                            </View>

                            {/* Rating Distribution */}
                            <View style={styles.distribution}>
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = reviews.filter(
                                        (r) => r.rating === star
                                    ).length;
                                    const percentage =
                                        reviews.length > 0
                                            ? (count / reviews.length) * 100
                                            : 0;
                                    return (
                                        <View key={star} style={styles.distributionRow}>
                                            <Text style={styles.distributionLabel}>
                                                {star} ★
                                            </Text>
                                            <View style={styles.distributionBar}>
                                                <View
                                                    style={[
                                                        styles.distributionFill,
                                                        { width: `${percentage}%` },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.distributionCount}>
                                                {count}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Reviews Section Title */}
                        {reviews.length > 0 && (
                            <Text style={styles.sectionTitle}>All Reviews</Text>
                        )}
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>⭐</Text>
                        <Text style={styles.emptyTitle}>No reviews yet</Text>
                        <Text style={styles.emptyText}>
                            When families review your work, their feedback will appear
                            here. Keep up the great work!
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
    listContent: {
        padding: SPACING.md,
    },
    header: {
        marginBottom: SPACING.lg,
    },
    backButton: {
        marginBottom: SPACING.md,
    },
    backButtonText: {
        color: COLORS.primary,
        fontSize: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    summaryCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    ratingLarge: {
        alignItems: "center",
        marginBottom: SPACING.lg,
        paddingBottom: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    ratingLargeValue: {
        fontSize: 48,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    ratingLargeStars: {
        fontSize: 24,
        color: COLORS.star,
        marginVertical: SPACING.xs,
    },
    ratingLargeCount: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    distribution: {
        gap: SPACING.sm,
    },
    distributionRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    distributionLabel: {
        width: 36,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    distributionBar: {
        flex: 1,
        height: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 4,
        marginHorizontal: SPACING.sm,
        overflow: "hidden",
    },
    distributionFill: {
        height: "100%",
        backgroundColor: COLORS.star,
        borderRadius: 4,
    },
    distributionCount: {
        width: 24,
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "right",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    reviewCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
    reviewHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: SPACING.sm,
    },
    reviewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    reviewerAvatarText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
    },
    reviewerInfo: {
        flex: 1,
        marginLeft: SPACING.sm,
    },
    reviewerName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    reviewDate: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    ratingBadge: {
        backgroundColor: COLORS.star + "20",
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.star,
    },
    reviewComment: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginTop: SPACING.xs,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    tag: {
        backgroundColor: COLORS.success + "20",
        paddingVertical: 2,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
    },
    tagText: {
        fontSize: 12,
        color: COLORS.success,
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
