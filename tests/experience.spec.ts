import { expect, test, type Page } from "@playwright/test";

async function openExperience(page: Page) {
  await page.goto("/#experience");
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator("#experience")).toHaveAttribute("data-renderer", "ready");
  await scrollToProgress(page, 0);
  await expect(page.locator(".experience-coil")).toHaveAttribute("data-active-experience", "0");
}

async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((progress) => {
    const section = document.getElementById("experience")!;
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + (section.offsetHeight - window.innerHeight) * progress, behavior: "instant" });
  }, progress);
}

test("experience uses a full-screen curved coil, responds to scrolling, and opens roles", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openExperience(page);
  const coil = page.getByRole("group", { name: "Scroll-driven experience coil" });
  await expect(page.locator(".experience-stage")).toHaveCSS("position", "sticky");
  await expect(page.locator(".experience-stage")).toHaveCSS("height", "1000px");
  const snapshot = () => coil.evaluate((element: HTMLCanvasElement) => new Promise<string>((resolve) => requestAnimationFrame(() => resolve(element.toDataURL()))));
  const before = await snapshot();
  await page.screenshot({ path: testInfo.outputPath("experience-coil-desktop-start.png") });
  await scrollToProgress(page, 1 / 14);
  await expect(coil).toHaveAttribute("data-active-experience", "1");
  expect(await snapshot()).not.toBe(before);
  await expect.poll(() => coil.evaluate((element) => Number((element as HTMLElement).dataset.coilProgress))).toBeGreaterThan(0.069);
  await page.screenshot({ path: testInfo.outputPath("experience-coil-desktop-design.png") });
  await coil.click({ position: { x: 720, y: 500 } });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Design Coordinator", exact: true })).toBeVisible();
  await expect(dialog).toContainText("September 2026 — October 2026");
  await expect(dialog).toContainText("merchandise and banner designs");
  await page.screenshot({ path: testInfo.outputPath("experience-role-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(coil).toBeFocused();
  expect(errors).toEqual([]);
});

test("keyboard exploration and the final View all overlay expose all six confirmed roles", async ({ page }, testInfo) => {
  await openExperience(page);
  const coil = page.getByRole("group", { name: "Scroll-driven experience coil" });
  await coil.focus();
  await coil.press("ArrowRight");
  await expect(coil).toHaveAttribute("data-active-experience", "1");
  await coil.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("Design Coordinator");
  await page.keyboard.press("Escape");
  await coil.press("End");
  await expect(page.locator("#experience")).toHaveAttribute("data-finished", "true");
  await expect(page.locator(".experience-title")).toHaveCSS("opacity", "0");
  await expect(page.locator(".experience-end-scrim")).toHaveCSS("opacity", "1");
  const viewAll = page.getByRole("button", { name: "View all", exact: true });
  await expect(viewAll).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("experience-coil-desktop-end.png") });
  await viewAll.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".experience-card")).toHaveCount(6);
  await expect(dialog).toContainText("Senior Operational Manager");
  await expect(dialog).toContainText("Event Head — Lakshya 2025");
  await expect(dialog.getByRole("link", { name: "Visit Srishti Green Decor" })).toHaveAttribute("href", "https://srishtigreendecor.com");
  await page.getByRole("button", { name: "Close experience details" }).click();
  await expect(viewAll).toBeFocused();
  await page.getByRole("link", { name: "Skip to awards and recognition" }).click();
  await expect(page).toHaveURL(/#recognition$/);
});

test("losing the coil's WebGL context reveals readable experience without trapping scroll", async ({ page }) => {
  await openExperience(page);
  await page.locator(".experience-coil").evaluate((element: HTMLCanvasElement) => element.getContext("webgl")!.getExtension("WEBGL_lose_context")!.loseContext());
  await expect(page.locator("#experience")).toHaveAttribute("data-renderer", "fallback");
  await expect(page.locator(".experience-static")).toBeVisible();
  await expect(page.locator(".experience-static .experience-card")).toHaveCount(6);
  await expect(page.locator(".experience-coil")).toBeHidden();
  await expect(page.locator(".experience-stage")).toHaveCSS("position", "relative");
});

test.describe("mobile experience", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("touch opens the front card and the coil and full list fit narrow screens", async ({ page }, testInfo) => {
    await openExperience(page);
    const coil = page.getByRole("group", { name: "Scroll-driven experience coil" });
    await page.screenshot({ path: testInfo.outputPath("experience-coil-mobile.png") });
    await coil.tap({ position: { x: 195, y: 422 } });
    await expect(page.getByRole("dialog")).toContainText("Senior Operational Manager");
    await page.getByRole("button", { name: "Close experience details" }).tap();
    await page.getByRole("button", { name: "All experience", exact: true }).tap();
    await expect(page.locator(".experience-dialog .experience-card")).toHaveCount(6);
    await page.screenshot({ path: testInfo.outputPath("experience-list-mobile.png") });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(await page.locator(".experience-dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await page.getByRole("button", { name: "Close experience details" }).tap();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
});

test.describe("static experience", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced motion displays complete roles without a pinned canvas", async ({ page }) => {
    await page.goto("/#experience");
    await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
    await expect(page.locator(".experience-static .experience-card")).toHaveCount(6);
    await expect(page.locator(".experience-static")).toBeVisible();
    await expect(page.locator(".experience-stage")).toHaveCSS("position", "relative");
    await expect(page.locator(".experience-coil")).toBeHidden();
    await expect(page.locator(".experience-static")).toContainText("Design Coordinator");
  });
});

test.describe("JavaScript-free experience", () => {
  test.use({ javaScriptEnabled: false });

  test("the six role descriptions are available in server-rendered HTML", async ({ page }) => {
    await page.goto("/#experience");
    await expect(page.locator(".experience-static .experience-card")).toHaveCount(6);
    await expect(page.getByRole("heading", { name: "Design Coordinator", exact: true })).toBeVisible();
    await expect(page.locator(".experience-static")).toContainText("September 2026 — October 2026");
    await expect(page.locator(".experience-coil")).toBeHidden();
  });
});
