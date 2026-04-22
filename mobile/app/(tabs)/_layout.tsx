import { useEffect, useState } from "react";
import { Tabs, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View, Image, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { supabase } from "../../lib/supabase";
import {
  registerForPushNotifications,
  handleNotificationTap,
} from "../../lib/notifications";
import { useTheme } from "../../lib/theme";

export default function TabsLayout() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const androidBottomPadding = Math.max(insets.bottom, 8);
  const androidTabBarHeight = 64 + androidBottomPadding;
  const tabBarBottomPadding =
    Platform.OS === "ios" ? 24 : androidBottomPadding;
  const tabBarHeight = Platform.OS === "ios" ? 88 : 56 + androidBottomPadding;

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me } = await supabase
        .from("profiles")
        .select("id, photos")
        .eq("user_id", user.id)
        .single();

      if (me?.photos?.[0]) {
        setPhotoUrl(me.photos[0]);
      }

      registerForPushNotifications();
    })();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => handleNotificationTap(response, { pathname })
    );
    return () => sub.remove();
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/feed") || pathname.startsWith("/create")) {
      router.replace("/(tabs)/matches");
    }
  }, [pathname]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#00A6F6",
          tabBarInactiveTintColor: isDark ? "#666" : "#999",
          tabBarStyle: {
            display: Platform.OS === "android" ? "none" : "flex",
            backgroundColor: isDark ? "#0a0a0a" : "#fff",
            borderTopWidth: 0.5,
            borderTopColor: isDark ? "#262626" : "#e5e5e5",
            paddingBottom: tabBarBottomPadding,
            paddingTop: 8,
            height: tabBarHeight,
          },
          sceneStyle:
            Platform.OS === "android"
              ? { paddingBottom: androidTabBarHeight }
              : undefined,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600" as const,
          },
        }}
      >
        <Tabs.Screen
          name="discover"
          options={{
            title: "Išči",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flame" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: "Buddies",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, size }) =>
              photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 2,
                    borderColor: color,
                  }}
                />
              ) : (
                <Ionicons name="person-circle" size={size} color={color} />
              ),
          }}
        />
      </Tabs>

      {Platform.OS === "android" ? (
        <AndroidTabBar
          bottomPadding={androidBottomPadding}
          height={androidTabBarHeight}
          isDark={isDark}
          photoUrl={photoUrl}
        />
      ) : null}
    </View>
  );
}

type AndroidTabName = "discover" | "matches" | "profile";

const androidTabs: {
  name: AndroidTabName;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: "discover", title: "Išči", icon: "flame" },
  { name: "matches", title: "Buddies", icon: "chatbubbles" },
  { name: "profile", title: "Profil", icon: "person-circle" },
];

function AndroidTabBar({
  bottomPadding,
  height,
  isDark,
  photoUrl,
}: {
  bottomPadding: number;
  height: number;
  isDark: boolean;
  photoUrl: string | null;
}) {
  const pathname = usePathname();
  const activeRoute = (pathname.split("/").filter(Boolean)[0] ??
    "discover") as AndroidTabName;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        paddingTop: 8,
        paddingBottom: bottomPadding,
        paddingHorizontal: 6,
        backgroundColor: isDark ? "#0a0a0a" : "#fff",
        borderTopWidth: 0.5,
        borderTopColor: isDark ? "#262626" : "#e5e5e5",
        flexDirection: "row",
        alignItems: "center",
        elevation: 24,
        zIndex: 50,
      }}
    >
      {androidTabs.map((tab) => {
        const focused = activeRoute === tab.name;
        const color = focused ? "#00A6F6" : isDark ? "#666" : "#999";

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : undefined}
            accessibilityLabel={tab.title}
            android_ripple={{ color: isDark ? "#1f1f1f" : "#f3f4f6" }}
            onPress={() => router.navigate(`/(tabs)/${tab.name}` as any)}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {tab.name === "profile" && photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: color,
                }}
              />
            ) : (
              <Ionicons name={tab.icon} size={24} color={color} />
            )}
            <Text
              style={{
                marginTop: 2,
                color,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
