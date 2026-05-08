"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActivityLog, Place, Profile } from "@/types";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAppData() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    setError(null);
    if (showLoading) setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setPlaces([]);
        setProfiles([]);
        setActivity([]);
        return;
      }

      const [profileResult, profilesResult, placesResult, legacyPlacesResult, activityResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
        supabase.from("profiles").select("*").order("full_name"),
        supabase
          .from("places")
          .select("*, opening_slots:place_opening_slots(*), assignments:place_assignments(*), photo_sessions:place_photo_sessions(*)")
          .order("priority", { ascending: false })
          .order("name"),
        supabase
          .from("places")
          .select("*, opening_slots:place_opening_slots(*)")
          .order("priority", { ascending: false })
          .order("name"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(250)
      ]);

      if (profileResult.error) setError(profileResult.error.message);
      if (!profileResult.error && !profileResult.data) setError("No se encontro un perfil activo para este usuario.");
      setUser(currentUser);
      setProfile((profileResult.data as Profile | null) ?? null);
      setProfiles((profilesResult.data as Profile[]) ?? []);
      if (placesResult.error && !legacyPlacesResult.error) {
        setPlaces(((legacyPlacesResult.data as Place[]) ?? []).map((place) => ({ ...place, assignments: [], photo_sessions: [] })));
      } else {
        if (placesResult.error) setError(placesResult.error.message);
        setPlaces((placesResult.data as Place[]) ?? []);
      }
      setActivity((activityResult.data as ActivityLog[]) ?? []);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No se pudo cargar la app.");
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void refresh(true);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tracker-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "places" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setPlaces((current) => current.filter((place) => place.id !== (payload.old as Place).id));
          return;
        }
        void refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        setActivity((current) => [payload.new as ActivityLog, ...current].slice(0, 250));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "place_opening_slots" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "place_assignments" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "place_photo_sessions" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  const profileById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);

  return {
    user,
    profile,
    profiles,
    profileById,
    places,
    setPlaces,
    activity,
    loading,
    initialized,
    error,
    refresh
  };
}
