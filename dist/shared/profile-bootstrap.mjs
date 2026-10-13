/** Premium profile boundary. No media fetches, timeline synthesis, or resize listeners. */
export const STORY_BEATS = Object.freeze([
  ['cover', 'The First 1,000'], ['personal', 'Personal.'], ['business', 'Business.'],
  ['thousand-users', '1,000 users.'], ['six-weeks', '6 weeks.'],
  ['san-francisco', '3 days in San Francisco.'],
].map(([id, headline]) => Object.freeze({id, headline})));
export const SOURCE_DIMENSIONS = Object.freeze({
  landscape: Object.freeze([1916, 1080]), portrait: Object.freeze([1080, 1916]),
});
const selectedDocuments = new WeakMap();
export const PORTRAIT_MEDIA = '(max-width:700px) and (orientation:portrait)';
const cueKeys = ['startFrame', 'captionStartFrame', 'readStartFrame', 'readEndFrame', 'captionEndFrame', 'endFrame'];
const requireValue = (condition, message) => { if (!condition) throw new TypeError(message); };
const positive = value => Number.isFinite(value) && value > 0;
const integer = value => Number.isSafeInteger(value) && value > 0;
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

/** Initial viewport classification, intentionally not device/UA detection. */
export function selectInitialProfile({viewportWidth, viewportHeight} = {}) {
  requireValue(positive(viewportWidth) && positive(viewportHeight), 'Positive initial viewport dimensions required');
  // CSS orientation:portrait also includes a square viewport. Match the HTML picture.
  return viewportWidth <= 700 && viewportHeight >= viewportWidth ? 'portrait' : 'landscape';
}

function validateBeats(beats, frameCount, label) {
  requireValue(Array.isArray(beats) && beats.length === STORY_BEATS.length, `${label}: all six beats required`);
  let end = 0;
  beats.forEach((beat, index) => {
    const expected = STORY_BEATS[index];
    requireValue(beat.id === expected.id && beat.headline === expected.headline, `${label}: shared semantic beat mismatch`);
    requireValue(['dark', 'light'].includes(beat.tone), `${label}: tone required`);
    requireValue(cueKeys.every(key => Number.isSafeInteger(beat[key])), `${label}: exact integer frame/caption cues required`);
    const [start, captionStart, readStart, readEnd, captionEnd, finish] = cueKeys.map(key => beat[key]);
    requireValue(start === end && start <= captionStart && captionStart <= readStart && readStart < readEnd && readEnd <= captionEnd && captionEnd <= finish && finish <= frameCount, `${label}: incomplete or invalid beat timeline`);
    end = finish;
  });
  requireValue(end === frameCount, `${label}: beats must cover the entire independent route`);
}

function versionedURL(value, base, build, label, assetRoot) {
  requireValue(typeof value === 'string' && value.length > 0, `${label}: URL required`);
  const url = new URL(value, base);
  requireValue(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash, `${label}: invalid media URL`);
  requireValue(url.searchParams.getAll('v').length === 1 && url.searchParams.get('v') === build, `${label}: stale or unversioned URL`);
  if (assetRoot) requireValue(url.origin === assetRoot.origin && url.pathname.startsWith(assetRoot.pathname), `${label}: crosses selected profile media directory`);
  return url.href;
}

/** Snapshot only the approved, complete selected profile; other profile URLs never load. */
export function prepareProfile(bundle, {viewportWidth, viewportHeight, configURL} = {}) {
  requireValue(bundle?.schemaVersion === 1 && bundle.status === 'approved', 'Premium profile bundle is pending or invalid');
  requireValue(typeof bundle.build === 'string' && /^[a-zA-Z0-9._-]+$/.test(bundle.build), 'Immutable build identifier required');
  const id = selectInitialProfile({viewportWidth, viewportHeight});
  const candidate = bundle.profiles?.[id];
  requireValue(candidate?.status === 'approved' && candidate.audit?.status === 'approved', `${id} profile is incomplete or unapproved`);
  // Input is embedded JSON. Copy prevents later edits to the original bundle resetting this session.
  const {config, manifest, chunkIndex} = JSON.parse(JSON.stringify(candidate));
  requireValue(config && manifest?.media && chunkIndex, `${id}: inline config, manifest and chunk index required`);
  const {build} = bundle, media = manifest.media, [width, height] = SOURCE_DIMENSIONS[id];
  requireValue(config.build === build, `${id}: config/build mismatch`);
  requireValue(manifest.build === build && chunkIndex.build === build && [config, manifest, chunkIndex].every(value => value.profile === id), `${id}: stale or cross-profile embedded metadata`);
  requireValue(media.width === width && media.height === height, `${id}: actual ${width}x${height} native source dimensions required`);
  requireValue(positive(media.fps) && media.fps <= 240 && integer(media.frameCount), `${id}: invalid source timeline`);
  requireValue(positive(config.scrollHeight) && config.scrollHeight > 1, `${id}: scroll height required`);
  const weights = config.scrollWeights;
  requireValue(weights && ['enter', 'read', 'exit'].every(key => positive(weights[key])) && Array.isArray(weights.scenes) && weights.scenes.length === 6 && weights.scenes.every(positive), `${id}: six positive scroll weights required`);
  requireValue(weights.phaseByScene === undefined && (weights.frameWeighted === undefined || typeof weights.frameWeighted === 'boolean'), `${id}: unsupported scroll weighting contract`);
  requireValue(config.experiment && typeof config.experiment === 'object', `${id}: experiment metadata object required`);
  validateBeats(manifest.scenes, media.frameCount, `${id}/manifest`);
  requireValue(config.uiTimeline?.version === 1, `${id}: exact reading overlay required`);
  validateBeats(config.uiTimeline.beats, media.frameCount, `${id}/captions`);
  requireValue(manifest.scenes.every((scene, i) => ['id', 'headline', 'tone', ...cueKeys].every(key => scene[key] === config.uiTimeline.beats[i][key])), `${id}: media/caption maps differ`);
  const manifestURL = versionedURL(config.desktopManifest, configURL, build, `${id}/manifest`);
  const assetRoot = new URL('./', manifestURL);
  requireValue(assetRoot.pathname.endsWith(`/${id}/`), `${id}: use a profile-specific media directory ending /${id}/`);
  config.desktopManifest = manifestURL;
  for (const key of ['src', 'poster', 'chunkIndex']) media[key] = versionedURL(media[key], manifestURL, build, `${id}/${key}`, assetRoot);
  requireValue(chunkIndex.fps === media.fps && chunkIndex.totalFrames === media.frameCount, `${id}: chunk/source timeline mismatch`);
  requireValue(chunkIndex.renditions?.desktop && chunkIndex.renditions?.mobile, `${id}: both bounded media qualities required`);
  for (const [quality, rendition] of Object.entries(chunkIndex.renditions)) {
    requireValue(integer(rendition.width) && integer(rendition.height) && rendition.width * height === rendition.height * width, `${id}/${quality}: rendition must retain exact native aspect`);
    requireValue(Array.isArray(rendition.chunks) && rendition.chunks.length > 0, `${id}/${quality}: chunks required`);
    let end = 0;
    rendition.chunks.forEach((chunk, i) => {
      requireValue(chunk.index === i && chunk.startFrame === end && integer(chunk.endFrame) && chunk.endFrame > end && chunk.endFrame <= media.frameCount && chunk.frameCount === chunk.endFrame - end && integer(chunk.bytes), `${id}/${quality}: incomplete chunk timeline`);
      chunk.src = versionedURL(chunk.src, manifestURL, build, `${id}/${quality}/${i}`, assetRoot);
      end = chunk.endFrame;
    });
    requireValue(end === media.frameCount, `${id}/${quality}: chunks do not cover the independent route`);
  }
  return freeze({id, build, nativeWidth: width, nativeHeight: height, inline: {config, manifest, chunkIndex}});
}

function pictureProfiles(bundle, configURL) {
  return Object.fromEntries(['landscape', 'portrait'].map(id => [id,
    prepareProfile(bundle, {configURL, viewportWidth: id === 'portrait' ? 390 : 1440, viewportHeight: 844})]));
}

/** Build-time HTML only: refuses to present either route as ready until both validate. */
export function createPosterMarkup(bundle, {configURL} = {}) {
  const profiles = pictureProfiles(bundle, configURL);
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const directory = new URL('./', configURL);
  const poster = id => {
    const url = new URL(profiles[id].inline.manifest.media.poster);
    // The index and config share a directory. Keep same-directory assets portable
    // across local previews, published origins, and nested deployment prefixes.
    const portable = url.origin === directory.origin && url.pathname.startsWith(directory.pathname)
      ? `./${url.pathname.slice(directory.pathname.length)}${url.search}` : url.href;
    return escape(portable);
  };
  return `<picture id="profile-poster"><source media="${PORTRAIT_MEDIA}" srcset="${poster('portrait')}" width="1080" height="1916"><img id="poster" src="${poster('landscape')}" width="1916" height="1080" alt="" fetchpriority="high" decoding="async"></picture>`;
}

/** Call inside the existing player's init try-block, before reading its inline data. */
export function bootstrapProfile(document, options) {
  if (selectedDocuments.has(document)) return selectedDocuments.get(document).inline;
  const embedded = document.querySelector('#journey-data'), poster = document.querySelector('#poster');
  requireValue(embedded && poster, 'Premium bootstrap needs #journey-data and #poster');
  requireValue(!poster.getAttribute('srcset'), 'The poster img must not have a separate srcset');
  const bundle = JSON.parse(embedded.textContent), selection = prepareProfile(bundle, options);
  const picture = document.querySelector('#profile-poster');
  let sources = [];
  if (picture) {
    const profiles = pictureProfiles(bundle, options.configURL);
    sources = [...picture.querySelectorAll('source')];
    requireValue(picture.querySelector('#poster') === poster && sources.length === 1 && sources[0].getAttribute('media') === PORTRAIT_MEDIA, 'Initial picture must follow the selected-only poster markup contract');
    requireValue(new URL(poster.getAttribute('src'), options.configURL).href === profiles.landscape.inline.manifest.media.poster && new URL(sources[0].getAttribute('srcset'), options.configURL).href === profiles.portrait.inline.manifest.media.poster, 'Initial picture has stale or cross-profile poster URLs');
  } else {
    requireValue(!poster.getAttribute('src') && !document.querySelector('picture #poster'), 'Remove static poster sources or use createPosterMarkup');
  }
  // All validation completes before DOM state or a network-triggering image source is set.
  document.documentElement.dataset.profile = selection.id;
  document.documentElement.dataset.profileBuild = selection.build;
  document.documentElement.style.setProperty('--profile-native-aspect', `${selection.nativeWidth} / ${selection.nativeHeight}`);
  embedded.textContent = JSON.stringify(selection.inline);
  poster.width = selection.nativeWidth;
  poster.height = selection.nativeHeight;
  selectedDocuments.set(document, selection);
  // Set fallback first: removing the portrait source must not request landscape.
  poster.src = selection.inline.manifest.media.poster;
  sources.forEach(source => source.remove());
  return selection.inline;
}
