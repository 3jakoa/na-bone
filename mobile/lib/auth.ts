import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const redirectTo = Linking.createURL("/auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, error: error?.message ?? "OAuth init failed" };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { ok: false, error: "cancelled" };

  const url = new URL(result.url);
  const code = url.searchParams.get("code");
  if (!code) return { ok: false, error: "no_code" };

  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exErr) return { ok: false, error: exErr.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await supabase.auth.signOut();
    return { ok: false, error: "no_user" };
  }
  return { ok: true };
}
