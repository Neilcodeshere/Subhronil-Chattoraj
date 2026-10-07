"use client";

import { useState } from "react";
import { Pause, Play, Asterisk } from "lucide-react";

const words = ["GENERATIVE AI", "WEB DEVELOPMENT", "DESIGN", "FOOTBALL", "MUSIC"];

export function Marquee() {
  const [paused, setPaused] = useState(false);
  return <section className={`marquee-section ${paused ? "is-paused" : ""}`} aria-label="Interests: generative AI, web development, design, football, music">
    <div className="marquee-track" aria-hidden="true">{[0, 1].map((copy) => <div className="marquee-copy" key={copy}>{words.map((word) => <span key={word}>{word}<Asterisk strokeWidth={1.2} /></span>)}</div>)}</div>
    <button className="marquee-pause icon-button" aria-label={paused ? "Play interests ticker" : "Pause interests ticker"} onClick={() => setPaused(!paused)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
  </section>;
}
