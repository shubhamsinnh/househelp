/**
 * LoginScreen
 * ===========
 * OTP-based phone login for House Help.
 *
 * FLOW:
 * 1. User enters phone number
 * 2. User taps "Send OTP" → OTP sent to phone
 * 3. User enters 6-digit OTP
 * 4. User taps "Verify" → Logged in, navigate to Home
 *
 * DESIGN:
 * - Matches the app's premium dark theme
 * - Large input fields for easy tapping
 * - Clear error messages
 * - Hindi hint text for accessibility
 */

import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { sendOTPFirebase, verifyOTPFirebase, User } from "../services/auth";

interface LoginScreenProps {
    navigation: any;
    onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ navigation, onLoginSuccess }: LoginScreenProps) {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const otpInputRef = useRef<TextInput>(null);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSendOTP = async () => {
        // Validate phone number
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
            Alert.alert("Invalid Phone", "Please enter a valid 10-digit mobile number.");
            return;
        }

        setLoading(true);
        const result = await sendOTPFirebase(cleanPhone);
        setLoading(false);

        if (result.success) {
            setStep("otp");
            setCountdown(30); // 30 second cooldown before resend
            // Auto-focus OTP input
            setTimeout(() => otpInputRef.current?.focus(), 100);
        } else {
            Alert.alert("Error", result.message);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            Alert.alert("Invalid OTP", "Please enter the 6-digit code sent to your phone.");
            return;
        }

        setLoading(true);
        const result = await verifyOTPFirebase(otp);
        setLoading(false);

        if (result.success && result.user) {
            // Show welcome message
            if (result.isNewUser) {
                Alert.alert(
                    "Welcome to House Help!",
                    "Your account has been created successfully.",
                    [{ text: "Let's Go!", onPress: () => onLoginSuccess(result.user!) }]
                );
            } else {
                onLoginSuccess(result.user);
            }
        } else {
            Alert.alert("Verification Failed", result.message);
        }
    };

    const handleResendOTP = () => {
        if (countdown === 0) {
            setOtp("");
            handleSendOTP();
        }
    };

    const handleChangeNumber = () => {
        setStep("phone");
        setOtp("");
        setCountdown(0);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>🏠 House Help</Text>
                        <Text style={styles.tagline}>
                            {step === "phone"
                                ? "Enter your phone number to get started"
                                : "Enter the OTP sent to your phone"}
                        </Text>
                        <Text style={styles.taglineHi}>
                            {step === "phone"
                                ? "शुरू करने के लिए अपना फोन नंबर दर्ज करें"
                                : "अपने फोन पर भेजा गया OTP दर्ज करें"}
                        </Text>
                    </View>

                    {/* Phone Input */}
                    {step === "phone" && (
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Mobile Number</Text>
                            <View style={styles.phoneInputContainer}>
                                <Text style={styles.countryCode}>+91</Text>
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="9876543210"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={phone}
                                    onChangeText={setPhone}
                                    autoFocus
                                />
                            </View>
                            <Text style={styles.inputHint}>
                                We'll send a 6-digit OTP to this number
                            </Text>

                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                onPress={handleSendOTP}
                                disabled={loading || phone.length < 10}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* OTP Input */}
                    {step === "otp" && (
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Enter OTP</Text>
                            <Text style={styles.phoneDisplay}>
                                Sent to +91 {phone}
                                <Text style={styles.changeNumber} onPress={handleChangeNumber}>
                                    {" "}Change
                                </Text>
                            </Text>

                            <TextInput
                                ref={otpInputRef}
                                style={styles.otpInput}
                                placeholder="● ● ● ● ● ●"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={setOtp}
                                textAlign="center"
                            />

                            <TouchableOpacity
                                style={styles.resendButton}
                                onPress={handleResendOTP}
                                disabled={countdown > 0}
                            >
                                <Text
                                    style={[
                                        styles.resendText,
                                        countdown > 0 && styles.resendTextDisabled,
                                    ]}
                                >
                                    {countdown > 0
                                        ? `Resend OTP in ${countdown}s`
                                        : "Resend OTP"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                onPress={handleVerifyOTP}
                                disabled={loading || otp.length < 6}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Verify & Login</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Terms */}
                    <Text style={styles.terms}>
                        By continuing, you agree to our{" "}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>

                    {/* Invisible reCAPTCHA container for Firebase */}
                    <View id="recaptcha-container" style={{ height: 0, width: 0 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl * 2,
        paddingBottom: SPACING.xl,
    },
    header: {
        marginBottom: SPACING.xl,
    },
    logo: {
        fontSize: 36,
        fontWeight: "800",
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    tagline: {
        fontSize: 18,
        color: COLORS.textSecondary,
        lineHeight: 26,
    },
    taglineHi: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
    },
    inputSection: {
        marginBottom: SPACING.xl,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    phoneInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
    },
    countryCode: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textPrimary,
        backgroundColor: COLORS.surface,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: 18,
        color: COLORS.textPrimary,
        letterSpacing: 2,
    },
    inputHint: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: SPACING.sm,
    },
    phoneDisplay: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    changeNumber: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    otpInput: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
        fontSize: 28,
        fontWeight: "700",
        color: COLORS.textPrimary,
        letterSpacing: 12,
    },
    resendButton: {
        alignSelf: "center",
        paddingVertical: SPACING.md,
    },
    resendText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "600",
    },
    resendTextDisabled: {
        color: COLORS.textMuted,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md,
        alignItems: "center",
        marginTop: SPACING.md,
    },
    primaryButtonText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFF",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    terms: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 18,
        marginTop: "auto",
        paddingTop: SPACING.xl,
    },
    termsLink: {
        color: COLORS.primary,
    },
});
