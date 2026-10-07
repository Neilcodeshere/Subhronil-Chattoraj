import { expect, test, type Page } from "@playwright/test";
import { createMailto } from "../src/lib/contact";

async function waitForLoading(page: Page) {
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0, { timeout: 5_000 });
}

test("email draft preserves special characters and never adds recipients", () => {
  const uri = new URL(createMailto({ name: "A & B", email: "sender@example.com", reason: "Collaboration", message: "AI + design? #ideas & café\nA second line" }));
  expect(uri.protocol).toBe("mailto:");
  expect(uri.pathname).toBe("subhronilchattoraj25@gmail.com");
  expect(uri.searchParams.get("subject")).toBe("Portfolio enquiry — Collaboration");
  expect(uri.searchParams.get("body")).toContain("AI + design? #ideas & café\nA second line");
  expect(uri.searchParams.get("body")).toContain("Name: A & B");
  expect([...uri.searchParams.keys()]).toEqual(["subject", "body"]);
});

test("homepage renders with no browser errors and has working project views", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await waitForLoading(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SUBHRONILCHATTORAJ.");
  await page.screenshot({ path: testInfo.outputPath("desktop-hero.png") });
  await page.getByRole("link", { name: "Explore my work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  const globe = page.getByRole("group", { name: "Interactive project globe" });
  await expect(globe).toBeVisible();
  await expect(globe).toHaveAttribute("data-renderer", "ready");
  await globe.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const orbit = document.querySelector(".project-orbit")!;
    window.scrollTo({ top: orbit.getBoundingClientRect().top + window.scrollY + 1, behavior: "instant" });
  });
  const snapshot = () => globe.evaluate((element: HTMLCanvasElement) => new Promise<string>((resolve) => requestAnimationFrame(() => resolve(element.toDataURL()))));
  const before = await snapshot();
  await globe.focus();
  await globe.press("ArrowRight");
  await expect.poll(snapshot).not.toBe(before);
  await page.locator(".project-orbit-panel").screenshot({ path: testInfo.outputPath("desktop-work.png") });
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(globe).toHaveCount(0);
  await expect(page.getByAltText("Hand-painted Madhubani planter from Srishti Green Decor in a sunlit courtyard")).toBeVisible();
  await expect(page.getByRole("link", { name: "Visit live website", exact: true })).toHaveAttribute("href", "https://srishtigreendecor.com");
  await page.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(globe).toBeVisible();
  await expect(globe).toHaveAttribute("data-renderer", "ready");
  await globe.scrollIntoViewIfNeeded();
  const bounds = await globe.boundingBox();
  if (!bounds) throw new Error("Missing globe bounds");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 95, bounds.y + bounds.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page).toHaveURL(/#work$/);
  expect(errors).toEqual([]);
});

test("project overview opens from both views and returns to selected work", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#work");
  await waitForLoading(page);
  await page.getByRole("link", { name: "Explore project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/srishti-green-decor$/);
  await expect(page.locator("[data-loading-screen]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Srishti Green Decor.");
  await expect(page).toHaveTitle("Srishti Green Decor — Subhronil Chattoraj");
  await expect(page.locator(".project-facts")).toContainText("Co-founder & website developer");
  await expect(page.getByRole("link", { name: "Visit live website", exact: true })).toHaveAttribute("href", "https://srishtigreendecor.com");
  for (const image of await page.locator(".project-preview img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout: 15_000 }).toBe(true);
  }
  await page.locator("#main-content").focus();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("desktop-project.png"), fullPage: true });
  await page.getByRole("link", { name: "All selected work", exact: true }).click();
  await expect(page).toHaveURL(/\/#work$/);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("link", { name: "Explore Srishti Green Decor", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/srishti-green-decor$/);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("canonical URLs and crawl files include the homepage and project overview", async ({ page, request }) => {
  await page.goto("/");
  const homepageCanonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(homepageCanonical).toBeTruthy();
  const base = new URL(homepageCanonical!);
  expect(base.pathname).toBe("/");
  await page.goto("/projects/srishti-green-decor");
  const projectUrl = new URL("/projects/srishti-green-decor", base).toString();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", projectUrl);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", projectUrl);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Srishti Green Decor — Subhronil Chattoraj");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain(`<loc>${base.toString()}</loc>`);
  expect(xml).toContain(`<loc>${projectUrl}</loc>`);
  expect(xml.match(/<loc>/g)).toHaveLength(2);
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${new URL("/sitemap.xml", base)}`);
});

test("unknown projects show a real 404 with a route back to the portfolio", async ({ page }) => {
  const response = await page.goto("/projects/not-a-project");
  expect(response?.status()).toBe(404);
  await waitForLoading(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found.");
  await page.getByRole("link", { name: "Back to the portfolio", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SUBHRONILCHATTORAJ.");
});

test("desktop experience coil includes the corrected design role and dates", async ({ page }) => {
  await page.goto("/");
  await waitForLoading(page);
  const section = page.locator("#experience");
  await expect(section).toHaveAttribute("data-renderer", "ready");
  const coil = page.getByRole("group", { name: "Scroll-driven experience coil" });
  await page.evaluate(() => {
    const element = document.getElementById("experience")!;
    const offset = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: offset + (element.offsetHeight - window.innerHeight) / 14, behavior: "instant" });
  });
  await expect(coil).toHaveAttribute("data-active-experience", "1");
  await coil.focus();
  await coil.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Design Coordinator", exact: true })).toBeVisible();
  await expect(dialog).toContainText("TEDxSIESGST");
  await expect(dialog).toContainText("September 2026 — October 2026");
  await expect(page.getByRole("heading", { name: "Technical Coordinator", exact: true })).toHaveCount(0);
});

test("recognition details are keyboard accessible", async ({ page }) => {
  await page.goto("/#recognition");
  await waitForLoading(page);
  const award = page.locator("details").filter({ has: page.getByRole("heading", { name: "Best Organiser", exact: true }) });
  const summary = award.locator("summary");
  await summary.focus();
  await summary.press("Enter");
  await expect(award).toHaveAttribute("open", "");
  await expect(award.locator(".award-description")).toBeVisible();
});

test("contact validates input and explains the email-client handoff", async ({ page }, testInfo) => {
  await page.goto("/#contact");
  await waitForLoading(page);
  const submit = page.getByRole("button", { name: "Open email draft", exact: true });
  await submit.click();
  expect(await page.locator("#contact-name").evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true);
  await page.getByLabel("Your name", { exact: true }).fill("A & B");
  await page.getByLabel("Email address", { exact: true }).fill("hello@example.com");
  await page.getByLabel("Collaboration", { exact: true }).check();
  await page.getByLabel("Message", { exact: true }).fill("Let’s explore AI + design together.");
  await submit.click();
  await expect(page.locator(".form-status")).toContainText("Send it from your email app");
  await expect(page.locator(".form-status")).not.toContainText("Message sent");
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("A & B");
  await page.locator("#contact").screenshot({ path: testInfo.outputPath("desktop-contact.png") });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("project previews fit narrow screens and navigation returns to the homepage", async ({ page }, testInfo) => {
    await page.goto("/projects/srishti-green-decor");
    await waitForLoading(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Srishti Green Decor.");
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const section of [".project-intro", ".project-showcase", ".project-story", ".project-next"]) {
        await page.locator(section).scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const image of await page.locator(".project-preview img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    }
    await page.locator("#main-content").focus();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath("mobile-project.png"), fullPage: true });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: /Contact/ }).click();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.locator("#mobile-menu")).toBeHidden();
    await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
    expect(await page.locator("body").evaluate((body) => body.style.overflow)).not.toBe("hidden");
  });

  test("navigation, content, and layouts work at a narrow viewport", async ({ page }, testInfo) => {
    await page.goto("/");
    await waitForLoading(page);
    await page.screenshot({ path: testInfo.outputPath("mobile-hero.png") });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: /Experience/ }).click();
    await expect(page).toHaveURL(/#experience$/);
    await expect(page.locator("#mobile-menu")).toBeHidden();
    await expect(page.locator("#experience")).toHaveAttribute("data-renderer", "ready");
    await expect(page.getByRole("group", { name: "Scroll-driven experience coil" })).toBeVisible();
    await page.getByRole("button", { name: "All experience", exact: true }).click();
    await expect(page.locator(".experience-dialog .experience-card")).toHaveCount(6);
    await page.getByRole("button", { name: "Close experience details" }).click();
    for (const section of ["#work", "#about", "#experience", "#recognition", "#contact"]) {
      await page.locator(section).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
    await page.locator("#work").screenshot({ path: testInfo.outputPath("mobile-work.png") });
    await page.locator("#contact").screenshot({ path: testInfo.outputPath("mobile-contact.png") });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("uses the project list and readable experience cards by default", async ({ page }) => {
    await page.goto("/");
    await waitForLoading(page);
    await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".experience-static")).toBeVisible();
    await expect(page.locator(".experience-coil")).toBeHidden();
    await expect(page.locator(".marquee-track")).toHaveCSS("animation-name", "none");
  });
});
