"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { contributionWeeks, describeContribution, readContributionCalendar, type ContributionCalendar } from "@/lib/github-contributions";

type Tooltip = { index: number; x: number; y: number; below: boolean };
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthName = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const rangeDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function tooltipPosition(element: HTMLButtonElement, index: number): Tooltip {
  const rect = element.getBoundingClientRect(), below = rect.top < 70;
  return { index, x: Math.max(145, Math.min(window.innerWidth - 145, rect.left + rect.width / 2)), y: below ? rect.bottom + 12 : rect.top - 12, below };
}

export function ContributionGraph({ initialData, username, profileHref }: { initialData: ContributionCalendar | null; username: string; profileHref: string }) {
  const [data, setData] = useState(initialData);
  const lastGood = useRef(initialData);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [focusedDate, setFocusedDate] = useState(initialData?.contributions.at(-1)?.date ?? "");
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const tooltipId = useId();
  const weeks = useMemo(() => contributionWeeks(data?.contributions ?? []), [data]);
  const months = useMemo(() => {
    const labels: { key: string; label: string; span: number }[] = [];
    for (const week of weeks) {
      const day = week.find((day) => day !== null)!;
      const date = new Date(`${day.date}T00:00:00Z`), key = day.date.slice(0, 7);
      if (labels.at(-1)?.key === key) labels[labels.length - 1].span++;
      else labels.push({ key, label: `${monthName.format(date)}${!labels.length || date.getUTCMonth() === 0 ? ` ’${String(date.getUTCFullYear()).slice(-2)}` : ""}`, span: 1 });
    }
    return labels;
  }, [weeks]);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setAnnouncement("");
    try {
      const response = await fetch("/api/github/contributions", { signal: request.signal });
      if (!response.ok) throw new Error("GitHub unavailable");
      const calendar = readContributionCalendar(await response.json(), username);
      if (request.signal.aborted) return;
      lastGood.current = calendar;
      setData(calendar);
      setFocusedDate((date) => calendar.contributions.some((day) => day.date === date) ? date : calendar.contributions.at(-1)!.date);
      setTooltip(null);
      setAnnouncement("GitHub activity updated.");
    } catch {
      if (!request.signal.aborted) setAnnouncement(lastGood.current ? "Refresh unavailable. Showing the saved GitHub calendar." : "GitHub activity is temporarily unavailable.");
    } finally { if (!request.signal.aborted) setLoading(false); }
  }, [username]);

  const trackScroll = useCallback(() => setTooltip((previous) => {
    if (!previous) return null;
    const day = lastGood.current?.contributions[previous.index];
    const button = day ? buttons.current.get(day.date) : undefined;
    return button && document.activeElement === button ? tooltipPosition(button, previous.index) : null;
  }), []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let refreshed = false;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting && !refreshed) { refreshed = true; void refresh(); }
    });
    observer.observe(element);
    return () => { observer.disconnect(); controller.current?.abort(); };
  }, [refresh]);

  useEffect(() => {
    const element = scroller.current;
    if (element && element.scrollWidth > element.clientWidth) element.scrollLeft = element.scrollWidth;
    const hideTooltip = () => setTooltip(null);
    window.addEventListener("resize", hideTooltip);
    window.addEventListener("scroll", trackScroll, { passive: true });
    return () => { window.removeEventListener("resize", hideTooltip); window.removeEventListener("scroll", trackScroll); };
  }, [data?.contributions.length, trackScroll]);

  function showTooltip(element: HTMLButtonElement, index: number) {
    setTooltip(tooltipPosition(element, index));
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number, weekday: number) {
    if (!data) return;
    if (event.key === "Escape") { setTooltip(null); return; }
    const direction = event.key === "ArrowLeft" ? -7 : event.key === "ArrowRight" ? 7 : event.key === "ArrowUp" && weekday > 0 ? -1 : event.key === "ArrowDown" && weekday < 6 ? 1 : 0;
    if (!direction && !["Home", "End", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? data.contributions.length - 1 : Math.max(0, Math.min(data.contributions.length - 1, index + direction));
    const button = buttons.current.get(data.contributions[next].date);
    if (button) { button.focus({ preventScroll: true }); button.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }); showTooltip(button, next); }
  }

  const days = data?.contributions ?? [];
  const offset = days.length ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay() : 0;
  return <div ref={root} className="contribution-calendar" data-status={data ? "ready" : loading ? "loading" : "unavailable"} data-visible={visible}>
    <div className="contribution-meta"><p className="contribution-total">{data ? <><strong>{data.total.toLocaleString("en-US")} contribution{data.total === 1 ? "" : "s"}</strong><span> in the last year</span></> : "GitHub contributions"}</p><div className="contribution-actions"><a href={profileHref} target="_blank" rel="noopener noreferrer">@{username}<ArrowUpRight size={15} aria-hidden="true" /></a><button className="contribution-refresh" aria-label="Refresh GitHub activity" disabled={loading} onClick={() => void refresh()}><RefreshCw size={14} aria-hidden="true" /></button></div></div>
    {data ? <>
      <div ref={scroller} className="contribution-scroll" role="region" aria-label="Scrollable GitHub contribution calendar" tabIndex={0} onScroll={trackScroll}>
        <table className="contribution-grid" role="grid" aria-label={`GitHub contributions for ${username}`} aria-readonly="true" style={{ minWidth: `${45 + weeks.length * 20}px` }}>
          <caption className="sr-only">{data.total} contributions in the last year. Use arrow keys to explore days, Home for the first day, End for the latest day, and Escape to dismiss details.</caption>
          <colgroup><col className="contribution-weekday-column" /><col span={weeks.length} /></colgroup>
          <thead><tr><td />{months.map((month) => <th key={month.key} scope="colgroup" colSpan={month.span}>{month.label}</th>)}</tr></thead>
          <tbody>{weekdays.map((weekday, row) => <tr key={weekday}><th scope="row"><span className={row === 1 || row === 3 || row === 5 ? "" : "sr-only"}>{weekday.slice(0, 3)}</span></th>{weeks.map((week, column) => {
            const day = week[row], index = column * 7 + row - offset;
            return <td key={column}>{day && <button ref={(element) => { if (element) buttons.current.set(day.date, element); else buttons.current.delete(day.date); }} className="contribution-day" data-date={day.date} data-count={day.count} data-level={day.level} aria-label={describeContribution(day)} aria-describedby={tooltip?.index === index ? tooltipId : undefined} tabIndex={day.date === focusedDate ? 0 : -1} style={{ animationDuration: `${14 + index % 9}s`, animationDelay: `${-(index * 0.37 % 20)}s` }} onPointerEnter={(event) => { if (event.pointerType === "mouse") showTooltip(event.currentTarget, index); }} onPointerLeave={(event) => { if (document.activeElement !== event.currentTarget) setTooltip(null); }} onFocus={(event) => { setFocusedDate(day.date); showTooltip(event.currentTarget, index); }} onBlur={() => setTooltip(null)} onClick={(event) => showTooltip(event.currentTarget, index)} onKeyDown={(event) => navigate(event, index, row)} />}</td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <div className="contribution-footer"><p className="contribution-range">{rangeDate.format(new Date(`${days[0].date}T00:00:00Z`))} — {rangeDate.format(new Date(`${days.at(-1)!.date}T00:00:00Z`))}</p><div className="contribution-legend" aria-label="Contribution intensity from less to more"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className="contribution-swatch" data-level={level} aria-hidden="true" />)}<span>More</span></div></div>
      <p className="contribution-scroll-hint">Scroll to view the full year.</p>
    </> : <div className="contribution-unavailable"><p>{loading ? "Loading GitHub activity…" : "GitHub activity is temporarily unavailable."}</p><a className="text-link" href={profileHref} target="_blank" rel="noopener noreferrer">View activity on GitHub<ArrowUpRight size={15} aria-hidden="true" /></a></div>}
    <p className="sr-only" role="status">{announcement}</p>
    {tooltip && days[tooltip.index] && createPortal(<div id={tooltipId} role="tooltip" className={`contribution-tooltip${tooltip.below ? " contribution-tooltip-below" : ""}`} style={{ left: tooltip.x, top: tooltip.y }}>{describeContribution(days[tooltip.index])}</div>, document.body)}
  </div>;
}
