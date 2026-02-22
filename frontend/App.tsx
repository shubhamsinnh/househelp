/**
 * App.tsx — Root Navigation
 * =========================
 * This is the entry point of the House Help mobile app.
 * It sets up the navigation stack and defines the screen flow.
 *
 * SCREEN FLOW:
 *   Home (city + category) → Search (worker list) → WorkerProfile (unlock CTA)
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./src/screens/HomeScreen";
import SearchScreen from "./src/screens/SearchScreen";
import WorkerProfileScreen from "./src/screens/WorkerProfileScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,        // We use custom headers in each screen
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
