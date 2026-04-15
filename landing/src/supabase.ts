import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseConfig = Boolean(url && anon);
export const supabase = hasSupabaseConfig ? createClient(url!, anon!) : null;

export type RestaurantInfo = {
  address?: string | null;
  city?: string | null;
  rating?: number | null;
  supplement_price?: number | null;
  meal_price?: number | null;
};

export type PublicBone = {
  id: string;
  user_id: string;
  restaurant: string;
  restaurant_info: RestaurantInfo | null;
  scheduled_at: string;
  note: string | null;
  created_at: string;
};

export type PublicAuthor = {
  id: string;
  name: string;
  faculty: string | null;
  photos: string[] | null;
};
