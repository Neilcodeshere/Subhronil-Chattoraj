import { expect, test, type Page } from "@playwright/test";

async function openOrbit(page: Page) {
  await page.goto("/#work");
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  const canvas = page.getByRole("group", { name: "Interactive project globe" });
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-renderer", "ready");
  await expect(canvas).toHaveAttribute("data-animating", "true");
  await page.evaluate(() => {
    const orbit = document.querySelector(".project-orbit")!;
    window.scrollTo({ top: orbit.getBoundingClientRect().top + window.scrollY + 1, behavior: "instant" });
  });
  return canvas;
}

test("WebGL renders real cover pixels, zooms during dragging, and restores the project action", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const canvas = await openOrbit(page);
  const pixels = await canvas.evaluate((element: HTMLCanvasElement) => new Promise<number>((resolve) => requestAnimationFrame(() => {
    const gl = element.getContext("webgl2")!;
    const data = new Uint8Array(64 * 64 * 4);
    gl.readPixels(Math.floor(element.width / 2) - 32, Math.floor(element.height / 2) - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, data);
    resolve(data.filter((value, index) => index % 4 !== 3 && value > 20).length);
  })));
  expect(pixels).toBeGreaterThan(500);
  const action = page.getByRole("link", { name: "Explore project", exact: true });
  await expect(action).toHaveAttribute("href", "/projects/srishti-green-decor");
  await expect(action).toBeInViewport({ ratio: 1 });
  await page.locator(".project-orbit-panel").screenshot({ path: testInfo.outputPath("orbit-desktop.png") });
  const bounds = await canvas.boundingBox();
  const before = await canvas.evaluate((element: HTMLCanvasElement) => new Promise<string>((resolve) => requestAnimationFrame(() => resolve(element.toDataURL()))));
  await page.mouse.move(bounds!.x + bounds!.width * 0.5, bounds!.y + bounds!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.75, bounds!.y + bounds!.height * 0.3, { steps: 20 });
  await expect(page.locator(".infinite-menu-wrap")).toHaveAttribute("data-moving", "true");
  await expect(action).toHaveClass(/inactive/);
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => new Promise<string>((resolve) => requestAnimationFrame(() => resolve(element.toDataURL()))))).not.toBe(before);
  await page.locator(".project-orbit-panel").screenshot({ path: testInfo.outputPath("orbit-dragging.png") });
  await page.mouse.up();
  await expect(page.locator(".infinite-menu-wrap")).toHaveAttribute("data-moving", "false");
  await expect(action).toHaveClass(/active/);
  await expect(action).toBeInViewport({ ratio: 1 });
  await action.click();
  await expect(page).toHaveURL(/\/projects\/srishti-green-decor$/);
  expect(errors).toEqual([]);
});

test("wide desktop captions match the reference and rendering pauses away from the orbit", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const canvas = await openOrbit(page);
  await expect(page.locator(".face-title")).toHaveText("Srishti Green Decor");
  await expect(page.locator(".face-caption")).toBeVisible();
  await expect(page.locator(".face-description")).toBeVisible();
  await page.locator(".project-orbit-panel").screenshot({ path: testInfo.outputPath("orbit-wide.png") });
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-animating", "false");
  await expect(page.locator("body")).not.toHaveClass(/is-project-orbit/);
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-animating", "true");
});

test("missing WebGL uses a working project list", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === "webgl2") return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/#work");
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".globe-fallback-note")).toContainText("unavailable");
  await expect(page.getByRole("group", { name: "Interactive project globe" })).toHaveCount(0);
  await page.getByRole("link", { name: "Explore project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/srishti-green-decor$/);
});

test("context loss switches to the list and a new globe can be mounted", async ({ page }) => {
  const canvas = await openOrbit(page);
  await canvas.evaluate((element: HTMLCanvasElement) => element.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext());
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveCount(0);
  await page.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-renderer", "ready");
});

test.describe("mobile globe", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("touch dragging works in an unpinned panel with a visible action", async ({ page }, testInfo) => {
    const canvas = await openOrbit(page);
    await expect(page.locator(".project-orbit-panel")).toHaveCSS("position", "relative");
    const bounds = await canvas.boundingBox();
    expect(bounds!.height).toBeLessThan(844);
    await page.locator(".project-orbit-panel").screenshot({ path: testInfo.outputPath("orbit-mobile.png") });
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: bounds!.y + bounds!.height * 0.5 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 280, y: bounds!.y + bounds!.height * 0.4 }] });
    await expect(page.locator(".infinite-menu-wrap")).toHaveAttribute("data-moving", "true");
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator(".infinite-menu-wrap")).toHaveAttribute("data-moving", "false");
    await expect(page.getByRole("link", { name: "Explore project", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("heading", { name: "About me.", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "About me.", exact: true })).toBeInViewport();
  });
});
