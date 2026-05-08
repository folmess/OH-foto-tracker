# Open House Foto Tracker

App colaborativa privada para coordinar cobertura fotografica de obras, edificios y lugares durante Open House Rosario. No sube ni almacena fotos: registra lugares, asignaciones, estados, notas, horarios, geolocalizacion manual e historial de actividad.

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Realtime y Row Level Security
- Leaflet / React-Leaflet
- Vercel

## Requisitos

- Node.js 20 recomendado
- npm
- cuenta de Supabase
- cuenta de GitHub
- cuenta de Vercel

## Instalacion Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completar `.env.local` antes de intentar login. Ese archivo es local y no debe subirse a GitHub.

## Variables De Entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL de Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key de Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: alternativa nueva de Supabase si tu proyecto la usa.

La app acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No uses service role keys en frontend.

Para conseguirlas: Supabase dashboard -> Project Settings -> API.

Variables futuras documentadas pero no usadas actualmente:

```bash
# GEOCODING_PROVIDER=georef
# MAPBOX_TOKEN=
# GOOGLE_GEOCODING_API_KEY=
# LOCATIONIQ_API_KEY=
```

El geocoding actual usa Nominatim/OpenStreetMap desde `/api/geocode` y no necesita API key.

## Supabase Setup

1. Crear un proyecto en Supabase.
2. Activar Auth con email/password o magic link.
3. Ejecutar migraciones SQL en orden desde `supabase/migrations`:
   - `0001_initial_schema.sql`
   - `0002_admin_geocoding_opening_slots.sql`
   - `0003_multiple_assignments_photo_sessions.sql`
   - `0004_admins_are_assignable_photographers.sql`
4. Verificar que Row Level Security quede activo.
5. Crear usuarios en Supabase Auth.
6. Crear un `profile` para cada usuario con el mismo UUID de `auth.users.id`.
7. Configurar Site URL y Redirect URLs si se usa magic link.
8. Importar CSV de lugares desde Admin.

Primer admin de ejemplo:

```sql
insert into public.profiles (id, full_name, email, color, role, active)
values (
  'AUTH_USER_UUID',
  'Nombre Admin',
  'admin@example.com',
  '#147a73',
  'admin',
  true
);
```

La app bloquea el acceso si el usuario autenticado no tiene un profile activo.

## Supabase Auth En Produccion

Cuando tengas la URL de Vercel, configurar en Supabase Auth:

El login principal de la app usa acceso por email sin contraseña (`signInWithOtp`). Para que el link vuelva a la app correcta, estas URLs tienen que estar bien configuradas.

Site URL:

```text
https://nombre-del-proyecto.vercel.app
```

Redirect URLs:

```text
http://localhost:3000/**
https://nombre-del-proyecto.vercel.app/**
https://*.vercel.app/**
```

Usa `https://*.vercel.app/**` solo si queres permitir previews de Vercel.

## Deploy En Vercel

1. Subir el repo a GitHub.
2. Ir a Vercel -> New Project.
3. Importar el repo desde GitHub.
4. Framework preset: Next.js.
5. Agregar Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
6. Deploy.
7. Configurar Supabase Auth con la URL final de Vercel.

En Vercel, las variables se configuran en Project Settings -> Environment Variables. Los cambios aplican en deployments nuevos.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

- `dev`: servidor local de desarrollo.
- `build`: build de produccion.
- `start`: sirve el build generado.
- `lint`: ESLint/Next lint.
- `typecheck`: TypeScript sin emitir archivos.

## CSV

Formato recomendado con preset:

```csv
place_number,name,street_address,city,lat,lng,priority,notes,schedule_preset
05,Sede Aricana,Buenos Aires 934,Rosario,-32.947305,-60.637992,high,Entrada por Buenos Aires,weekend_full
```

Valores de `schedule_preset`:

- `saturday_morning`
- `saturday_full`
- `sunday_morning`
- `sunday_full`
- `weekend_morning`
- `weekend_full`

Formato detallado para franjas especificas:

```csv
place_number,name,street_address,city,lat,lng,priority,notes,saturday_morning_open,saturday_morning_close,saturday_afternoon_open,saturday_afternoon_close,sunday_morning_open,sunday_morning_close,sunday_afternoon_open,sunday_afternoon_close
18,Casa Pasaje Monroe,Monroe 742,Rosario,-32.943210,-60.652180,high,Abre sabado manana y domingo tarde,10:00,13:00,,,,,15:00,19:00
```

Reglas:

- `place_number`, `name`, `street_address`, `city`, `lat`, `lng` y `priority` son los campos principales.
- `city` debe ser `Rosario` o `Funes`.
- `priority` debe ser `low`, `medium` o `high`.
- Si `lat` o `lng` estan vacios, el importador marca error.
- No se hace geocoding masivo automatico desde CSV.
- Los lugares importados quedan en `pending`.

## Geocoding

En Admin:

1. Cargar numero, nombre y direccion corta.
2. Elegir Rosario o Funes.
3. Tocar `Buscar coordenadas`.
4. La app consulta `/api/geocode`.
5. Si hay cache en `geocoding_cache`, usa ese resultado.
6. Si hay varios resultados, el admin elige uno.
7. El mini mapa permite ajustar manualmente el marker.

La direccion final tiene este formato:

```text
Balcarce 17, Rosario, Santa Fe, Argentina
```

## Asignaciones Y Sesiones

- Un lugar puede tener varias asignaciones activas de distintos fotografos.
- Un usuario admin tambien puede ser asignado y fotografiar; `admin` significa `admin + fotografo`.
- Marcar `Fotografiado` crea una nueva sesion fotografica; no pisa sesiones anteriores.
- Si un lugar ya tiene sesiones pero todavia quedan asignaciones activas, sigue apareciendo como pendiente/asignado con chip `Ya fotografiado`.
- El porcentaje completado cuenta lugares cerrados, mientras que las estadisticas de sesiones cuentan cada visita fotografica.

## Notas De Seguridad

- No subir `.env.local`.
- No subir `.env` ni claves privadas.
- No usar service role key en frontend.
- No exponer claves privadas de geocoding.
- No hacer publico el mapa sin login.
- Mantener RLS activo en Supabase.
- Revisar permisos antes de crear admins.

## Checklist Antes De Deploy

- [ ] `npm install` funciona
- [ ] `npm run build` funciona
- [ ] `.env.local` existe localmente
- [ ] `.env.local` no esta trackeado por git
- [ ] `.env.example` existe
- [ ] Supabase URL configurada
- [ ] Supabase anon key o publishable key configurada
- [ ] SQL ejecutado en Supabase
- [ ] Usuarios creados
- [ ] Profiles creados
- [ ] Redirect URLs configuradas
- [ ] CSV import probado
- [ ] Mapa carga correctamente
- [ ] Login funciona
- [ ] Realtime funciona

## Checklist Despues De Deploy

- [ ] App abre en Vercel
- [ ] Login funciona en produccion
- [ ] Magic link vuelve correctamente a la app
- [ ] Mapa carga en produccion
- [ ] Lugares aparecen
- [ ] Se puede asignar lugar
- [ ] Se puede marcar como fotografiado
- [ ] Activity log registra acciones
- [ ] Otro usuario ve cambios sin recargar
