/**
 * App.tsx — Root Navigation with Authentication & Bottom Tabs
 * ============================================================
 * This is the entry point of the House Help mobile app.
 * It handles authentication state and navigation.
 *
 * NAVIGATION STRUCTURE:
 *   - Not logged in: Login Screen
 *   - Logged in: Bottom Tabs
 *       - Home Tab → Search → WorkerProfile
 *       - Contacts Tab (My Contacts)
 *       - Favorites Tab
 *       - Settings Tab → UserProfile
 */

// Initialize Firebase (must be imported first)
import "./firebase.config";

import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "./src/screens/HomeScreen";
import SearchScreen from "./src/screens/SearchScreen";
import WorkerProfileScreen from "./src/screens/WorkerProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MyContactsScreen from "./src/screens/MyContactsScreen";
import FavoritesScreen from "./src/screens/FavoritesScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import WorkerRegistrationScreen from "./src/screens/WorkerRegistrationScreen";
import WorkerDashboardScreen from "./src/screens/WorkerDashboardScreen";
import WorkerReviewsScreen from "./src/screens/WorkerReviewsScreen";
import WorkerEditProfileScreen from "./src/screens/WorkerEditProfileScreen";
import { getAuthState, User, logout as logoutService } from "./src/services/auth";
import { COLORS } from "./src/constants/theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Context for sharing user state across screens
export const AuthContext = React.createContext<{
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => void;
}>({
    user: null,
    setUser: () => {},
    logout: () => {},
});

// Tab Bar Icon Component
interface TabIconProps {
    emoji: string;
    focused: boolean;
}

const TabIcon = ({ emoji, focused }: TabIconProps) => (
    <Text style={{ fontSize: focused ? 26 : 24, opacity: focused ? 1 : 0.6 }}>
        {emoji}
    </Text>
);

// Home Stack (Home → Search → WorkerProfile)
function HomeStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
        </Stack.Navigator>
    );
}

// Settings Stack (Settings → UserProfile)
function SettingsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="SettingsMain" component={SettingsScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="MyContacts" component={MyContactsScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="WorkerRegistration" component={WorkerRegistrationScreen} />
        </Stack.Navigator>
    );
}

// Worker Dashboard Stack (Dashboard → EditProfile)
function WorkerDashboardStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="WorkerDashboardMain" component={WorkerDashboardScreen} />
            <Stack.Screen name="WorkerEditProfile" component={WorkerEditProfileScreen} />
            <Stack.Screen name="WorkerReviews" component={WorkerReviewsScreen} />
        </Stack.Navigator>
    );
}

// Worker Reviews Stack
function WorkerReviewsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="WorkerReviewsMain" component={WorkerReviewsScreen} />
        </Stack.Navigator>
    );
}

// Worker Settings Stack
function WorkerSettingsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="WorkerSettingsMain" component={SettingsScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        </Stack.Navigator>
    );
}

// Favorites Stack (for navigating to WorkerProfile from favorites)
function FavoritesStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="FavoritesMain" component={FavoritesScreen} />
            <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
        </Stack.Navigator>
    );
}

// Contacts Stack (for navigating to WorkerProfile from contacts)
function ContactsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="ContactsMain" component={MyContactsScreen} />
            <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
        </Stack.Navigator>
    );
}

// Main Tab Navigator (for employers/users)
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.card,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: 65,
                    paddingTop: 8,
                    paddingBottom: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeStack}
                options={{
                    tabBarLabel: "Home",
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="🏠" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Contacts"
                component={ContactsStack}
                options={{
                    tabBarLabel: "Contacts",
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="📞" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Favorites"
                component={FavoritesStack}
                options={{
                    tabBarLabel: "Favorites",
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="💝" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsStack}
                options={{
                    tabBarLabel: "Settings",
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="⚙️" focused={focused} />,
                }}
            />
        </Tab.Navigator>
    );
}

// Worker Tab Navigator (for workers)
function WorkerTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.card,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: 65,
                    paddingTop: 8,
                    paddingBottom: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={WorkerDashboardStack}
                options={{
                    tabBarLabel: "Leads",
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="📋" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Reviews"
                component={WorkerReviewsStack}
                options={{
                    tabBarLabel: "Reviews",
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="⭐" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="WorkerSettings"
                component={WorkerSettingsStack}
                options={{
                    tabBarLabel: "Settings",
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="⚙️" focused={focused} />,
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // Check for existing auth on app load
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const authState = await getAuthState();
            if (authState.isAuthenticated && authState.user) {
                setUser(authState.user);
            }
        } catch (error) {
            console.log("Auth check failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginSuccess = (loggedInUser: User) => {
        setUser(loggedInUser);
    };

    const handleLogout = async () => {
        await logoutService();
        setUser(null);
    };

    // Show loading screen while checking auth
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <AuthContext.Provider value={{ user, setUser, logout: handleLogout }}>
            <NavigationContainer>
                <Stack.Navigator
                    screenOptions={{
                        headerShown: false,
                        animation: "slide_from_right",
                    }}
                >
                    {user === null ? (
                        // Auth Stack - shown when not logged in
                        <Stack.Screen name="Login">
                            {(props) => (
                                <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
                            )}
                        </Stack.Screen>
                    ) : user.is_worker ? (
                        // Worker App with Worker Tab Navigator
                        <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
                    ) : (
                        // Main App with Tab Navigator (for employers)
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </AuthContext.Provider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
});
