import { ArrowDown, ArrowUpRight } from "lucide-react";
import { HeroName } from "./hero-name";
import { FilamentBackground } from "./filament-background";

export function Hero() {
  return (
    <section id="home" className="hero" aria-labelledby="hero-heading" tabIndex={-1}>
      <FilamentBackground className="hero-background" />
      <div className="hero-content section-shell">
        <div className="hero-title-wrap"><HeroName /></div>
        <div className="hero-summary">
          <p>Third-year engineering student interested in generative AI and web development.</p>
          <div className="hero-links"><a href="#work" className="text-link">Explore my work <ArrowDown size={17} /></a><a className="text-link" href="#about">About me <ArrowUpRight size={17} /></a></div>
        </div>
      </div>
    </section>
  );
}
