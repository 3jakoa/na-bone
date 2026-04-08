import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const url = (Constants.expoConfig?.extra?.supabaseUrl as string) ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anon = (Constants.expoConfig?.extra?.supabaseAnonKey as string) ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  age: number;
  bio: string | null;
  faculty: string;
  university: string;
  city: string;
  gender: "moški" | "ženska" | "drugo";
  photos: string[];
  is_onboarded: boolean;
};

export type Bone = {
  id: string;
  user_id: string;
  match_id: string | null;
  restaurant: string;
  scheduled_at: string;
  note: string | null;
  status: "open" | "accepted" | "declined" | "done";
  visibility: "public" | "private";
  created_at: string;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};
