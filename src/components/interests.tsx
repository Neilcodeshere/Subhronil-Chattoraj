import { AudioLines, CircleDot, Compass, MessageCircle, Zap } from "lucide-react";
import { interests } from "@/content/interests";
import { Reveal } from "./reveal";

const icons = { football: CircleDot, music: AudioLines, superheroes: Zap, travel: Compass, connections: MessageCircle };

export function Interests() {
  return <section className="interests-section section-shell section-spacing" aria-labelledby="interests-heading">
    <Reveal className="section-heading"><h2 id="interests-heading">Interests.</h2></Reveal>
    <div className="interests-grid">{interests.map((interest, i) => { const Icon = icons[interest.icon]; return <Reveal className="interest" key={interest.title} delay={i * 0.04}><Icon size={25} strokeWidth={1.2} aria-hidden="true" /><h3>{interest.title}</h3></Reveal>; })}</div>
  </section>;
}
