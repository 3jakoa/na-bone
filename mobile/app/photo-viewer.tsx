import { useState } from "react";
import {
  View,
  Image,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function PhotoViewer() {
  const { photos: photosStr, index: indexStr } = useLocalSearchParams<{
    photos: string;
    index: string;
  }>();
  const photos = photosStr ? JSON.parse(photosStr) : [];
  const startIndex = parseInt(indexStr ?? "0", 10);
  const [current, setCurrent] = useState(startIndex);

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        className="absolute top-16 right-5 z-20 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
      >
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>

      {/* Photos */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: startIndex * width, y: 0 }}
        onMomentumScrollEnd={(e) => {
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        className="flex-1"
      >
        {photos.map((uri: string, i: number) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width, height }}
            resizeMode="contain"
          />
        ))}
      </ScrollView>

      {/* Dots */}
      {photos.length > 1 && (
        <View className="absolute bottom-12 left-0 right-0 flex-row justify-center gap-2">
          {photos.map((_: any, i: number) => (
            <View
              key={i}
              className={`w-2 h-2 rounded-full ${i === current ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
