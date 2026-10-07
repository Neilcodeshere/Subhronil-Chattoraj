import { expect, test, type Page } from "@playwright/test";
import { parseGitHubContributions, readContributionCalendar, type ContributionCalendar } from "../src/lib/github-contributions";

const fixture = `
  <h2 id="js-contribution-activity-description">2,451 contributions in the last year</h2>
  <td data-level="4" id="day-c" data-date="2026-01-02"></td>
  <tool-tip for="day-c">2,450 contributions on January 2nd.</tool-tip>
  <td id="day-a" data-date="2025-12-31" data-level="0"></td>
  <tool-tip for="day-a">No contributions on December 31st.</tool-tip>
  <td data-date="2026-01-01" data-level="1" id="day-b"></td>
  <tool-tip for="day-b">1 contribution on January 1st.</tool-tip>
`;

test("GitHub HTML parsing preserves real counts, intensity, and dates across a year boundary", () => {
  const calendar = parseGitHubContributions(fixture, "Neilcodeshere");
  expect(calendar.total).toBe(2451);
  expect(calendar.contributions).toEqual([
    { date: "2025-12-31", count: 0, level: 0 },
    { date: "2026-01-01", count: 1, level: 1 },
    { date: "2026-01-02", count: 2450, level: 4 },
  ]);
});

test("missing counts, incomplete dates, invalid refreshes, and incorrect totals cannot become misleading calendars", () => {
  expect(() => parseGitHubContributions(fixture.replace("1 contribution on January 1st.", "Unavailable"), "Neilcodeshere")).toThrow();
  expect(() => parseGitHubContributions(fixture.replace("2026-01-01", "2026-01-04"), "Neilcodeshere")).toThrow();
  expect(() => parseGitHubContributions(fixture.replace("2,451 contributions in", "2,450 contributions in"), "Neilcodeshere")).toThrow();
  expect(() => parseGitHubContributions("<html>GitHub is unavailable</html>", "Neilcodeshere")).toThrow();
  expect(() => readContributionCalendar({ username: "SomeoneElse", contributions: [], total: 0 }, "Neilcodeshere")).toThrow();
});

async function openCalendar(page: Page) {
  await page.goto("/#code");
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator(".contribution-calendar")).toHaveAttribute("data-status", "ready");
  await expect(page.locator(".contribution-calendar")).toHaveAttribute("data-visible", "true");
  await expect(page.getByRole("button", { name: "Refresh GitHub activity" })).toBeEnabled();
}

test("the calendar matches the live GitHub feed and exposes day details through keyboard and hover", async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await request.get("/api/github/contributions");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("s-maxage=3600");
  const calendar = await response.json() as ContributionCalendar;
  await openCalendar(page);
  await expect(page.getByRole("heading", { name: "GitHub activity." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Code", exact: true })).toHaveAttribute("aria-current", "location");
  await expect(page.locator(".contribution-total strong")).toHaveText(`${calendar.total.toLocaleString("en-US")} contribution${calendar.total === 1 ? "" : "s"}`);
  await expect(page.locator(".contribution-day")).toHaveCount(calendar.contributions.length);
  expect(await page.locator(".contribution-day").evaluateAll((buttons) => buttons.reduce((sum, button) => sum + Number((button as HTMLElement).dataset.count), 0))).toBe(calendar.total);
  const index = calendar.contributions.findIndex((day) => day.count > 0);
  const activeIndex = index >= 0 ? index : Math.floor(calendar.contributions.length / 2);
  const day = calendar.contributions[activeIndex];
  const button = page.locator(`.contribution-day[data-date="${day.date}"]`);
  await expect(button).toHaveAttribute("data-level", String(day.level));
  await button.hover();
  await expect(page.getByRole("tooltip")).toContainText(day.count === 0 ? "No contributions" : `${day.count.toLocaleString("en-US")} contribution`);
  await button.focus();
  await button.press("ArrowRight");
  await expect(page.locator(`.contribution-day[data-date="${calendar.contributions[Math.min(activeIndex + 7, calendar.contributions.length - 1)].date}"]`)).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator(`.contribution-day[data-date="${calendar.contributions[0].date}"]`)).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.locator(`.contribution-day[data-date="${calendar.contributions.at(-1)!.date}"]`)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.locator(".contribution-day[tabindex='0']")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("github-desktop.png") });
  expect(errors).toEqual([]);
});

test("failed or malformed refreshes preserve the saved calendar and a subsequent retry recovers", async ({ page }) => {
  let mode: "failure" | "invalid" | "success" = "failure";
  await page.route("**/api/github/contributions", (route) => mode === "success" ? route.continue() : route.fulfill({ status: mode === "failure" ? 503 : 200, json: mode === "failure" ? { error: "GitHub unavailable" } : { username: "Neilcodeshere", total: 1000, contributions: [] } }));
  await openCalendar(page);
  const saved = await page.locator(".contribution-total").innerText();
  await expect(page.getByRole("status").filter({ hasText: "Showing the saved GitHub calendar" })).toBeVisible();
  mode = "invalid";
  await page.getByRole("button", { name: "Refresh GitHub activity" }).click();
  await expect(page.getByRole("button", { name: "Refresh GitHub activity" })).toBeEnabled();
  await expect(page.locator(".contribution-total")).toHaveText(saved);
  await expect(page.locator(".contribution-calendar")).toHaveAttribute("data-status", "ready");
  mode = "success";
  await page.getByRole("button", { name: "Refresh GitHub activity" }).click();
  await expect(page.getByRole("status").filter({ hasText: "GitHub activity updated." })).toBeVisible();
  await expect(page.locator(".contribution-total")).toHaveText(saved);
});

test.describe("mobile contributions", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });

  test("the calendar scrolls inside narrow screens, accepts touch, and respects reduced motion", async ({ page }, testInfo) => {
    await openCalendar(page);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(await page.locator(".contribution-scroll").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const firstDate = await page.locator(".contribution-day").evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.date!).sort()[0]);
    const first = page.locator(`.contribution-day[data-date="${firstDate}"]`);
    await page.locator(".contribution-day[tabindex='0']").focus();
    await page.keyboard.press("Home");
    await expect(first).toBeFocused();
    await expect(page.getByRole("tooltip")).toHaveText((await first.getAttribute("aria-label"))!);
    await page.keyboard.press("End");
    const active = page.locator('.contribution-day:not([data-count="0"])').last();
    const button = await active.count() ? active : page.locator(".contribution-day").last();
    await button.scrollIntoViewIfNeeded();
    await button.tap();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(button).toHaveCSS("animation-name", "none");
    await expect(page.locator("#code .contribution-actions a")).toHaveAttribute("href", "https://github.com/Neilcodeshere");
    await page.screenshot({ path: testInfo.outputPath("github-mobile.png") });
  });
});

test.describe("JavaScript-free contributions", () => {
  test.use({ javaScriptEnabled: false });

  test("the real contribution total and calendar are included in server-rendered HTML", async ({ page }) => {
    await page.goto("/#code");
    await expect(page.locator(".contribution-calendar")).toHaveAttribute("data-status", "ready");
    expect(await page.locator(".contribution-day").count()).toBeGreaterThan(350);
    await expect(page.locator(".contribution-total strong")).toHaveText(/^\d[\d,]* contributions?$/);
    await expect(page.locator("#code .contribution-actions a")).toHaveAttribute("href", "https://github.com/Neilcodeshere");
  });
});
