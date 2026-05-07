# Deployment

Guia para subir Open House Foto Tracker a GitHub y deployarlo en Vercel.

## A. GitHub

Si el proyecto todavia no tiene git:

```bash
git init
git add .
git commit -m "Initial version of Open House Foto Tracker"
git branch -M main
git remote add origin <URL_DEL_REPO_GITHUB>
git push -u origin main
```

Antes de `git add .`, confirmar:

```bash
git status --short
git check-ignore .env.local
git check-ignore .next
git check-ignore node_modules
```

No subir `.env.local`, `.env`, `.vercel`, `.next` ni `node_modules`.

## B. Supabase

1. Crear proyecto en Supabase.
2. Copiar Project URL y anon public key.
3. Ejecutar SQL en orden:

```text
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_admin_geocoding_opening_slots.sql
```

4. Crear usuarios en Authentication.
5. Crear profiles en `public.profiles`.
6. Activar email/password o magic link segun el flujo elegido.
7. Configurar Auth URLs.

Site URL local para desarrollo:

```text
http://localhost:3000
```

Redirect URLs recomendadas:

```text
http://localhost:3000/**
https://nombre-del-proyecto.vercel.app/**
https://*.vercel.app/**
```

## C. Vercel

1. Ir a Vercel.
2. Crear `New Project`.
3. Importar repo desde GitHub.
4. Framework: Next.js.
5. Agregar Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Tambien se puede usar:

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

6. Deploy.
7. Copiar la URL final de Vercel.
8. Volver a Supabase y configurar Site URL y Redirect URLs con esa URL.
9. Redeploy si cambiaste variables.

## D. Pruebas Post Deploy

- [ ] App abre en Vercel
- [ ] Login funciona
- [ ] Magic link redirige a la app correcta
- [ ] Profile activo entra al dashboard
- [ ] Usuario sin profile activo queda bloqueado
- [ ] Mapa carga
- [ ] Lugares aparecen
- [ ] CSV import funciona desde Admin
- [ ] Se puede asignar un lugar
- [ ] Se puede marcar en progreso
- [ ] Se puede marcar fotografiado
- [ ] Activity log registra acciones
- [ ] Realtime actualiza otro navegador sin recargar
- [ ] `/api/geocode?address=Balcarce%2017%2C%20Rosario%2C%20Santa%20Fe%2C%20Argentina` responde

## Problemas Comunes

- **Login falla en produccion**: revisar variables en Vercel y Redirect URLs en Supabase.
- **Magic link vuelve a localhost**: actualizar Site URL en Supabase.
- **Mapa no carga**: confirmar que el componente Leaflet se importa dinamicamente con `ssr: false`.
- **No aparecen lugares**: revisar RLS, profile activo y migraciones ejecutadas.
- **Realtime no actualiza**: revisar que las tablas esten agregadas a `supabase_realtime`.
- **Variables nuevas no aplican en Vercel**: hacer redeploy.

## Seguridad

- No usar service role key en frontend.
- No commitear `.env.local`.
- No commitear `.vercel`.
- Mantener RLS activo.
- Crear admins manualmente y revisar permisos.
