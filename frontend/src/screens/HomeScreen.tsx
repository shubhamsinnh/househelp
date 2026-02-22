/**
 * HomeScreen
 * ==========
 * The first screen the user sees after the app loads.
 * Allows city selection and service category selection.
 *
 * FLOW: User selects a city → taps a category card → taken to SearchScreen.
 *
 * DESIGN DECISIONS:
 * - Large emoji-based category cards for low-literacy accessibility.
 * - City picker at the top for quick switching.
 * - Premium dark gradient background with vibrant accent colors.
 */

import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from "react-native";
import { COLORS, SPACING, RADIUS, CATEGORIES, CITIES } from "../constants/theme";

export default function HomeScreen({ navigation }: any) {
    const [selectedCity, setSelectedCity] = useState("Lucknow");
    const [showCityPicker, setShowCityPicker] = useState(false);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>🏠 House Help</Text>
                    <Text style={styles.tagline}>
                        Find trusted domestic help near you
                    </Text>
                </View>

                {/* City Selector */}
                <TouchableOpacity
                    style={styles.citySelector}
                    onPress={() => setShowCityPicker(!showCityPicker)}
                >
                    <Text style={styles.citySelectorLabel}>📍 Your City</Text>
                    <Text style={styles.citySelectorValue}>{selectedCity} ▾</Text>
                </TouchableOpacity>

                {showCityPicker && (
                    <View style={styles.cityDropdown}>
                        {CITIES.map((city) => (
                            <TouchableOpacity
                                key={city}
                                style={[
                                    styles.cityOption,
                                    city === selectedCity && styles.cityOptionActive,
                                ]}
                                onPress={() => {
                                    setSelectedCity(city);
                                    setShowCityPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.cityOptionText,
                                        city === selectedCity && styles.cityOptionTextActive,
                                    ]}
                                >
                                    {city}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Category Cards */}
                <Text style={styles.sectionTitle}>What help do you need?</Text>
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={styles.categoryCard}
                            onPress={() =>
                                navigation.navigate("Search", {
                                    city: selectedCity,
                                    category: cat.id,
                                    categoryLabel: cat.label,
                                })
                            }
                        >
                            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                            <Text style={styles.categoryLabel}>{cat.label}</Text>
                            <Text style={styles.categoryLabelHi}>{cat.labelHi}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Trust Banner */}
                <View style={styles.trustBanner}>
                    <Text style={styles.trustTitle}>✅ How it works</Text>
                    <Text style={styles.trustStep}>1. Browse worker profiles for free</Text>
                    <Text style={styles.trustStep}>2. Pay ₹99 to unlock their contact</Text>
                    <Text style={styles.trustStep}>3. Call and negotiate directly</Text>
                    <Text style={styles.trustDisclaimer}>
                        House Help is a discovery platform. We connect — you decide.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.lg,
    },
    logo: {
        fontSize: 32,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    tagline: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    citySelector: {
        marginHorizontal: SPACING.lg,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    citySelectorLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    citySelectorValue: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: "700",
    },
    cityDropdown: {
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.sm,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cityOption: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.sm,
    },
    cityOptionActive: {
        backgroundColor: COLORS.primary + "20",
    },
    cityOptionText: {
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    cityOptionTextActive: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.xl,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: SPACING.md,
        justifyContent: "space-between",
    },
    categoryCard: {
        width: "47%",
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
        alignItems: "center",
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryEmoji: {
        fontSize: 40,
        marginBottom: SPACING.sm,
    },
    categoryLabel: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    categoryLabelHi: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    trustBanner: {
        margin: SPACING.lg,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.success + "30",
    },
    trustTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.success,
        marginBottom: SPACING.sm,
    },
    trustStep: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        paddingLeft: SPACING.sm,
    },
    trustDisclaimer: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: SPACING.md,
        fontStyle: "italic",
    },
});
