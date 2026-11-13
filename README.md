# Subhronil Chattoraj – Portfolio

My personal portfolio site, built with Next.js and TypeScript. It's a single page with a few WebGL pieces (a project globe and a scrolling experience coil), a live GitHub contribution calendar, and a page for each project.

All the content (projects, experience, achievements) lives in plain TypeScript files, so updating the site doesn't mean touching components.

## Features

- Short intro screen that reveals the page, with a scrambled-letter effect on my name
- Project globe in WebGL 2: drag to spin, arrow keys to move, Home to reset. Falls back to a plain list without WebGL 2
- A statically generated overview page per project at `/projects/{id}`
- GitHub contribution calendar for my profile, fetched from GitHub without a token and refreshed in the browser through `/api/github/contributions`
- Experience shown as cards on a 3D helix that you scroll through, with a dialog listing every role
- Achievements section with optional award photos
- Contact form that opens a pre-filled email in your mail app (there's no backend, nothing is stored)
- Reduced-motion, no-JavaScript and no-WebGL visitors get a static, readable version of every section

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Motion
- Raw WebGL / WebGL 2 for the globe, background and experience coil
- Playwright for end-to-end tests

## Project Structure

```
src/
  app/                     page, project pages, sitemap, robots, OG image, contributions API route
  components/              one component per section (hero, globe, experience, footer, …)
  content/                 site.ts, projects.ts, experience.ts, achievements.ts, interests.ts
  lib/                     WebGL renderers, GitHub calendar fetch and parsing, URL helpers
public/images/             project and award images
tests/                     Playwright specs
```

## Getting Started

Requires Node.js 22+ and npm.

```bash
git clone https://github.com/Neilcodeshere/Subhronil-Chattoraj.git
cd Subhronil-Chattoraj
npm install
npm run dev               # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Editing the content

| File | What it holds |
|---|---|
| `src/content/site.ts` | Name, intro, email, social links, navigation |
| `src/content/projects.ts` | Projects, images, tags, live links and overview pages |
| `src/content/experience.ts` | Roles, dates, descriptions |
| `src/content/achievements.ts` | Achievements, optional photos, certifications |
| `src/content/interests.ts` | Interests |
| `src/app/globals.css` | Colours, typography, layout |

Adding a project to `projects.ts` adds it to the globe, the list view, the sitemap and generates its overview page. Images go in `public/images/`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL used for canonical links, Open Graph, `sitemap.xml` and `robots.txt`. Defaults to `http://localhost:3000` locally; on Vercel the production URL is picked up automatically |

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright tests run against a production server, so build first. If something is already using port 3000, set `PLAYWRIGHT_PORT=3100`.

## How It Works

**Project globe.** `src/lib/infinite-grid-menu.js` handles the WebGL renderer and the drag physics (arcball rotation with inertia and snapping to the nearest project). `project-globe.tsx` connects it to the project list. The canvas pauses when it's off-screen or the tab is hidden, and frees its GPU resources when it unmounts.

**Contribution calendar.** `src/lib/github.ts` fetches the public contribution calendar for the profile in `site.ts`, cached for an hour. `github-contributions.ts` parses and validates it. The calendar is server-rendered, then refreshed when it scrolls into view. If a refresh fails, the last good calendar stays. This needs a Next.js server (for example Vercel), not a static export.

**Experience coil.** `src/lib/experience-coil.ts` places the role cards on a vertical helix and moves the camera as you scroll. Front-facing cards can be clicked, or opened with Enter after focusing the canvas.

## Current Limitations

- Only one project (Srishti Green Decor) is listed so far.
- Some role descriptions are still one line.
- No custom domain is set yet (`NEXT_PUBLIC_SITE_URL` still defaults to localhost).

## Author

Subhronil Chattoraj · GitHub: [Neilcodeshere](https://github.com/Neilcodeshere) · LinkedIn: [subhronilchattoraj](https://www.linkedin.com/in/subhronilchattoraj)
