import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile } from "../../lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export default function Discover() {
  const [me, setMe] = useState<Profile | null>(null);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setMe(myProfile as Profile);

      const { data: swiped } = await supabase
        .from("profile_swipes")
        .select("swiped_id")
        .eq("swiper_id", (myProfile as Profile).id);
      const { data: blockedRows } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", (myProfile as Profile).id);
      const { data: blockedByRows } = await supabase
        .from("blocked_users")
        .select("blocker_id")
        .eq("blocked_id", (myProfile as Profile).id);
      const exclude = new Set([
        (myProfile as Profile).id,
        ...((swiped ?? []).map((s) => s.swiped_id)),
        ...((blockedRows ?? []).map((b) => b.blocked_id)),
        ...((blockedByRows ?? []).map((b) => b.blocker_id)),
      ]);

      const { data: candidates } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_onboarded", true);
      setDeck(
        ((candidates ?? []) as Profile[]).filter((p) => !exclude.has(p.id))
      );
    })();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeOut("right");
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeOut("left");
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  function swipeOut(direction: "left" | "right") {
    const toX =
      direction === "right" ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, {
      toValue: { x: toX, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      handleSwipe(direction);
      position.setValue({ x: 0, y: 0 });
    });
  }

  async function handleSwipe(direction: "left" | "right") {
    if (!me || !deck[idx]) return;
    const target = deck[idx];
    setIdx((i) => i + 1);
    const { error } = await supabase.from("profile_swipes").insert({
      swiper_id: me.id,
      swiped_id: target.id,
      direction,
    });
    if (error) Alert.alert("Napaka", error.message);
  }

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-12deg", "0deg", "12deg"],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.25],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.25, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const card = deck[idx];
  const nextCard = deck[idx + 1];

  return (
    <View className="flex-1 bg-gray-50 pt-16">
      <Text className="text-3xl font-bold text-gray-900 px-6 mb-4">Išči</Text>

      <View className="flex-1 items-center justify-center px-4">
        {!card ? (
          <View className="items-center">
            <Ionicons name="search" size={48} color="#ccc" />
            <Text className="text-gray-400 text-lg mt-4">Ni več profilov</Text>
            <Text className="text-gray-300 text-sm mt-1">
              Preveri znova pozneje
            </Text>
          </View>
        ) : (
          <View className="w-full flex-1 max-h-[520px]">
            {/* Next card (behind) */}
            {nextCard && (
              <View
                className="absolute w-full h-full bg-white rounded-3xl shadow-sm overflow-hidden"
                style={{ transform: [{ scale: 0.95 }], top: 10 }}
              >
                <CardContent profile={nextCard} />
              </View>
            )}

            {/* Current card (draggable) */}
            <Animated.View
              {...panResponder.panHandlers}
              style={{
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate },
                ],
                width: "100%",
                height: "100%",
              }}
              className="bg-white rounded-3xl shadow-lg overflow-hidden"
            >
              {/* Like / Nope stamps */}
              <Animated.View
                style={{ opacity: likeOpacity }}
                className="absolute top-8 left-6 z-10 border-4 border-green-500 rounded-xl px-4 py-2"
              >
                <Text className="text-green-500 text-2xl font-black">
                  LIKE
                </Text>
              </Animated.View>
              <Animated.View
                style={{ opacity: nopeOpacity }}
                className="absolute top-8 right-6 z-10 border-4 border-red-500 rounded-xl px-4 py-2"
              >
                <Text className="text-red-500 text-2xl font-black">NOPE</Text>
              </Animated.View>

              <Pressable
                onPress={() =>
                  router.push(`/profile-detail?id=${card.id}`)
                }
                className="flex-1"
              >
                <CardContent profile={card} />
              </Pressable>
            </Animated.View>

            {/* Action buttons */}
            <View className="flex-row justify-center gap-6 mt-5">
              <Pressable
                onPress={() => swipeOut("left")}
                className="w-16 h-16 rounded-full bg-white shadow items-center justify-center border border-gray-100"
              >
                <Ionicons name="close" size={32} color="#ef4444" />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push(`/profile-detail?id=${card.id}`)
                }
                className="w-14 h-14 rounded-full bg-white shadow items-center justify-center border border-gray-100"
              >
                <Ionicons name="information" size={24} color="#00A6F6" />
              </Pressable>
              <Pressable
                onPress={() => swipeOut("right")}
                className="w-16 h-16 rounded-full bg-white shadow items-center justify-center border border-gray-100"
              >
                <Ionicons name="heart" size={30} color="#22c55e" />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function CardContent({ profile }: { profile: Profile }) {
  return (
    <>
      {profile.photos[0] ? (
        <Image
          source={{ uri: profile.photos[0] }}
          style={{ width: "100%", height: "75%" }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: "100%", height: "75%" }} className="bg-brand-light items-center justify-center">
          <Text className="text-7xl font-bold text-brand-dark">
            {profile.name[0]}
          </Text>
        </View>
      )}
      <View className="p-5 flex-1 justify-center">
        <Text className="text-xl font-bold text-gray-900">
          {profile.name}, {profile.age}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="school-outline" size={14} color="#999" />
          <Text className="text-sm text-gray-500 ml-1">{profile.faculty}</Text>
        </View>
        {profile.bio && (
          <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
      </View>
    </>
  );
}
