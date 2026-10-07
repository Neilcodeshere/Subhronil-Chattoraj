import { ArrowUp, ArrowUpRight } from "lucide-react";
import { site } from "@/content/site";
import Link from "next/link";
import { FooterArtwork } from "./footer-artwork";
import { FooterSurface } from "./footer-surface";

export function Footer({ homeHref = "" }: { homeHref?: string }) {
  return (
    <FooterSurface>
      <FooterArtwork />
      <div className="footer-shell section-shell">
        <div className="footer-top">
          <div className="footer-invitation">
            <p className="eyebrow">One more thing /</p>
            <h2>Let’s keep<br />in <em>touch.</em></h2>
            <p>A project, a collaboration, or a good idea.<br />I’d love to hear what you have in mind.</p>
            <Link className="footer-cta" href={`${homeHref}#contact`}>Start a conversation <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className="footer-contact">
            <Link className="footer-wordmark" href={`${homeHref}#home`} aria-label="Subhronil Chattoraj — home">sc<span>.</span></Link>
            <p className="footer-name eyebrow">{site.name}</p>
            <p className="footer-discipline mono">Generative AI / Web development</p>
            <a className="footer-email" href={`mailto:${site.email}`}>{site.email}<ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="footer-utility">
          <p className="footer-hint mono" aria-hidden="true"><span className="footer-pointer-hint">Move your cursor through the code</span><span className="footer-touch-hint">Touch the code to light it up</span></p>
          <a className="back-to-top" href="#home">Back to top <span className="round-icon"><ArrowUp size={17} aria-hidden="true" /></span></a>
        </div>
        <div className="footer-bottom">
          <nav className="footer-nav" aria-label="Footer navigation">
            <Link href={`${homeHref}#work`}>Work</Link>
            <Link href={`${homeHref}#about`}>About</Link>
            <Link href={`${homeHref}#contact`}>Contact</Link>
          </nav>
          <span className="footer-copyright">© {new Date().getFullYear()} {site.name}</span>
          <nav className="footer-socials" aria-label="Footer social links">{site.socials.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer">{social.name}<ArrowUpRight size={12} aria-hidden="true" /></a>)}</nav>
        </div>
      </div>
    </FooterSurface>
  );
}
