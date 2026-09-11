import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Trim and drop any trailing slash: a stray space or slash pasted into .env
// turns into a DNS failure that surfaces only as "Network request failed".
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!rawUrl || !rawKey) {
  throw new Error(
    "Missing Supabase config. Copy .env.example to .env and set " +
      "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, " +
      "then restart with: npx expo start --clear",
  );
}

if (!rawUrl.startsWith("https://")) {
  // iOS blocks plain http from apps even though Safari allows it, which looks
  // identical to the app being offline.
  throw new Error(
    `EXPO_PUBLIC_SUPABASE_URL must start with https:// — got "${rawUrl}". ` +
      "Fix .env, then restart with: npx expo start --clear",
  );
}

export const supabaseUrl = rawUrl;

export const supabase = createClient(rawUrl, rawKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
