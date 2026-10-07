"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowUpRight, Award, GraduationCap, Medal, Trophy } from "lucide-react";
import { achievements, certifications, type Achievement } from "@/content/achievements";

const EASE = [0.16, 1, 0.3, 1] as const;
const icons = [Trophy, Award, Medal, Award, GraduationCap, Trophy];

function AwardTile({ award, index }: { award: Achievement; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 150, damping: 18 });
  const Icon = icons[index % icons.length];

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse" || !ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    mx.set((event.clientX - bounds.left) / bounds.width - 0.5);
    my.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  return <motion.div className="award-tile-wrap" initial={false} whileInView={reduced ? undefined : { opacity: [0.4, 1], y: [60, 0] }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, ease: EASE, delay: Math.min(index * 0.08, 0.3) }}>
    <motion.div ref={ref} className={`award-tile award-tile-${index % 3}`} onPointerMove={move} onPointerLeave={() => { mx.set(0); my.set(0); }} style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY }}>
      {award.image ? <Image src={award.image} alt={award.imageAlt || award.title} fill sizes="(max-width: 767px) calc(100vw - 40px), 45vw" className="award-image" /> : <div className="award-cover" aria-hidden="true"><Icon strokeWidth={0.65} /></div>}
      <div className="award-scrim" aria-hidden="true" />
      <div className="award-sheen" aria-hidden="true" />
      <details className="award-details">
        <summary className="award-summary">
          <div className="award-meta"><span className="mono">/{String(index + 1).padStart(2, "0")}</span><span className="award-date"><Icon size={14} aria-hidden="true" />{award.date}</span></div>
          <div className="award-title-block"><div><h3>{award.title}</h3><p className="award-issuer">{award.issuer}</p></div><span className="award-toggle" aria-hidden="true"><ArrowUpRight size={20} /></span></div>
        </summary>
        <div className="award-description"><p>{award.description}</p></div>
      </details>
    </motion.div>
  </motion.div>;
}

export function Achievements() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const titleScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const x = useSpring(cursorX, { stiffness: 500, damping: 40, mass: 0.4 });
  const y = useSpring(cursorY, { stiffness: 500, damping: 40, mass: 0.4 });
  const [cursorActive, setCursorActive] = useState(false);

  function move(event: PointerEvent<HTMLElement>) {
    if (reduced || event.pointerType !== "mouse" || !window.matchMedia("(pointer: fine)").matches) return;
    cursorX.set(event.clientX);
    cursorY.set(event.clientY);
    setCursorActive(true);
  }

  return <section ref={ref} id="recognition" className={`recognition-section${reduced ? " recognition-reduced" : ""}`} aria-labelledby="recognition-heading" tabIndex={-1} data-cursor-active={cursorActive && !reduced} onPointerMove={move} onPointerLeave={() => setCursorActive(false)}>
    <motion.div className="awards-cursor" aria-hidden="true" style={{ left: x, top: y }} animate={{ opacity: cursorActive && !reduced ? 1 : 0, scale: cursorActive ? 1 : 0.6 }} transition={{ duration: 0.18, ease: "easeOut" }}>sc<span>.</span></motion.div>
    <div className="recognition-hero">
      <div className="recognition-background" aria-hidden="true" />
      <motion.div className="recognition-title" style={{ scale: reduced ? 1 : titleScale, opacity: reduced ? 1 : titleOpacity }}>
        <span className="recognition-count">({achievements.length})</span>
        <h2 id="recognition-heading" aria-label="Awards & recognition"><span>AWARDS &</span><span>RECOGNITION</span></h2>
      </motion.div>
    </div>
    <div className="recognition-tiles"><div className="award-grid">{achievements.map((award, index) => <AwardTile key={award.title} award={award} index={index} />)}</div>
      {certifications.length > 0 && <div className="certifications"><h3>Certifications.</h3>{certifications.map((item) => <article key={item.title}><h4>{item.title}</h4><p>{item.issuer} · {item.year}</p>{item.href && <a className="text-link" href={item.href} target="_blank" rel="noopener noreferrer">View credential <ArrowUpRight size={15} /></a>}</article>)}</div>}
    </div>
  </section>;
}
