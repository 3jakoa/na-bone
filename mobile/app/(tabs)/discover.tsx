import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
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
import { useLanguage } from "../../lib/i18n";
import { DiscoverEmptyAnimation } from "../../components/EmptyStateAnimations";
import { design } from "../../lib/design";

const RIGHT_SWIPE_LIMIT_MESSAGE =
  "Porabil si vse današnje buddyje. Jutri lahko spet iščeš buddyja.";

const cardShadow = design.shadow.card;

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
  const [transitionBehindCard, setTransitionBehindCard] =
    useState<Profile | null>(null);
  const [remainingRightSwipes, setRemainingRightSwipes] = useState(10);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swiping = useRef(false);
  const { t } = useLanguage();

  const loadDeck = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMe(null);
      setDeck([]);
      setIdx(0);
      setCardVisible(true);
      setTransitionBehindCard(null);
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
      setTransitionBehindCard(null);
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
      Alert.alert(t("common.error"), candidatesError.message);
      setDeck([]);
    } else {
      setDeck((candidates ?? []) as Profile[]);
    }

    if (remainingError) {
      Alert.alert(t("common.error"), remainingError.message);
      setRemainingRightSwipes(10);
    } else {
      setRemainingRightSwipes(
        typeof remaining === "number" ? remaining : 10
      );
    }

    setIdx(0);
    setCardVisible(true);
    setTransitionBehindCard(null);
    swiping.current = false;
    translateX.value = 0;
    translateY.value = 0;
  }, [t, translateX, translateY]);

  useFocusEffect(
    useCallback(() => {
      void loadDeck();
    }, [loadDeck])
  );

  useEffect(() => {
    deck.slice(idx, idx + 4).forEach((profile) => {
      const photo = profile.photos[0];
      if (photo) {
        void Image.prefetch(photo);
      }
    });
  }, [deck, idx]);

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
    Alert.alert("", t("discover.rightSwipeLimit"));
  }

  function completeSwipe(direction: "left" | "right") {
    void handleSwipe(direction);
  }

  function promptPhotoRequired() {
    springCardBack();
    Alert.alert(t("discover.addPhotoTitle"), t("discover.addPhotoBody"), [
      {
        text: t("discover.later"),
        style: "cancel",
      },
      {
        text: t("discover.addPhotoTitle"),
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
    if (remainingRightSwipes <= 0) {
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
    setTransitionBehindCard(deck[idx + 1] ?? null);
    setCardVisible(false);
    setIdx((i) => i + 1);
    setTimeout(() => {
      resetCardPosition();
      setCardVisible(true);
      setTransitionBehindCard(null);
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
      if (error.message === RIGHT_SWIPE_LIMIT_MESSAGE) {
        showRightSwipeLimitMessage();
        void loadDeck();
        return;
      }

      Alert.alert(t("common.error"), error.message);
      void loadDeck();
      return;
    }

    setRemainingRightSwipes((current) => Math.max(0, current - 1));

    if (direction === "right") {
      const { data: match } = await supabase
        .from("buddy_matches")
        .select("id")
        .or(
          `and(user1_id.eq.${me.id},user2_id.eq.${target.id}),and(user1_id.eq.${target.id},user2_id.eq.${me.id})`
        )
        .maybeSingle();

      if (match?.id) {
        Alert.alert(t("discover.matchTitle"), t("discover.matchBody", { name: target.name }), [
          {
            text: t("discover.later"),
            style: "cancel",
          },
          {
            text: t("discover.openChat"),
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
  const behindCard = transitionBehindCard ?? nextCard;

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
    <View className="flex-1 bg-page pt-16">
      <View className="flex-1 items-center justify-center px-4">
        {!card ? (
          <View
            pointerEvents="none"
            className="items-center justify-center px-6"
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <DiscoverEmptyAnimation />
            <Text className="text-brand text-lg font-bold mt-3">
              {t("discover.noProfiles")}
            </Text>
            <Text className="text-muted text-[13px] leading-5 mt-2 text-center">
              {t("discover.checkLater")}
            </Text>
          </View>
        ) : (
          <View className="w-full flex-1 max-h-[520px]">
            {/* Next card (behind) */}
            {behindCard && (
              <View
                className="absolute w-full h-full bg-surface rounded-[24px] overflow-hidden"
                style={[cardShadow, { transform: [{ scale: 0.95 }], top: 10, zIndex: 1 }]}
              >
                <CardContent profile={behindCard} />
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
                    zIndex: 2,
                  },
                  cardAnimatedStyle,
                  cardShadow,
                ]}
                className="bg-surface rounded-[24px] overflow-hidden"
              >
                <Animated.View
                  pointerEvents="none"
                  style={buddyFeedbackStyle}
                  className="absolute top-6 left-6 z-10 rounded-full bg-brand px-4 py-2"
                >
                  <Text className="text-white text-base font-bold">
                    {t("common.buddy")}
                  </Text>
                </Animated.View>
                <Animated.View
                  pointerEvents="none"
                  style={nextFeedbackStyle}
                  className="absolute top-6 right-6 z-10 rounded-full bg-soft/90 px-4 py-2"
                >
                  <Text className="text-white text-base font-bold">
                    {t("discover.nextBadge")}
                  </Text>
                </Animated.View>

                <View className="flex-1">
                  <CardContent profile={card} />
                </View>
              </Animated.View>
            </GestureDetector>

            <View
              pointerEvents="none"
              className="absolute left-0 right-0 items-center px-6"
              style={{ bottom: -58, zIndex: 0 }}
            >
              <Text className="text-sm font-semibold text-muted text-center">
                {t("discover.instructions")}
              </Text>
              <Text className="text-xs text-subtle text-center mt-1">
                {t("discover.tapForMore")}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const CardContent = memo(function CardContent({ profile }: { profile: Profile }) {
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
        <Text className="text-xl font-bold text-ink">
          {profile.name}, {profile.age}
        </Text>
        <View className="flex-row items-center mt-1">
          <EmojiIcon name="school-outline" size={14} color={design.colors.muted} />
          <Text className="text-sm text-muted ml-1">{profile.faculty}</Text>
        </View>
        {profile.bio && (
          <Text className="text-sm text-soft mt-2" numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
      </View>
    </>
  );
});
