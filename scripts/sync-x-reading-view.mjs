import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const fragment = fs.readFileSync(new URL('scripts/x-reading-view.html', root), 'utf8').trim();
for (const file of ['dist/video/player.html', 'dist/video/player/index.html']) {
  const path = new URL(file, root);
  let html = fs.readFileSync(path, 'utf8');
  const start = html.indexOf('<section id="x-reading-view"');
  const end = html.indexOf('<nav aria-label="Chapters">', start);
  if (start < 0 || end < 0) throw new Error(`Reading view boundaries missing: ${file}`);
  html = html.slice(0, start) + fragment + html.slice(end);
  html = html.replace(/x-player-shell\.css\?v=[^"\s]+/g, 'x-player-shell.css?v=20261015-reading22');
  fs.writeFileSync(path, html);
}
