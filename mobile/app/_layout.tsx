import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import "../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="profile-detail" options={{ presentation: "modal" }} />
        <Stack.Screen name="photo-viewer" options={{ presentation: "modal", animation: "fade" }} />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/help" />
        <Stack.Screen name="settings/terms" />
        <Stack.Screen name="settings/buddies" />
        <Stack.Screen name="matches/[id]" />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
  );
}
