"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useIntroReady } from "./intro-provider";
import type { createFilamentBackground } from "@/lib/filament-background";

export function FilamentBackground({ className = "", paused = false }: { className?: string; paused?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createFilamentBackground> | null>(null);
  const pausedRef = useRef(paused);
  const ready = useIntroReady();
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    if (!ready || !element) return;
    let cancelled = false;
    let background: ReturnType<typeof createFilamentBackground> | null = null;
    import("@/lib/filament-background").then((module) => {
      if (cancelled) return;
      try {
        background = module.createFilamentBackground(element, !reduced && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        background.setPaused(pausedRef.current);
        renderer.current = background;
      } catch { element.dataset.renderer = "fallback"; }
    }).catch(() => { if (!cancelled) element.dataset.renderer = "fallback"; });
    return () => { cancelled = true; background?.dispose(); renderer.current = null; };
  }, [ready, reduced]);

  useEffect(() => { pausedRef.current = paused; renderer.current?.setPaused(paused); }, [paused]);

  return <canvas ref={canvas} className={`filament-background ${className}`} aria-hidden="true" data-renderer="loading" data-animating="false" />;
}
