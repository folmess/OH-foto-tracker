"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityLog, BottomSheetState, FilterKey, LocationPoint, MobileTab, Place, Profile, SortKey } from "@/types";
import { supabase } from "@/lib/supabase";
import { BottomNavigationBar } from "./bottom-navigation-bar";
import { BottomSheetScaffold } from "./bottom-sheet-scaffold";
import { FiltersBar } from "./filters-bar";
import { FloatingMapActions } from "./floating-map-actions";
import { FloatingSearchBar } from "./floating-search-bar";
import { MapViewport } from "./map-viewport";
import { MyRouteView } from "./my-route-view";
import { NearbySuggestions } from "./nearby-suggestions";
import { PlaceDetailSheetContent } from "./place-drawer";
import { PlaceList } from "./place-list";
import { PlacesPreview } from "./places-preview";
import { QuickFilterChips } from "./quick-filter-chips";
import { StatsPanel } from "./stats-panel";
import { AdminPage } from "./admin-page";

type SheetMode = "list" | "detail" | "filters" | "route" | "stats" | "admin";

const sortChips: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recomendado" },
  { key: "place_number", label: "Numero" },
  { key: "priority", label: "Prioridad" },
  { key: "distance", label: "Cercania" }
];

const NAV_HEIGHT = 78;
const PEEK_HEIGHT = 258;
const TOP_MARGIN = 92;

function ListSortChips({
  active,
  userLocation,
  onChange
}: {
  active: SortKey;
  userLocation?: LocationPoint | null;
  onChange: (sort: SortKey) => void;
}) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {sortChips.map((chip) => {
        const selected = active === chip.key;
        const disabled = chip.key === "distance" && !userLocation;
        return (
          <button
            key={chip.key}
            onClick={() => onChange(chip.key)}
            disabled={disabled}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-extrabold transition active:scale-[0.98] disabled:opacity-45 ${
              selected ? "border-ink bg-ink text-white" : "border-black/10 bg-field text-ink"
            }`}
            aria-pressed={selected}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

export function MobileMapScreen({
  places,
  visiblePlaces,
  profiles,
  profile,
  profileById,
  activity,
  filters,
  sort,
  searchQuery,
  selectedPlace,
  userLocation,
  locationError,
  notice,
  onFiltersChange,
  onSortChange,
  onSearchChange,
  onSelectPlace,
  onClearSelectedPlace,
  onUseLocation,
  onClearNotice,
  refresh
}: {
  places: Place[];
  visiblePlaces: Place[];
  profiles: Profile[];
  profile: Profile;
  profileById: Map<string, Profile>;
  activity: ActivityLog[];
  filters: Set<FilterKey>;
  sort: SortKey;
  searchQuery: string;
  selectedPlace: Place | null;
  userLocation?: LocationPoint | null;
  locationError?: string | null;
  notice?: string | null;
  onFiltersChange: (next: Set<FilterKey>) => void;
  onSortChange: (sort: SortKey) => void;
  onSearchChange: (value: string) => void;
  onSelectPlace: (place: Place) => void;
  onClearSelectedPlace: () => void;
  onUseLocation: () => void;
  onClearNotice: () => void;
  refresh: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<MobileTab>("map");
  const [bottomSheetState, setBottomSheetState] = useState<BottomSheetState>("collapsed");
  const [sheetMode, setSheetMode] = useState<SheetMode>("list");
  const [fitBoundsKey, setFitBoundsKey] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);
  const pendingPlacesCount = visiblePlaces.filter((place) => place.status !== "completed" && place.status !== "skipped").length;
  const isListSheet = sheetMode === "list";

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sheetVisibleHeight = useMemo(() => {
    const expanded = Math.max(PEEK_HEIGHT, viewportHeight - NAV_HEIGHT - TOP_MARGIN);
    if (bottomSheetState === "expanded") return expanded;
    if (bottomSheetState === "partial") return Math.min(Math.round(viewportHeight * 0.54), expanded);
    return Math.min(PEEK_HEIGHT, expanded);
  }, [bottomSheetState, viewportHeight]);

  const mapFocusBottomInset = sheetVisibleHeight + NAV_HEIGHT;

  const sheetTitle = useMemo(() => {
    if (sheetMode === "detail" && selectedPlace) return selectedPlace.name;
    if (sheetMode === "filters") return "Filtros y busqueda";
    if (sheetMode === "route") return "Mi recorrido";
    if (sheetMode === "stats") return "Estadisticas";
    if (sheetMode === "admin") return "Admin";
    return "Lista de lugares";
  }, [selectedPlace, sheetMode]);

  const sheetSummary = useMemo(() => {
    if (sheetMode === "detail") return "Detalle del lugar seleccionado";
    if (sheetMode === "filters") return "Filter chips, orden y resultados";
    if (sheetMode === "route") return userLocation ? "Recomendaciones segun tu ubicacion" : "Activa tu ubicacion para sugerencias";
    if (sheetMode === "stats") return "Resumen del operativo";
    if (sheetMode === "admin") return "Gestion administrativa";
    return searchQuery ? `${visiblePlaces.length} resultados para "${searchQuery}"` : `${visiblePlaces.length} lugares`;
  }, [searchQuery, sheetMode, userLocation, visiblePlaces.length]);

  function openList(state: BottomSheetState = "partial") {
    setSheetMode("list");
    setBottomSheetState(state);
  }

  function selectPlace(place: Place) {
    onSelectPlace(place);
    setSheetMode("detail");
    setBottomSheetState("partial");
    setActiveTab("map");
  }

  function changeTab(tab: MobileTab) {
    setActiveTab(tab);
    if (tab === "map") {
      setSheetMode("list");
      setBottomSheetState("collapsed");
    } else if (tab === "list") {
      openList("expanded");
    } else {
      setSheetMode(tab);
      setBottomSheetState("expanded");
    }
  }

  function openFilters() {
    setSheetMode("filters");
    setBottomSheetState("expanded");
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-field md:hidden">
      <MapViewport
        places={visiblePlaces}
        profileById={profileById}
        selectedPlace={selectedPlace}
        userLocation={userLocation}
        fitBoundsKey={fitBoundsKey}
        focusBottomInset={mapFocusBottomInset}
        onSelect={selectPlace}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[820] space-y-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <FloatingSearchBar value={searchQuery} onChange={onSearchChange} onOpenFilters={openFilters} onProfilePress={() => supabase.auth.signOut()} profileName={profile.full_name} />
        <QuickFilterChips active={filters} onChange={onFiltersChange} />
      </div>

      {(locationError || notice) && (
        <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+7.4rem)] z-[870] rounded-2xl bg-ink p-3 text-sm font-bold text-white shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <span>{locationError || notice}</span>
            {notice && <button onClick={onClearNotice} className="rounded-full bg-white/15 px-3 py-1">Cerrar</button>}
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed right-3 z-[810]" style={{ bottom: bottomSheetState === "collapsed" ? "calc(350px + env(safe-area-inset-bottom))" : "calc(50vh + env(safe-area-inset-bottom))" }}>
        <FloatingMapActions onUseLocation={onUseLocation} onFitPlaces={() => setFitBoundsKey((key) => key + 1)} onOpenFilters={openFilters} />
      </div>

      <BottomSheetScaffold
        state={bottomSheetState}
        onStateChange={setBottomSheetState}
        title={sheetTitle}
        summary={sheetSummary}
        badge={isListSheet ? `${pendingPlacesCount} pendientes` : undefined}
        headerActions={isListSheet ? <ListSortChips active={sort} userLocation={userLocation} onChange={onSortChange} /> : undefined}
      >
        {sheetMode === "detail" && selectedPlace ? (
          <PlaceDetailSheetContent
            place={selectedPlace}
            currentProfile={profile}
            profileById={profileById}
            activity={activity}
            userLocation={userLocation}
            onBack={() => openList("partial")}
            onClose={() => {
              onClearSelectedPlace();
              openList("collapsed");
            }}
          />
        ) : sheetMode === "filters" ? (
          <div className="space-y-3">
            <FiltersBar active={filters} onChange={onFiltersChange} sort={sort} onSortChange={onSortChange} showSort />
            <PlacesPreview places={visiblePlaces} profileById={profileById} userLocation={userLocation} selectedId={selectedPlace?.id} onSelect={selectPlace} />
          </div>
        ) : sheetMode === "route" ? (
          <MyRouteView places={places} profile={profile} userLocation={userLocation} onSelect={selectPlace} onUseLocation={onUseLocation} />
        ) : sheetMode === "stats" ? (
          <div className="p-3">
            <StatsPanel places={places} profiles={profiles} />
          </div>
        ) : sheetMode === "admin" ? (
          <AdminPage places={places} profiles={profiles} refresh={refresh} />
        ) : bottomSheetState === "collapsed" ? (
          <div className="space-y-3">
            <NearbySuggestions className="mx-4" places={places} userLocation={userLocation} onSelect={selectPlace} />
            <PlacesPreview places={visiblePlaces} profileById={profileById} userLocation={userLocation} selectedId={selectedPlace?.id} onSelect={selectPlace} />
          </div>
        ) : (
          <div className="space-y-3">
            <NearbySuggestions className="mx-4" places={places} userLocation={userLocation} onSelect={selectPlace} />
            <PlaceList places={visiblePlaces} profileById={profileById} userLocation={userLocation} selectedId={selectedPlace?.id} onSelect={selectPlace} />
          </div>
        )}
      </BottomSheetScaffold>

      <BottomNavigationBar active={activeTab} isAdmin={profile.role === "admin"} onChange={changeTab} />
    </main>
  );
}
