import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "./supabase";

// Foreground handler: show banner + sound for notifications received while app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permissions, get the Expo push token, and save it to the
 * authenticated user's profile row.
 *
 * Returns the token on success, or null on any failure (no permission,
 * not a physical device, no session, etc). Does not throw.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      // Simulators don't receive push notifications
      return null;
    }

    // Android needs an explicit notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Obvestila",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#00A6F6",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
    }
    if (status !== "granted") return null;

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (!token) return null;

    // Save to profile
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return token;

    await supabase
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("user_id", user.id);

    return token;
  } catch (e) {
    console.warn("[notifications] registerForPushNotifications failed", e);
    return null;
  }
}

/**
 * Handle a tap on a push notification. Reads the `data` payload and deep-links
 * to the right screen.
 *
 * Shapes we handle:
 *   { type: "chat",       match_id: "..." }            → /matches/:id
 *   { type: "match",      match_id: "..." }            → /matches/:id
 *   { type: "bone_new",   match_id: "..." }            → /matches/:id
 *   { type: "bone_reply", match_id: "..." }            → /matches/:id
 */
export function handleNotificationTap(
  response: Notifications.NotificationResponse
) {
  const data = response.notification.request.content.data as
    | Record<string, unknown>
    | undefined;
  if (!data) return;
  const matchId = typeof data.match_id === "string" ? data.match_id : null;
  const type = typeof data.type === "string" ? data.type : null;

  if (!type) return;

  if (
    matchId &&
    (type === "chat" ||
      type === "match" ||
      type === "bone_new" ||
      type === "bone_reply")
  ) {
    router.push(`/matches/${matchId}` as any);
  }
}
