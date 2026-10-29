import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const primary = ['dist/index.html', 'dist/read.html', 'dist/read/index.html', 'dist/player.html', 'dist/player/index.html'];
const origin = 'https://competition.maritime.sh';

test('all primary routes open the approved reading page with no video runtime or preload', () => {
  for (const file of primary) {
    const html = read(file);
    assert.match(html, /<main id="x-reading-view" class="x-reading-view" aria-label="Program information"(?: tabindex="0")?>/);
    assert.doesNotMatch(html, /journey-data|player-loader\.js|x-player-shell\.js|modulepreload|<video|<canvas/);
    assert.match(html, /We believe always on agents are the next big thing\. We want you to build the next unicorn\./);
    assert.match(html, /reach 1,000 users in six weeks\./);
    assert.match(html, /full access to Keiki, \$1,000 in Maritime credits/);
    assert.match(html, /first three qualifying projects earn/);
    assert.match(html, /up to \$20,000 in AI credits and a three-day trip to San Francisco/);
    assert.doesNotMatch(html, /Sponsored flights|Marvin|Noah|Tomo/);
    assert.match(html, /\/shared\/application\.js/);
    assert.equal((html.match(/data-application-open/g) || []).length, 2);
    assert.match(html, /href="sms:\+16287264285"/);
    assert.match(html, /href="\/terms"/);
  }
  assert.equal(read('dist/index.html'), read('dist/read.html'));
  assert.equal(read('dist/read.html'), read('dist/read/index.html'));
  assert.equal(read('dist/player.html'), read('dist/player/index.html'));
});

test('only the X routes load the bounded scrolling layout, after the normal reading styles', () => {
  for (const file of primary) {
    const html = read(file);
    const embedded = file.includes('/player');
    assert.equal(html.includes('/read/player.css'), embedded, file);
    if (embedded) {
      assert(html.indexOf('/read/player.css') > html.indexOf('/read/reading.css'));
      assert.match(html, /aria-label="Program information" tabindex="0"/);
    }
    assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
  }
});

test('the X content owns a viewport-bounded scroll area while the standalone page retains document scrolling', () => {
  // Check the emitted stylesheet cascade, rather than assuming that visible content
  // or the presence of card metadata makes the iframe scrollable.
  const declarations = (css, selector) => {
    const result = {};
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = rule[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().split(',').map(s => s.trim());
      if (!selectors.includes(selector)) continue;
      for (const declaration of rule[2].split(';')) {
        const colon = declaration.indexOf(':');
        if (colon < 0) continue;
        const key = declaration.slice(0, colon).trim(), value = declaration.slice(colon + 1).trim();
        result[key] = value;
        if (key === 'overflow') result['overflow-x'] = result['overflow-y'] = value;
      }
    }
    return result;
  };
  const standaloneCSS = read('dist/shared/x-player-shell.css') + '\n' + read('dist/read/reading.css');
  const cardCSS = standaloneCSS + '\n' + read('dist/read/player.css');
  const page = declarations(standaloneCSS, '.x-reading-view');
  const card = declarations(cardCSS, '.x-reading-view');
  assert.equal(page.position, 'relative');
  assert.equal(page['overflow-y'], 'visible');
  assert.equal(card.position, 'fixed');
  assert.equal(card.inset, '0');
  assert.equal(card.height, '100%');
  assert.equal(card['min-height'], '0');
  assert.equal(card['overflow-y'], 'auto');
  assert.equal(card['touch-action'], 'pan-y');
  assert.equal(card['-webkit-overflow-scrolling'], 'touch');
  for (const selector of ['html', 'body']) {
    const outer = declarations(read('dist/read/player.css'), selector);
    assert.equal(outer.height, '100%');
    assert.equal(outer.overflow, 'hidden');
  }
  assert.equal(declarations(read('dist/read/player.css'), 'body:has(.application-dialog[open]) .x-reading-view')['overflow-y'], 'hidden');
});

test('the primary social cards embed the reading player and each page links to its secondary video', () => {
  for (const file of primary) {
    const html = read(file);
    const player = html.match(/name="twitter:player" content="([^"]+)"/)[1];
    assert.equal(new URL(player).pathname, '/player');
    assert.match(html, /name="twitter:card" content="player"/);
    assert.match(html, /name="twitter:player:width" content="800"/);
    assert.match(html, /name="twitter:player:height" content="600"/);
    const embedded = file.includes('/player');
    assert(html.includes(`href="${embedded ? '/video/player' : '/video'}" data-secondary-video`));
    assert(html.includes(`rel="canonical" href="${origin}${embedded ? '/player' : '/'}"`));
  }
});

test('program end is exactly six weeks after October 20, and every reading view has the confirmed dates', () => {
  const start = Date.UTC(2026, 9, 20);
  const end = Date.UTC(2026, 11, 1);
  assert.equal((end - start) / (24 * 60 * 60 * 1000), 42);
  for (const file of [...primary, 'scripts/x-reading-view.html']) {
    const html = read(file);
    for (const date of ['2026-10-13', '2026-10-20', '2026-12-01']) assert(html.includes(`datetime="${date}"`));
    assert.doesNotMatch(html, /To be announced/);
  }
});

test('secondary video HTML preserves the previous experiences outside metadata, URL resolution, and reading copy', () => {
  const baseline = JSON.parse(read('verification/video-route-baseline.json'));
  for (const [file, sha] of Object.entries(baseline.routes)) {
    const html = read(file);
    const normalized = html.replace(/<base[^>]*>/g, '')
      .replaceAll('data-config="/config.json', 'data-config="./config.json')
      .replace(/(<link rel="canonical" href=")[^"]+/g, '$1ROUTE')
      .replace(/(<meta property="og:url" content=")[^"]+/g, '$1ROUTE')
      .replace(/(<meta name="twitter:player" content=")[^"]+/g, '$1PLAYER')
      .replace(/<section id="x-reading-view"[\s\S]*?(?=<nav aria-label="Chapters">)/g, 'READING_VIEW');
    assert.equal(crypto.createHash('sha256').update(normalized).digest('hex'), sha, file);
    assert.match(html, /<base href="\/">/);
    assert.match(html, /data-config="\/config.json/);
    const embedded = file.includes('/player');
    assert.match(html, embedded ? /data-player="embed"/ : /data-player="native"/);
    assert(html.includes(`rel="canonical" href="${origin}${embedded ? '/video/player' : '/video'}"`));
    assert(html.includes(`name="twitter:player" content="${origin}/video/player?`));
    // Both pretty URLs and trailing-slash routes must resolve the config at root.
    for (const route of embedded ? ['/video/player', '/video/player/'] : ['/video', '/video/']) {
      const config = html.match(/data-config="([^"]+)"/)[1];
      assert.equal(new URL(config, origin + route).pathname, '/config.json');
    }
  }
});

test('terms use the approved name, user target, dates and access while retaining flight limits', () => {
  const terms = read('dist/terms.html');
  assert.equal(terms, read('dist/terms/index.html'));
  assert.match(terms, /1,000 distinct users/);
  assert.match(terms, /starts October 20, 2026 and ends December 1, 2026/);
  assert.match(terms, /full access to Keiki, \$1,000 in Maritime credits/);
  assert.match(terms, /Sponsored flights are limited to people in the United States/);
  assert.doesNotMatch(terms, /1,000 distinct agents|dates are not yet published/);
});
