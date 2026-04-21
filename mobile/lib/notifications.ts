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
 *   { type: "bone_new",   bone_id: "..." }             → /(tabs)/feed
 *   { type: "bone_reply", match_id: "..." }            → /matches/:id
 */
type NotificationType = "chat" | "match" | "bone_new" | "bone_reply";

type NotificationTarget =
  | { kind: "feed" }
  | { kind: "match"; matchId: string };

type NotificationTapContext = {
  pathname?: string | null;
};

function isNotificationType(value: unknown): value is NotificationType {
  return (
    value === "chat" ||
    value === "match" ||
    value === "bone_new" ||
    value === "bone_reply"
  );
}

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNotificationTarget(
  response: Notifications.NotificationResponse
): NotificationTarget | null {
  const rawData = response.notification.request.content.data;
  if (!rawData || typeof rawData !== "object") {
    console.warn("[notifications] Ignoring tap with missing payload");
    return null;
  }

  const data = rawData as Record<string, unknown>;
  const type = data.type;

  if (!isNotificationType(type)) {
    console.warn("[notifications] Ignoring tap with unsupported type", type);
    return null;
  }

  if (type === "bone_new") {
    return { kind: "feed" };
  }

  const matchId = asNonEmptyString(data.match_id);
  if (!matchId) {
    console.warn("[notifications] Ignoring tap with missing match_id", data);
    return null;
  }

  return { kind: "match", matchId };
}

function getActiveMatchId(pathname?: string | null) {
  if (!pathname) return null;

  const [pathOnly] = pathname.split("?");
  const parts = pathOnly.split("/").filter(Boolean);
  if (parts[0] !== "matches" || parts.length < 2) return null;

  return asNonEmptyString(parts[1]);
}

export function handleNotificationTap(
  response: Notifications.NotificationResponse,
  context: NotificationTapContext = {}
) {
  const target = parseNotificationTarget(response);
  if (!target) return;

  if (target.kind === "feed") {
    router.push("/(tabs)/feed" as any);
    return;
  }

  const activeMatchId = getActiveMatchId(context.pathname);

  // Avoid stacking the same chat route on top of itself when the user taps
  // a notification while already viewing that thread.
  if (activeMatchId === target.matchId) {
    return;
  }

  if (activeMatchId) {
    router.replace(`/matches/${target.matchId}` as any);
    return;
  }

  router.push(`/matches/${target.matchId}` as any);
}
