import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const template = fs.readFileSync(new URL('scripts/reading-page.html', root), 'utf8');
const routes = [
  { files: ['dist/index.html', 'dist/read.html', 'dist/read/index.html'], canonical: '/', video: '/video', robots: '', embed: false },
  { files: ['dist/player.html', 'dist/player/index.html'], canonical: '/player', video: '/video/player', robots: '<meta name="robots" content="noindex">', embed: true },
];
for (const route of routes) {
  const html = template.replaceAll('{{CANONICAL_PATH}}', route.canonical)
    .replaceAll('{{VIDEO_PATH}}', route.video).replace('{{ROBOTS}}', route.robots)
    .replace('{{PLAYER_STYLE}}', route.embed ? '<link rel="stylesheet" href="/read/player.css?v=20261015-scroll28">' : '')
    .replace('{{SCROLL_ATTRIBUTES}}', route.embed ? ' tabindex="0"' : '');
  for (const file of route.files) fs.writeFileSync(new URL(file, root), html);
}

// Keep the secondary video's manual/error reading view on the same approved copy.
const start = template.indexOf('  <main id="x-reading-view"');
const end = template.indexOf('</main>', start);
if (start < 0 || end < 0) throw new Error('Reading template boundaries missing.');
const fragment = (template.slice(start, end) + '</section>\n')
  .replace(/<main[^>]+>/, '<section id="x-reading-view" class="x-reading-view" data-embed-interactive aria-label="Program information" tabindex="-1" hidden>')
  .replace('</header>', '</header>\n    <p id="x-reading-notice" class="x-reading-notice" role="status" hidden></p>')
  .replace('<a href="{{VIDEO_PATH}}" data-secondary-video>Try the video</a>', '<button type="button" id="x-try-video">Try the video</button>')
  .trim() + '\n';
fs.writeFileSync(new URL('scripts/x-reading-view.html', root), fragment);
await import('./sync-x-reading-view.mjs');
