import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A fresh, non-persistent client per call — used only for admin "add member"
// signUp calls so the new user's session never touches or replaces the
// admin's own logged-in session (which lives in the default supabase client).
export const createIsolatedClient = () =>
  createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
