"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { ArrowDown, ArrowUpRight, List, X } from "lucide-react";
import { experience } from "@/content/experience";
import type { createExperienceCoil } from "@/lib/experience-coil";
import { FilamentBackground } from "./filament-background";

function ExperienceCard({ index }: { index: number }) {
  const item = experience[index];
  return <article className={`experience-card experience-card-${index % 3}`}>
    <div className="experience-card-top"><span className="eyebrow">{item.category}</span><span className="mono">{String(index + 1).padStart(2, "0")}</span></div>
    <div className="experience-card-body"><p className="experience-organization">{item.organization}</p><h3>{item.role}</h3><p className="experience-description">{item.description}</p></div>
    <div className="experience-card-bottom"><p className="experience-date mono">{item.dates}</p>{item.href && <a className="icon-button" href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${item.organization}`}><ArrowUpRight size={20} /></a>}</div>
    <ul className="tags">{item.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
  </article>;
}

export function Experience() {
  const ref = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createExperienceCoil> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [finished, setFinished] = useState(false);
  const [dialogView, setDialogView] = useState<number | "all" | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const enhanced = status === "ready" && !reduced;
  useMotionValueEvent(scrollYProgress, "change", (value) => setFinished(value > 0.8421428571428571));

  const open = useCallback((view: number | "all") => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialogView(view);
  }, []);
  const unavailable = useCallback(() => setStatus("fallback"), []);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let renderer: ReturnType<typeof createExperienceCoil> | null = null;
    Promise.all([import("@/lib/experience-coil"), document.fonts.ready]).then(([module]) => {
      if (cancelled || !canvasRef.current) return;
      try {
        renderer = module.createExperienceCoil(canvasRef.current, { items: experience, getProgress: () => scrollYProgress.get(), onOpen: open, onUnavailable: unavailable });
        rendererRef.current = renderer;
        setStatus("ready");
      } catch { unavailable(); }
    }).catch(() => { if (!cancelled) unavailable(); });
    return () => { cancelled = true; renderer?.dispose(); rendererRef.current = null; };
  }, [reduced, scrollYProgress, open, unavailable]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialogView === null) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    rendererRef.current?.setPaused(true);
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      rendererRef.current?.setPaused(false);
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [dialogView]);

  function navigate(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(rendererRef.current?.getActiveIndex() ?? 0); return; }
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key) || !ref.current) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const progress = event.key === "Home" ? 0 : event.key === "End" ? 1 : Math.max(0, Math.min(1, scrollYProgress.get() + direction / 14));
    const section = ref.current;
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + (section.offsetHeight - window.innerHeight) * progress, behavior: "instant" });
  }

  return <section id="experience" ref={ref} className={`experience-section${enhanced ? " experience-enhanced" : ""}`} aria-labelledby="experience-heading" tabIndex={-1} data-renderer={status} data-finished={enhanced && finished}>
    <div className="experience-stage">
      <FilamentBackground className="experience-backdrop" paused={dialogView !== null} />
      <div className="experience-title"><h2 id="experience-heading"><em>Experience</em></h2></div>
      <canvas ref={canvasRef} className="experience-coil" role="group" aria-label="Scroll-driven experience coil" aria-describedby="experience-keyboard-help" tabIndex={enhanced && !finished ? 0 : -1} aria-hidden={!enhanced || finished} onKeyDown={navigate} />
      <p id="experience-keyboard-help" className="sr-only">Scroll or use the arrow keys to explore experience. Press Enter to read the current role. Home returns to the start; End shows all experience.</p>
      <div className="experience-end-scrim" aria-hidden="true" />
      <div className="experience-end"><button className="experience-view-all" onClick={() => open("all")} tabIndex={enhanced && finished ? 0 : -1} aria-hidden={!enhanced || !finished}>View all</button></div>
      <div className="experience-controls"><button className="experience-list-button" onClick={() => open("all")}><List size={15} aria-hidden="true" />All experience</button><a className="experience-skip" href="#recognition" aria-label="Skip to awards and recognition"><ArrowDown size={19} aria-hidden="true" /></a></div>
    </div>
    <div className="experience-scroll-room" aria-hidden="true" style={{ height: `${120 + 30 * experience.length}svh` }} />
    <div className="experience-static section-shell">{experience.map((item, index) => <ExperienceCard key={`${item.role}-${item.organization}`} index={index} />)}</div>
    <dialog ref={dialogRef} className="experience-dialog" aria-labelledby="experience-dialog-title" onCancel={(event) => { event.preventDefault(); setDialogView(null); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setDialogView(null); } }}>
      <div className="experience-dialog-heading"><h2 id="experience-dialog-title">{typeof dialogView === "number" ? experience[dialogView].organization : "All experience"}</h2><button className="icon-button" onClick={() => setDialogView(null)} aria-label="Close experience details" autoFocus><X size={20} /></button></div>
      <div className={`experience-dialog-content${dialogView === "all" ? " experience-dialog-grid" : ""}`}>{dialogView === "all" ? experience.map((item, index) => <ExperienceCard key={`${item.role}-${item.organization}`} index={index} />) : typeof dialogView === "number" ? <ExperienceCard index={dialogView} /> : null}</div>
    </dialog>
  </section>;
}
