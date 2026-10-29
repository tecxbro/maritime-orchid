# The First 1,000

The competition website is published at **https://competition.maritime.sh**. The main page and X player open the approved read-only competition page, with the Apply form, Program Terms, and October 20–December 1, 2026 program dates.

Program partners: **Keiki × Maritime × supermemory × PumpGTM**. The opening Apply button sits directly below the program title. Participants get full Keiki access, $1,000 in Maritime credits, and access to supermemory and PumpGTM. The existing winning-project awards are retained. Both reading and video routes use the updated Program Terms, including the program-change provision. Social/work links are required, and the application presents the existing Slack and Discord invites after submission.\n\n## Run or deploy

This is a static site with no build step or package installation. Publish **`dist/` as the domain root** on an HTTPS static host. For a local preview, run `python3 -m http.server 8080 --directory dist`.

| Route | Experience |
| --- | --- |
| `/` | Primary read-only website with native document scrolling |
| `/read`, `/read/` | Aliases for the primary website |
| `/player`, `/player/` | Read-only X player with its own viewport-sized scroll region |
| `/video`, `/video/` | Secondary native video website |
| `/video/player`, `/video/player/` | Secondary video X player with manual/error reading fallback |
| `/terms`, `/terms/` | Program terms |
| `/keikibrand`, `/keikibrand/` | Separate Keiki brand design variant |

The corresponding `.html` routes are also included. The main reading pages do not load a video runtime or preload video media. Their “Try the video” links open the secondary video experience.

All public canonical, Open Graph, Twitter image, and Twitter player URLs use `competition.maritime.sh`. The Twitter player URL is `/player?v=20261015-scroll28`; it no longer points to the separate ChatGPT preview. Hosting must allow X to embed the player: do not set `X-Frame-Options: DENY` or a conflicting `frame-ancestors` policy.

The code and deployable output are in this repository. DNS currently points the public domain to Railway; the Railway service's repository/branch settings are managed outside this repository. The separate ChatGPT Sites preview does not automatically update this GitHub repository.

## Editing the reading page

Source copy lives in `scripts/reading-page.html`. Run `node scripts/sync-reading-pages.mjs` to generate the primary routes and synchronize the secondary X player's reading fallback. Styles shared with that fallback are in `dist/shared/x-player-shell.css`; standalone overrides are in `dist/read/reading.css`, and X-only scrolling overrides are in `dist/read/player.css`.

## Existing application backend

The frontend retains the existing Apps Script endpoint:

`https://script.google.com/macros/s/AKfycbyX83d0VQB8VD9nX2MotoNviHZQpB4qoIzIF2c5hzgKhZF6w-yabnMwM0CYJ0MeTp9-sw/exec`

Applications continue to use that deployed Google backend. Hosting this static site does not require another spreadsheet, Apps Script deployment, or Google authorization while the existing deployment and spreadsheet access remain active. `backend/Code.gs` is preserved from GitHub main and is not executed by the static host.

The backend targets spreadsheet `10eAEVJrPAW3ZJgToFBFksUktO0aIaz8Pbygh0t2SWxQ`, tab `Applications`. It validates input, checks submission IDs, rate-limits submissions, and writes formula-safe cells. Google permissions and deployment settings remain managed outside this repository.

## Secondary video playback

Desktop playback retains the existing `player.js` and `embed-runtime.js` files byte-for-byte. The loader selects separate phone runtimes for the approved chapter-swipe behavior. Phones present native video directly; desktop canvas presentation and all existing media assets remain unchanged.

After the first frame, playback downloads the next two chunks and prepares one upcoming decoder. It keeps at most four chunks and two mounted video elements, follows scroll direction, cancels stale work on jumps, and disables speculation in data-saving mode. The X runtime embeds the shared modules so it can run in an opaque iframe.

After editing the shared buffer or chapter-swipe module, run its matching `scripts/sync-*.mjs` script.

## Verification and provenance

Run:

```sh
node scripts/sync-chunk-buffer.mjs --check
node scripts/sync-chapter-swipe.mjs --check
node --test verification/*.test.mjs
```

Tests cover reading routes and copy, public metadata, X scroll styles, modeled video playback, desktop isolation, phone chapter navigation, application markup, fallback behavior, and preservation hashes. They do not establish physical Safari performance or acceptance inside the real X app. No real application is submitted by these checks.

Source: ChatGPT Sites version 30, commit `0b53cdf73c9849680dff0dd128a28fbe1ad04b59`, transferred onto GitHub main `725abc27b92d591e8bc25171da23e42417b055ed`. Deployment adaptations change public origins, route the brand variant's video link to `/video/player`, and update verification/documentation. `EXPORT-MANIFEST.json` records the exported files and checksums. ChatGPT hosting bindings and transient refinement receipts are excluded; the existing GitHub backend is retained.
