import { expect, test, type Page } from "@playwright/test";

const NAME = "SUBHRONILCHATTORAJ.";

async function freezeIntroduction(page: Page) {
  const time = new Date("2026-10-07T12:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
}

test("name waits for the loading reveal, resolves in place, and replays on hover", async ({ page }, testInfo) => {
  await freezeIntroduction(page);
  await page.goto("/");
  const name = page.locator("#hero-heading");
  const loader = page.getByRole("dialog", { name: "Loading portfolio" });
  await expect(loader).toBeVisible();
  await page.clock.runFor(2200);
  await expect(loader).toHaveClass(/is-exiting/);
  await expect(name).toHaveAttribute("data-intro-ready", "false");
  await expect(name).toHaveText(NAME);
  const initialBounds = await name.boundingBox();

  await page.clock.runFor(700);
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(name).toHaveAttribute("data-scramble", "running");
  await expect(name).not.toHaveText(NAME);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Subhronil Chattoraj");
  await page.clock.runFor(280);
  await expect(name.locator(".scramble-glyph").first()).toHaveText("S");
  expect(await name.boundingBox()).toEqual(initialBounds);
  await page.screenshot({ path: testInfo.outputPath("hero-name-scrambling.png"), animations: "disabled" });

  await page.clock.runFor(2400);
  await expect(name).toHaveAttribute("data-scramble", "settled");
  await expect(name).toHaveText(NAME);
  expect(await name.boundingBox()).toEqual(initialBounds);
  await page.screenshot({ path: testInfo.outputPath("hero-name-desktop.png"), animations: "disabled" });
  await page.mouse.move(0, 0);
  await name.hover();
  await expect(name).toHaveAttribute("data-scramble", "running");
  await page.clock.runFor(2400);
  await expect(name).toHaveText(NAME);
  await expect(name).toHaveAttribute("data-scramble", "settled");
});

test("skip starts the name reveal and returning from a project keeps it working", async ({ page }) => {
  await freezeIntroduction(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Enter portfolio" }).press("Enter");
  await page.clock.runFor(700);
  await expect(page.locator("#hero-heading")).toHaveAttribute("data-scramble", "running");
  await page.clock.runFor(2400);
  await expect(page.locator("#hero-heading")).toHaveText(NAME);
  await page.clock.resume();
  await page.getByRole("link", { name: "Explore my work", exact: true }).click();
  await page.getByRole("link", { name: "Explore project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/srishti-green-decor$/);
  await page.getByRole("link", { name: "Subhronil Chattoraj — home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/#home$/);
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.locator("#hero-heading")).toHaveAttribute("data-intro-ready", "true");
  await expect(page.locator("#hero-heading")).toHaveText(NAME);
});

test.describe("mobile name", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("scrambling keeps both name lines within narrow screens", async ({ page }, testInfo) => {
    await freezeIntroduction(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Enter portfolio" }).press("Enter");
    await page.clock.runFor(700);
    await expect(page.locator("#hero-heading")).toHaveAttribute("data-scramble", "running");
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const line of await page.locator(".hero-name-line").all()) {
        const bounds = await line.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        expect(await line.evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
    await page.clock.runFor(2400);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#hero-heading")).toHaveText(NAME);
    await page.screenshot({ path: testInfo.outputPath("hero-name-mobile.png"), animations: "disabled" });
  });
});

test.describe("reduced-motion name", () => {
  test.use({ reducedMotion: "reduce" });

  test("name remains readable after loading and on hover", async ({ page }) => {
    await freezeIntroduction(page);
    await page.goto("/");
    await page.clock.runFor(400);
    const name = page.locator("#hero-heading");
    await expect(name).toHaveAttribute("data-scramble", "settled");
    await expect(name).toHaveText(NAME);
    await name.hover();
    await expect(name).toHaveAttribute("data-scramble", "settled");
    await expect(name).toHaveText(NAME);
  });
});
