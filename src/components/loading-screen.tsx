"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowUpRight, Move } from "lucide-react";

const LOAD_DURATION = 2100;
const REDUCED_LOAD_DURATION = 300;
const EXIT_DURATION = 650;

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const screen = useRef<HTMLDialogElement>(null);
  const dismiss = useRef(() => {});
  const pointerFrame = useRef(0);
  const reducedMotion = useRef(false);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = screen.current;
    if (!element) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = preference.matches;
    const duration = preference.matches ? REDUCED_LOAD_DURATION : LOAD_DURATION;
    const started = performance.now();
    let frame = 0;
    let exitTimer = 0;
    let finishTimer = 0;
    let finishing = false;
    let previousProgress = -1;

    // A closed native dialog stays out of the way if JavaScript is unavailable.
    // showModal contains keyboard focus and makes the rest of the page inert.
    element.showModal();
    document.body.classList.add("is-loading");

    const finish = () => {
      if (finishing) return;
      finishing = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pointerFrame.current);
      window.clearTimeout(finishTimer);
      setProgress(100);
      setExiting(true);
      exitTimer = window.setTimeout(() => {
        element.close();
        document.body.classList.remove("is-loading");
        if (window.location.hash) {
          const section = document.getElementById(window.location.hash.slice(1));
          section?.scrollIntoView({ behavior: "instant", block: "start" });
        }
        document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true });
        setVisible(false);
        onComplete();
      }, reducedMotion.current ? 40 : EXIT_DURATION);
    };

    const tick = (now: number) => {
      const next = Math.min(Math.round(((now - started) / duration) * 100), 100);
      if (next !== previousProgress) {
        previousProgress = next;
        setProgress(next);
      }
      if (!finishing) frame = requestAnimationFrame(tick);
    };

    const onPreferenceChange = () => {
      reducedMotion.current = preference.matches;
      if (preference.matches) finish();
    };

    dismiss.current = finish;
    preference.addEventListener("change", onPreferenceChange);
    // Completion also runs when the browser pauses animation frames.
    finishTimer = window.setTimeout(finish, duration);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = 0;
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
      preference.removeEventListener("change", onPreferenceChange);
      dismiss.current = () => {};
      element.close();
      document.body.classList.remove("is-loading");
    };
  }, [onComplete]);

  function move(event: PointerEvent<HTMLDialogElement>) {
    const element = screen.current;
    if (!element || reducedMotion.current || exiting) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      const bounds = element.getBoundingClientRect();
      const x = clientX - bounds.left;
      const y = clientY - bounds.top;
      element.style.setProperty("--loader-x", `${x}px`);
      element.style.setProperty("--loader-y", `${y}px`);
      element.style.setProperty("--loader-shift-x", `${(x - bounds.width / 2) * 0.08}px`);
      element.style.setProperty("--loader-shift-y", `${(y - bounds.height / 2) * 0.08}px`);
    });
  }

  if (!visible) return null;

  return (
    <dialog
      ref={screen}
      className={`loader-screen${exiting ? " is-exiting" : ""}`}
      data-loading-screen
      aria-modal="true"
      aria-label="Loading portfolio"
      aria-describedby="loader-instructions"
      onPointerMove={move}
      onPointerDown={move}
      onCancel={(event) => { event.preventDefault(); dismiss.current(); }}
    >
      <div className="loader-grid" aria-hidden="true" />
      <div className="loader-noise" aria-hidden="true" />
      <div className="loader-cursor-mark" aria-hidden="true"><span /><span /></div>

      <div className="loader-content">
        <div className="loader-topline"><span className="eyebrow">Subhronil Chattoraj</span></div>
        <div className="loader-center">
          <div className="loader-core" aria-hidden="true">
            <span className="loader-core-ring loader-core-ring-one" />
            <span className="loader-core-ring loader-core-ring-two" />
            <span className="loader-core-dot" />
          </div>
          <p className="loader-title">sc<span className="title-period">.</span></p>
        </div>
        <div className="loader-bottomline">
          <div className="loader-progress-wrap" role="progressbar" aria-label="Introduction progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="loader-progress-label mono"><span>Loading</span><span>{String(progress).padStart(3, "0")} %</span></div><div className="loader-progress-track"><span style={{ transform: `scaleX(${progress / 100})` }} /></div></div>
          <div id="loader-instructions" className="loader-interaction mono"><Move size={14} aria-hidden="true" /><span className="loader-pointer-hint">Move your cursor to explore</span><span className="loader-touch-hint">Touch & drag to explore</span></div>
          <button className="loader-enter" type="button" onClick={() => dismiss.current()}>Enter portfolio <ArrowUpRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
    </dialog>
  );
}
