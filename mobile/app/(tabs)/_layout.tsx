import { useEffect, useState } from "react";
import { Tabs, router, usePathname } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import {
  Platform,
  View,
  Modal,
  Text,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { createGuard } from "../../lib/createGuard";
import { registerForPushNotifications } from "../../lib/notifications";
import { useLanguage, type TranslationKey } from "../../lib/i18n";
import { design } from "../../lib/design";

export default function TabsLayout() {
  const [leaveRoute, setLeaveRoute] = useState<string | null>(null);
  const { t } = useLanguage();
  const pathname = usePathname();
  const activeTab = pathname.split("?")[0].split("/").filter(Boolean)[0] ?? "feed";
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

      registerForPushNotifications();
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: design.colors.brand,
          tabBarInactiveTintColor: design.colors.muted,
          tabBarStyle: {
            display: Platform.OS === "android" ? "none" : "flex",
            backgroundColor: design.colors.surface,
            borderTopWidth: 0.5,
            borderTopColor: design.colors.border,
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
          tabBarButton: (props: any) => (
            <Pressable
              {...props}
              onPress={(e: any) => {
                if (createGuard.dirty && route.name !== activeTab) {
                  setLeaveRoute(route.name);
                  return;
                }
                props.onPress?.(e);
              }}
            />
          ),
        })}
      >
        <Tabs.Screen
          name="discover"
          options={{
            title: t("tabs.discover"),
            tabBarIcon: ({ color, size, focused }) => (
              <TabEmoji emoji="🔥" size={size} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: t("tabs.boni"),
            tabBarIcon: ({ color, size, focused }) => (
              <TabEmoji emoji="🥣" size={size} color={color} focused={focused} />
            ),
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
            title: t("tabs.matches"),
            tabBarIcon: ({ color, size, focused }) => (
              <TabEmoji emoji="💬" size={size} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("tabs.profile"),
            tabBarIcon: ({ color, size, focused }) => (
              <TabEmoji emoji="😎" size={size} color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>

      {Platform.OS === "android" ? (
        <AndroidTabBar
          bottomPadding={androidBottomPadding}
          height={androidTabBarHeight}
          onBlockedNavigate={setLeaveRoute}
        />
      ) : null}

      <Modal
        visible={!!leaveRoute}
        transparent
        animationType="none"
        onRequestClose={() => setLeaveRoute(null)}
      >
        <Pressable
          onPress={() => setLeaveRoute(null)}
          style={{
            flex: 1,
            backgroundColor: design.colors.overlay,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: design.colors.surface,
              borderRadius: design.radius.sheet,
              width: "100%",
              paddingHorizontal: 24,
              paddingVertical: 28,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: design.colors.dangerBg,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <EmojiIcon name="warning-outline" size={28} color={design.colors.danger} />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: design.colors.text,
                  textAlign: "center",
                }}
              >
                {t("feed.leaveCreateTitle")}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: design.colors.muted,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {t("feed.leaveCreateQuestion")}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                const target = leaveRoute;
                setLeaveRoute(null);
                if (createGuard.reset) createGuard.reset();
                if (target) {
                  requestAnimationFrame(() =>
                    router.navigate(`/(tabs)/${target}` as any)
                  );
                }
              }}
              android_ripple={{ color: design.colors.danger }}
              style={{
                backgroundColor: design.colors.danger,
                borderRadius: design.radius.control,
                paddingVertical: 14,
                alignItems: "center" as const,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: design.colors.white, fontWeight: "700", fontSize: 16 }}>
                {t("common.leave")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLeaveRoute(null)}
              android_ripple={{ color: design.colors.border }}
              style={{
                backgroundColor: design.colors.field,
                borderRadius: design.radius.control,
                paddingVertical: 14,
                alignItems: "center" as const,
              }}
            >
              <Text
                style={{
                  color: design.colors.textSoft,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {t("common.stay")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type AndroidTabName = "discover" | "feed" | "matches" | "profile";

const androidTabs: {
  name: AndroidTabName;
  titleKey: TranslationKey;
  emoji: string;
}[] = [
  { name: "discover", titleKey: "tabs.discover", emoji: "🔥" },
  { name: "feed", titleKey: "tabs.boni", emoji: "🥣" },
  { name: "matches", titleKey: "tabs.matches", emoji: "💬" },
  { name: "profile", titleKey: "tabs.profile", emoji: "😎" },
];

function TabEmoji({
  emoji,
  size,
  color,
  focused,
}: {
  emoji: string;
  size: number;
  color: string;
  focused: boolean;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: Math.round(size * 0.94),
        lineHeight: size,
        opacity: focused ? 1 : 0.58,
      }}
    >
      {emoji}
    </Text>
  );
}

function AndroidTabBar({
  bottomPadding,
  height,
  onBlockedNavigate,
}: {
  bottomPadding: number;
  height: number;
  onBlockedNavigate: (route: string) => void;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const activeRoute = pathname.split("?")[0].split("/").filter(Boolean)[0] ?? "feed";

  function goToTab(name: AndroidTabName) {
    if (createGuard.dirty && name !== activeRoute) {
      onBlockedNavigate(name);
      return;
    }

    router.navigate(`/(tabs)/${name}` as any);
  }

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
        backgroundColor: design.colors.surface,
        borderTopWidth: 0.5,
        borderTopColor: design.colors.border,
        flexDirection: "row",
        alignItems: "center",
        elevation: 24,
        zIndex: 50,
      }}
    >
      {androidTabs.map((tab) => {
        const focused = activeRoute === tab.name;
        const color = focused ? design.colors.brand : design.colors.muted;
        const title = t(tab.titleKey);

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : undefined}
            accessibilityLabel={title}
            android_ripple={{ color: design.colors.field }}
            onPress={() => goToTab(tab.name)}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TabEmoji emoji={tab.emoji} size={24} color={color} focused={focused} />
            <Text
              style={{
                marginTop: 2,
                color,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
