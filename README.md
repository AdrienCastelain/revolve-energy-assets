# Revolve Energy — Site Assets

Custom JS / static assets served on https://revolve-energy.webflow.io (and the production domain).

## Files

| File | Purpose |
|---|---|
| `revolve-reveals.js` | Readable source for hero + scroll reveal animations. ⚠ live site currently loads `revolve-reveal-engine-1.1.0.js` from Webflow's own CDN — this copy may be superseded; verify before relying on it. |
| `revolve-reveals.min.js` | Minified build (see note above). |
| `revolve-insights-downloads-gate.js` | Readable source — Insights downloadable docs + free/email-gated download model. |
| `revolve-insights-downloads-gate.min.js` | Minified build — loaded on the live site via Footer Code (jsDelivr). |

## CDN URL (jsDelivr)

`revolve-insights-downloads-gate.min.js` is served via:
`https://cdn.jsdelivr.net/gh/AdrienCastelain/revolve-energy-assets@main/revolve-insights-downloads-gate.min.js`
(Pin a tag like `@v1.0.0` instead of `@main` for production immutability.)

## Reveal class contract (apply in Webflow Designer)

| Class / attribute | Element |
|---|---|
| `.hero-reveal` | `section_hero` container (one per page) |
| `data-hero="visual"` | Image / slideshow image block |
| `data-hero="visual-controls"` | Slide title + arrows (lifts from behind the visual) |
| `data-hero="pattern"` | Decorative pattern (fades + small lift alongside visual) |
| `data-hero="overline"` | Pretitle / eyebrow (optional) |
| `data-hero="title"` | H1 |
| `data-hero="subtitle"` | Lede paragraph |
| `data-hero="cta"` | Primary button / link |
| `.text-reveal` | Paragraphs + sub-hero titles — fade + 12px y, 0.6s, `power2.out` |
| `.block-reveal` | Cards, decor, overlines — fade + 16px y, 0.7s, `expo.out` |

Rules:
- One reveal per element. `.text-reveal` / `.block-reveal` inside `.hero-reveal` are ignored.
- Mobile (&lt;768px): distances −40%, durations −25%. Automatic.
- `prefers-reduced-motion`: opacity-only, no translation.
- Re-fires on every Barba `afterEnter`. ScrollTrigger instances are killed on `beforeLeave`.

## How it loads

Footer Code includes one `<script src="...">` tag pointing at this file. Updates: push here, hard-reload the site.

## Build

```bash
npx terser revolve-reveals.js --compress passes=2 --mangle -o revolve-reveals.min.js
```
