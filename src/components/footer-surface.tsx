"use client";

import { useEffect, useRef, type FocusEvent, type PointerEvent, type ReactNode } from "react";

export function FooterSurface({ children }: { children: ReactNode }) {
  const footer = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const reducedMotion = useRef(false);

  function reset() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const element = footer.current;
    if (!element) return;
    delete element.dataset.pointerActive;
    element.style.removeProperty("--footer-x");
    element.style.removeProperty("--footer-y");
  }

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = preference.matches;
    const onPreferenceChange = () => {
      reducedMotion.current = preference.matches;
      reset();
    };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      cancelAnimationFrame(frame.current);
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  function illuminate(clientX: number, clientY: number) {
    if (reducedMotion.current) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const element = footer.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      element.style.setProperty("--footer-x", `${clientX - bounds.left}px`);
      element.style.setProperty("--footer-y", `${clientY - bounds.top}px`);
      element.dataset.pointerActive = "true";
    });
  }

  function move(event: PointerEvent<HTMLElement>) {
    illuminate(event.clientX, event.clientY);
  }

  function focus(event: FocusEvent<HTMLElement>) {
    const bounds = event.target.getBoundingClientRect();
    illuminate(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  }

  return (
    <footer
      ref={footer}
      className="site-footer"
      onPointerEnter={move}
      onPointerMove={move}
      onPointerDown={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
      onPointerUp={(event) => { if (event.pointerType !== "mouse") reset(); }}
      onFocusCapture={focus}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) reset(); }}
    >
      {children}
    </footer>
  );
}
