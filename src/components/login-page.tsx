"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getSupabaseConfigError } from "@/lib/env";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
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
    const result = showPasswordLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (!showPasswordLogin) setMessage("Te enviamos un link de acceso. Revisa tu email. El link puede tardar unos segundos. Revisa spam si no llega.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f351b] p-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Image src="/OHLOGO.avif" alt="Open House Rosario" width={168} height={168} priority className="mb-6 h-auto w-40" />
        </div>
        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-panel">
        <h1 className="text-center font-bebas text-5xl leading-none tracking-normal text-[#9068a5]">OH Foto Tracker</h1>
        <div className="mt-8 space-y-3">
          <label className="block text-sm font-semibold text-ink">
            Email
            <input className="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-3 text-ink placeholder:text-ink/45 focus:border-[#9068a5] focus:outline-none focus:ring-2 focus:ring-[#9068a5]/20" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {showPasswordLogin && (
            <label className="block text-sm font-semibold text-ink">
              Contraseña
              <input className="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-3 text-ink focus:border-[#9068a5] focus:outline-none focus:ring-2 focus:ring-[#9068a5]/20" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
          )}
        </div>
        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-md bg-coral/10 p-3 text-sm font-semibold text-coral">
            {getSupabaseConfigError()} Crea `.env.local` con la URL y la anon key o publishable key del proyecto.
          </p>
        )}
        {message && <p className="mt-4 rounded-md bg-[#9068a5]/10 p-3 text-sm font-semibold text-ink">{message}</p>}
        <button disabled={loading || !isSupabaseConfigured} className="mt-5 w-full rounded-md bg-[#9068a5] px-4 py-3 font-semibold text-white disabled:opacity-60">
          {loading ? "Enviando..." : showPasswordLogin ? "Ingresar con contraseña" : "Enviarme link de acceso por email"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPasswordLogin((value) => !value);
            setMessage(null);
          }}
          className="mt-4 w-full rounded-md px-4 py-2 text-sm font-semibold text-ink/70 underline underline-offset-4"
        >
          {showPasswordLogin ? "Usar link de acceso por email" : "Ingresar con contraseña"}
        </button>
        </form>
      </div>
    </main>
  );
}
