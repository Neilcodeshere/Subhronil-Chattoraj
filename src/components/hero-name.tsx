"use client";

import { useEffect, useRef } from "react";
import { useIntroReady } from "./intro-provider";

// Left-to-right symbol reveal with stable letter sizing and hover replay.
const SYMBOLS = "!@#$%^&*()_+~|}{[]:;?><,./-=";
const FRAME_INTERVAL = 35;
const LETTER_STEP = 0.3;
const NAME_LINES = ["SUBHRONIL", "CHATTORAJ"];

export function HeroName() {
  const heading = useRef<HTMLHeadingElement>(null);
  const ready = useIntroReady();

  useEffect(() => {
    const element = heading.current;
    if (!element || !ready) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const characters = Array.from(element.querySelectorAll<HTMLElement>(".scramble-glyph"));
    let timer = 0;
    let entered = false;

    const settle = () => {
      window.clearTimeout(timer);
      characters.forEach((character) => {
        character.textContent = character.dataset.letter!;
        character.removeAttribute("data-scrambling");
      });
      element.dataset.scramble = "settled";
    };

    const scramble = () => {
      if (preference.matches || document.hidden) { settle(); return; }
      window.clearTimeout(timer);
      let iteration = 0;
      element.dataset.scramble = "running";

      const tick = () => {
        if (iteration >= characters.length || preference.matches || document.hidden) { settle(); return; }
        characters.forEach((character, index) => {
          const resolved = index < Math.floor(iteration);
          character.textContent = resolved ? character.dataset.letter! : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          if (resolved) character.removeAttribute("data-scrambling");
          else character.dataset.scrambling = "true";
        });
        iteration += LETTER_STEP;
        timer = window.setTimeout(tick, FRAME_INTERVAL);
      };

      tick();
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entered) return;
      entered = true;
      scramble();
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(element);

    const onPointerEnter = (event: PointerEvent) => {
      if (entered && event.pointerType === "mouse" && element.dataset.scramble !== "running") scramble();
    };
    const onPreferenceChange = () => { if (preference.matches) settle(); };
    const onVisibilityChange = () => { if (document.hidden) settle(); };
    element.addEventListener("pointerenter", onPointerEnter);
    preference.addEventListener("change", onPreferenceChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      settle();
      observer.disconnect();
      element.removeEventListener("pointerenter", onPointerEnter);
      preference.removeEventListener("change", onPreferenceChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready]);

  return <h1 ref={heading} id="hero-heading" className="hero-name" aria-label="Subhronil Chattoraj" data-intro-ready={ready} data-scramble="idle">
    {NAME_LINES.map((line, lineIndex) => <span className="hero-name-line" aria-hidden="true" key={line}>{Array.from(line).map((letter, index) => <span className="scramble-cell" data-character={letter} key={index}><span className="scramble-glyph" data-letter={letter}>{letter}</span></span>)}{lineIndex === NAME_LINES.length - 1 && <span className="title-period">.</span>}</span>)}
  </h1>;
}
