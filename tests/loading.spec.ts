import { expect, test, type Page } from "@playwright/test";

async function freezeIntroduction(page: Page) {
  const time = new Date("2026-10-07T12:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
}

test("cursor-reactive intro contains focus and animates into the portfolio when skipped", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await freezeIntroduction(page);
  await page.goto("/");
  const loader = page.getByRole("dialog", { name: "Loading portfolio" });
  const enter = loader.getByRole("button", { name: "Enter portfolio" });
  await expect(enter).toBeFocused();
  await page.locator("#main-content").focus();
  await expect(enter).toBeFocused();
  const core = loader.locator(".loader-core");
  const before = await core.evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.move(180, 240);
  await page.clock.runFor(100);
  await expect(loader).toHaveAttribute("style", /--loader-x: 180px/);
  await expect.poll(() => core.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before);
  await page.screenshot({ path: testInfo.outputPath("desktop-loading.png"), animations: "disabled" });
  await enter.click();
  await expect(loader).toHaveClass(/is-exiting/);
  await page.clock.runFor(700);
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/is-loading/);
  await page.clock.resume();
  await page.getByRole("link", { name: "Explore my work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  expect(errors).toEqual([]);
});

test("intro completes automatically and preserves deep links", async ({ page }) => {
  await freezeIntroduction(page);
  await page.goto("/#work");
  const loader = page.getByRole("dialog", { name: "Loading portfolio" });
  await expect(loader).toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/is-loading/);
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#main-content")).toBeFocused();
  await page.clock.resume();
  await expect(page.getByRole("heading", { name: "Selected work.", exact: true })).toBeInViewport();
});

test("Escape dismisses the intro when a project page is opened directly", async ({ page }) => {
  await freezeIntroduction(page);
  await page.goto("/projects/srishti-green-decor");
  await expect(page.getByRole("dialog", { name: "Loading portfolio" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(700);
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Srishti Green Decor.");
  await expect(page.locator("body")).not.toHaveClass(/is-loading/);
});

test.describe("mobile intro", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("native mobile tap starts the reveal immediately", async ({ page }) => {
    await page.goto("/");
    const loader = page.getByRole("dialog", { name: "Loading portfolio" });
    await expect(loader).toBeVisible();
    await loader.getByRole("button", { name: "Enter portfolio" }).tap();
    await expect(loader).toHaveClass(/is-exiting/, { timeout: 300 });
    await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  });

  test("touch interaction moves the spotlight and the enter button fits small screens", async ({ page }, testInfo) => {
    await freezeIntroduction(page);
    await page.goto("/");
    const loader = page.getByRole("dialog", { name: "Loading portfolio" });
    await expect(loader).toBeVisible();
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 120, y: 300 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 220, y: 350 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.clock.runFor(100);
    await expect(loader).toHaveAttribute("style", /--loader-x: 220px/);
    await expect(loader.locator(".loader-touch-hint")).toBeVisible();
    await expect(loader.locator(".loader-cursor-mark")).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath("mobile-loading.png"), animations: "disabled" });
    for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      const bounds = await loader.getByRole("button", { name: "Enter portfolio" }).boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
    await loader.getByRole("button", { name: "Enter portfolio" }).press("Enter");
    await expect(loader).toHaveClass(/is-exiting/);
    await page.clock.runFor(700);
    await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveClass(/is-loading/);
  });
});

test.describe("reduced-motion intro", () => {
  test.use({ reducedMotion: "reduce" });

  test("intro is static and clears quickly without following the pointer", async ({ page }) => {
    await freezeIntroduction(page);
    await page.goto("/");
    const loader = page.getByRole("dialog", { name: "Loading portfolio" });
    await expect(loader).toBeVisible();
    await expect(loader.locator(".loader-core-ring-one")).toHaveCSS("animation-name", "none");
    await expect(loader).toHaveCSS("animation-name", "none");
    await page.mouse.move(180, 240);
    await page.clock.runFor(100);
    await expect(loader).not.toHaveAttribute("style", /--loader-x/);
    await page.clock.runFor(300);
    await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveClass(/is-loading/);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the intro stays closed and the portfolio is readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-loading-screen]")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("SUBHRONILCHATTORAJ.");
    await expect(page.locator("body")).not.toHaveClass(/is-loading/);
    await page.getByRole("link", { name: "Explore my work", exact: true }).click();
    await expect(page).toHaveURL(/#work$/);
  });
});
