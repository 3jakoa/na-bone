import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
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

const BRAND = "#00A6F6";
const BRAND_DARK = "#0080C0";
const BRAND_LIGHT = "#E0F4FE";
const BORDER = "#e5e7eb";
const GRAY_100 = "#f3f4f6";
const GRAY_200 = "#e5e7eb";
const GRAY_400 = "#9ca3af";
const ORANGE = "#f97316";

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

function useCrumbStyle(
  progress: SharedValue<number>,
  offset: number,
  radius: number
) {
  return useAnimatedStyle(() => {
    const p = phase(progress.value, offset);
    return {
      opacity: interpolate(p, [0, 0.1, 0.9, 1], [0, 0.9, 0.9, 0]),
      transform: [{ rotate: `${p * 360}deg` }, { translateX: radius }],
    };
  });
}

function useRadarStyle(
  progress: SharedValue<number>,
  offset: number,
  maxOpacity: number
) {
  return useAnimatedStyle(() => {
    const p = phase(progress.value, offset);
    const size = interpolate(p, [0, 1], [12, 104]);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity: interpolate(p, [0, 1], [maxOpacity, 0]),
    };
  });
}

function useBubbleStyle(progress: SharedValue<number>, right = false) {
  return useAnimatedStyle(() => {
    const input = right ? [0, 0.3, 0.5, 0.85, 1] : [0, 0.2, 0.7, 1];
    const opacity = right
      ? interpolate(
          progress.value,
          input,
          [0, 0, 1, 1, 0],
          Extrapolation.CLAMP
        )
      : interpolate(
          progress.value,
          input,
          [0, 1, 1, 0],
          Extrapolation.CLAMP
        );
    return {
      opacity,
      transform: [
        { translateY: interpolate(opacity, [0, 1], [5, 0]) },
        { scale: interpolate(opacity, [0, 1], [0.75, 1]) },
      ],
    };
  });
}

function useTypingDotStyle(progress: SharedValue<number>, index: number) {
  return useAnimatedStyle<ViewStyle>(() => {
    const value = phase(progress.value, index * 0.3);
    return {
      opacity: interpolate(value, [0, 0.25, 1], [0.2, 1, 0.2]),
    };
  });
}

export function FeedEmptyAnimation() {
  const float = useLoop(3000);
  const wobble = useLoop(3400);
  const orbit = useLoop(4200);
  const plus = useLoop(2400);

  const plateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 0.5, 1], [0, -9, 0]) }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(float.value, [0, 0.5, 1], [0.12, 0.06, 0.12]),
    transform: [{ scaleX: interpolate(float.value, [0, 0.5, 1], [1, 0.82, 1]) }],
  }));

  const leftToolStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(wobble.value, [0, 0.5, 1], [-5, 3, -5])}deg` },
    ],
  }));

  const rightToolStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(wobble.value, [0, 0.5, 1], [5, -3, 5])}deg` },
    ],
  }));

  const plusStyle = useAnimatedStyle(() => ({
    opacity: interpolate(plus.value, [0, 0.4, 0.6, 1], [0, 0.6, 0.6, 0]),
    transform: [
      { scale: interpolate(plus.value, [0, 0.4, 0.6, 1], [0.5, 1, 1, 0.5]) },
    ],
  }));

  const crumbOneStyle = useCrumbStyle(orbit, 0, 54);
  const crumbTwoStyle = useCrumbStyle(orbit, 1 / 3, 48);
  const crumbThreeStyle = useCrumbStyle(orbit, 2 / 3, 42);

  return (
    <View style={styles.canvas}>
      <Animated.View style={[styles.plateShadow, shadowStyle]} />

      <View style={styles.orbitCenter} pointerEvents="none">
        <Animated.View style={[styles.crumb, styles.crumbOrange, crumbOneStyle]} />
        <Animated.View style={[styles.crumbSmall, styles.crumbBrand, crumbTwoStyle]} />
        <Animated.View style={[styles.crumbTiny, styles.crumbSky, crumbThreeStyle]} />
      </View>

      <Animated.View style={[styles.plateGroup, plateStyle]}>
        <View style={styles.plateBase} />
        <View style={styles.plateBowl}>
          <View style={styles.plateRim}>
            <View style={styles.plateCenter}>
              <Animated.View style={[styles.plusGroup, plusStyle]}>
                <View style={styles.plusVertical} />
                <View style={styles.plusHorizontal} />
              </Animated.View>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.fork, leftToolStyle]}>
        <View style={styles.forkCrossbar} />
        <View style={styles.forkTineOne} />
        <View style={styles.forkTineTwo} />
        <View style={styles.forkTineThree} />
        <View style={styles.forkHandle} />
      </Animated.View>

      <Animated.View style={[styles.knife, rightToolStyle]}>
        <View style={styles.knifeBlade} />
        <View style={styles.knifeHandle} />
      </Animated.View>
    </View>
  );
}

export function DiscoverEmptyAnimation() {
  const radar = useLoop(2800, Easing.out(Easing.ease));
  const cards = useLoop(3800, Easing.in(Easing.ease));
  const dot = useLoop(2000);

  const firstRadarStyle = useRadarStyle(radar, 0, 0.9);
  const secondRadarStyle = useRadarStyle(radar, 0.5, 0.7);

  const bottomCardStyle = useAnimatedStyle(() => ({
    opacity: 0.45,
    transform: [{ translateY: 8 }, { scale: 0.94 }],
  }));

  const middleCardStyle = useAnimatedStyle(() => {
    const p = phase(cards.value, 0.24);
    return {
      opacity: interpolate(p, [0, 0.4, 0.7, 0.71, 1], [0.7, 0.7, 0, 0, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 0.4, 0.7, 1], [0, 0, -76, 0], Extrapolation.CLAMP) },
        { translateY: interpolate(p, [0, 0.4, 0.7, 1], [0, 0, -22, 0], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [0, 0.4, 0.7, 1], [-2, -2, -18, -2], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const topCardStyle = useAnimatedStyle(() => {
    const p = cards.value;
    return {
      opacity: interpolate(p, [0, 0.25, 0.55, 0.56, 1], [1, 1, 0, 0, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 0.25, 0.55, 1], [0, 0, 88, 0], Extrapolation.CLAMP) },
        { translateY: interpolate(p, [0, 0.25, 0.55, 1], [0, 0, -28, 0], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [0, 0.25, 0.55, 1], [0, 0, 20, 0], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(dot.value, [0, 0.5, 1], [1, 1.3, 1]) }],
  }));

  return (
    <View style={styles.canvas}>
      <View style={styles.radarCenter}>
        <Animated.View style={[styles.radarRing, firstRadarStyle]} />
        <Animated.View style={[styles.radarRing, secondRadarStyle]} />
      </View>

      <Animated.View style={[styles.discoverCard, styles.discoverCardBottom, bottomCardStyle]}>
        <CardSkeleton size="small" />
      </Animated.View>
      <Animated.View style={[styles.discoverCard, styles.discoverCardMiddle, middleCardStyle]}>
        <CardSkeleton />
      </Animated.View>
      <Animated.View style={[styles.discoverCard, styles.discoverCardTop, topCardStyle]}>
        <View style={styles.passHint} />
        <View style={styles.buddyHint} />
        <CardSkeleton active />
      </Animated.View>

      <Animated.View style={[styles.centerDot, dotStyle]}>
        <View style={styles.centerDotInner} />
      </Animated.View>
    </View>
  );
}

function CardSkeleton({ active = false, size = "regular" }: { active?: boolean; size?: "regular" | "small" }) {
  const avatarSize = size === "small" ? 26 : active ? 32 : 28;
  return (
    <View style={styles.cardSkeleton}>
      <View
        style={[
          styles.skeletonAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: active ? "rgba(71,189,239,0.25)" : BRAND_LIGHT,
          },
        ]}
      >
        {active ? <View style={styles.skeletonAvatarInner} /> : null}
      </View>
      <View style={[styles.skeletonLineWide, active ? styles.skeletonLineActive : null]} />
      <View style={[styles.skeletonLineShort, active ? styles.skeletonLineActive : null]} />
    </View>
  );
}

export function MatchesEmptyAnimation() {
  const drift = useLoop(3200);
  const typing = useLoop(1000);
  const rightTyping = useLoop(1000);

  const leftFigureStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(drift.value, [0, 0.5, 1], [0, 7, 0]) }],
  }));

  const rightFigureStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(drift.value, [0, 0.5, 1], [0, -7, 0]) }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 0.5, 1], [0.15, 0.5, 0.15]),
    transform: [{ translateX: interpolate(drift.value, [0, 0.5, 1], [-8, 0, -8]) }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 0.45, 0.6, 0.82, 1], [0, 0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(drift.value, [0, 0.45, 0.6, 0.82, 1], [2, 2, -10, -10, 2], Extrapolation.CLAMP) },
      { scale: interpolate(drift.value, [0, 0.45, 0.6, 0.82, 1], [0.3, 0.3, 1, 1, 0.3], Extrapolation.CLAMP) },
    ],
  }));

  const leftBubbleStyle = useBubbleStyle(drift);
  const rightBubbleStyle = useBubbleStyle(drift, true);
  const leftDotOneStyle = useTypingDotStyle(typing, 0);
  const leftDotTwoStyle = useTypingDotStyle(typing, 1);
  const leftDotThreeStyle = useTypingDotStyle(typing, 2);
  const rightDotOneStyle = useTypingDotStyle(rightTyping, 0);
  const rightDotTwoStyle = useTypingDotStyle(rightTyping, 1);
  const rightDotThreeStyle = useTypingDotStyle(rightTyping, 2);

  return (
    <View style={styles.canvas}>
      <View style={styles.connectionLineClip}>
        <Animated.View style={[styles.connectionLine, lineStyle]} />
      </View>

      <Animated.View style={[styles.leftFigure, leftFigureStyle]}>
        <Figure fill={BRAND_LIGHT} faceOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.rightFigure, rightFigureStyle]}>
        <Figure fill="rgba(0,166,246,0.18)" faceOpacity={0.7} />
      </Animated.View>

      <Animated.View style={[styles.leftBubble, leftBubbleStyle]}>
        <View style={styles.leftBubbleTail} />
        <TypingDots
          color={GRAY_400}
          stylesForDots={[leftDotOneStyle, leftDotTwoStyle, leftDotThreeStyle]}
        />
      </Animated.View>

      <Animated.View style={[styles.rightBubble, rightBubbleStyle]}>
        <View style={styles.rightBubbleTail} />
        <TypingDots
          color="#ffffff"
          stylesForDots={[rightDotOneStyle, rightDotTwoStyle, rightDotThreeStyle]}
        />
      </Animated.View>

      <Animated.View style={[styles.heart, heartStyle]}>
        <Ionicons name="heart" size={24} color={BRAND} />
      </Animated.View>
    </View>
  );
}

function Figure({ fill, faceOpacity }: { fill: string; faceOpacity: number }) {
  return (
    <>
      <View style={[styles.figureBody, { backgroundColor: fill }]} />
      <View style={[styles.figureHead, { backgroundColor: fill }]}>
        <View style={[styles.figureEye, styles.figureEyeLeft, { opacity: faceOpacity }]} />
        <View style={[styles.figureEye, styles.figureEyeRight, { opacity: faceOpacity }]} />
        <View style={[styles.figureSmile, { opacity: faceOpacity }]} />
      </View>
    </>
  );
}

function TypingDots({
  color,
  stylesForDots,
}: {
  color: string;
  stylesForDots: ViewStyle[];
}) {
  return (
    <View style={styles.typingDots}>
      {stylesForDots.map((dotStyle, index) => (
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
  },
  plateShadow: {
    position: "absolute",
    left: 44,
    top: 126,
    width: 92,
    height: 14,
    borderRadius: 46,
    backgroundColor: BRAND,
  },
  orbitCenter: {
    position: "absolute",
    left: 90,
    top: 86,
  },
  crumb: {
    position: "absolute",
    left: -5.5,
    top: -5.5,
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  crumbSmall: {
    position: "absolute",
    left: -4.5,
    top: -4.5,
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  crumbTiny: {
    position: "absolute",
    left: -4,
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  crumbOrange: {
    backgroundColor: ORANGE,
  },
  crumbBrand: {
    backgroundColor: BRAND,
  },
  crumbSky: {
    backgroundColor: "#7bdcf8",
  },
  plateGroup: {
    position: "absolute",
    left: 38,
    top: 48,
    width: 104,
    height: 72,
    alignItems: "center",
  },
  plateBase: {
    position: "absolute",
    left: 0,
    top: 39,
    width: 104,
    height: 26,
    borderRadius: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  plateBowl: {
    position: "absolute",
    left: 8,
    top: 0,
    width: 88,
    height: 76,
    borderRadius: 44,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  plateRim: {
    width: 72,
    height: 60,
    borderRadius: 36,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: GRAY_100,
    alignItems: "center",
    justifyContent: "center",
  },
  plateCenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5fcff",
    alignItems: "center",
    justifyContent: "center",
  },
  plusGroup: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  plusVertical: {
    position: "absolute",
    width: 5,
    height: 14,
    borderRadius: 2.5,
    backgroundColor: BRAND,
  },
  plusHorizontal: {
    position: "absolute",
    width: 14,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BRAND,
  },
  fork: {
    position: "absolute",
    left: 50,
    top: 50,
    width: 16,
    height: 54,
  },
  forkHandle: {
    position: "absolute",
    left: 5.5,
    top: 17,
    width: 3,
    height: 34,
    borderRadius: 1.5,
    backgroundColor: GRAY_400,
  },
  forkCrossbar: {
    position: "absolute",
    left: 0,
    top: 15,
    width: 14,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: GRAY_400,
  },
  forkTineOne: {
    position: "absolute",
    left: 1,
    top: 0,
    width: 2.5,
    height: 17,
    borderRadius: 1.25,
    backgroundColor: GRAY_400,
  },
  forkTineTwo: {
    position: "absolute",
    left: 6,
    top: 0,
    width: 2.5,
    height: 17,
    borderRadius: 1.25,
    backgroundColor: GRAY_400,
  },
  forkTineThree: {
    position: "absolute",
    left: 11,
    top: 0,
    width: 2.5,
    height: 17,
    borderRadius: 1.25,
    backgroundColor: GRAY_400,
  },
  knife: {
    position: "absolute",
    left: 118,
    top: 50,
    width: 14,
    height: 54,
  },
  knifeBlade: {
    position: "absolute",
    left: 3.5,
    top: 0,
    width: 9,
    height: 18,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 9,
    backgroundColor: "#d1d5db",
    transform: [{ skewY: "16deg" }],
  },
  knifeHandle: {
    position: "absolute",
    left: 3.5,
    top: 8,
    width: 3,
    height: 43,
    borderRadius: 1.5,
    backgroundColor: GRAY_400,
  },
  radarCenter: {
    position: "absolute",
    left: 90,
    top: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  radarRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  discoverCard: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 2,
  },
  discoverCardBottom: {
    left: 57,
    top: 56,
    width: 66,
    height: 78,
    borderRadius: 14,
  },
  discoverCardMiddle: {
    left: 55,
    top: 52,
    width: 70,
    height: 78,
    borderRadius: 14,
  },
  discoverCardTop: {
    left: 53,
    top: 48,
    width: 74,
    height: 78,
    borderRadius: 14,
    borderColor: "#bfdbfe",
  },
  cardSkeleton: {
    flex: 1,
    alignItems: "center",
    paddingTop: 12,
  },
  skeletonAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonAvatarInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(71,189,239,0.45)",
  },
  skeletonLineWide: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: GRAY_100,
    marginTop: 14,
  },
  skeletonLineShort: {
    width: 28,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GRAY_100,
    marginTop: 5,
  },
  skeletonLineActive: {
    backgroundColor: GRAY_200,
  },
  passHint: {
    position: "absolute",
    left: 3,
    top: 4,
    width: 20,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(156,163,175,0.15)",
  },
  buddyHint: {
    position: "absolute",
    right: 3,
    top: 4,
    width: 20,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(0,166,246,0.15)",
  },
  centerDot: {
    position: "absolute",
    left: 85,
    top: 85,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  centerDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#ffffff",
  },
  connectionLineClip: {
    position: "absolute",
    left: 68,
    top: 98,
    width: 44,
    height: 4,
    overflow: "hidden",
  },
  connectionLine: {
    width: 120,
    height: 1.5,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BRAND,
  },
  leftFigure: {
    position: "absolute",
    left: 30,
    top: 78,
    width: 36,
    height: 51,
  },
  rightFigure: {
    position: "absolute",
    left: 114,
    top: 78,
    width: 36,
    height: 51,
  },
  figureBody: {
    position: "absolute",
    left: 0,
    top: 25,
    width: 36,
    height: 26,
    borderRadius: 12,
  },
  figureHead: {
    position: "absolute",
    left: 4,
    top: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  figureEye: {
    position: "absolute",
    top: 11,
    width: 3.6,
    height: 3.6,
    borderRadius: 1.8,
    backgroundColor: BRAND_DARK,
  },
  figureEyeLeft: {
    left: 10,
  },
  figureEyeRight: {
    right: 10,
  },
  figureSmile: {
    position: "absolute",
    left: 10,
    top: 15,
    width: 8,
    height: 5,
    borderBottomWidth: 1.8,
    borderColor: BRAND_DARK,
    borderRadius: 8,
  },
  leftBubble: {
    position: "absolute",
    left: 26,
    top: 56,
    width: 38,
    height: 24,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    borderWidth: 1.2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  leftBubbleTail: {
    position: "absolute",
    left: 8,
    bottom: -5,
    width: 10,
    height: 10,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    transform: [{ rotate: "45deg" }],
  },
  rightBubble: {
    position: "absolute",
    left: 116,
    top: 56,
    width: 38,
    height: 24,
    borderRadius: 11,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  rightBubbleTail: {
    position: "absolute",
    right: 8,
    bottom: -5,
    width: 10,
    height: 10,
    backgroundColor: BRAND,
    transform: [{ rotate: "45deg" }],
  },
  typingDots: {
    flexDirection: "row",
    gap: 4,
  },
  typingDot: {
    width: 5.6,
    height: 5.6,
    borderRadius: 2.8,
  },
  heart: {
    position: "absolute",
    left: 78,
    top: 72,
    width: 24,
    height: 24,
  },
});
