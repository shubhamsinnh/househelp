/**
 * UserProfileScreen
 * =================
 * Displays and allows editing of the current user's profile.
 * Shows name, phone, city, and account info.
 */

import React, { useState, useContext, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    ActivityIndicator,
} from "react-native";
import { COLORS, SPACING, RADIUS, CITIES } from "../constants/theme";
import { AuthContext } from "../../App";
import { authFetch } from "../services/auth";
import { BASE_URL } from "../services/api";

export default function UserProfileScreen({ navigation }: any) {
    const { user, setUser } = useContext(AuthContext);
    const [name, setName] = useState(user?.name || "");
    const [city, setCity] = useState(user?.city || "");
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const changed = name !== (user?.name || "") || city !== (user?.city || "");
        setHasChanges(changed);
    }, [name, city, user]);

    const handleSave = async () => {
        if (!hasChanges) return;

        setIsSaving(true);
        try {
            const response = await authFetch(`${BASE_URL}/api/auth/me`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, city }),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUser({ ...user!, ...updatedUser });
                Alert.alert("Success", "Profile updated successfully!");
                setHasChanges(false);
            } else {
                Alert.alert("Error", "Failed to update profile. Please try again.");
            }
        } catch (error) {
            Alert.alert("Error", "Network error. Please check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Profile Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(name || user?.phone || "U").charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.phoneNumber}>{user?.phone}</Text>
                    <Text style={styles.memberSince}>
                        Member since {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </Text>
                </View>

                {/* Form Fields */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Personal Details</Text>

                    {/* Name Field */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

                    {/* City Field */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>City</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => setShowCityPicker(!showCityPicker)}
                        >
                            <Text style={city ? styles.selectValue : styles.selectPlaceholder}>
                                {city || "Select your city"}
                            </Text>
                            <Text style={styles.selectArrow}>▾</Text>
                        </TouchableOpacity>

                        {showCityPicker && (
                            <View style={styles.dropdown}>
                                {CITIES.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[
                                            styles.dropdownOption,
                                            c === city && styles.dropdownOptionActive,
                                        ]}
                                        onPress={() => {
                                            setCity(c);
                                            setShowCityPicker(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownOptionText,
                                                c === city && styles.dropdownOptionTextActive,
                                            ]}
                                        >
                                            {c}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Phone (read-only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.readOnlyInput}>
                            <Text style={styles.readOnlyText}>{user?.phone}</Text>
                            <Text style={styles.verifiedBadge}>Verified</Text>
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                {hasChanges && (
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color={COLORS.textPrimary} />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                )}

                {/* Account Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Role</Text>
                        <Text style={styles.infoValue}>
                            {user?.is_worker ? "Worker" : "Customer"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>User ID</Text>
                        <Text style={styles.infoValue}>#{user?.id}</Text>
                    </View>
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.card,
        justifyContent: "center",
        alignItems: "center",
    },
    backButtonText: {
        fontSize: 20,
        color: COLORS.textPrimary,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    avatarSection: {
        alignItems: "center",
        paddingVertical: SPACING.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: SPACING.md,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    phoneNumber: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    memberSince: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
    },
    formSection: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    inputLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    input: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: 16,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectInput: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectValue: {
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    selectPlaceholder: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
    selectArrow: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    dropdown: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        marginTop: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxHeight: 200,
    },
    dropdownOption: {
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    dropdownOptionActive: {
        backgroundColor: COLORS.primary + "20",
    },
    dropdownOptionText: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    dropdownOptionTextActive: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    readOnlyInput: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    readOnlyText: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
    verifiedBadge: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: "600",
        backgroundColor: COLORS.success + "20",
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        marginHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: "center",
        marginBottom: SPACING.lg,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    infoSection: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.xxl,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    infoLabel: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    infoValue: {
        fontSize: 15,
        color: COLORS.textPrimary,
        fontWeight: "500",
    },
});
