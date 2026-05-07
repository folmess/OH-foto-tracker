export function getSupabaseBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing: string[] = [];

  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  return {
    url,
    key,
    isConfigured: missing.length === 0,
    missing
  };
}

export function getSupabaseConfigError() {
  const env = getSupabaseBrowserEnv();
  if (env.isConfigured) return null;
  return `Faltan variables de entorno: ${env.missing.join(", ")}.`;
}
