/**
 * WorkerRegistrationScreen.tsx
 * ============================
 * Allows users to register as workers on the platform.
 * Collects essential profile information.
 */

import React, { useState, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, CATEGORIES, CITIES } from "../constants/theme";
import { registerAsWorker } from "../services/api";
import { getUser, saveUser } from "../services/auth";
import { AuthContext } from "../../App";

interface WorkerRegistrationScreenProps {
    navigation: any;
    onRegistrationSuccess?: () => void;
}

export default function WorkerRegistrationScreen({
    navigation,
    onRegistrationSuccess,
}: WorkerRegistrationScreenProps) {
    const { setUser } = useContext(AuthContext);

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [city, setCity] = useState("");
    const [locality, setLocality] = useState("");
    const [expectedSalary, setExpectedSalary] = useState("");
    const [experienceYears, setExperienceYears] = useState("");
    const [languages, setLanguages] = useState("Hindi");
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert("Required", "Please enter your name");
            return;
        }
        if (!category) {
            Alert.alert("Required", "Please select your service category");
            return;
        }
        if (!city) {
            Alert.alert("Required", "Please select your city");
            return;
        }
        if (!expectedSalary || parseInt(expectedSalary) < 1000) {
            Alert.alert("Required", "Please enter a valid salary expectation");
            return;
        }

        setIsLoading(true);

        const result = await registerAsWorker({
            name: name.trim(),
            category,
            city,
            locality: locality.trim() || undefined,
            expected_salary: parseInt(expectedSalary),
            experience_years: experienceYears ? parseInt(experienceYears) : undefined,
            languages: languages.trim() || undefined,
        });

        setIsLoading(false);

        if (result.success) {
            // Update local user state to reflect worker status
            const currentUser = await getUser();
            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    is_worker: true,
                    worker_id: result.worker_id || null,
                    role: "worker",
                };
                await saveUser(updatedUser);
                setUser(updatedUser);
            }

            Alert.alert(
                "Welcome!",
                "Your worker profile has been created. You can now receive job leads!",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            if (onRegistrationSuccess) {
                                onRegistrationSuccess();
                            } else {
                                navigation.goBack();
                            }
                        },
                    },
                ]
            );
        } else {
            Alert.alert("Error", result.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>Become a Worker</Text>
                        <Text style={styles.subtitle}>
                            Join House Help and get discovered by families in your city
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your name"
                                placeholderTextColor={COLORS.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Category Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Service Type *</Text>
                            <View style={styles.categoryGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryChip,
                                            category === cat.id && styles.categoryChipSelected,
                                        ]}
                                        onPress={() => setCategory(cat.id)}
                                    >
                                        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                                        <Text
                                            style={[
                                                styles.categoryLabel,
                                                category === cat.id && styles.categoryLabelSelected,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* City Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>City *</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.cityScroll}
                            >
                                {CITIES.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[
                                            styles.cityChip,
                                            city === c && styles.cityChipSelected,
                                        ]}
                                        onPress={() => setCity(c)}
                                    >
                                        <Text
                                            style={[
                                                styles.cityText,
                                                city === c && styles.cityTextSelected,
                                            ]}
                                        >
                                            {c}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Locality */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Area/Locality</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Gomti Nagar, Indira Nagar"
                                placeholderTextColor={COLORS.textMuted}
                                value={locality}
                                onChangeText={setLocality}
                            />
                        </View>

                        {/* Expected Salary */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Expected Monthly Salary *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 15000"
                                placeholderTextColor={COLORS.textMuted}
                                value={expectedSalary}
                                onChangeText={setExpectedSalary}
                                keyboardType="numeric"
                            />
                            <Text style={styles.hint}>Enter amount in Rupees</Text>
                        </View>

                        {/* Experience */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Years of Experience</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 5"
                                placeholderTextColor={COLORS.textMuted}
                                value={experienceYears}
                                onChangeText={setExperienceYears}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Languages */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Languages Spoken</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Hindi, English, Bhojpuri"
                                placeholderTextColor={COLORS.textMuted}
                                value={languages}
                                onChangeText={setLanguages}
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Create Worker Profile</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        By registering, you agree to our Terms of Service and Privacy Policy.
                        Your profile will be visible to families looking for domestic help.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    header: {
        marginBottom: SPACING.xl,
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
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    form: {
        gap: SPACING.lg,
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
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
    hint: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.sm,
    },
    categoryChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.xs,
    },
    categoryChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    categoryEmoji: {
        fontSize: 20,
    },
    categoryLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    categoryLabelSelected: {
        color: "#fff",
        fontWeight: "600",
    },
    cityScroll: {
        marginTop: SPACING.xs,
    },
    cityChip: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.sm,
    },
    cityChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    cityText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    cityTextSelected: {
        color: "#fff",
        fontWeight: "600",
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        alignItems: "center",
        marginTop: SPACING.xl,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    disclaimer: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: "center",
        marginTop: SPACING.lg,
        lineHeight: 18,
    },
});
