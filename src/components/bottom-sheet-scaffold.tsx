"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BottomSheetState } from "@/types";

const NAV_HEIGHT = 78;
const PEEK_HEIGHT = 258;
const TOP_MARGIN = 92;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function BottomSheetHandle() {
  return <span className="h-1.5 w-14 rounded-full bg-ink/20 transition-colors hover:bg-ink/30" aria-hidden="true" />;
}

export function BottomSheetScaffold({
  state,
  onStateChange,
  title,
  summary,
  badge,
  headerActions,
  children
}: {
  state: BottomSheetState;
  onStateChange: (state: BottomSheetState) => void;
  title: string | null;
  summary?: string;
  badge?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const [viewportHeight, setViewportHeight] = useState(720);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; visibleHeight: number } | null>(null);

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const snapHeights = useMemo(() => {
    const expanded = Math.max(PEEK_HEIGHT, viewportHeight - NAV_HEIGHT - TOP_MARGIN);
    return {
      collapsed: Math.min(PEEK_HEIGHT, expanded),
      partial: Math.min(Math.round(viewportHeight * 0.54), expanded),
      expanded
    };
  }, [viewportHeight]);

  const visibleHeight = dragOffset ?? snapHeights[state];
  const sheetHeight = snapHeights.expanded;
  const translateY = sheetHeight - visibleHeight;

  function finishDrag() {
    if (dragOffset === null) return;
    const distances = (Object.keys(snapHeights) as BottomSheetState[]).map((snap) => ({
      snap,
      distance: Math.abs(snapHeights[snap] - dragOffset)
    }));
    const closest = distances.sort((a, b) => a.distance - b.distance)[0].snap;
    setDragOffset(null);
    dragStart.current = null;
    if (closest !== state) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(5);
    }
    onStateChange(closest);
  }

  const transitionDuration = state === "collapsed" || dragOffset !== null ? "200ms" : "300ms";

  return (
    <section
      className="fixed inset-x-0 z-[830] flex flex-col rounded-t-[28px] bg-white shadow-[0_-18px_44px_rgba(23,32,31,0.2)] ring-1 ring-black/10"
      style={{
        bottom: "calc(78px + env(safe-area-inset-bottom))",
        height: sheetHeight,
        transform: `translate3d(0, ${translateY}px, 0)`,
        transition: dragOffset === null ? `transform ${transitionDuration} cubic-bezier(.2,.8,.2,1)` : "none",
        touchAction: "none"
      }}
      aria-label={title ?? undefined}
    >
      <div
        className="shrink-0 cursor-grab touch-none rounded-t-[28px] bg-white px-4 pb-2 pt-3 active:cursor-grabbing"
        onPointerDown={(event) => {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          dragStart.current = { y: event.clientY, visibleHeight: snapHeights[state] };
          setDragOffset(snapHeights[state]);
        }}
        onPointerMove={(event) => {
          if (!dragStart.current) return;
          const delta = dragStart.current.y - event.clientY;
          setDragOffset(clamp(dragStart.current.visibleHeight + delta, snapHeights.collapsed, snapHeights.expanded));
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="flex justify-center py-1">
          <BottomSheetHandle />
        </div>
        <div className="space-y-2">
          {(title || badge) && (
            <button
              onClick={() => onStateChange(state === "expanded" ? "partial" : "expanded")}
              className="flex min-h-14 w-full items-center justify-between gap-4 text-left"
              aria-label={state === "expanded" ? "Contraer panel" : "Expandir panel"}
            >
              {title && (
                <span>
                  <span className="block text-base font-extrabold text-ink">{title}</span>
                  {summary && <span className="mt-0.5 block text-xs font-semibold text-ink/55">{summary}</span>}
                </span>
              )}
              {badge && <span className="shrink-0 rounded-full bg-mist px-3 py-1 text-xs font-bold text-ink">{badge}</span>}
            </button>
          )}
          {headerActions && (
            <div className={`flex items-center justify-end ${!(title || badge) ? "mb-2" : ""}`}>
              {headerActions}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
    </section>
  );
}
