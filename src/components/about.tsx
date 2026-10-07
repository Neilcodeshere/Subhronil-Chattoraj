import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./reveal";

export function About() {
  return (
    <section id="about" className="about-section section-shell section-spacing" aria-labelledby="about-heading" tabIndex={-1}>
      <div className="about-intro">
        <Reveal><h2 id="about-heading">About me.</h2></Reveal>
        <Reveal className="about-copy" delay={0.12}><p className="large-copy">I’m Subhronil, a third-year engineering student interested in generative AI.</p><p>I co-founded Srishti Green Decor, a handcrafted, eco-friendly décor business, and built its website.</p><p>I’m also part of the Technical Team at SIES GST. My experience includes team operations, event coordination, and design work for TEDxSIESGST.</p><a className="text-link" href="#contact">Contact me <ArrowUpRight size={17} /></a></Reveal>
      </div>
    </section>
  );
}
