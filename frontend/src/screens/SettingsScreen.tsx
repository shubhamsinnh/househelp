/**
 * SettingsScreen
 * ==============
 * App settings, account options, and logout functionality.
 */

import React, { useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    Linking,
} from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { AuthContext } from "../../App";

interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    danger?: boolean;
    showArrow?: boolean;
}

const SettingItem = ({ icon, title, subtitle, onPress, danger, showArrow = true }: SettingItemProps) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {showArrow && <Text style={styles.settingArrow}>›</Text>}
    </TouchableOpacity>
);

export default function SettingsScreen({ navigation }: any) {
    const { user, logout } = useContext(AuthContext);

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const handleContactSupport = () => {
        Linking.openURL("mailto:support@househelp.in?subject=Support%20Request");
    };

    const handleRateApp = () => {
        Alert.alert("Coming Soon", "App store rating will be available soon!");
    };

    const handlePrivacyPolicy = () => {
        Alert.alert("Privacy Policy", "Our privacy policy will be available soon on our website.");
    };

    const handleTermsOfService = () => {
        Alert.alert("Terms of Service", "Our terms of service will be available soon on our website.");
    };

    const handleAbout = () => {
        Alert.alert(
            "About House Help",
            "House Help v1.0.0\n\nA discovery marketplace connecting households with domestic workers.\n\nMade with ♥ in India",
            [{ text: "OK" }]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action cannot be undone. All your data including unlocked contacts and reviews will be permanently deleted.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Account",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            "Contact Support",
                            "To delete your account, please email support@househelp.in with your registered phone number."
                        );
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Settings</Text>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="👤"
                            title="My Profile"
                            subtitle={user?.name || user?.phone || "Edit your details"}
                            onPress={() => navigation.navigate("UserProfile")}
                        />
                        <SettingItem
                            icon="📱"
                            title="Phone Number"
                            subtitle={user?.phone}
                            onPress={() => Alert.alert("Phone Number", "Your verified phone number cannot be changed.")}
                            showArrow={false}
                        />
                    </View>
                </View>

                {/* Activity Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACTIVITY</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="📞"
                            title="My Contacts"
                            subtitle="Unlocked worker contacts"
                            onPress={() => navigation.navigate("MyContacts")}
                        />
                        <SettingItem
                            icon="💝"
                            title="Favorites"
                            subtitle="Saved workers"
                            onPress={() => navigation.navigate("Favorites")}
                        />
                    </View>
                </View>

                {/* Worker Registration - only show if user is not a worker */}
                {!user?.is_worker && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>EARN WITH US</Text>
                        <View style={styles.sectionContent}>
                            <SettingItem
                                icon="💼"
                                title="Become a Worker"
                                subtitle="Register as maid, cook, driver, etc."
                                onPress={() => navigation.navigate("WorkerRegistration")}
                            />
                        </View>
                    </View>
                )}

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="💬"
                            title="Contact Support"
                            subtitle="Get help with your account"
                            onPress={handleContactSupport}
                        />
                        <SettingItem
                            icon="⭐"
                            title="Rate House Help"
                            subtitle="Love the app? Rate us!"
                            onPress={handleRateApp}
                        />
                    </View>
                </View>

                {/* Legal Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>LEGAL</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="🔒"
                            title="Privacy Policy"
                            onPress={handlePrivacyPolicy}
                        />
                        <SettingItem
                            icon="📄"
                            title="Terms of Service"
                            onPress={handleTermsOfService}
                        />
                        <SettingItem
                            icon="ℹ️"
                            title="About"
                            subtitle="Version 1.0.0"
                            onPress={handleAbout}
                        />
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="🚪"
                            title="Logout"
                            onPress={handleLogout}
                            danger
                        />
                        <SettingItem
                            icon="🗑️"
                            title="Delete Account"
                            subtitle="Permanently remove your data"
                            onPress={handleDeleteAccount}
                            danger
                        />
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>House Help v1.0.0</Text>
                    <Text style={styles.footerText}>Made with ♥ in India</Text>
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
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textMuted,
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: COLORS.card,
        marginHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    settingIcon: {
        fontSize: 22,
        marginRight: SPACING.md,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: "500",
        color: COLORS.textPrimary,
    },
    settingTitleDanger: {
        color: COLORS.danger,
    },
    settingSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    settingArrow: {
        fontSize: 22,
        color: COLORS.textMuted,
    },
    footer: {
        alignItems: "center",
        paddingVertical: SPACING.xl,
        marginBottom: SPACING.xxl,
    },
    footerText: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
});
