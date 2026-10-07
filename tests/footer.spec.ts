import { expect, test, type Page } from "@playwright/test";

async function openFooter(page: Page, path = "/", javaScript = true) {
  await page.goto(path);
  if (javaScript) await expect(page.locator("[data-loading-screen]")).toHaveCount(0, { timeout: 5_000 });
  else await expect(page.locator("[data-loading-screen]")).toBeHidden();
  const footer = page.getByRole("contentinfo");
  await footer.scrollIntoViewIfNeeded();
  return footer;
}

async function waveSnapshot(page: Page) {
  // Compare only the code ribbon, excluding focus rings and the sticky header.
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  const bounds = (await page.getByRole("contentinfo").boundingBox())!;
  return page.screenshot({ clip: { x: Math.round(bounds.width / 2 - 220), y: Math.round(bounds.y + bounds.height / 2 - 80), width: 440, height: 160 }, animations: "disabled" });
}

test("the code wave visibly follows the pointer and returns to its resting state", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const footer = await openFooter(page);
  await page.mouse.move(0, 0);
  const resting = await waveSnapshot(page);
  const bounds = (await footer.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.5);
  await expect(footer).toHaveAttribute("data-pointer-active", "true");
  const left = await waveSnapshot(page);
  expect(left.equals(resting)).toBe(false);
  await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.5);
  expect((await waveSnapshot(page)).equals(left)).toBe(false);
  await footer.screenshot({ path: testInfo.outputPath("desktop-footer.png") });
  await page.mouse.move(0, 0);
  await expect(footer).not.toHaveAttribute("data-pointer-active");
  expect((await waveSnapshot(page)).equals(resting)).toBe(true);
  expect(errors).toEqual([]);
});

test("footer links support keyboard focus and navigate from project pages", async ({ page }) => {
  const footer = await openFooter(page, "/projects/srishti-green-decor");
  const contact = footer.getByRole("link", { name: "Start a conversation", exact: true });
  await contact.focus();
  await expect(contact).toBeFocused();
  await expect(footer).toHaveAttribute("data-pointer-active", "true");
  await expect(contact).toHaveAttribute("href", "/#contact");
  await expect(footer.getByRole("link", { name: "Back to top", exact: true })).toHaveAttribute("href", "#home");
  await expect(footer.getByRole("link", { name: "Subhronil Chattoraj — home", exact: true })).toHaveAttribute("href", "/#home");
  await expect(footer.getByRole("link", { name: /subhronilchattoraj25@gmail.com/ })).toHaveAttribute("href", "mailto:subhronilchattoraj25@gmail.com");
  await contact.press("Enter");
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
  await page.getByRole("contentinfo").getByRole("link", { name: "Back to top", exact: true }).click();
  await expect(page).toHaveURL(/#home$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
});

test.describe("touch footer", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("touch lights the artwork, releases cleanly, and fits narrow screens", async ({ page }, testInfo) => {
    const footer = await openFooter(page);
    const session = await page.context().newCDPSession(page);
    const bounds = (await footer.boundingBox())!;
    const point = { x: 180, y: Math.max(180, bounds.y + bounds.height * 0.5) };
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await expect(footer).toHaveAttribute("data-pointer-active", "true");
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, x: 240 }] });
    await expect(footer).toHaveAttribute("data-pointer-active", "true");
    await expect(footer.locator(".footer-symbols-lit")).toHaveCSS("opacity", "1");
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(footer).not.toHaveAttribute("data-pointer-active");
    await footer.screenshot({ path: testInfo.outputPath("mobile-footer.png") });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      for (const link of await footer.getByRole("link").all()) {
        const box = (await link.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
  });
});

test.describe("static footer", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced motion keeps the code wave static and the links available", async ({ page }) => {
    const footer = await openFooter(page);
    const before = await waveSnapshot(page);
    const bounds = (await footer.boundingBox())!;
    await page.mouse.move(500, bounds.y + bounds.height * 0.5);
    await footer.getByRole("link", { name: "Start a conversation", exact: true }).focus();
    await expect(footer).not.toHaveAttribute("data-pointer-active");
    await expect(footer.locator(".footer-symbols-lit")).toBeHidden();
    expect((await waveSnapshot(page)).equals(before)).toBe(true);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.mouse.move(600, bounds.y + bounds.height * 0.5);
    await expect(footer).toHaveAttribute("data-pointer-active", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(footer).not.toHaveAttribute("data-pointer-active");
  });
});

test.describe("JavaScript-free footer", () => {
  test.use({ javaScriptEnabled: false });

  test("server-rendered artwork and section links work without JavaScript", async ({ page }) => {
    const footer = await openFooter(page, "/", false);
    await expect(footer.locator(".footer-symbols").first()).toBeVisible();
    await footer.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Work", exact: true }).click();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.getByRole("heading", { name: "Selected work.", exact: true })).toBeInViewport();
  });
});
