"use client";

import type { OpeningDay, OpeningPeriod, OpeningSlot } from "@/types";

const defaultTimes: Record<Exclude<OpeningPeriod, "custom">, { open: string; close: string }> = {
  morning: { open: "10:00", close: "13:00" },
  afternoon: { open: "15:00", close: "19:00" }
};

const presetLabels = [
  ["saturday_morning", "Solo sabado manana"],
  ["saturday_full", "Solo sabado manana y tarde"],
  ["sunday_morning", "Solo domingo manana"],
  ["sunday_full", "Solo domingo manana y tarde"],
  ["weekend_morning", "Sabado y domingo manana"],
  ["weekend_full", "Sabado y domingo manana y tarde"],
  ["custom", "Personalizado"]
] as const;

function slotKey(day: OpeningDay, period: OpeningPeriod) {
  return `${day}:${period}`;
}

function makeSlot(day: OpeningDay, period: OpeningPeriod): OpeningSlot {
  const times = period === "afternoon" ? defaultTimes.afternoon : defaultTimes.morning;
  return { day_of_week: day, period, open_time: times.open, close_time: times.close };
}

export function slotsFromPreset(preset: string): OpeningSlot[] {
  const slots: OpeningSlot[] = [];
  if (preset === "saturday_morning" || preset === "saturday_full" || preset === "weekend_morning" || preset === "weekend_full") {
    slots.push(makeSlot("saturday", "morning"));
  }
  if (preset === "saturday_full" || preset === "weekend_full") slots.push(makeSlot("saturday", "afternoon"));
  if (preset === "sunday_morning" || preset === "sunday_full" || preset === "weekend_morning" || preset === "weekend_full") {
    slots.push(makeSlot("sunday", "morning"));
  }
  if (preset === "sunday_full" || preset === "weekend_full") slots.push(makeSlot("sunday", "afternoon"));
  return slots;
}

export function OpeningHoursEditor({ value, onChange }: { value: OpeningSlot[]; onChange: (slots: OpeningSlot[]) => void }) {
  function setPreset(preset: string) {
    if (preset !== "custom") onChange(slotsFromPreset(preset));
  }

  function toggle(day: OpeningDay, period: OpeningPeriod, checked: boolean) {
    const key = slotKey(day, period);
    if (!checked) {
      onChange(value.filter((slot) => slotKey(slot.day_of_week, slot.period) !== key));
      return;
    }
    if (!value.some((slot) => slotKey(slot.day_of_week, slot.period) === key)) onChange([...value, makeSlot(day, period)]);
  }

  function update(slot: OpeningSlot, field: "open_time" | "close_time", nextValue: string) {
    onChange(value.map((item) => (item === slot ? { ...item, [field]: nextValue } : item)));
  }

  return (
    <div className="space-y-3 rounded-md border border-black/10 bg-field p-3">
      <div className="flex flex-wrap gap-2">
        {presetLabels.map(([preset, label]) => (
          <button key={preset} type="button" onClick={() => setPreset(preset)} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-ink ring-1 ring-black/10">
            {label}
          </button>
        ))}
      </div>
      {(["saturday", "sunday"] as OpeningDay[]).map((day) => (
        <div key={day} className="rounded-md bg-white p-3">
          <p className="font-bold">{day === "saturday" ? "Sabado" : "Domingo"}</p>
          {(["morning", "afternoon", "custom"] as OpeningPeriod[]).map((period) => {
            const slot = value.find((item) => item.day_of_week === day && item.period === period);
            const label = period === "morning" ? "Manana" : period === "afternoon" ? "Tarde" : "Horario personalizado";
            return (
              <div key={period} className="mt-2 grid items-center gap-2 md:grid-cols-[180px_1fr_1fr]">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={Boolean(slot)} onChange={(event) => toggle(day, period, event.target.checked)} />
                  {label}
                </label>
                <input disabled={!slot} type="time" className="rounded-md border p-2 disabled:opacity-40" value={slot?.open_time ?? ""} onChange={(event) => slot && update(slot, "open_time", event.target.value)} />
                <input disabled={!slot} type="time" className="rounded-md border p-2 disabled:opacity-40" value={slot?.close_time ?? ""} onChange={(event) => slot && update(slot, "close_time", event.target.value)} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
