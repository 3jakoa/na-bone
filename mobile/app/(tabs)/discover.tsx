import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { supabase, type Profile } from "../../lib/supabase";

const RIGHT_SWIPE_LIMIT_MESSAGE =
  "Porabil si vse današnje buddyje. Jutri lahko spet iščeš buddyja.";

function hasUploadedPhoto(profile: Profile | null) {
  return profile?.photos.some((photo) => photo.trim().length > 0) ?? false;
}

export default function Discover() {
  const { width: screenWidth } = useWindowDimensions();
  const swipeThreshold = screenWidth * 0.25;
  const [me, setMe] = useState<Profile | null>(null);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);
  const [remainingRightSwipes, setRemainingRightSwipes] = useState(10);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swiping = useRef(false);

  const loadDeck = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMe(null);
      setDeck([]);
      setIdx(0);
      setCardVisible(true);
      setRemainingRightSwipes(10);
      swiping.current = false;
      translateX.value = 0;
      translateY.value = 0;
      return;
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (!myProfile) {
      setMe(null);
      setDeck([]);
      setIdx(0);
      setRemainingRightSwipes(10);
      return;
    }

    const meProfile = myProfile as Profile;
    setMe(meProfile);

    const [
      { data: candidates, error: candidatesError },
      { data: remaining, error: remainingError },
    ] = await Promise.all([
      supabase.rpc("get_discover_candidates"),
      supabase.rpc("remaining_daily_right_swipes"),
    ]);

    if (candidatesError) {
      Alert.alert("Napaka", candidatesError.message);
      setDeck([]);
    } else {
      setDeck((candidates ?? []) as Profile[]);
    }

    if (remainingError) {
      Alert.alert("Napaka", remainingError.message);
      setRemainingRightSwipes(10);
    } else {
      setRemainingRightSwipes(
        typeof remaining === "number" ? remaining : 10
      );
    }

    setIdx(0);
    setCardVisible(true);
    swiping.current = false;
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  useFocusEffect(
    useCallback(() => {
      void loadDeck();
    }, [loadDeck])
  );

  function resetCardPosition() {
    translateX.value = 0;
    translateY.value = 0;
    swiping.current = false;
  }

  function springCardBack() {
    translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    swiping.current = false;
  }

  function showRightSwipeLimitMessage() {
    Alert.alert("", RIGHT_SWIPE_LIMIT_MESSAGE);
  }

  function completeSwipe(direction: "left" | "right") {
    void handleSwipe(direction);
  }

  function promptPhotoRequired() {
    springCardBack();
    Alert.alert("Dodaj sliko", "Dodaj vsaj eno sliko, da lahko swipaš.", [
      {
        text: "Kasneje",
        style: "cancel",
      },
      {
        text: "Dodaj sliko",
        onPress: () => router.push("/edit-profile"),
      },
    ]);
  }

  function swipeOut(direction: "left" | "right") {
    if (swiping.current) return;
    if (!hasUploadedPhoto(me)) {
      promptPhotoRequired();
      return;
    }
    if (direction === "right" && remainingRightSwipes <= 0) {
      springCardBack();
      showRightSwipeLimitMessage();
      return;
    }

    swiping.current = true;
    const toX = direction === "right" ? screenWidth + 120 : -screenWidth - 120;

    translateX.value = withTiming(
      toX,
      { duration: 220 },
      (finished) => {
        if (finished) {
          runOnJS(completeSwipe)(direction);
        }
      }
    );
    translateY.value = withTiming(0, { duration: 220 });
  }

  async function handleSwipe(direction: "left" | "right") {
    if (!me || !deck[idx]) {
      resetCardPosition();
      return;
    }
    if (!hasUploadedPhoto(me)) {
      promptPhotoRequired();
      return;
    }
    const target = deck[idx];

    // Hide during the index/value swap so the previous card cannot flash back
    // at the center for a frame on slower simulator renders.
    setCardVisible(false);
    setIdx((i) => i + 1);
    setTimeout(() => {
      resetCardPosition();
      setCardVisible(true);
    }, 0);

    const swipedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profile_swipes")
      .upsert(
        {
          swiper_id: me.id,
          swiped_id: target.id,
          direction,
          created_at: swipedAt,
        },
        { onConflict: "swiper_id,swiped_id" }
      );

    if (error) {
      if (direction === "right" && error.message === RIGHT_SWIPE_LIMIT_MESSAGE) {
        showRightSwipeLimitMessage();
        void loadDeck();
        return;
      }

      Alert.alert("Napaka", error.message);
      void loadDeck();
      return;
    }

    if (direction === "right") {
      setRemainingRightSwipes((current) => Math.max(0, current - 1));

      const { data: match } = await supabase
        .from("buddy_matches")
        .select("id")
        .or(
          `and(user1_id.eq.${me.id},user2_id.eq.${target.id}),and(user1_id.eq.${target.id},user2_id.eq.${me.id})`
        )
        .maybeSingle();

      if (match?.id) {
        Alert.alert("Match!", `Ujel/a si se z ${target.name}.`, [
          {
            text: "Kasneje",
            style: "cancel",
          },
          {
            text: "Odpri chat",
            onPress: () => router.push(`/matches/${match.id}`),
          },
        ]);
      }
    }
  }

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.2;
    })
    .onEnd((event) => {
      if (event.translationX > swipeThreshold) {
        runOnJS(swipeOut)("right");
        return;
      }
      if (event.translationX < -swipeThreshold) {
        runOnJS(swipeOut)("left");
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-12, 0, 12]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const buddyFeedbackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [screenWidth * 0.08, screenWidth * 0.28],
      [0, 1],
      "clamp"
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [screenWidth * 0.08, screenWidth * 0.28],
          [0.92, 1],
          "clamp"
        ),
      },
    ],
  }));

  const nextFeedbackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-screenWidth * 0.28, -screenWidth * 0.08],
      [1, 0],
      "clamp"
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-screenWidth * 0.28, -screenWidth * 0.08],
          [1, 0.92],
          "clamp"
        ),
      },
    ],
  }));

  const card = deck[idx];
  const nextCard = deck[idx + 1];

  function openProfile(profileId: string) {
    router.push(`/profile-detail?id=${profileId}`);
  }

  const tapGesture = Gesture.Tap()
    .maxDistance(8)
    .onEnd((_event, success) => {
      if (success && card?.id) {
        runOnJS(openProfile)(card.id);
      }
    });

  const cardGesture = Gesture.Exclusive(panGesture, tapGesture);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950 pt-16">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white px-6 mb-4">Išči</Text>

      <View className="flex-1 items-center justify-center px-4">
        {!card ? (
          <View className="items-center">
            <Ionicons name="search" size={48} color="#888" />
            <Text className="text-gray-400 dark:text-gray-500 text-lg mt-4">Ni več profilov</Text>
            <Text className="text-gray-300 dark:text-gray-600 text-sm mt-1">
              Preveri znova pozneje
            </Text>
          </View>
        ) : (
          <View className="w-full flex-1 max-h-[520px]">
            {/* Next card (behind) */}
            {nextCard && (
              <View
                className="absolute w-full h-full bg-white dark:bg-neutral-900 rounded-3xl shadow-sm overflow-hidden"
                style={{ transform: [{ scale: 0.95 }], top: 10 }}
              >
                <CardContent profile={nextCard} />
              </View>
            )}

            {/* Current card (draggable) */}
            <GestureDetector gesture={cardGesture}>
              <Animated.View
                style={[
                  {
                    width: "100%",
                    height: "100%",
                    opacity: cardVisible ? 1 : 0,
                  },
                  cardAnimatedStyle,
                ]}
                className="bg-white dark:bg-neutral-900 rounded-3xl shadow-lg overflow-hidden"
              >
                <Animated.View
                  pointerEvents="none"
                  style={buddyFeedbackStyle}
                  className="absolute top-6 left-6 z-10 rounded-full bg-brand px-4 py-2 shadow-sm"
                >
                  <Text className="text-white text-base font-bold">
                    Buddy
                  </Text>
                </Animated.View>
                <Animated.View
                  pointerEvents="none"
                  style={nextFeedbackStyle}
                  className="absolute top-6 right-6 z-10 rounded-full bg-gray-500/90 px-4 py-2 shadow-sm dark:bg-neutral-600"
                >
                  <Text className="text-white text-base font-bold">
                    Naprej
                  </Text>
                </Animated.View>

                <View className="flex-1">
                  <CardContent profile={card} />
                </View>
              </Animated.View>
            </GestureDetector>

            <View className="items-center px-6 mt-4 mb-2">
              <Text className="text-sm font-semibold text-gray-400 dark:text-gray-500 text-center">
                Povleci levo za naprej, desno za buddyja
              </Text>
              <Text className="text-xs text-gray-300 dark:text-gray-600 text-center mt-1">
                Tapni kartico za več informacij
              </Text>
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
        <View style={{ width: "100%", height: "75%" }} className="bg-brand-light dark:bg-neutral-800 items-center justify-center">
          <Text className="text-7xl font-bold text-brand-dark dark:text-brand">
            {profile.name[0]}
          </Text>
        </View>
      )}
      <View className="p-5 flex-1 justify-center">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {profile.name}, {profile.age}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="school-outline" size={14} color="#999" />
          <Text className="text-sm text-gray-500 dark:text-gray-400 ml-1">{profile.faculty}</Text>
        </View>
        {profile.bio && (
          <Text className="text-sm text-gray-600 dark:text-gray-300 mt-2" numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
      </View>
    </>
  );
}
