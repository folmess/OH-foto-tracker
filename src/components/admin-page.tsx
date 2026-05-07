"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import type { City, OpeningSlot, Place, Priority, Profile, Role } from "@/types";
import { supabase } from "@/lib/supabase";
import { StatsPanel } from "./stats-panel";
import { StatusBadge, PriorityBadge, PhotographerBadge } from "./badges";
import { AddressGeocoder } from "./address-geocoder";
import { MiniMapPicker } from "./mini-map-picker";
import { OpeningHoursEditor, slotsFromPreset } from "./opening-hours-editor";
import { formatOpeningHours, getOpeningSlots } from "@/lib/place-utils";

type CsvPlace = {
  place_number?: string;
  name: string;
  street_address?: string;
  city?: City;
  address?: string;
  neighborhood?: string;
  lat?: string;
  lng?: string;
  priority?: Priority;
  notes?: string;
  schedule_preset?: string;
  saturday_morning_open?: string;
  saturday_morning_close?: string;
  saturday_afternoon_open?: string;
  saturday_afternoon_close?: string;
  sunday_morning_open?: string;
  sunday_morning_close?: string;
  sunday_afternoon_open?: string;
  sunday_afternoon_close?: string;
};

function addDetailedSlot(slots: OpeningSlot[], row: CsvPlace, day: "saturday" | "sunday", period: "morning" | "afternoon") {
  const open = row[`${day}_${period}_open` as keyof CsvPlace];
  const close = row[`${day}_${period}_close` as keyof CsvPlace];
  if (typeof open === "string" && typeof close === "string" && open && close) {
    slots.push({ day_of_week: day, period, open_time: open, close_time: close });
  }
}

function slotsForCsvRow(row: CsvPlace) {
  const detailed: OpeningSlot[] = [];
  addDetailedSlot(detailed, row, "saturday", "morning");
  addDetailedSlot(detailed, row, "saturday", "afternoon");
  addDetailedSlot(detailed, row, "sunday", "morning");
  addDetailedSlot(detailed, row, "sunday", "afternoon");
  if (detailed.length) return detailed;
  return slotsFromPreset(row.schedule_preset || "");
}

export function AdminPage({ places, profiles, refresh }: { places: Place[]; profiles: Profile[]; refresh: () => Promise<void> }) {
  const [csvRows, setCsvRows] = useState<CsvPlace[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Partial<Profile>>({ color: "#147a73", role: "photographer", active: true });
  const [editingPlace, setEditingPlace] = useState<Partial<Place>>({ priority: "medium", status: "pending", city: "Rosario" });
  const [openingSlots, setOpeningSlots] = useState<OpeningSlot[]>(slotsFromPreset("saturday_morning"));
  const [coordinatesAdjusted, setCoordinatesAdjusted] = useState(false);

  const validRows = useMemo(
    () =>
      csvRows.filter(
        (row) =>
          row.name?.trim() &&
          Number.isFinite(Number(row.lat)) &&
          Number.isFinite(Number(row.lng)) &&
          (row.city === undefined || row.city === "Rosario" || row.city === "Funes") &&
          (!row.priority || ["low", "medium", "high"].includes(row.priority))
      ),
    [csvRows]
  );

  function parseCsv(file: File) {
    Papa.parse<CsvPlace>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data;
        const errors = rows.flatMap((row, index) => {
          const rowErrors: string[] = [];
          if (!row.name?.trim()) rowErrors.push(`Fila ${index + 2}: falta name`);
          if (!row.street_address?.trim() && !row.address?.trim()) rowErrors.push(`Fila ${index + 2}: falta street_address o address`);
          if (row.city && row.city !== "Rosario" && row.city !== "Funes") rowErrors.push(`Fila ${index + 2}: city invalida`);
          if (!Number.isFinite(Number(row.lat))) rowErrors.push(`Fila ${index + 2}: lat invalida o vacia; buscala manualmente antes de importar`);
          if (!Number.isFinite(Number(row.lng))) rowErrors.push(`Fila ${index + 2}: lng invalida o vacia; buscala manualmente antes de importar`);
          if (row.priority && !["low", "medium", "high"].includes(row.priority)) rowErrors.push(`Fila ${index + 2}: priority invalida`);
          if (!slotsForCsvRow(row).length) rowErrors.push(`Fila ${index + 2}: falta schedule_preset valido o horarios detallados`);
          return rowErrors;
        });
        setCsvRows(rows);
        setCsvErrors(errors);
      }
    });
  }

  async function importCsv() {
    setMessage(null);
    let inserted = 0;
    let skipped = 0;
    for (const row of validRows) {
      const streetAddress = row.street_address || row.address || "";
      const city = row.city || "Rosario";
      const fullAddress = `${streetAddress}, ${city}, Santa Fe, Argentina`;
      const { data: existing } = await supabase
        .from("places")
        .select("id")
        .eq("name", row.name)
        .eq("address", fullAddress)
        .maybeSingle();
      if (existing) {
        skipped += 1;
        continue;
      }
      const { data: place, error } = await supabase
        .from("places")
        .insert({
          name: row.name,
          place_number: row.place_number || null,
          street_address: streetAddress,
          city,
          full_address: fullAddress,
          address: fullAddress,
          neighborhood: row.neighborhood || null,
          lat: Number(row.lat),
          lng: Number(row.lng),
          priority: row.priority || "medium",
          status: "pending",
          notes: row.notes || null
        })
        .select("id")
        .single();
      if (error || !place) {
        setMessage(error?.message ?? "No se pudo importar una fila.");
        return;
      }
      await supabase.from("place_opening_slots").insert(slotsForCsvRow(row).map((slot) => ({ ...slot, place_id: place.id })));
      inserted += 1;
    }
    setMessage(`Importados: ${inserted}. Duplicados omitidos: ${skipped}.`);
    setCsvRows([]);
    await refresh();
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!editingProfile.id || !editingProfile.full_name || !editingProfile.email) return;
    setMessage(null);
    const payload = {
      id: editingProfile.id,
      full_name: editingProfile.full_name,
      email: editingProfile.email,
      color: editingProfile.color || "#147a73",
      role: (editingProfile.role || "photographer") as Role,
      active: editingProfile.active ?? true
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setMessage(error ? error.message : "Fotografo guardado.");
    if (!error) {
      setEditingProfile({ color: "#147a73", role: "photographer", active: true });
      await refresh();
    }
  }

  async function savePlace(event: FormEvent) {
    event.preventDefault();
    if (!editingPlace.name?.trim()) return setMessage("El nombre es obligatorio.");
    if (!editingPlace.street_address?.trim()) return setMessage("La direccion es obligatoria.");
    if (!editingPlace.city) return setMessage("La ciudad es obligatoria.");
    if (editingPlace.lat === undefined || editingPlace.lng === undefined) return setMessage("Busca coordenadas antes de guardar.");
    if (!openingSlots.length) return setMessage("Carga al menos una franja horaria.");
    if (openingSlots.some((slot) => !slot.open_time || !slot.close_time || slot.open_time >= slot.close_time)) return setMessage("Revisa horarios: apertura debe ser menor que cierre.");
    setMessage(null);
    const fullAddress = editingPlace.full_address || `${editingPlace.street_address}, ${editingPlace.city}, Santa Fe, Argentina`;
    const payload = {
      name: editingPlace.name,
      place_number: editingPlace.place_number || null,
      street_address: editingPlace.street_address,
      city: editingPlace.city,
      full_address: fullAddress,
      address: fullAddress,
      neighborhood: editingPlace.neighborhood || null,
      lat: Number(editingPlace.lat),
      lng: Number(editingPlace.lng),
      saturday_open: null,
      saturday_close: null,
      sunday_open: null,
      sunday_close: null,
      priority: editingPlace.priority || "medium",
      status: editingPlace.status || "pending",
      notes: editingPlace.notes || null,
      admin_notes: editingPlace.admin_notes || null
    };
    const request = editingPlace.id
      ? supabase.from("places").update(payload).eq("id", editingPlace.id).select("id").single()
      : supabase.from("places").insert(payload).select("id").single();
    const { data: savedPlace, error } = await request;
    setMessage(error ? error.message : "Lugar guardado.");
    if (!error && savedPlace) {
      await supabase.from("place_opening_slots").delete().eq("place_id", savedPlace.id);
      const { error: slotsError } = await supabase.from("place_opening_slots").insert(openingSlots.map((slot) => ({ ...slot, place_id: savedPlace.id })));
      if (slotsError) {
        setMessage(slotsError.message);
        return;
      }
      setEditingPlace({ priority: "medium", status: "pending", city: "Rosario" });
      setOpeningSlots(slotsFromPreset("saturday_morning"));
      setCoordinatesAdjusted(false);
      await refresh();
    }
  }

  function editPlace(place: Place) {
    setEditingPlace({ ...place, street_address: place.street_address || place.address || "", city: place.city || "Rosario", full_address: place.full_address || place.address || "" });
    setOpeningSlots(getOpeningSlots(place));
    setCoordinatesAdjusted(false);
  }

  async function deletePlace(place: Place) {
    if (!window.confirm(`Borrar ${place.name}?`)) return;
    const { error } = await supabase.from("places").delete().eq("id", place.id);
    setMessage(error ? error.message : "Lugar borrado.");
    if (!error) await refresh();
  }

  return (
    <div className="h-full overflow-y-auto bg-field p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <section>
          <h2 className="text-2xl font-bold">Admin</h2>
          <p className="text-sm text-ink/60">Importacion, fotografos, lugares y estadisticas basicas.</p>
        </section>
        {message && <p className="rounded-md bg-mist p-3 text-sm font-semibold">{message}</p>}
        <StatsPanel places={places} profiles={profiles} />
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="font-bold">Crear o editar lugar</h3>
          <form onSubmit={savePlace} className="mt-3 grid gap-2 md:grid-cols-6">
            <input placeholder="Numero, ej. 05" className="rounded-md border p-2" value={editingPlace.place_number ?? ""} onChange={(event) => setEditingPlace({ ...editingPlace, place_number: event.target.value })} />
            <input placeholder="Nombre, ej. Sede Aricana" className="rounded-md border p-2 md:col-span-3" value={editingPlace.name ?? ""} onChange={(event) => setEditingPlace({ ...editingPlace, name: event.target.value })} required />
            <select className="rounded-md border p-2" value={editingPlace.priority ?? "medium"} onChange={(event) => setEditingPlace({ ...editingPlace, priority: event.target.value as Priority })}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
            <AddressGeocoder
              streetAddress={editingPlace.street_address ?? ""}
              city={(editingPlace.city ?? "Rosario") as City}
              lat={editingPlace.lat}
              lng={editingPlace.lng}
              onAddressChange={(value) => setEditingPlace({ ...editingPlace, street_address: value, full_address: `${value}, ${editingPlace.city ?? "Rosario"}, Santa Fe, Argentina` })}
              onCityChange={(value) => setEditingPlace({ ...editingPlace, city: value, full_address: `${editingPlace.street_address ?? ""}, ${value}, Santa Fe, Argentina` })}
              onCoordinatesChange={(lat, lng, fullAddress) => {
                setEditingPlace({ ...editingPlace, lat, lng, full_address: fullAddress, address: fullAddress });
                setCoordinatesAdjusted(false);
              }}
            />
            <input placeholder="Lat" type="number" step="any" className="rounded-md border p-2" value={editingPlace.lat ?? ""} onChange={(event) => setEditingPlace({ ...editingPlace, lat: Number(event.target.value) })} required />
            <input placeholder="Lng" type="number" step="any" className="rounded-md border p-2" value={editingPlace.lng ?? ""} onChange={(event) => setEditingPlace({ ...editingPlace, lng: Number(event.target.value) })} required />
            {editingPlace.lat !== undefined && editingPlace.lng !== undefined && (
              <div className="md:col-span-4">
                <MiniMapPicker
                  value={{ lat: Number(editingPlace.lat), lng: Number(editingPlace.lng) }}
                  onChange={(value) => {
                    setEditingPlace({ ...editingPlace, lat: value.lat, lng: value.lng });
                    setCoordinatesAdjusted(true);
                  }}
                />
                {coordinatesAdjusted && <p className="mt-2 text-sm font-semibold text-river">Coordenadas ajustadas manualmente.</p>}
              </div>
            )}
            <div className="md:col-span-6">
              <OpeningHoursEditor value={openingSlots} onChange={setOpeningSlots} />
            </div>
            <textarea placeholder="Notas" className="rounded-md border p-2 md:col-span-3" value={editingPlace.notes ?? ""} onChange={(event) => setEditingPlace({ ...editingPlace, notes: event.target.value })} />
            <textarea placeholder="Notas admin" className="rounded-md border p-2 md:col-span-3" value={editingPlace.admin_notes ?? ""} onChange={(event) => setEditingPlace({ ...editingPlace, admin_notes: event.target.value })} />
            <button className="rounded-md bg-river px-4 py-3 font-semibold text-white md:col-span-3">Guardar lugar</button>
            <button type="button" onClick={() => { setEditingPlace({ priority: "medium", status: "pending", city: "Rosario" }); setOpeningSlots(slotsFromPreset("saturday_morning")); }} className="rounded-md bg-mist px-4 py-3 font-semibold text-ink md:col-span-3">Nuevo</button>
          </form>
        </section>
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="font-bold">Importar CSV</h3>
          <input className="mt-3 w-full rounded-md border border-black/10 p-3" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && parseCsv(event.target.files[0])} />
          {csvErrors.length > 0 && <div className="mt-3 rounded-md bg-coral/10 p-3 text-sm text-coral">{csvErrors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}</div>}
          {csvRows.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold">{validRows.length} filas validas de {csvRows.length}</p>
              <button disabled={!validRows.length || csvErrors.length > 0} onClick={importCsv} className="mt-2 rounded-md bg-river px-4 py-3 font-semibold text-white disabled:opacity-50">Importar lugares</button>
            </div>
          )}
        </section>
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="font-bold">Fotografos</h3>
          <form onSubmit={saveProfile} className="mt-3 grid gap-2 md:grid-cols-6">
            <input placeholder="UUID auth user" className="rounded-md border p-2 md:col-span-2" value={editingProfile.id ?? ""} onChange={(event) => setEditingProfile({ ...editingProfile, id: event.target.value })} required />
            <input placeholder="Nombre" className="rounded-md border p-2" value={editingProfile.full_name ?? ""} onChange={(event) => setEditingProfile({ ...editingProfile, full_name: event.target.value })} required />
            <input placeholder="Email" type="email" className="rounded-md border p-2" value={editingProfile.email ?? ""} onChange={(event) => setEditingProfile({ ...editingProfile, email: event.target.value })} required />
            <input type="color" className="h-11 rounded-md border p-1" value={editingProfile.color ?? "#147a73"} onChange={(event) => setEditingProfile({ ...editingProfile, color: event.target.value })} />
            <select className="rounded-md border p-2" value={editingProfile.role ?? "photographer"} onChange={(event) => setEditingProfile({ ...editingProfile, role: event.target.value as Role })}>
              <option value="photographer">Photographer</option>
              <option value="admin">Admin</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingProfile.active ?? true} onChange={(event) => setEditingProfile({ ...editingProfile, active: event.target.checked })} />Activo</label>
            <button className="rounded-md bg-ink px-4 py-3 font-semibold text-white md:col-span-6">Guardar fotografo</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {profiles.map((profile) => (
              <button key={profile.id} onClick={() => setEditingProfile(profile)}><PhotographerBadge profile={profile} /></button>
            ))}
          </div>
        </section>
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="font-bold">Lugares</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b"><th className="py-2">Lugar</th><th>Estado</th><th>Prioridad</th><th>Asignado</th><th></th></tr></thead>
              <tbody>
                {places.map((place) => (
                  <tr key={place.id} className="border-b">
                    <td className="py-2 pr-4"><strong>{place.place_number ? `${place.place_number} · ` : ""}{place.name}</strong><br /><span className="text-ink/55">{place.full_address || place.address}</span><br /><span className="text-ink/55">{formatOpeningHours(getOpeningSlots(place))}</span></td>
                    <td><StatusBadge status={place.status} /></td>
                    <td><PriorityBadge priority={place.priority} /></td>
                    <td><PhotographerBadge profile={place.assigned_photographer_id ? profiles.find((profile) => profile.id === place.assigned_photographer_id) : null} /></td>
                    <td className="space-x-2">
                      <button onClick={() => editPlace(place)} className="rounded-md bg-ink px-3 py-2 font-semibold text-white">Editar</button>
                      <button onClick={() => deletePlace(place)} className="rounded-md bg-coral px-3 py-2 font-semibold text-white">Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
