"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Footprints, List, LocateFixed, LogOut, Map, Shield } from "lucide-react";
import type { FilterKey, LocationPoint, Place, Priority, SortKey } from "@/types";
import { useAppData } from "@/hooks/use-app-data";
import { filterPlaces, sortPlaces } from "@/lib/place-utils";
import { supabase } from "@/lib/supabase";
import { LoginPage } from "./login-page";
import { FiltersBar } from "./filters-bar";
import { PlaceList } from "./place-list";
import { PlaceDrawer } from "./place-drawer";
import { MapViewDynamic } from "./map-view-dynamic";
import { NearbySuggestions } from "./nearby-suggestions";
import { AdminPage } from "./admin-page";
import { MyRouteView } from "./my-route-view";
import { MapLegend } from "./map-legend";
import { GlobalStatsChips } from "./global-stats-chips";
import { PlacePreviewCard } from "./place-preview-card";
import { MobileMapScreen } from "./mobile-map-screen";

export function DashboardPage() {
  const { user, profile, profiles, profileById, places, activity, loading, error, refresh } = useAppData();
  const [mode, setMode] = useState<"map" | "list" | "route" | "admin">("map");
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set(["all"]));
  const [sort, setSort] = useState<SortKey>("priority");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewPlace, setPreviewPlace] = useState<Place | null>(null);
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<LocationPoint | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetTouchStart, setSheetTouchStart] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const savedFilters = window.localStorage.getItem("tracker.filters");
    const savedSort = window.localStorage.getItem("tracker.sort") as SortKey | null;
    if (savedFilters) setFilters(new Set(savedFilters.split(",") as FilterKey[]));
    if (savedSort) setSort(savedSort);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tracker.filters", Array.from(filters).join(","));
    window.localStorage.setItem("tracker.sort", sort);
  }, [filters, sort]);

  useEffect(() => {
    if (!locationError) return;
    const timeout = window.setTimeout(() => setLocationError(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [locationError]);

  const visiblePlaces = useMemo(() => {
    const filtered = filterPlaces(places, filters, profile?.id, userLocation);
    const query = searchQuery.trim().toLocaleLowerCase("es-AR");
    const searched = query
      ? filtered.filter((place) =>
          [place.name, place.place_number, place.full_address, place.address, place.neighborhood, place.city]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase("es-AR").includes(query))
        )
      : filtered;
    return sortPlaces(searched, sort, userLocation);
  }, [places, filters, profile?.id, searchQuery, sort, userLocation]);

  useEffect(() => {
    if (!detailPlace) return;
    const updated = places.find((place) => place.id === detailPlace.id);
    if (!updated) return;
    if (updated.status === "completed" && detailPlace.status !== "completed") {
      const who = updated.completed_by ? profileById.get(updated.completed_by)?.full_name : "otro usuario";
      setNotice(`${updated.place_number ? `${updated.place_number} · ` : ""}${updated.name} fue fotografiado por ${who ?? "otro usuario"}.`);
    }
    if (
      updated.assigned_photographer_id &&
      updated.assigned_photographer_id !== detailPlace.assigned_photographer_id &&
      updated.assigned_photographer_id !== profile?.id
    ) {
      const who = profileById.get(updated.assigned_photographer_id)?.full_name ?? "otro usuario";
      setNotice(`${updated.place_number ? `${updated.place_number} · ` : ""}${updated.name} ahora esta asignado a ${who}.`);
    }
    if (updated !== detailPlace) setDetailPlace(updated);
  }, [places, profile?.id, profileById, detailPlace]);

  useEffect(() => {
    if (!previewPlace) return;
    const updated = places.find((place) => place.id === previewPlace.id);
    if (updated && updated !== previewPlace) setPreviewPlace(updated);
  }, [places, previewPlace]);

  function requestLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Este navegador no soporta geolocalizacion.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setLocationError("No se pudo obtener tu ubicacion."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function changePlacePriority(place: Place, priority: Priority) {
    if (!profile || profile.role !== "admin" || place.priority === priority) return;
    const { error } = await supabase
      .from("places")
      .update({ priority })
      .eq("id", place.id);
    if (error) {
      setNotice(error.message);
      return;
    }
    await supabase.from("activity_log").insert({
      place_id: place.id,
      photographer_id: profile.id,
      action: "priority_changed",
      previous_status: place.priority,
      new_status: priority
    });
    await refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-field p-5">
        <div className="flex animate-pulse flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#9068a5]/10 shadow-inner ring-1 ring-[#9068a5]/20">
            <Image src="/OHLOGO.avif" alt="Open House Rosario" width={58} height={58} priority className="h-14 w-14 object-contain grayscale" />
          </div>
          <p className="mt-4 text-sm font-bold tracking-wide text-[#9068a5]">Cargando OH Foto Tracker</p>
        </div>
      </main>
    );
  }
  if (!user) return <LoginPage />;
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-field p-5">
        <div className="max-w-sm rounded-lg bg-white p-5 shadow-panel">
          <h1 className="text-xl font-bold">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-ink/65">Tu usuario no tiene un profile activo. Pedile a un admin que cree o active tu perfil.</p>
          {error && <p className="mt-3 text-sm text-coral">{error}</p>}
          <button onClick={() => supabase.auth.signOut()} className="mt-4 rounded-md bg-ink px-4 py-3 font-semibold text-white">Salir</button>
        </div>
      </main>
    );
  }

  if (!isDesktop) {
    return (
      <MobileMapScreen
        places={places}
        visiblePlaces={visiblePlaces}
        profiles={profiles}
        profile={profile}
        profileById={profileById}
        activity={activity}
        filters={filters}
        sort={sort}
        searchQuery={searchQuery}
        selectedPlace={detailPlace}
        userLocation={userLocation}
        locationError={locationError}
        notice={notice}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        onSearchChange={setSearchQuery}
        onSelectPlace={(place) => {
          setDetailPlace(place);
          setPreviewPlace(null);
        }}
        onChangePriority={changePlacePriority}
        onClearSelectedPlace={() => setDetailPlace(null)}
        onUseLocation={requestLocation}
        onClearNotice={() => setNotice(null)}
        refresh={refresh}
      />
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-field">
      <header className="flex min-h-16 items-center justify-between gap-2 border-b border-black/10 bg-white px-3 py-2">
        <div>
          <h1 className="text-base font-bold leading-tight">Open House Foto Tracker</h1>
          <p className="text-xs text-ink/60">{profile.full_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMode(mode === "map" ? "list" : "map")} className="flex min-w-16 flex-col items-center gap-1 rounded-md bg-mist px-2 py-2 text-[11px] font-bold" aria-label="Alternar mapa lista">
            {mode === "map" ? <List size={17} /> : <Map size={17} />}
            {mode === "map" ? "Ver lista" : "Mapa"}
          </button>
          <button onClick={() => setMode(mode === "route" ? "map" : "route")} className="flex min-w-16 flex-col items-center gap-1 rounded-md bg-mist px-2 py-2 text-[11px] font-bold" aria-label="Panel">
            <Footprints size={17} />
            Panel
          </button>
          {profile.role === "admin" && (
            <button onClick={() => setMode(mode === "admin" ? "map" : "admin")} className="flex min-w-16 flex-col items-center gap-1 rounded-md bg-mist px-2 py-2 text-[11px] font-bold" aria-label="Admin">
              <Shield size={17} />
              Admin
            </button>
          )}
          <button onClick={() => supabase.auth.signOut()} className="flex min-w-16 flex-col items-center gap-1 rounded-md bg-mist px-2 py-2 text-[11px] font-bold" aria-label="Logout">
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>
      <GlobalStatsChips places={places} />
      {mode !== "admin" && <FiltersBar active={filters} onChange={setFilters} sort={sort} onSortChange={setSort} showSort={mode === "list"} />}
      {locationError && <p className="absolute left-3 right-3 top-32 z-[800] rounded-md bg-coral p-2 text-sm font-semibold text-white">{locationError}</p>}
      {notice && (
        <div className="absolute left-3 right-3 top-32 z-[850] flex items-center justify-between gap-3 rounded-md bg-ink p-3 text-sm font-semibold text-white shadow-panel md:left-auto md:w-[420px]">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="rounded-md bg-white/15 px-2 py-1">Cerrar</button>
        </div>
      )}
      <section className="relative h-[calc(100vh-11.2rem)] md:h-[calc(100vh-10.5rem)]">
        {mode === "admin" ? (
          <AdminPage places={places} profiles={profiles} refresh={refresh} />
        ) : mode === "route" ? (
          <MyRouteView places={places} profile={profile} userLocation={userLocation} onSelect={setDetailPlace} onUseLocation={requestLocation} />
        ) : (
          <div className="relative h-full md:grid md:grid-cols-[1fr_430px]">
            <div className={`${mode === "list" ? "hidden md:block" : "block"} relative h-full pb-[34vh] md:pb-0`}>
              <MapViewDynamic places={visiblePlaces} profileById={profileById} selectedPlace={previewPlace ?? detailPlace} userLocation={userLocation} onSelect={setPreviewPlace} />
              <PlacePreviewCard
                place={previewPlace}
                canChangePriority={profile.role === "admin"}
                onChangePriority={changePlacePriority}
                onClose={() => setPreviewPlace(null)}
                onDetails={(place) => { setDetailPlace(place); setPreviewPlace(null); }}
              />
              <MapLegend profiles={profiles} />
              <button onClick={requestLocation} className="absolute bottom-[calc(34vh+1rem)] right-4 z-[800] rounded-full bg-river p-4 text-white shadow-panel md:bottom-4" aria-label="Usar mi ubicacion">
                <LocateFixed size={22} />
              </button>
            </div>
            <div
              className={`${mode === "map" ? "absolute inset-x-0 bottom-0 z-[760] h-[34vh] rounded-t-lg border-t border-black/10 shadow-panel md:static md:block md:h-full md:rounded-none md:border-l md:border-t-0 md:shadow-none" : "block h-full"} overflow-hidden bg-field`}
              onTouchStart={(event) => setSheetTouchStart(event.touches[0].clientY)}
              onTouchEnd={(event) => {
                if (sheetTouchStart !== null && sheetTouchStart - event.changedTouches[0].clientY > 45) setMode("list");
                setSheetTouchStart(null);
              }}
            >
              {mode === "map" && (
                <button onClick={() => setMode("list")} className="flex w-full items-center justify-center bg-white py-2 md:hidden" aria-label="Abrir lista">
                  <span className="h-1.5 w-12 rounded-full bg-black/20" />
                </button>
              )}
              <NearbySuggestions className="m-3" places={places} userLocation={userLocation} onSelect={mode === "map" ? setPreviewPlace : setDetailPlace} />
              <PlaceList
                places={visiblePlaces}
                profileById={profileById}
                currentProfile={profile}
                userLocation={userLocation}
                selectedId={(previewPlace ?? detailPlace)?.id}
                onSelect={mode === "map" ? setPreviewPlace : setDetailPlace}
                onChangePriority={changePlacePriority}
              />
            </div>
          </div>
        )}
        {mode !== "admin" && (
          <PlaceDrawer
            place={detailPlace}
            currentProfile={profile}
            profiles={profiles}
            profileById={profileById}
            activity={activity}
            userLocation={userLocation}
            onChangePriority={changePlacePriority}
            refresh={refresh}
            onClose={() => setDetailPlace(null)}
          />
        )}
      </section>
    </main>
  );
}
