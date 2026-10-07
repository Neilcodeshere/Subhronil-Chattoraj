import { expect, test } from "@playwright/test";

test("hero name is centered on desktop and mobile without the decorative orb", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.locator("#hero-heading")).toHaveText("SUBHRONILCHATTORAJ.");
  await expect(page.locator(".hero-art, .hero-topline, .hero-baseline, .principles")).toHaveCount(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await page.locator("#hero-heading").boundingBox();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath("centered-hero-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("centered-hero-mobile.png") });
});

test("recognition title fades into six tilt cards with keyboard-accessible details", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#recognition");
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Awards & recognition", exact: true })).toBeInViewport();
  await expect(page.locator(".recognition-count")).toHaveText("(6)");
  await page.locator(".recognition-hero").screenshot({ path: testInfo.outputPath("recognition-title-desktop.png") });
  const cards = page.locator(".award-tile");
  await expect(cards).toHaveCount(6);
  await cards.first().scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator(".recognition-title").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(0.05);
  const rows = await page.locator(".award-tile-wrap").evaluateAll((elements) => elements.slice(0, 2).map((element) => ({ top: (element as HTMLElement).offsetTop, left: (element as HTMLElement).offsetLeft, width: (element as HTMLElement).offsetWidth })));
  expect(rows[0].top).toBe(rows[1].top);
  expect(rows[1].left).toBeGreaterThan(rows[0].left + rows[0].width);
  const before = await cards.first().getAttribute("style");
  await cards.first().hover({ position: { x: 80, y: 80 } });
  await expect.poll(() => cards.first().getAttribute("style")).not.toBe(before);
  await page.mouse.move(0, 0);
  const award = page.locator("details").filter({ has: page.getByRole("heading", { name: "First Place — SustainX", exact: true }) });
  await award.locator("summary").focus();
  await award.locator("summary").press("Enter");
  await expect(award).toHaveAttribute("open", "");
  await expect(award.locator(".award-description")).toContainText("first place in SustainX 2025");
  await expect(award.locator(".award-description")).toBeVisible();
  await award.locator("summary").press("Enter");
  await expect(award).not.toHaveAttribute("open", "");
  await page.locator(".award-grid").screenshot({ path: testInfo.outputPath("recognition-grid-desktop.png") });
  expect(errors).toEqual([]);
});

test.describe("mobile recognition", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("awards use a single column and can be opened with touch", async ({ page }, testInfo) => {
    await page.goto("/#recognition");
    await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
    await page.locator(".recognition-hero").screenshot({ path: testInfo.outputPath("recognition-title-mobile.png") });
    const first = page.locator(".award-details").first();
    await first.locator("summary").tap();
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator(".award-description")).toBeVisible();
    await page.locator(".award-tile").first().screenshot({ path: testInfo.outputPath("recognition-card-mobile.png") });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
});

test.describe("reduced-motion recognition", () => {
  test.use({ reducedMotion: "reduce" });

  test("title and cards stay readable without a pinned transition or tilt", async ({ page }) => {
    await page.goto("/#recognition");
    await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
    await expect(page.locator(".recognition-hero")).toHaveCSS("position", "relative");
    await page.locator(".award-tile").first().scrollIntoViewIfNeeded();
    const card = page.locator(".award-tile").first();
    await card.hover();
    await expect(card).toHaveCSS("transform", "none");
    await expect(page.locator(".awards-cursor")).toBeHidden();
  });
});
