import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

function getRedirectTo() {
  const appOwnership = Constants.appOwnership;

  // Expo Go cannot use the app's custom scheme, so it must round-trip back
  // into the current exp:// session URL. Native/dev builds should use the
  // production app scheme.
  if (appOwnership === "expo") {
    return Linking.createURL("auth/callback");
  }

  return makeRedirectUri({
    scheme: "bonibuddy",
    path: "auth/callback",
  });
}

function getOAuthParams(url: string) {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);
  const hash = parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash;

  if (hash) {
    const hashParams = new URLSearchParams(hash);
    for (const [key, value] of hashParams.entries()) {
      if (!params.has(key)) params.set(key, value);
    }
  }

  return params;
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, error: error?.message ?? "OAuth init failed" };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { ok: false, error: "cancelled" };

  const params = getOAuthParams(result.url);
  const authError = params.get("error_description") ?? params.get("error");
  if (authError) return { ok: false, error: authError };

  const code = params.get("code");
  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) return { ok: false, error: exErr.message };
  } else {
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return {
        ok: false,
        error: `OAuth callback mismatch. Add this Redirect URL in Supabase Auth: ${redirectTo}`,
      };
    }

    const { error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionErr) return { ok: false, error: sessionErr.message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await supabase.auth.signOut();
    return { ok: false, error: "no_user" };
  }
  return { ok: true };
}
