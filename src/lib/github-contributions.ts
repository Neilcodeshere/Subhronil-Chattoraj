export type ContributionDay = { date: string; count: number; level: number };
export type ContributionCalendar = { username: string; total: number; contributions: ContributionDay[] };

const DAY = 86_400_000;
const fullDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function describeContribution(day: ContributionDay) {
  return `${day.count === 0 ? "No" : day.count.toLocaleString("en-US")} contribution${day.count === 1 ? "" : "s"} on ${fullDate.format(new Date(`${day.date}T00:00:00Z`))}`;
}

// Validate both GitHub's parsed HTML and the calendar's JSON refresh response.
// Missing days/counts must be treated as unavailable data, not zero activity.
export function readContributionCalendar(value: unknown, username: string): ContributionCalendar {
  if (!value || typeof value !== "object") throw new Error("Invalid contribution calendar");
  const candidate = value as Partial<ContributionCalendar>;
  if (candidate.username !== username || !Number.isSafeInteger(candidate.total) || !Array.isArray(candidate.contributions) || !candidate.contributions.length || candidate.contributions.length > 400) throw new Error("Invalid contribution calendar");
  const contributions = candidate.contributions.map((day) => {
    if (!day || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isSafeInteger(day.count) || day.count < 0 || !Number.isInteger(day.level) || day.level < 0 || day.level > 4 || (day.count === 0) !== (day.level === 0)) throw new Error("Invalid contribution day");
    const timestamp = Date.parse(`${day.date}T00:00:00Z`);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day.date) throw new Error("Invalid contribution date");
    return { date: day.date, count: day.count, level: day.level };
  }).sort((a, b) => a.date.localeCompare(b.date));
  for (let index = 1; index < contributions.length; index++) {
    if (Date.parse(contributions[index].date) - Date.parse(contributions[index - 1].date) !== DAY) throw new Error("Incomplete contribution calendar");
  }
  const total = contributions.reduce((sum, day) => sum + day.count, 0);
  if (candidate.total !== total) throw new Error("Contribution total does not match the calendar");
  return { username, total, contributions };
}

export function parseGitHubContributions(html: string, username: string): ContributionCalendar {
  const attribute = (attributes: string, name: string) => attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
  const text = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&(?:nbsp|#160);/g, " ").trim();
  const counts = new Map<string, number>();
  for (const [, attributes, content] of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi)) {
    const id = attribute(attributes, "for"), match = text(content).match(/^(No|[\d,]+)\s+contributions?\b/i);
    if (id && match) counts.set(id, match[1].toLowerCase() === "no" ? 0 : Number(match[1].replaceAll(",", "")));
  }
  const contributions: ContributionDay[] = [];
  for (const [, attributes] of html.matchAll(/<td\b([^>]*)>/gi)) {
    const date = attribute(attributes, "data-date");
    if (!date) continue;
    const id = attribute(attributes, "id"), level = attribute(attributes, "data-level");
    const count = id ? counts.get(id) : undefined;
    if (count === undefined || level === undefined) throw new Error("Missing GitHub contribution details");
    contributions.push({ date, count, level: Number(level) });
  }
  const heading = html.match(/<h2\b[^>]*\bid="js-contribution-activity-description"[^>]*>([\s\S]*?)<\/h2>/i);
  const reportedTotal = heading && text(heading[1]).match(/^([\d,]+)\s+contributions?\b/i);
  const total = reportedTotal ? Number(reportedTotal[1].replaceAll(",", "")) : contributions.reduce((sum, day) => sum + day.count, 0);
  return readContributionCalendar({ username, total, contributions }, username);
}

export function contributionWeeks(days: ContributionDay[]) {
  if (!days.length) return [];
  const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  return Array.from({ length: Math.ceil((days.length + offset) / 7) }, (_, week) => Array.from({ length: 7 }, (_, weekday) => days[week * 7 + weekday - offset] ?? null));
}
