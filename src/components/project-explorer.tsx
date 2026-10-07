"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Globe2, List } from "lucide-react";
import { projects } from "@/content/projects";
import { Reveal } from "./reveal";

const subscribeToHydration = () => () => {};

const ProjectGlobe = dynamic(() => import("./project-globe").then((module) => module.ProjectGlobe), {
  ssr: false,
  loading: () => <div className="globe-loading"><span className="eyebrow">Preparing the project orbit…</span></div>,
});

export function ProjectExplorer() {
  const reduced = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [view, setView] = useState<"globe" | "list" | null>(null);
  const [selected, setSelected] = useState(0);
  const [globeUnavailable, setGlobeUnavailable] = useState(false);
  const onUnavailable = useCallback(() => { setGlobeUnavailable(true); setView("list"); }, []);
  // Keep the first client render consistent with the server, then apply the
  // browser's motion preference before the introduction reveals the page.
  const actualView = view ?? (hydrated && reduced ? "list" : "globe");
  return (
    <section id="work" className="work-section section-spacing" aria-labelledby="work-heading" tabIndex={-1}>
      <Reveal className="section-heading section-shell">
        <h2 id="work-heading">Selected work.</h2>
        <div className="work-heading-right"><div className="view-switch" role="group" aria-label="Project display">
          <button aria-pressed={actualView === "globe"} onClick={() => { setGlobeUnavailable(false); setView("globe"); }}><Globe2 size={15} />Globe</button>
          <button aria-pressed={actualView === "list"} onClick={() => setView("list")}><List size={16} />List</button>
        </div></div>
      </Reveal>
      {globeUnavailable && <p className="globe-fallback-note section-shell" role="status">The interactive orbit is unavailable in this browser. Explore the same projects below.</p>}
      {actualView === "globe" ? <ProjectGlobe selected={selected} onSelect={setSelected} onUnavailable={onUnavailable} /> : <div className="project-list section-shell">{projects.map((item, index) => <article className="project-list-item" key={item.id}>
        <Link className="project-image-link" href={`/projects/${item.id}`} aria-label={`Explore ${item.title}`}><Image src={item.image} alt={item.imageAlt} width={640} height={640} sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 1100px) 45vw, 640px" className="project-list-image" /></Link>
        <div><p className="eyebrow">PROJECT {String(index + 1).padStart(2, "0")} / {item.category}</p><h3>{item.title}</h3><p>{item.description}</p><ul className="tags">{item.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul><div className="project-actions"><Link href={`/projects/${item.id}`} className="button button-light">Explore project <ArrowRight size={18} /></Link><a href={item.href} target="_blank" rel="noopener noreferrer" className="text-link">Visit live website <ArrowUpRight size={18} /></a></div></div>
      </article>)}</div>}
      <div className="section-footnote section-shell mono"><span>{projects.length} PROJECT{projects.length === 1 ? "" : "S"}</span></div>
    </section>
  );
}
