# Premium X Player · The First 1,000

Standalone export of the current Premium X player, including its application form and existing Google Sheets connection. The separate main website is not included.

## Run or deploy

This is a complete static site with no build step or package installation. Publish **`dist/` as the domain root** on an HTTPS static host. For a local preview: `python3 -m http.server 8080 --directory dist`.

- `/` serves the same player as `/player.html`.
- `/player/` is the directory-compatible player entry; hosts with clean URLs can serve `/player` directly.
- `/terms/` and `/terms.html` retain the program terms required by the application form.
- `dist/shared/` contains readable JavaScript, CSS, application logic, and runtime source.
- `dist/profiles/` contains both landscape and portrait films, MP4 chunks, posters, and manifests.
- `dist/embed-media/` contains all classic-script media payloads for X's sandboxed player.
- `backend/Code.gs` preserves the owner-connected Apps Script backend source. It is not executed by the static host.

The player uses root-relative paths; deploy at a domain root rather than a repository subfolder. Keep existing X metadata URLs when retaining the current domain. If using a new domain, update canonical, Open Graph, Twitter image, and Twitter player URLs to that public HTTPS domain. The current metadata intentionally preserves the existing live Premium origin. Hosting must permit embedding the player in X; do not set `X-Frame-Options: DENY` or a conflicting `frame-ancestors` policy.

## Google Sheets is already connected

The frontend retains this exact existing Apps Script endpoint:

`https://script.google.com/macros/s/AKfycbyX83d0VQB8VD9nX2MotoNviHZQpB4qoIzIF2c5hzgKhZF6w-yabnMwM0CYJ0MeTp9-sw/exec`

Applications continue to use that existing deployed Google backend. Deploying this static player does **not** require creating another spreadsheet, redeploying Apps Script, or repeating Google authorization, as long as the current deployment and its spreadsheet access remain active. Do not replace the endpoint or deploy `backend/Code.gs` merely to host this site elsewhere.

The preserved backend targets spreadsheet `10eAEVJrPAW3ZJgToFBFksUktO0aIaz8Pbygh0t2SWxQ`, tab `Applications`. It validates input, checks submission IDs, rate-limits submissions, and writes formula-safe cells. Its service-owner permissions and Google deployment settings remain managed in Google, outside this Git repository. This export contains no applicant records or Google credentials and does not change access permissions.

## Playback buffering

After showing the first frame, the player downloads the next two chunks and prepares one upcoming decoder. It keeps at most four chunks and two mounted video elements, follows scroll direction, cancels stale work on jumps, and disables speculation in data-saving mode. The video assets are unchanged. The classic player embeds the shared buffer so it works in X's opaque iframe without module imports or media fetches.

After editing `dist/shared/chunk-buffer.mjs`, run `node scripts/sync-chunk-buffer.mjs`. Check source parity with `node scripts/sync-chunk-buffer.mjs --check`.

## Verification and provenance

Run `node --test verification/*.test.mjs` with Node.js. Tests cover emitted poster/profile selection, player metadata, modeled chunk loading and reverse navigation, compact application form, and hashes for preserved media/runtime files. Modeled tests are not a physical Safari or X app acceptance test. No real application is submitted by these checks.

Source: published Premium version 10, commit `180959019a4141ce7f61b348c0f92c44c2de4ac6`. The player entry and every retained runtime/media file are copied byte-for-byte; `dist/index.html` is an additional copy of `dist/player.html`. `EXPORT-MANIFEST.json` inventories all exported files and checksums.

No `.gitignore` is present and no included player file is excluded by ignore rules. All player media are stored directly in Git; Git LFS and multipart reconstruction are not required. Historical full-site archives, the separate main page, diagnostic-only card page, and unrelated production intermediates are outside this player-only export.

