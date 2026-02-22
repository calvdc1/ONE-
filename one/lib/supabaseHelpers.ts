import { supabase, isSupabaseConfigured } from "./supabase";

type JsonRecord = Record<string, unknown>;

export async function upsertUserProfileSupabase(email: string, profile: JsonRecord): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase
      .from("users")
      .upsert(
        {
          email,
          profile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );
  } catch {
    // noop
  }
}

export async function getUserProfileSupabase(email: string): Promise<JsonRecord | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data } = await supabase
      .from("users")
      .select("profile")
      .eq("email", email)
      .maybeSingle();
    if (!data || !("profile" in data)) return null;
    const rec = data as { profile?: JsonRecord } | null;
    return rec && rec.profile ? rec.profile : null;
  } catch {
    return null;
  }
}

