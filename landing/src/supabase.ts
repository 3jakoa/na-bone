import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon);

export type PublicBone = {
  id: string;
  user_id: string;
  restaurant: string;
  scheduled_at: string;
  note: string | null;
  created_at: string;
};
