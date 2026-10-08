# Subhronil Chattoraj — Portfolio

A black-and-purple, editorial portfolio built with Next.js, TypeScript, Tailwind CSS, and Motion. Fonts and project imagery are served locally. The Srishti Green Decor project includes real product photography and desktop/mobile previews of the live website.

The shared app shell opens with a short cursor-reactive introduction. Move across it to shift the spotlight, crosshair, and central orbit, or touch and drag on mobile. It automatically reveals the page after about 2.8 seconds; **Enter portfolio** or **Escape** starts the reveal immediately. The transition plays once per full page load, and internal navigation stays uninterrupted. Reduced-motion visitors receive a brief static introduction, and the page remains usable without JavaScript. Edit the timing in `src/components/loading-screen.tsx` and its appearance in `src/app/globals.css`.

### Hero typography

The name uses a left-to-right symbol scramble in `src/components/hero-name.tsx`. Hidden CSS sizing letters beneath each changing glyph prevent layout shifts, while the heading keeps a stable accessible name and local Space Grotesk typography. The reveal advances by 0.3 letters every 35 ms and replays on hover. `src/components/intro-provider.tsx` signals completion so the name starts resolving after the loading screen closes and the name is visible. Reduced-motion and JavaScript-free visitors see the complete name.

The hero and Experience section share the cursor-reactive purple filament background in `src/components/filament-background.tsx` and `src/lib/filament-background.ts`. It uses a sharp shader sample, native screen resolution (up to 2× pixel density), and light grain. Animation begins after the introduction, pauses off-screen, in hidden tabs, and behind experience dialogs, and renders a static frame for reduced motion. WebGL-unavailable and JavaScript-free visitors see a CSS background.

## Run locally

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run build
npm start
```

## Editing the content

| File | Content |
| --- | --- |
| `src/content/site.ts` | Name, introduction, email, social links, navigation |
| `src/content/projects.ts` | Projects, image paths, descriptions, tags, live links, overview content, and previews |
| `src/content/experience.ts` | Experience cards, dates, descriptions |
| `src/content/achievements.ts` | Achievements and future certifications |
| `src/content/interests.ts` | Personal interests |
| `src/app/globals.css` | Colors, typography, responsive layout, motion styling |

### Project globe

The globe uses a WebGL 2 renderer with curved disc geometry, 42 icosphere disc instances, a 512px-per-project texture atlas, arcball rotation, inertial snapping, motion-based disc stretching, and camera pull-back during dragging. Its full-width sticky desktop viewport includes side scrims, captions, and a crimson circular project action. Mobile uses an unpinned 70svh panel.

`src/lib/infinite-grid-menu.js` owns the renderer and physics; `src/components/project-globe.tsx` connects it to the portfolio. Add entries to `projects.ts` to populate both views. Only confirmed projects are repeated over the sphere. Use arrow keys to explore and Home to reset. The canvas pauses off-screen or when the tab is hidden and disposes its WebGL resources when removed. Browsers without WebGL 2 use the project list; reduced-motion visitors start in the list view.

Keep project covers and screenshots under `public/images/`. The current Srishti assets were captured from `https://srishtigreendecor.com` on October 5, 2026 and compressed to WebP. The square cover uses the live site’s hero photography; the desktop and mobile previews are screenshots of its homepage. Update the assets when the live website changes.

Set a project's optional `globeImage` to use a separate image on its globe discs. Srishti Green Decor uses the supplied butterfly logo at `/images/srishti-logo.png`; its list and overview continue to use the product photograph.

### Project overviews

Each project has a statically generated page at `/projects/{id}`, linked from both project views. Edit its `overview` fields in `projects.ts` to update the introduction, role, highlights, and preview gallery. Supply each screenshot’s intrinsic width and height, descriptive alt text, caption, and `desktop` or `mobile` format. New project entries also populate the sitemap automatically.

The current overview describes the confirmed contribution and features visible on the live site. Add verified tools, process details, and outcomes when expanding it into a full case study.

### GitHub contributions

The **Code** section (`/#code`), below Selected Work, displays a contribution calendar in the portfolio's purple palette. It shows the linked `Neilcodeshere` profile's real last-year contribution total, month/day labels, five intensity levels, a subtle pulse on active days, and hover, keyboard, and touch details. Narrow screens scroll horizontally to keep the squares readable; reduced motion disables the pulse.

`src/lib/github.ts` fetches the public calendar directly from GitHub without a token, with one-hour revalidation. `src/lib/github-contributions.ts` extracts and validates the dates, counts, intensity levels, and total. The calendar is server-rendered, then refreshed through `/api/github/contributions` when it becomes visible; the refresh button can retry. A failed refresh preserves the last good calendar, and an unavailable initial fetch provides a GitHub profile link. Update the GitHub social entry in `src/content/site.ts` to change the account. The deployment needs a Next.js server (such as Vercel) for automatic updates and the API route.

### Experience and recognition

Experience combines a pinned viewport, oversized centered title, animated filament background, and 14 curved cards moving through a flared vertical helix. The WebGL renderer in `src/lib/experience-coil.ts` uses a 7.7-unit radius, 5 × 3.75-unit cards, a 30-unit coil, a 45° camera, eased scrolling, and velocity-based flutter. The six existing roles repeat around the coil on desktop and mobile, using local typography and a purple palette. Click or tap a front-facing card to read its complete details; focus the canvas and use arrow keys to explore, Enter to open a role, and Home/End to move to the beginning/end. The final “View all” overlay and corner list button open all six roles in a keyboard-accessible dialog. Reduced-motion, JavaScript-free, and WebGL-unavailable visitors receive ordinary readable cards. Rendering pauses off-screen and in hidden tabs, and releases resources on unmount.

Recognition uses a sticky title and tilt-card layout with a violet palette, the portfolio’s five achievements, and keyboard/touch-expandable details. Reduced-motion visitors see an ordinary heading and static cards.

Award photos are optional: add local `image` and `imageAlt` values to an entry in `src/content/achievements.ts` to replace its purple cover. SustainX, Newbie Award, and Dr. Stya Paul Award use the supplied award photographs; the remaining two achievements use icon covers. The empty certifications array is ready for confirmed credentials; it does not display an empty section.

Some role descriptions are intentionally brief until detailed responsibilities are supplied. Add the actual tools, process, and outcomes for Srishti Green Decor before writing a dedicated case study.

### Contact

The form validates required fields and opens a URL-encoded `mailto:` draft. The visitor sends the message using their email application. No backend or delivery confirmation is involved. The email address and copy action remain available as a fallback. Form content is not stored by the site.

### Interactive footer

The full-height footer combines a code-symbol wave and cursor spotlight in the portfolio's purple palette. Move across the wave to brighten the symbols, or touch and drag on mobile. Keyboard focus illuminates the area around each link. Touch scrolling stays native, and reduced-motion visitors see a static wave. The artwork is locally generated and server-rendered in `src/components/footer-artwork.tsx`; `src/components/footer-surface.tsx` updates the spotlight once per animation frame and cleans up on unmount. Edit the layout and colors in the Footer section of `src/app/globals.css`. Contact and navigation links use the existing portfolio content on both the homepage and project pages.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests cover the cursor-reactive intro and footer, hero name scramble, automatic completion, skipping, keyboard focus, touch interaction, JavaScript-free access, navigation, WebGL cover rendering and dragging, context-loss/list fallback, project overview links and previews, canonical URLs and crawl files, missing-project handling, mobile layout, reduced-motion behavior, recognition details, and the email-draft flow. They run against a production server after `npm run build`. If your development server is already on port 3000, set `PLAYWRIGHT_PORT=3100` for the tests to use a separate production server.

## Deployment

Deploy as a standard Next.js application, for example by importing the project into Vercel. Once a domain is chosen, set `NEXT_PUBLIC_SITE_URL` to that production URL (see `.env.example`) before building. Canonical URLs, Open Graph URLs, `sitemap.xml`, and `robots.txt` use that setting automatically. Vercel's production URL is used automatically when available; local development defaults to `http://localhost:3000`. The app includes a generated social-sharing image and local icon.

## Later additions

More projects, detailed case studies, verified certifications, a supplied résumé, and any portfolio assistant can be added to the existing structure. No analytics or third-party trackers are included.
