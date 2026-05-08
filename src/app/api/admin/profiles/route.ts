import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Role } from "@/types";

type ProfilePayload = {
  id?: string;
  full_name?: string;
  email?: string;
  password?: string;
  color?: string;
  role?: Role;
  active?: boolean;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "photographer";
}

type CleanPayloadResult =
  | { error: string; data?: never }
  | {
      data: {
        id: string | null;
        full_name: string;
        email: string;
        password: string | null;
        color: string;
        role: Role;
        active: boolean;
      };
      error?: never;
    };

function cleanPayload(payload: ProfilePayload): CleanPayloadResult {
  const fullName = payload.full_name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const color = payload.color?.trim() || "#147a73";
  const role = payload.role || "photographer";

  if (!fullName) return { error: "El nombre es obligatorio." };
  if (!email) return { error: "El email es obligatorio." };
  if (!isRole(role)) return { error: "El rol es invalido." };
  if (!/^#[0-9a-f]{6}$/i.test(color)) return { error: "El color debe ser hexadecimal." };
  if (!payload.id && (!password || password.length < 6)) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (payload.id && password && password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

  return {
    data: {
      id: payload.id?.trim() || null,
      full_name: fullName,
      email,
      password: password || null,
      color,
      role,
      active: payload.active ?? true
    }
  };
}

async function findAuthUserByEmail(serviceClient: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) return jsonError("Faltan variables publicas de Supabase.", 500);
  if (!serviceRoleKey) return jsonError("Falta SUPABASE_SERVICE_ROLE_KEY para crear usuarios de Auth desde Admin.", 500);

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return jsonError("Falta sesion de admin.", 401);

  const authedClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userResult, error: userError } = await authedClient.auth.getUser();
  if (userError || !userResult.user) return jsonError("Sesion invalida.", 401);

  const { data: adminProfile, error: adminError } = await serviceClient
    .from("profiles")
    .select("role, active")
    .eq("id", userResult.user.id)
    .maybeSingle();
  if (adminError) return jsonError(adminError.message, 500);
  if (!adminProfile || adminProfile.role !== "admin" || !adminProfile.active) return jsonError("No autorizado.", 403);

  const body = (await request.json()) as ProfilePayload;
  const cleaned = cleanPayload(body);
  const payload = cleaned.data;
  if (!payload) return jsonError(cleaned.error || "Datos invalidos.", 400);

  let authResult = payload.id
    ? await serviceClient.auth.admin.updateUserById(payload.id, {
        email: payload.email,
        password: payload.password ?? undefined,
        user_metadata: { full_name: payload.full_name, role: payload.role }
      })
    : await serviceClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password ?? undefined,
        email_confirm: true,
        user_metadata: { full_name: payload.full_name, role: payload.role }
      });

  if (!payload.id && authResult.error) {
    const existingUser = await findAuthUserByEmail(serviceClient, payload.email);
    if (existingUser) {
      authResult = await serviceClient.auth.admin.updateUserById(existingUser.id, {
        email: payload.email,
        password: payload.password ?? undefined,
        user_metadata: { full_name: payload.full_name, role: payload.role }
      });
    }
  }

  if (authResult.error || !authResult.data.user) return jsonError(authResult.error?.message ?? "No se pudo crear el usuario.", 400);

  const userId = authResult.data.user.id;
  const { error: profileError } = await serviceClient.from("profiles").upsert({
    id: userId,
    full_name: payload.full_name,
    email: payload.email,
    color: payload.color,
    role: payload.role,
    active: payload.active
  });
  if (profileError) return jsonError(profileError.message, 400);

  return NextResponse.json({ id: userId });
}
