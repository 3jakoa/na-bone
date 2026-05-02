import { useEffect, useRef } from "react";
import {
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { OpenSans_400Regular } from "@expo-google-fonts/open-sans";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { design } from "../lib/design";

const BRAND = design.colors.brand;
const SKY_BG = design.colors.page;

export function AnimatedSplashScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    OpenSans_400Regular,
  });
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(0.5)).current;
  const mascotTranslateY = useRef(new Animated.Value(16)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(8)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    const dotLoops: Animated.CompositeAnimation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    const entranceAnimation = Animated.parallel([
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.spring(mascotOpacity, {
            toValue: 1,
            damping: 18,
            stiffness: 180,
            mass: 1,
            useNativeDriver: true,
          }),
          Animated.spring(mascotScale, {
            toValue: 1,
            damping: 18,
            stiffness: 180,
            mass: 1,
            useNativeDriver: true,
          }),
          Animated.spring(mascotTranslateY, {
            toValue: 0,
            damping: 18,
            stiffness: 180,
            mass: 1,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(260),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkTranslateY, {
            toValue: 0,
            duration: 450,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(420),
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(550),
        Animated.timing(dotsOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    entranceAnimation.start();

    dotAnims.forEach((dotAnim, index) => {
      const timer = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(dotAnim, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
              toValue: 0,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );

        dotLoops.push(loop);
        loop.start();
      }, 550 + index * 200);

      timers.push(timer);
    });

    return () => {
      entranceAnimation.stop();
      timers.forEach(clearTimeout);
      dotLoops.forEach((loop) => loop.stop());
    };
  }, [
    dotAnims,
    dotsOpacity,
    fontsLoaded,
    mascotOpacity,
    mascotScale,
    mascotTranslateY,
    taglineOpacity,
    taglineTranslateY,
    wordmarkOpacity,
    wordmarkTranslateY,
  ]);

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.mascotWrap,
            {
              opacity: mascotOpacity,
              transform: [
                { scale: mascotScale },
                { translateY: mascotTranslateY },
              ],
            },
          ]}
        >
          <Image
            source={require("../assets/logo.png")}
            style={styles.mascot}
            resizeMode="cover"
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.wordmark,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkTranslateY }],
            },
          ]}
        >
          BoniBuddy
        </Animated.Text>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          Najdi družbo za bone.
        </Animated.Text>
      </View>

      <Animated.View style={[styles.dots, { opacity: dotsOpacity }]}>
        {dotAnims.map((dotAnim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: dotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
                transform: [
                  {
                    scale: dotAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SKY_BG,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  mascotWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: design.colors.white,
    backgroundColor: design.colors.white,
    ...Platform.select({
      ios: {
        shadowColor: design.colors.brand,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mascot: {
    width: "100%",
    height: "100%",
  },
  wordmark: {
    marginTop: 20,
    color: BRAND,
    fontFamily: "Poppins_700Bold",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
  },
  tagline: {
    marginTop: 8,
    color: design.colors.muted,
    fontFamily: "OpenSans_400Regular",
    fontSize: 15,
    fontWeight: "400",
  },
  dots: {
    position: "absolute",
    bottom: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BRAND,
  },
});
