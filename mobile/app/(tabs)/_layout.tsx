import { useEffect, useRef, useState } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Platform,
  View,
  Image,
  Modal,
  Text,
  Pressable,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { createGuard } from "../../lib/createGuard";

export default function TabsLayout() {
  const subRef = useRef<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [leaveRoute, setLeaveRoute] = useState<string | null>(null);

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
      if (!me) return;
      if (me.photos?.[0]) setPhotoUrl(me.photos[0]);

      const channel = supabase
        .channel("match-bones")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "meal_invites",
          },
          async (payload) => {
            const bone = payload.new as any;
            if (bone.user_id === me.id) return;

            const { count } = await supabase
              .from("buddy_matches")
              .select("*", { count: "exact", head: true })
              .or(
                `and(user1_id.eq.${me.id},user2_id.eq.${bone.user_id}),and(user1_id.eq.${bone.user_id},user2_id.eq.${me.id})`
              );
            if (!count || count === 0) return;

            const { data: author } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", bone.user_id)
              .single();
            const name = author?.name ?? "Nekdo";

            Alert.alert(
              "Nov bon!",
              `${name} gre v ${bone.restaurant}! Pridruži se.`
            );
          }
        )
        .subscribe();

      subRef.current = channel;
    })();

    return () => {
      if (subRef.current) supabase.removeChannel(subRef.current);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#00A6F6",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 0.5,
            borderTopColor: "#e5e5e5",
            paddingBottom: Platform.OS === "ios" ? 24 : 8,
            paddingTop: 8,
            height: Platform.OS === "ios" ? 88 : 64,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600" as const,
          },
          ...(route.name !== "create" && {
            tabBarButton: (props: any) => (
              <Pressable
                {...props}
                onPress={(e: any) => {
                  if (createGuard.dirty) {
                    setLeaveRoute(route.name);
                    return;
                  }
                  props.onPress?.(e);
                }}
              />
            ),
          }),
        })}
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
            title: "Boni",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: "",
            tabBarIcon: () => (
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  backgroundColor: "#f2f2f7",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: Platform.OS === "ios" ? 20 : 8,
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "#00A6F6",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#00A6F6",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </View>
              </View>
            ),
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

      {/* Leave create guard modal — OUTSIDE Tabs to avoid Screen-only children warning */}
      <Modal
        visible={!!leaveRoute}
        transparent
        animationType="none"
        onRequestClose={() => setLeaveRoute(null)}
      >
        <Pressable
          onPress={() => setLeaveRoute(null)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}
        >
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: "#fff", borderRadius: 24, width: "100%", paddingHorizontal: 24, paddingVertical: 28 }}
          >
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="warning-outline" size={28} color="#ef4444" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#111827",
                  textAlign: "center",
                }}
              >
                Zapuščaš ustvarjanje bona
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Vsi podatki se bodo ponastavili. Želiš nadaljevati?
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
              android_ripple={{ color: "#dc2626" }}
              style={{
                backgroundColor: "#ef4444",
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center" as const,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Zapusti
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLeaveRoute(null)}
              android_ripple={{ color: "#d1d5db" }}
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center" as const,
              }}
            >
              <Text
                style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}
              >
                Ostani
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
