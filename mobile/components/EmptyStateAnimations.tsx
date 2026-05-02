import { useEffect } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { design } from "../lib/design";

const BRAND = design.colors.brand;
const BRAND_LIGHT = design.colors.brandLight;
const BORDER = design.colors.border;
const DANGER = design.colors.danger;
const GRAY_100 = design.colors.field;
const GRAY_200 = design.colors.border;
const GRAY_400 = design.colors.muted;

function useLoop(duration: number, easing = Easing.inOut(Easing.ease)) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration, easing }),
      -1,
      false
    );
  }, [duration, easing, progress]);

  return progress;
}

function phase(value: number, offset: number) {
  "worklet";
  return (value + offset) % 1;
}

function useFoodFloatStyle(progress: SharedValue<number>, offset: number) {
  return useAnimatedStyle<ViewStyle>(() => {
    const p = phase(progress.value, offset);
    return {
      opacity: interpolate(p, [0, 0.5, 1], [0.55, 1, 0.55]),
      transform: [
        { translateY: interpolate(p, [0, 0.5, 1], [0, -8, 0]) },
        { scale: interpolate(p, [0, 0.5, 1], [0.96, 1.04, 0.96]) },
      ],
    };
  });
}

function useTypingDotStyle(progress: SharedValue<number>, index: number) {
  return useAnimatedStyle<ViewStyle>(() => {
    const p = phase(progress.value, index * 0.3);
    return {
      opacity: interpolate(p, [0, 0.25, 1], [0.15, 1, 0.15]),
    };
  });
}

function useHeartStyle(progress: SharedValue<number>, offset: number, variant: 0 | 1 | 2) {
  return useAnimatedStyle<ViewStyle>(() => {
    const p = phase(progress.value, offset);
    const translateY = interpolate(
      p,
      [0, 0.22, 0.55, 0.85, 1],
      variant === 1 ? [0, -22, -44, -60, -60] : variant === 2 ? [0, -14, -30, -48, -48] : [0, -18, -36, -54, -54],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      p,
      [0, 0.22, 0.55, 0.85, 1],
      variant === 1 ? [0.3, 1.2, 0.85, 0.5, 0.5] : variant === 2 ? [0.5, 1, 0.9, 0.6, 0.6] : [0.4, 1.1, 0.9, 0.6, 0.6],
      Extrapolation.CLAMP
    );
    const rotate = interpolate(
      p,
      [0, 0.22, 0.55, 0.85, 1],
      variant === 1 ? [10, -8, 4, 0, 0] : variant === 2 ? [-5, 6, -3, 0, 0] : [-10, 8, -5, 0, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity: interpolate(p, [0, 0.2, 0.6, 0.85, 1], [0, 1, 1, 0, 0]),
      transform: [{ translateY }, { scale }, { rotate: `${rotate}deg` }],
    };
  });
}

export function FeedEmptyAnimation() {
  const progress = useLoop(2600, Easing.inOut(Easing.ease));

  const plateStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 0.5, 1], [0, -8, 0]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.06, 1]) },
    ],
  }));

  const firstFoodStyle = useFoodFloatStyle(progress, 0);
  const secondFoodStyle = useFoodFloatStyle(progress, 0.28);
  const thirdFoodStyle = useFoodFloatStyle(progress, 0.56);

  const foods = [
    { emoji: "🍜", placement: styles.foodTopLeft, style: firstFoodStyle },
    { emoji: "🥗", placement: styles.foodTopRight, style: secondFoodStyle },
    { emoji: "🍕", placement: styles.foodBottom, style: thirdFoodStyle },
  ];

  return (
    <View style={styles.canvas}>
      {foods.map((food) => (
        <Animated.View
          key={food.emoji}
          style={[styles.foodEmojiWrap, food.placement, food.style]}
        >
          <Text style={styles.foodEmoji}>{food.emoji}</Text>
        </Animated.View>
      ))}

      <Animated.View style={[styles.feedPlateWrap, plateStyle]}>
        <Text style={styles.feedPlate}>🍽️</Text>
      </Animated.View>
    </View>
  );
}

export function DiscoverEmptyAnimation() {
  const cards = useLoop(3800);

  const bottomCardStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: 0.5,
    transform: [{ translateY: 10 }, { scale: 0.91 }],
  }));

  const middleCardStyle = useAnimatedStyle<ViewStyle>(() => {
    const p = phase(cards.value, 0.24);
    return {
      opacity: interpolate(p, [0, 0.35, 0.63, 0.64, 1], [0.8, 0.8, 0, 0, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 0.35, 0.63, 1], [0, 0, -100, 0], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [0, 0.35, 0.63, 1], [-2, -2, -20, -2], Extrapolation.CLAMP)}deg` },
        { scale: 0.96 },
      ],
    };
  });

  const topCardStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: interpolate(cards.value, [0, 0.2, 0.48, 0.49, 1], [1, 1, 0, 0, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(cards.value, [0, 0.2, 0.48, 1], [0, 0, 110, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(cards.value, [0, 0.2, 0.48, 1], [0, 0, 22, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const nopeStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: interpolate(cards.value, [0, 0.15, 0.25, 0.38, 0.45, 1], [0, 0, 1, 1, 0, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(cards.value, [0, 0.15, 0.25, 0.38, 0.45, 1], [0.6, 0.6, 1, 1, 0.6, 0.6], Extrapolation.CLAMP) },
      { rotate: `${interpolate(cards.value, [0, 0.25, 0.38, 1], [8, -8, -8, 8], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const yepStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: interpolate(cards.value, [0, 0.5, 0.6, 0.73, 0.8, 1], [0, 0, 1, 1, 0, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(cards.value, [0, 0.5, 0.6, 0.73, 0.8, 1], [0.6, 0.6, 1, 1, 0.6, 0.6], Extrapolation.CLAMP) },
      { rotate: `${interpolate(cards.value, [0, 0.6, 0.73, 1], [-8, 8, 8, -8], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const glassStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { scale: interpolate(cards.value, [0, 0.5, 1], [1, 1.08, 1]) },
      { rotate: `${interpolate(cards.value, [0, 0.5, 1], [-8, 8, -8])}deg` },
    ],
  }));

  return (
    <View style={styles.canvas}>
      <View style={styles.discoverStack}>
        <Animated.View style={[styles.discoverCard, bottomCardStyle]}>
          <EmojiCardContent emoji="😴" />
        </Animated.View>
        <Animated.View style={[styles.discoverCard, middleCardStyle]}>
          <EmojiCardContent emoji="🤩" active />
        </Animated.View>
        <Animated.View style={[styles.discoverCard, styles.discoverTopCard, topCardStyle]}>
          <EmojiCardContent emoji="😊" active />
          <Animated.View style={[styles.nopeBadge, nopeStyle]}>
            <Text style={styles.nopeText}>✕ NOPE</Text>
          </Animated.View>
          <Animated.View style={[styles.yepBadge, yepStyle]}>
            <Text style={styles.yepText}>💙 YEP</Text>
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.View style={[styles.magnifier, glassStyle]}>
        <Text style={styles.magnifierEmoji}>🔍</Text>
      </Animated.View>
    </View>
  );
}

function EmojiCardContent({ emoji, active = false }: { emoji: string; active?: boolean }) {
  return (
    <>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={[styles.skeletonLineWide, active ? styles.skeletonActive : null]} />
      <View style={[styles.skeletonLineShort, active ? styles.skeletonActive : null]} />
    </>
  );
}

export function MatchesEmptyAnimation() {
  const drift = useLoop(2800);
  const hearts = useLoop(2400, Easing.out(Easing.ease));
  const typing = useLoop(900);

  const leftFaceStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 0.5, 1], [0, 8, 0]) },
      { rotate: `${interpolate(drift.value, [0, 0.5, 1], [0, -6, 0])}deg` },
    ],
  }));

  const rightFaceStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 0.5, 1], [0, -8, 0]) },
      { rotate: `${interpolate(drift.value, [0, 0.5, 1], [0, 6, 0])}deg` },
    ],
  }));

  const leftBubbleStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: interpolate(drift.value, [0, 0.15, 0.65, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(drift.value, [0, 0.15, 0.65, 1], [6, 0, 0, 6], Extrapolation.CLAMP) },
      { scale: interpolate(drift.value, [0, 0.15, 0.65, 1], [0.7, 1, 1, 0.7], Extrapolation.CLAMP) },
    ],
  }));

  const rightBubbleStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: interpolate(drift.value, [0, 0.35, 0.5, 0.9, 1], [0, 0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(drift.value, [0, 0.35, 0.5, 0.9, 1], [6, 6, 0, 0, 6], Extrapolation.CLAMP) },
      { scale: interpolate(drift.value, [0, 0.35, 0.5, 0.9, 1], [0.7, 0.7, 1, 1, 0.7], Extrapolation.CLAMP) },
    ],
  }));

  const heartOneStyle = useHeartStyle(hearts, 0, 0);
  const heartTwoStyle = useHeartStyle(hearts, 0.21, 1);
  const heartThreeStyle = useHeartStyle(hearts, 0.42, 2);
  const dotOneStyle = useTypingDotStyle(typing, 0);
  const dotTwoStyle = useTypingDotStyle(typing, 1);
  const dotThreeStyle = useTypingDotStyle(typing, 2);

  return (
    <View style={styles.canvas}>
      <Animated.View style={[styles.heartOne, heartOneStyle]}>
        <Text style={styles.heartSmall}>💙</Text>
      </Animated.View>
      <Animated.View style={[styles.heartTwo, heartTwoStyle]}>
        <Text style={styles.heartLarge}>💙</Text>
      </Animated.View>
      <Animated.View style={[styles.heartThree, heartThreeStyle]}>
        <Text style={styles.heartTiny}>💙</Text>
      </Animated.View>

      <Animated.View style={[styles.buddyLeft, leftFaceStyle]}>
        <Animated.View style={[styles.leftBubble, leftBubbleStyle]}>
          <TypingDots color={GRAY_400} dotStyles={[dotOneStyle, dotTwoStyle, dotThreeStyle]} />
        </Animated.View>
        <Text style={styles.buddyEmoji}>😄</Text>
      </Animated.View>

      <Animated.View style={[styles.buddyRight, rightFaceStyle]}>
        <Animated.View style={[styles.rightBubble, rightBubbleStyle]}>
          <TypingDots color={design.colors.white} dotStyles={[dotOneStyle, dotTwoStyle, dotThreeStyle]} />
        </Animated.View>
        <Text style={styles.buddyEmoji}>🥰</Text>
      </Animated.View>
    </View>
  );
}

function TypingDots({
  color,
  dotStyles,
}: {
  color: string;
  dotStyles: ViewStyle[];
}) {
  return (
    <View style={styles.typingDots}>
      {dotStyles.map((dotStyle, index) => (
        <Animated.View
          key={index}
          style={[styles.typingDot, { backgroundColor: color }, dotStyle]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: 180,
    height: 160,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  foodEmojiWrap: {
    position: "absolute",
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  foodTopLeft: {
    left: 30,
    top: 30,
  },
  foodTopRight: {
    right: 26,
    top: 28,
  },
  foodBottom: {
    left: 70,
    bottom: 16,
  },
  foodEmoji: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  feedPlateWrap: {
    position: "relative",
    zIndex: 2,
  },
  feedPlate: {
    fontSize: 64,
    lineHeight: 72,
  },
  discoverStack: {
    width: 80,
    height: 110,
    position: "relative",
  },
  discoverCard: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: design.radius.control,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: design.colors.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  discoverTopCard: {
    borderWidth: 2,
    borderColor: BRAND_LIGHT,
    shadowColor: BRAND,
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  cardEmoji: {
    fontSize: 36,
    lineHeight: 42,
  },
  skeletonLineWide: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: GRAY_100,
  },
  skeletonLineShort: {
    width: 32,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GRAY_100,
  },
  skeletonActive: {
    backgroundColor: GRAY_200,
  },
  nopeBadge: {
    position: "absolute",
    top: 8,
    left: 6,
    borderRadius: 999,
    backgroundColor: design.colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  yepBadge: {
    position: "absolute",
    top: 8,
    right: 6,
    borderRadius: 999,
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  nopeText: {
    color: DANGER,
    fontSize: 10,
    fontWeight: "800",
  },
  yepText: {
    color: BRAND,
    fontSize: 10,
    fontWeight: "800",
  },
  magnifier: {
    position: "absolute",
    right: 24,
    bottom: 10,
  },
  magnifierEmoji: {
    fontSize: 28,
  },
  heartOne: {
    position: "absolute",
    top: 28,
    left: 72,
  },
  heartSmall: {
    fontSize: 16,
  },
  heartTwo: {
    position: "absolute",
    top: 34,
    left: 84,
  },
  heartLarge: {
    fontSize: 22,
  },
  heartThree: {
    position: "absolute",
    top: 30,
    left: 96,
  },
  heartTiny: {
    fontSize: 13,
  },
  buddyLeft: {
    position: "absolute",
    left: 14,
    top: 46,
    alignItems: "center",
    gap: 4,
  },
  buddyRight: {
    position: "absolute",
    right: 14,
    top: 46,
    alignItems: "center",
    gap: 4,
  },
  buddyEmoji: {
    fontSize: 42,
    lineHeight: 48,
  },
  leftBubble: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: design.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  rightBubble: {
    borderRadius: 12,
    backgroundColor: BRAND,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  typingDots: {
    flexDirection: "row",
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
