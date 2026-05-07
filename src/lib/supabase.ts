"use client";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv } from "./env";

const env = getSupabaseBrowserEnv();
const supabaseUrl = env.url || "https://placeholder.supabase.co";
const supabaseKey = env.key || "placeholder-key";

export const isSupabaseConfigured = env.isConfigured;

export const supabase = createClient(supabaseUrl, supabaseKey);
