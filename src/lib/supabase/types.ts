export type University =
  | "Univerza v Ljubljani"
  | "Univerza v Mariboru"
  | "Univerza na Primorskem"
  | "Univerza v Novi Gorici";

export type City =
  | "Ljubljana"
  | "Maribor"
  | "Koper"
  | "Nova Gorica"
  | "Kranj"
  | "Celje"
  | "Novo Mesto";

export type Gender = "moški" | "ženska" | "drugo";

export type RestaurantInfo = {
  address?: string | null;
  city?: string | null;
  rating?: number | null;
  supplement_price?: number | null;
  meal_price?: number | null;
};

export type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  age: number;
  bio: string | null;
  faculty: string;
  university: string;
  city: string;
  gender: Gender;
  photos: string[];
  top_restaurants: string[];
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
};

export type SwipeRow = {
  id: string;
  swiper_id: string;
  swiped_id: string;
  direction: "left" | "right";
  created_at: string;
};

export type SwipeInsert = Omit<SwipeRow, "id" | "created_at"> & {
  created_at?: string;
};

export type SwipeUpdate = Partial<Omit<SwipeRow, "id">>;

export type MatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
};

export type BoneRow = {
  id: string;
  user_id: string;
  match_id: string | null;
  restaurant: string;
  restaurant_info: RestaurantInfo | null;
  scheduled_at: string;
  note: string | null;
  status: "open" | "accepted" | "declined" | "done";
  visibility: "public" | "private";
  created_at: string;
};

export type RestaurantRow = {
  id: string;
  sp_id: number | null;
  name: string;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  supplement_price: number | null;
  meal_price: number | null;
  rating: number | null;
  features: string[] | null;
  phone: string | null;
  created_at: string;
};

export type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      profile_swipes: {
        Row: SwipeRow;
        Insert: SwipeInsert;
        Update: SwipeUpdate;
        Relationships: [];
      };
      buddy_matches: {
        Row: MatchRow;
        Insert: Omit<MatchRow, "id" | "created_at">;
        Update: Partial<Omit<MatchRow, "id" | "created_at">>;
        Relationships: [];
      };
      meal_invites: {
        Row: BoneRow;
        Insert: Omit<BoneRow, "id" | "created_at">;
        Update: Partial<Omit<BoneRow, "id" | "created_at">>;
        Relationships: [];
      };
      restaurants: {
        Row: RestaurantRow;
        Insert: Omit<RestaurantRow, "id" | "created_at">;
        Update: Partial<Omit<RestaurantRow, "id" | "created_at">>;
        Relationships: [];
      };
      chat_messages: {
        Row: MessageRow;
        Insert: Omit<MessageRow, "id" | "created_at">;
        Update: Partial<Omit<MessageRow, "id" | "created_at">>;
        Relationships: [];
      };
      blocked_users: {
        Row: { id: string; blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Profile = ProfileRow;
export type Swipe = SwipeRow;
export type Match = MatchRow;
export type Bone = BoneRow;
export type Restaurant = RestaurantRow;
export type Message = MessageRow;
