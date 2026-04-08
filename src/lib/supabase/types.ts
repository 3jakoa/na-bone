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

// Row types (what comes back from the database)
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
  scheduled_at: string;
  note: string | null;
  status: "open" | "accepted" | "declined" | "done";
  created_at: string;
};

export type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

// Supabase requires Relationships on every table definition
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      swipes: {
        Row: SwipeRow;
        Insert: SwipeInsert;
        Update: SwipeUpdate;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: Omit<MatchRow, "id" | "created_at">;
        Update: Partial<Omit<MatchRow, "id" | "created_at">>;
        Relationships: [];
      };
      bones: {
        Row: BoneRow;
        Insert: Omit<BoneRow, "id" | "created_at">;
        Update: Partial<Omit<BoneRow, "id" | "created_at">>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: Omit<MessageRow, "id" | "created_at">;
        Update: Partial<Omit<MessageRow, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Convenience aliases
export type Profile = ProfileRow;
export type Swipe = SwipeRow;
export type Match = MatchRow;
export type Bone = BoneRow;
export type Message = MessageRow;
