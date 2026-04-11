import { supabase } from "./supabase";

/**
 * Upload a local image URI to Supabase storage.
 * Uses FormData which works reliably in React Native.
 */
export async function uploadImage(
  uri: string,
  userId: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const formData = new FormData();
  formData.append("", {
    uri,
    name: fileName,
    type: "image/jpeg",
  } as any);

  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, formData, {
      contentType: "multipart/form-data",
      upsert: true,
    });

  if (error) throw error;

  return supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
}
