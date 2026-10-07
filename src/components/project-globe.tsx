"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/content/projects";
import { InfiniteGridMenu } from "@/lib/infinite-grid-menu";

const items = projects.map((project) => ({ image: project.globeImage ?? project.image, link: `/projects/${project.id}`, title: project.title, description: project.description }));
type Props = { selected: number; onSelect: (index: number) => void; onUnavailable: () => void };

export function ProjectGlobe({ selected, onSelect, onUnavailable }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [moving, setMoving] = useState(false);
  const [ready, setReady] = useState(false);
  const item = items[selected];

  useEffect(() => {
    const element = canvas.current;
    const container = panel.current;
    if (!element || !container) return;
    let sketch: InfiniteGridMenu;
    let inView = false;
    let disposed = false;
    try {
      sketch = new InfiniteGridMenu(element, items, onSelect, setMoving, () => {
        if (!disposed) { setReady(true); element.dataset.renderer = "ready"; }
      });
    } catch {
      onUnavailable();
      return;
    }

    const visibility = () => { if (inView && !document.hidden) sketch.start(); else sketch.stop(); };
    const resize = new ResizeObserver(() => sketch.resize());
    resize.observe(container);
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      visibility();
    });
    intersection.observe(container);
    const chrome = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("is-project-orbit", entry.intersectionRatio > 0.6 && window.innerWidth >= 768);
    }, { threshold: [0, 0.3, 0.6, 0.9, 1] });
    chrome.observe(container);

    const onKey = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) {
        event.preventDefault();
        sketch.command(event.key === "Home" ? "reset" : event.key === "ArrowRight" ? "next" : "prev");
      }
    };
    const onLost = (event: Event) => { event.preventDefault(); onUnavailable(); };
    element.addEventListener("keydown", onKey);
    element.addEventListener("webglcontextlost", onLost);
    document.addEventListener("visibilitychange", visibility);
    element.dataset.renderer = "loading";

    return () => {
      disposed = true;
      resize.disconnect();
      intersection.disconnect();
      chrome.disconnect();
      element.removeEventListener("keydown", onKey);
      element.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", visibility);
      document.body.classList.remove("is-project-orbit");
      sketch.dispose();
    };
  }, [onSelect, onUnavailable]);

  return <div className="project-orbit"><div ref={panel} className="project-orbit-panel">
    <div className="infinite-menu-wrap" data-moving={moving}>
      <canvas ref={canvas} id="infinite-grid-menu-canvas" tabIndex={0} role="group" aria-label="Interactive project globe" aria-describedby="globe-instructions" />
      <div className="im-edge-scrim" aria-hidden="true" />
      <p id="globe-instructions" className="orbit-hint mono">( Drag to explore )<span>Keyboard: ← → · Home to reset</span></p>
      {!ready && <p className="orbit-loading eyebrow" role="status">Preparing the project orbit…</p>}
      <div className={`face-caption ${moving ? "inactive" : "active"}`}><span className="face-index">Project / {String(selected + 1).padStart(2, "0")}</span><h3 className="face-title">{item.title}</h3></div>
      <p className={`face-description ${moving ? "inactive" : "active"}`}>{item.description}</p>
      <p className="sr-only" role="status">Selected project: {item.title}. {item.description}</p>
      <Link href={item.link} className={`action-button ${moving ? "inactive" : "active"}`} aria-label="Explore project" title={`Explore ${item.title}`} tabIndex={moving ? -1 : 0}><ArrowUpRight className="action-button-icon" size={26} aria-hidden="true" /></Link>
    </div>
  </div></div>;
}
