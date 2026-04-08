import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#00A6F6",
        tabBarStyle: { backgroundColor: "#fff" },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: "Išči" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="matches" options={{ title: "Buddies" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
