"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { navigation } from "@/content/site";

export function Navigation({ homeHref = "" }: { homeHref?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(homeHref ? "#work" : "");
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (homeHref) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(`#${entry.target.id}`);
      });
    }, { rootMargin: "-15% 0px -60% 0px", threshold: 0 });
    navigation.forEach(({ href }) => {
      const section = document.querySelector(href);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [homeHref]);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
      if (event.key === "Tab") {
        const links = panel.current?.querySelectorAll<HTMLAnchorElement>("a");
        if (!links?.length) return;
        if (event.shiftKey && document.activeElement === toggle.current) {
          event.preventDefault(); links[links.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === links[links.length - 1]) {
          event.preventDefault(); toggle.current?.focus();
        }
      }
    };
    const onResize = () => { if (window.innerWidth > 900) setOpen(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function closeToSection(href: string) {
    setOpen(false);
    if (!homeHref) requestAnimationFrame(() => document.querySelector<HTMLElement>(href)?.focus({ preventScroll: true }));
  }

  return (
    <header className="site-header">
      <Link className="wordmark" href={`${homeHref}#home`} aria-label="Subhronil Chattoraj — home">sc<span>.</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map((item) => <Link key={item.href} href={`${homeHref}${item.href}`} aria-current={active === item.href ? "location" : undefined}>{item.label}</Link>)}
      </nav>
      <Link href={`${homeHref}#contact`} className="header-cta">Let’s talk <ArrowUpRight size={15} /></Link>
      <button ref={toggle} className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
        {open ? <X /> : <Menu />}
      </button>
      <div ref={panel} id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav aria-label="Mobile navigation">
          {navigation.map((item, i) => <Link href={`${homeHref}${item.href}`} key={item.href} onClick={() => closeToSection(item.href)} aria-current={active === item.href ? "location" : undefined}><span className="mono">0{i + 1}</span>{item.label}<ArrowUpRight /></Link>)}
        </nav>
      </div>
    </header>
  );
}
