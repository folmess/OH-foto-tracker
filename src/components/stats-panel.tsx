"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Crown, Flame, Footprints, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Place, Profile } from "@/types";
import { getActiveAssignments, getPhotoSessions, isPlaceFullyCompleted } from "@/lib/place-utils";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 28;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      frame = Math.min(totalFrames, Math.round(elapsed / 18));
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (frame < totalFrames) requestAnimationFrame(tick);
    }

    setDisplayValue(0);
    const animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  suffix = ""
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "hot" | "warn";
  suffix?: string;
}) {
  const toneClass = {
    neutral: "bg-mist text-ink",
    good: "bg-river/10 text-river",
    hot: "bg-coral/10 text-coral",
    warn: "bg-amber/15 text-ink"
  }[tone];

  return (
    <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-ink/55">{label}</p>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${toneClass}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-black leading-none text-ink">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
    </div>
  );
}

export function StatsPanel({ places, profiles }: { places: Place[]; profiles: Profile[] }) {
  const stats = useMemo(() => {
    const total = places.length;
    const completed = places.filter(isPlaceFullyCompleted).length;
    const sessions = places.flatMap(getPhotoSessions);
    const activeAssignments = places.reduce((sum, place) => sum + getActiveAssignments(place).length, 0);
    const assignedPlaces = places.filter((place) => getActiveAssignments(place).length > 0).length;
    const photographedStillOpen = places.filter((place) => getPhotoSessions(place).length > 0 && getActiveAssignments(place).length > 0).length;
    const count = (status: string) => places.filter((place) => place.status === status).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const pendingByPriority = {
      high: places.filter((place) => place.priority === "high" && place.status !== "completed" && place.status !== "skipped").length,
      medium: places.filter((place) => place.priority === "medium" && place.status !== "completed" && place.status !== "skipped").length,
      low: places.filter((place) => place.priority === "low" && place.status !== "completed" && place.status !== "skipped").length
    };
    const byPhotographer = profiles
      .map((profile) => ({
        profile,
        sessions: sessions.filter((session) => session.photographer_id === profile.id).length,
        assignments: places.filter((place) => getActiveAssignments(place).some((assignment) => assignment.photographer_id === profile.id)).length
      }))
      .sort((a, b) => b.sessions - a.sessions || b.assignments - a.assignments);
    const leader = byPhotographer.find((item) => item.sessions > 0) ?? null;
    const remaining = Math.max(total - completed, 0);

    return {
      total,
      completed,
      sessions,
      activeAssignments,
      assignedPlaces,
      photographedStillOpen,
      issues: count("issue"),
      skipped: count("skipped"),
      percent,
      pendingByPriority,
      byPhotographer,
      leader,
      remaining
    };
  }, [places, profiles]);

  const momentumText =
    stats.percent >= 80
      ? "Recta final: conviene barrer alta prioridad y casos con problema."
      : stats.percent >= 45
        ? "Buen avance: foco en asignaciones abiertas y lugares de alta prioridad."
        : "Arranque del operativo: prioriza alta prioridad y zonas cercanas.";

  return (
    <div className="space-y-3">
      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink/45">Avance general</p>
            <p className="mt-1 text-4xl font-black leading-none text-ink">
              <AnimatedNumber value={stats.percent} suffix="%" />
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-river/10 text-river">
            <Target size={22} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-mist">
          <div className="h-full rounded-full bg-river transition-[width] duration-700 ease-out" style={{ width: `${stats.percent}%` }} />
        </div>
        <p className="mt-3 text-sm font-semibold text-ink/60">{momentumText}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={Footprints} />
        <StatCard label="Completados" value={stats.completed} icon={CheckCircle2} tone="good" />
        <StatCard label="Sesiones" value={stats.sessions.length} icon={Camera} tone="good" />
        <StatCard label="Restantes" value={stats.remaining} icon={Target} tone={stats.remaining ? "warn" : "good"} />
        <StatCard label="Asignados" value={stats.assignedPlaces} icon={Users} />
        <StatCard label="Asignaciones" value={stats.activeAssignments} icon={Footprints} />
        <StatCard label="Alta pendiente" value={stats.pendingByPriority.high} icon={Crown} tone={stats.pendingByPriority.high ? "hot" : "good"} />
        <StatCard label="Problemas" value={stats.issues} icon={AlertTriangle} tone={stats.issues ? "hot" : "good"} />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-extrabold text-ink">Prioridad pendiente</p>
            <Flame size={18} className="text-coral" aria-hidden="true" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-coral px-3 py-2 text-sm font-extrabold text-white">Alta {stats.pendingByPriority.high}</span>
            <span className="rounded-full bg-amber px-3 py-2 text-sm font-extrabold text-white">Media {stats.pendingByPriority.medium}</span>
            <span className="rounded-full bg-mist px-3 py-2 text-sm font-extrabold text-ink">Baja {stats.pendingByPriority.low}</span>
          </div>
          {stats.photographedStillOpen > 0 && (
            <p className="mt-3 rounded-lg bg-river/10 p-3 text-sm font-bold text-river">
              {stats.photographedStillOpen} lugares ya tienen una sesion pero siguen con asignaciones abiertas.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-extrabold text-ink">Sesiones por fotografo</p>
            {stats.leader && <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-extrabold text-ink">Top {stats.leader.profile.full_name}</span>}
          </div>
          <div className="mt-3 space-y-2">
            {stats.byPhotographer.map(({ profile, sessions, assignments }) => {
              const maxSessions = Math.max(stats.byPhotographer[0]?.sessions ?? 0, 1);
              return (
                <div key={profile.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2 font-bold text-ink">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: profile.color }} aria-hidden="true" />
                      <span className="truncate">{profile.full_name}</span>
                    </span>
                    <span className="shrink-0 font-extrabold text-ink/65">{sessions} sesiones · {assignments} asign.</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-mist">
                    <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(sessions / maxSessions) * 100}%`, backgroundColor: profile.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
