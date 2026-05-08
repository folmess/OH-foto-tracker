"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getSupabaseConfigError } from "@/lib/env";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage(`${getSupabaseConfigError()} Completa .env.local y reinicia el servidor.`);
      return;
    }
    setLoading(true);
    setMessage(null);
    const redirectTo = window.location.origin;
    const result = useMagicLink
      ? await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      setLoading(false);
      setMessage(result.error.message);
      return;
    }
    if (useMagicLink) {
      setLoading(false);
      setMessage("Te enviamos un link de acceso. Revisa tu email. El link puede tardar unos segundos. Revisa spam si no llega.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f351b] via-[#153d22] to-[#1a5c2e] p-5">
      {loading && !useMagicLink && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#9068a5] p-5">
          <div className="flex animate-pulse flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-inner ring-1 ring-white/25">
              <Image src="/OHLOGO.avif" alt="Open House Rosario" width={58} height={58} priority className="h-14 w-14 object-contain grayscale brightness-0 invert" />
            </div>
            <p className="mt-4 text-sm font-bold tracking-wide text-white">Cargando OH Foto Tracker</p>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex justify-center">
          <Image src="/OHLOGO.avif" alt="Open House Rosario" width={168} height={168} priority className="mb-6 h-auto w-40 drop-shadow-lg" />
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-panel backdrop-blur-xl">
          <h1 className="text-center font-bebas text-5xl leading-none tracking-normal text-[#9068a5]">OH Foto Tracker</h1>
          <div className="mt-8 space-y-3">
            <label className="block text-sm font-semibold text-ink">
              Email
              <input
                className="mt-1 w-full rounded-xl border border-black/10 bg-field px-4 py-3.5 text-ink placeholder:text-ink/40 focus:border-[#9068a5] focus:outline-none focus:ring-2 focus:ring-[#9068a5]/20"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                required
              />
            </label>
            {!useMagicLink && (
              <label className="block text-sm font-semibold text-ink">
                Contraseña
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 bg-field px-4 py-3.5 text-ink focus:border-[#9068a5] focus:outline-none focus:ring-2 focus:ring-[#9068a5]/20"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
            )}
          </div>
          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm font-semibold text-coral">
              {getSupabaseConfigError()} Crea `.env.local` con la URL y la anon key o publishable key del proyecto.
            </p>
          )}
          {message && <p className="mt-4 rounded-xl bg-[#9068a5]/10 p-3 text-sm font-semibold text-ink">{message}</p>}
          <button
            disabled={loading || !isSupabaseConfigured}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#9068a5] px-4 py-3.5 font-bold text-white shadow-lg shadow-[#9068a5]/20 transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Ingresando..." : useMagicLink ? "Enviarme link de acceso" : "Ingresar con contraseña"}
          </button>
          <button
            type="button"
            onClick={() => {
              setUseMagicLink((value) => !value);
              setMessage(null);
            }}
            className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-ink/55 transition hover:bg-mist hover:text-ink active:scale-[0.98]"
          >
            {useMagicLink ? "Ingresar con contraseña" : "Usar link de acceso por email"}
          </button>
        </form>
      </div>
    </main>
  );
}
