import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { invalidateBuddyChatPreviews } from "../lib/buddyChatPreviews";
import { ProductVariantProvider } from "../lib/productVariant";
import { supabase } from "../lib/supabase";
import { ThemeProvider } from "../lib/theme";
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      invalidateBuddyChatPreviews();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider>
      <ProductVariantProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/signup" />
              <Stack.Screen name="auth/forgot-password" />
              <Stack.Screen name="auth/reset-password" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="invite/[token]" />
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
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ProductVariantProvider>
    </ThemeProvider>
  );
}
