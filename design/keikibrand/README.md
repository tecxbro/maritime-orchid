# Keiki brand variant

Separate route: `/keikibrand`. The existing home, X player, and reading routes are unchanged.

The supplied `Pasted text(20261015-065658).txt` brand guide defines this page: white canvas, #142653 navy text, #0742a0 actions, Geist Variable reading text, Inter Variable controls, original brand artwork, and a five-pixel desktop frame. Gold appears only for text selection. Body copy, program dates, and terms are retained from the reading page.

## Assets

- `dist/keikibrand/assets/keiki-mark-navy.svg`: exact transparent SVG from https://onkeiki.com/design/keiki-mark-navy.svg, unmodified.
- Maritime: existing `/assets/logo-maritime.png`, unmodified, displayed proportionally on black.
- Boat: original https://onkeiki.com/landing/boat.png retained as `boat-original.png`. The public WebP delivery copy keeps the original dimensions and full composition. No generated artwork was added.
- Geist / Inter variable Latin webfonts: downloaded from the official Fontsource packages via jsDelivr, self-hosted under the new route. `geist-source.json` and `inter-source.json` record pinned package versions; license files are retained here.

## Behavior

Native scrolling. The white header stays visible to keep Apply available. Apply opens the existing application dialog using the unchanged `/shared/application-config.js` and `/shared/application.js`. The new page supplies its own dialog CSS; it does not load or modify existing application styling. Terms opens `/terms`. Try the video opens `/player`. The form's SMS alternative and submission endpoint are retained. No live test application is submitted.

## Implementation and verification

`dist/keikibrand/index.html` and `dist/keikibrand.html` are identical entry points with absolute asset URLs. `dist/keikibrand/brand.css` is loaded only by these entry points. The new page does not load player code or media. Mobile rules cover native stacking, safe areas, at least 44px-equivalent touch targets, and 16px-equivalent form input text.

Verify asset existence, font validity, HTML structure, links, shared application behavior, and unchanged tracked files before deployment. Browser/physical-phone visual QA is not available in this session.
