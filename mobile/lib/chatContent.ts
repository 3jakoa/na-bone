export type InviteCard = {
  type: "bone_invite";
  bone_id: string;
  restaurant: string;
  restaurant_address?: string | null;
  restaurant_city?: string | null;
  restaurant_rating?: number | null;
  restaurant_supplement?: number | null;
  restaurant_meal_price?: number | null;
  scheduled_at: string;
  note: string | null;
};

export type PokeCard = {
  type: "poke";
  location_label: string;
  prompt: string;
};

export type StructuredChatContent = InviteCard | PokeCard;

export function parseStructuredChatContent(
  content: string
): StructuredChatContent | null {
  try {
    const parsed = JSON.parse(content);

    if (parsed?.type === "bone_invite" && typeof parsed?.bone_id === "string") {
      return parsed as InviteCard;
    }

    if (
      parsed?.type === "poke" &&
      typeof parsed?.location_label === "string" &&
      typeof parsed?.prompt === "string"
    ) {
      return parsed as PokeCard;
    }
  } catch {}

  return null;
}

export function getChatMessagePreview(content: string) {
  const parsed = parseStructuredChatContent(content);
  if (!parsed) {
    return {
      preview: content,
    };
  }

  if (parsed.type === "bone_invite") {
    return {
      preview: `Povabilo na bon: ${parsed.restaurant ?? "Restavracija"}`,
    };
  }

  return {
    preview: parsed.prompt,
  };
}
