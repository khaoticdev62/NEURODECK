# NEURODECK Performance Baseline

> Generated: 2026-06-16T16:51:31.571Z
> Command: `npm run perf:lighthouse`
> Viewport: 1280×800
> Chrome: headless

## Summary

| Route | Performance | Accessibility | Best Practices | SEO | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Total KB |
|---|---|---|---|---|---|---|---|---|---|
| / | 55 | 100 | 96 | 82 | 11901 | 13088 | 96 | 0.026 | 2041 |
| /chat | 56 | 100 | 96 | 82 | 11413 | 13111 | 0 | 0.026 | 2041 |
| /canvas | 56 | 100 | 96 | 82 | 11415 | 13413 | 0 | 0.026 | 2041 |
| /terminal | 56 | 100 | 96 | 82 | 11419 | 13118 | 0 | 0.026 | 2041 |
| /settings | 56 | 100 | 96 | 82 | 11415 | 13415 | 0 | 0.026 | 2041 |
| /memory | 56 | 100 | 96 | 82 | 11415 | 13114 | 0 | 0.026 | 2041 |
| /agent | 56 | 100 | 96 | 82 | 11420 | 13122 | 0 | 0.026 | 2041 |
| /browser | 56 | 100 | 96 | 82 | 11418 | 13115 | 0 | 0.026 | 2041 |
| /ide | 56 | 100 | 96 | 82 | 11415 | 13414 | 0 | 0.026 | 2041 |

## Budget Compliance

| Route | Status | Details |
|---|---|---|
| / | ⚠️ | first-contentful-paint: 11901ms (budget 1500ms) ❌<br>largest-contentful-paint: 13088ms (budget 2500ms) ❌<br>interactive: 13088ms (budget 3500ms) ❌<br>total-blocking-time: 96ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11901ms (budget 2500ms) ❌ |
| /chat | ⚠️ | first-contentful-paint: 11413ms (budget 1500ms) ❌<br>largest-contentful-paint: 13111ms (budget 2500ms) ❌<br>interactive: 13111ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11413ms (budget 2500ms) ❌ |
| /canvas | ⚠️ | first-contentful-paint: 11415ms (budget 1500ms) ❌<br>largest-contentful-paint: 13413ms (budget 2500ms) ❌<br>interactive: 13413ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11415ms (budget 2500ms) ❌ |
| /terminal | ⚠️ | first-contentful-paint: 11419ms (budget 1500ms) ❌<br>largest-contentful-paint: 13118ms (budget 2500ms) ❌<br>interactive: 13118ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11419ms (budget 2500ms) ❌ |
| /settings | ⚠️ | first-contentful-paint: 11415ms (budget 1500ms) ❌<br>largest-contentful-paint: 13415ms (budget 2500ms) ❌<br>interactive: 13415ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11415ms (budget 2500ms) ❌ |
| /memory | ⚠️ | first-contentful-paint: 11415ms (budget 1500ms) ❌<br>largest-contentful-paint: 13114ms (budget 2500ms) ❌<br>interactive: 13114ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11415ms (budget 2500ms) ❌ |
| /agent | ⚠️ | first-contentful-paint: 11420ms (budget 1500ms) ❌<br>largest-contentful-paint: 13122ms (budget 2500ms) ❌<br>interactive: 13122ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11420ms (budget 2500ms) ❌ |
| /browser | ⚠️ | first-contentful-paint: 11418ms (budget 1500ms) ❌<br>largest-contentful-paint: 13115ms (budget 2500ms) ❌<br>interactive: 13115ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11418ms (budget 2500ms) ❌ |
| /ide | ⚠️ | first-contentful-paint: 11415ms (budget 1500ms) ❌<br>largest-contentful-paint: 13414ms (budget 2500ms) ❌<br>interactive: 13414ms (budget 3500ms) ❌<br>total-blocking-time: 0ms (budget 200ms) ✅<br>cumulative-layout-shift: 0ms (budget 0.1ms) ✅<br>speed-index: 11415ms (budget 2500ms) ❌ |

## Notes

- This baseline uses a static SPA server against the production Vite build.
- The Browser and Terminal views may report lower scores due to heavy third-party/webview initialization; optimize only after confirming with runtime telemetry.
- Re-run this audit after each phase to detect regressions.
