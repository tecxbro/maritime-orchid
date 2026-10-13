/* Premium classic adapter; generated with asserted source anchors. */
(async()=>{
// Blob chunk lifecycle. No native master URL or Range dependency.
class MediaFailure extends Error {
  constructor(kind, message, cause) { super(message, {cause}); this.name = 'MediaFailure'; this.kind = kind; }
}
const aborted = () => new DOMException('Aborted', 'AbortError');
function deadline(task, ms, signal, failure, onTimeout = () => {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolve(value);
    };
    const cancel = () => finish(aborted());
    const timer = setTimeout(() => { finish(failure); onTimeout(); }, ms);
    signal?.addEventListener('abort', cancel, {once:true});
    if (signal?.aborted) cancel();
    Promise.resolve(task).then(value => finish(null, value), error => finish(error));
  });
}
// Opaque-sandbox transport: bounded classic scripts, then original MP4 bytes in Blob.
class ChunkCache {
  constructor(chunks, base, {onProgress=()=>{}, onTransfer=()=>{}, totalMs=30000}={}) {
    Object.assign(this,{chunks,base,onProgress,onTransfer,totalMs});
    this.entries=new Map(); this.allowed=new Set(); this.waiting=new Map();
    this.deliver=(key,data,script)=>this.waiting.get(key)?.(data,script);
    globalThis.__ascentPremiumChunkData=this.deliver;
  }
  retain(indices) {
    this.allowed=new Set(indices.filter(i=>i>=0&&i<this.chunks.length));
    for(const [index,entry] of this.entries)if(!this.allowed.has(index)){
      entry.cancel?.();this.entries.delete(index);
    }
  }
  get(index) {
    if(this.entries.has(index))return this.entries.get(index).promise;
    if(!this.allowed.has(index))return Promise.reject(aborted());
    const chunk=this.chunks[index],url=new URL(chunk.src,this.base);
    const match=url.pathname.match(/\/profiles\/(landscape|portrait)\/chunks\/([a-z0-9-]+)\.mp4$/);
    if(!match)return Promise.reject(new MediaFailure('network','Invalid profile chunk path.'));
    const [,profile,name]=match,build=url.searchParams.get('v');
    const key=`${build}/${profile}/${name}`,entry={bytes:0,blob:null,cancel:null};
    this.entries.set(index,entry);
    entry.promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');let timer,settled=false;
      const clean=()=>{clearTimeout(timer);if(this.waiting.get(key)===receive)this.waiting.delete(key);script.remove();entry.cancel=null;script.onerror=null;script.onload=null;};
      const fail=error=>{if(settled)return;settled=true;clean();if(this.entries.get(index)===entry)this.entries.delete(index);reject(error);};
      const receive=(data,sender)=>{
        // A removed or timed-out older script must not satisfy a new request.
        if(settled||sender!==script||!this.allowed.has(index)||this.entries.get(index)!==entry)return;
        try{
          if(typeof data!=='string'||data.length!==4*Math.ceil(chunk.bytes/3))throw Error('Invalid media payload size.');
          const raw=atob(data);if(raw.length!==chunk.bytes)throw Error('Incomplete media chunk.');
          const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
          entry.bytes=bytes.length;entry.blob=new Blob([bytes],{type:'video/mp4'});
          this.onTransfer(entry.bytes);this.onProgress(index,entry.bytes,chunk.bytes);
          settled=true;clean();resolve(entry.blob);
        }catch(error){fail(new MediaFailure('network',error.message,error));}
      };
      entry.cancel=()=>fail(aborted());this.waiting.set(key,receive);
      this.onProgress(index,0,chunk.bytes);
      script.onerror=()=>fail(new MediaFailure('network','Could not load video chunk.'));
      script.onload=()=>{if(!settled)fail(new MediaFailure('network','Video script did not provide its chunk.'));};
      script.src=new URL(`../../embed-media/${profile}/${name}.js?v=${encodeURIComponent(build)}`,this.base).href;
      script.async=true;
      timer=setTimeout(()=>fail(new MediaFailure('network','Video chunk timed out.')),this.totalMs);
      document.head.append(script);
    });
    return entry.promise;
  }
  get bytes(){return [...this.entries.values()].reduce((sum,entry)=>sum+entry.bytes,0);}
  clear(){this.retain([]);}
}
function mediaEvent(video, events, predicate, signal, ms, error) {
  let cleanup = ()=>{};
  const task = new Promise((resolve,reject)=>{
    const check = ()=>{ if (video.error) failed(); else if (predicate()) resolve(); };
    const failed = ()=>reject(new MediaFailure('decode', `Video decoder failed${video.error?.code ? ` (${video.error.code})` : ''}.`));
    cleanup = ()=>{ for (const event of events) video.removeEventListener(event,check); video.removeEventListener('error',failed); };
    for (const event of events) video.addEventListener(event,check);
    video.addEventListener('error',failed); check();
  });
  return deadline(task,ms,signal,error).finally(cleanup);
}
class ChunkDecoder {
  constructor(layer, {fps, frameCount, timeoutMs=4000, activationMs=1800, fallbackMs=16, createVideo=()=>document.createElement('video'), onPresentation=()=>{}}) {
    Object.assign(this,{fps,frameCount,timeoutMs,activationMs,fallbackMs,onPresentation});
    this.video = createVideo(); this.disposed = false; this.serial = 0; this.activationSerial = 0; this.seekController = null; this.activation = null;
    const v=this.video; v.muted=true; v.defaultMuted=true; v.playsInline=true; v.preload='auto';
    v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
    v.setAttribute('aria-hidden','true'); v.tabIndex=-1; v.className='chunk-decoder';
    // Safari must see a mounted native element before load/activation begins.
    layer.append(v);
  }
  activate({force=false}={}) {
    if (this.disposed) return Promise.reject(aborted());
    if (this.activation && !force) return this.activation;
    this.activationController?.abort(); this.activationController=new AbortController();
    const token=++this.activationSerial, v=this.video;
    let attempt;
    try { attempt=v.play(); } catch(error) { attempt=Promise.reject(error); }
    this.activation = deadline(attempt,this.activationMs,this.activationController.signal,new MediaFailure('activation','Tap to enable video.')).then(()=>{
      if (!this.disposed && token===this.activationSerial) v.pause();
      return true;
    },error=>{
      if (!this.disposed && token===this.activationSerial) v.pause();
      if(error.name==='AbortError') throw error;
      if (error.name==='NotAllowedError' || error.kind==='activation') return false;
      throw new MediaFailure('decode','Video activation failed.',error);
    }).finally(()=>{ if(token===this.activationSerial) this.activation=null; });
    // A play promise may resolve after the deadline; it must not start runaway playback.
    Promise.resolve(attempt).then(()=>{if(this.disposed || token===this.activationSerial) v.pause();},()=>{});
    return this.activation;
  }
  async load(blob, signal) {
    const v=this.video;
    this.url=URL.createObjectURL(blob);
    // Keep one error guard installed across metadata, play activation, and first data.
    // Individual readiness listeners may settle before activation has completed.
    let fail;
    const decoderError=new Promise((resolve,reject)=>{
      fail=()=>reject(new MediaFailure('decode',`Video decoder failed${v.error?.code ? ` (${v.error.code})` : ''}.`));
      v.addEventListener('error',fail);
    });
    try {
      const metadata=mediaEvent(v,['loadedmetadata','durationchange'],()=>v.readyState>=1 && Number.isFinite(v.duration) && v.duration>0,signal,this.timeoutMs,new MediaFailure('decode','Video metadata timed out.'));
      v.src=this.url; v.load();
      const activation=this.activate();
      const [,enabled]=await Promise.race([Promise.all([metadata,activation]),decoderError]);
      if (this.disposed || signal.aborted) throw aborted();
      if (v.error) throw new MediaFailure('decode',`Video decoder failed (${v.error.code}).`);
      if (v.readyState<2) {
        await Promise.race([mediaEvent(v,['loadeddata','canplay','seeked'],()=>v.readyState>=2,signal,this.timeoutMs,new MediaFailure(enabled?'decode':'activation',enabled?'No decoded video frame arrived.':'Tap to enable video.')),decoderError]);
      }
      v.pause();
    } catch(error) {
      this.activationController?.abort(); v.pause(); throw error;
    } finally {
      v.removeEventListener('error',fail);
    }
  }
  cancelSeek() { this.serial++; this.seekController?.abort(); this.seekController=null; }
  seek(frame, draw, outerSignal) {
    if (!Number.isFinite(frame)) return Promise.reject(new MediaFailure('decode','Invalid video frame.'));
    frame=Math.round(Math.max(0,Math.min(this.frameCount-1,frame)));
    // Controller keeps only one native seek in flight; caller queues newest target.
    if (this.seekController) return Promise.reject(new MediaFailure('decode','Concurrent seek refused.'));
    const v=this.video, token=++this.serial, controller=new AbortController(); this.seekController=controller;
    const signal=controller.signal, abort=()=>controller.abort(); outerSignal?.addEventListener('abort',abort,{once:true});
    if (outerSignal?.aborted) abort();
    const target=Math.min((frame+.25)/this.fps,Math.max(0,v.duration-.001));
    let callback, fallbackTimer, watchdog, seekObserved=false, settled=false;
    return new Promise((resolve,reject)=>{
      const cleanup=()=>{
        clearTimeout(fallbackTimer); clearTimeout(watchdog);
        if(callback!==undefined) v.cancelVideoFrameCallback?.(callback);
        v.removeEventListener('seeked',seeked); v.removeEventListener('error',failed); signal.removeEventListener('abort',cancel);
        outerSignal?.removeEventListener('abort',abort);
        if(this.seekController===controller) this.seekController=null;
      };
      const finish=(error,value)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve(value);};
      const valid=()=>!settled && !this.disposed && token===this.serial && !signal.aborted;
      const decoded=()=>v.readyState>=2 && !v.seeking && v.videoWidth>0 && v.videoHeight>0;
      const commit=(time,method)=>{
        if (!valid() || !decoded()) return false;
        const actual=Math.max(0,Math.min(this.frameCount-1,Math.round(time*this.fps)));
        if(actual!==frame) return false;
        try { draw(v,actual,method); } catch(error) { finish(new MediaFailure('decode','Could not present the decoded video frame.',error)); return true; }
        try { this.onPresentation({frame:actual,method}); } catch(error) { finish(new MediaFailure('decode','Presentation observer failed.',error)); return true; }
        finish(null,{frame:actual,method}); return true;
      };
      const fallback=()=>{
        // seeked + current decoded data + successful canvas draw is the fallback evidence.
        // currentTime alone is never counted as a displayed frame.
        if(seekObserved && decoded() && Math.abs(v.currentTime-target)<.6/this.fps) {
          if(commit(Math.floor(v.currentTime*this.fps)/this.fps,'seeked-canvas')) return;
        }
        if(valid()) fallbackTimer=setTimeout(fallback,this.fallbackMs);
      };
      const seeked=()=>{seekObserved=true;clearTimeout(fallbackTimer);fallbackTimer=setTimeout(fallback,this.fallbackMs);};
      const failed=()=>finish(new MediaFailure('decode','Video decoder failed during seek.'));
      const cancel=()=>finish(aborted());
      v.addEventListener('seeked',seeked); v.addEventListener('error',failed); signal.addEventListener('abort',cancel,{once:true});
      watchdog=setTimeout(()=>finish(new MediaFailure('decode','Decoded frame presentation timed out.')),this.timeoutMs);
      if(signal.aborted || this.disposed){cancel();return;}
      if(v.requestVideoFrameCallback) {
        const watch=()=>{callback=v.requestVideoFrameCallback((now,metadata)=>{if(!valid())return;if(!commit(metadata.mediaTime,'video-frame-callback'))watch();});}; watch();
      }
      try {
        if(Math.abs(v.currentTime-target)<.1/this.fps && decoded()) seeked();
        else v.currentTime=target;
      } catch(error) { finish(new MediaFailure('decode','Video seek failed.',error)); }
    });
  }
  dispose() {
    if(this.disposed)return;
    this.disposed=true; this.cancelSeek(); this.activationSerial++; this.activationController?.abort();
    const v=this.video; v.pause(); v.removeAttribute('src'); v.load(); v.remove();
    if(this.url) URL.revokeObjectURL(this.url);
  }
}

/** Premium profile boundary. No media fetches, timeline synthesis, or resize listeners. */
const STORY_BEATS = Object.freeze([
  ['cover', 'The First 1,000'], ['personal', 'Personal.'], ['business', 'Business.'],
  ['thousand-users', '1,000 users.'], ['six-weeks', '6 weeks.'],
  ['san-francisco', '3 days in San Francisco.'],
].map(([id, headline]) => Object.freeze({id, headline})));
const SOURCE_DIMENSIONS = Object.freeze({
  landscape: Object.freeze([1916, 1080]), portrait: Object.freeze([1080, 1916]),
});
const selectedDocuments = new WeakMap();
const PORTRAIT_MEDIA = '(max-width:700px) and (orientation:portrait)';
const cueKeys = ['startFrame', 'captionStartFrame', 'readStartFrame', 'readEndFrame', 'captionEndFrame', 'endFrame'];
const requireValue = (condition, message) => { if (!condition) throw new TypeError(message); };
const positive = value => Number.isFinite(value) && value > 0;
const integer = value => Number.isSafeInteger(value) && value > 0;
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

/** Initial viewport classification, intentionally not device/UA detection. */
function selectInitialProfile({viewportWidth, viewportHeight} = {}) {
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
function prepareProfile(bundle, {viewportWidth, viewportHeight, configURL} = {}) {
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
function createPosterMarkup(bundle, {configURL} = {}) {
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
function bootstrapProfile(document, options) {
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

// Native, keyboard-accessible program information. The cinematic timeline is untouched.
function bindProgramDetails(doc = document) {
  const dialog = doc.querySelector('#program-details');
  const openers = [...doc.querySelectorAll('[data-program-details]')];
  if (!dialog || !openers.length) return null;
  let opener = null;
  const open = event => {
    opener = event.currentTarget;
    if (!dialog.open) dialog.showModal();
  };
  const close = () => dialog.close();
  openers.forEach(button => button.addEventListener('click', open));
  dialog.querySelector('[data-close-details]').addEventListener('click', close);
  // Keep Home/End/arrow keys inside the dialog rather than seeking the movie behind it.
  dialog.addEventListener('keydown', event => event.stopPropagation());
  dialog.addEventListener('close', () => opener?.focus({preventScroll: true}));
  return { dialog, openers };
}
if (typeof document !== 'undefined') bindProgramDetails(document);

// First1000 progressive2 lifecycle repair. Media remains independent Blob chunks.


/* BEGIN shared chunk buffer */
// Bounded look-ahead shared by the native page and the classic X player.
// One displayed decoder plus one prepared decoder; at most four cached chunks.
class ChunkBuffer {
  constructor({cache, createDecoder, isSuspended, saveData=false}) {
    Object.assign(this,{cache,createDecoder,isSuspended,saveData});
    this.spare=null;this.failedWarm=-1;this.windowKey='';this.failedPrefetch=new Set();
    this.stats={prepared:0,reused:0,cancelled:0};
  }
  retain(index,direction=1) {
    direction=direction<0?-1:1;
    const key=`${index}/${direction}`;
    if(key!==this.windowKey){this.windowKey=key;this.failedWarm=-1;this.failedPrefetch.clear();}
    const ahead=index+direction;
    if(this.spare&&this.spare.index!==ahead)this.cancelSpare();
    this.cache.retain(this.saveData?[index,index-1,index+1]:[index,index-direction,ahead,index+2*direction]);
  }
  prefetch(index,direction=1) {
    if(this.saveData||this.isSuspended())return;
    direction=direction<0?-1:1;this.retain(index,direction);
    const windowKey=this.windowKey;
    for(const target of [index+direction,index+2*direction]){
      if(this.cache.allowed.has(target)&&!this.failedPrefetch.has(target))this.cache.get(target).catch(()=>{
        if(this.windowKey===windowKey)this.failedPrefetch.add(target);
      });
    }
    const target=index+direction;
    if(!this.cache.allowed.has(target)||this.spare?.index===target||this.failedWarm===target)return;
    this.cancelSpare();
    const controller=new AbortController();
    const slot={index:target,controller,decoder:null,claimed:false,ready:false};
    slot.cancel=()=>{controller.abort();slot.decoder?.dispose();};
    this.spare=slot;
    const valid=()=>!controller.signal.aborted&&!this.isSuspended()&&(slot.claimed||this.spare===slot);
    slot.promise=(async()=>{
      try{
        const blob=await this.cache.get(target);
        if(!valid())throw new DOMException('Aborted','AbortError');
        slot.decoder=this.createDecoder(target);
        await slot.decoder.load(blob,controller.signal);
        if(!valid())throw new DOMException('Aborted','AbortError');
        await slot.decoder.seek(0,()=>{},controller.signal);
        if(!valid())throw new DOMException('Aborted','AbortError');
        slot.ready=true;this.stats.prepared++;
        return {decoder:slot.decoder,blob};
      }catch(error){
        slot.decoder?.dispose();
        if(this.spare===slot){this.spare=null;this.failedWarm=target;}
        throw error;
      }
    })();
    // Speculative failure never prevents using the page or retrying on demand.
    slot.promise.catch(()=>{});
  }
  take(index) {
    const slot=this.spare;
    if(!slot||slot.index!==index){this.cancelSpare();return null;}
    this.spare=null;slot.claimed=true;
    return slot;
  }
  cancelSpare() {
    if(!this.spare)return;
    const slot=this.spare;this.spare=null;this.stats.cancelled++;slot.cancel();
  }
  suspend(index) {
    this.cancelSpare();this.cache.retain(index<0?[]:[index]);
  }
}
/* END shared chunk buffer */
const HEADLINES=['The First 1,000','personal or business.','1,000 users.','6 weeks.','3 days in San Francisco.'];
const SIX_BEAT_HEADLINES=['The First 1,000','Personal.','Business.','1,000 users.','6 weeks.','3 days in San Francisco.'];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
function validateManifest(m){
  if(!m?.media||!Number.isFinite(m.media.fps)||m.media.fps<=0||!Number.isInteger(m.media.frameCount)||m.media.frameCount<5)throw Error('Invalid master media metadata');
  if(typeof m.media.src!=='string'||!Array.isArray(m.scenes)||![5,6].includes(m.scenes.length))throw Error('A master and five or six approved scenes are required');
  const expected=m.scenes.length===6?SIX_BEAT_HEADLINES:HEADLINES;
  let end=0;
  m.scenes.forEach((s,i)=>{
    for(const key of ['startFrame','endFrame','readStartFrame','readEndFrame'])if(!Number.isInteger(s[key]))throw Error('Scene frame ranges must be integers');
    if(s.startFrame!==end||s.endFrame<=s.startFrame||s.readStartFrame<s.startFrame||s.readEndFrame<=s.readStartFrame||s.readEndFrame>s.endFrame)throw Error('Invalid or non-contiguous scene mapping');
    if(s.headline!==expected[i])throw Error('Headline differs from the approved text');
    if(s.captionStartFrame!==undefined&&(!Number.isInteger(s.captionStartFrame)||s.captionStartFrame<s.startFrame||s.captionStartFrame>s.readStartFrame))throw Error('Invalid caption arrival frame');
    if(s.captionEndFrame!==undefined&&(!Number.isInteger(s.captionEndFrame)||s.captionEndFrame<s.readEndFrame||s.captionEndFrame>s.endFrame))throw Error('Invalid caption departure frame');
    end=s.endFrame;
  });
  if(end!==m.media.frameCount)throw Error('Scene mapping does not cover the complete master');
  return m;
}
function buildScrollMap(m,weights={enter:1,read:3,exit:1}){
  const segments=[];let total=0;
  const chapterWeights=weights.scenes||m.scenes.map(()=>1);
  if(!Array.isArray(chapterWeights)||chapterWeights.length!==m.scenes.length||chapterWeights.some(w=>!Number.isFinite(w)||w<=0))throw Error('Positive scroll weights must match every scene');
  for(const [index,s] of m.scenes.entries()){
    for(const [from,to,phase] of [[s.startFrame,s.readStartFrame,'enter'],[s.readStartFrame,s.readEndFrame,'read'],[s.readEndFrame,s.endFrame,'exit']]){
      if(to===from)continue;
      const weight=Number(weights[phase])*chapterWeights[index]*(weights.frameWeighted?to-from:1);if(!Number.isFinite(weight)||weight<=0)throw Error('Scroll weights must be positive');
      segments.push({from,to,start:total,end:total+weight});total+=weight;
    }
  }
  return {segments,total,lastFrame:m.media.frameCount-1};
}
function frameAtProgress(p,map){
  const x=clamp(p)*map.total,s=map.segments.find(s=>x<=s.end)||map.segments.at(-1);
  return clamp(Math.round(s.from+(s.to-s.from)*clamp((x-s.start)/(s.end-s.start))),0,map.lastFrame);
}
function progressAtFrame(frame,map){
  const s=map.segments.find(s=>frame<=s.to)||map.segments.at(-1);
  return clamp((s.start+(s.end-s.start)*(s.to===s.from?0:clamp((frame-s.from)/(s.to-s.from))))/map.total);
}
function sceneAtFrame(frame,m){return Math.max(0,m.scenes.findIndex(s=>frame>=s.startFrame&&frame<s.endFrame));}
function captionOpacity(frame,scene,index){
  if(index===0&&scene.captionEndFrame===undefined)return 1;
  const arrival=scene.captionStartFrame??scene.startFrame;
  const departure=scene.captionEndFrame??scene.endFrame;
  const enter=Math.max(1,scene.readStartFrame-arrival),exit=Math.max(1,departure-scene.readEndFrame);
  return Math.min(index===0?1:clamp((frame-arrival)/enter),index===4?1:clamp((departure-1-frame)/exit));
}
function validateChunks(index,manifest){
  if(index.fps!==manifest.media.fps||index.totalFrames!==manifest.media.frameCount)throw Error('Chunk timeline differs from master');
  for(const rendition of Object.values(index.renditions||{})){
    let end=0;
    if(!rendition.chunks?.length)throw Error('Missing media chunks');
    rendition.chunks.forEach((c,i)=>{
      if(c.index!==i||c.startFrame!==end||!Number.isInteger(c.endFrame)||c.endFrame<=end||c.frameCount!==c.endFrame-c.startFrame||typeof c.src!=='string'||!c.src||!Number.isSafeInteger(c.bytes)||c.bytes<=0)throw Error('Invalid chunk boundaries');
      end=c.endFrame;
    });
    if(end!==index.totalFrames)throw Error('Incomplete chunk timeline');
  }
  if(!index.renditions.desktop||!index.renditions.mobile)throw Error('Two media qualities required');
  return index;
}
function chunkAtFrame(chunks,frame){
  const index=chunks.findIndex(c=>frame>=c.startFrame&&frame<c.endFrame);
  if(index<0)throw Error('Frame outside chunk timeline');return index;
}
// Reading beats are independent of immutable media/chunk boundaries.
function validateReadingBeats(ui,m){
  if(!ui)return null;
  const expected=SIX_BEAT_HEADLINES;
  if(ui.version!==1||!Array.isArray(ui.beats)||ui.beats.length!==expected.length)throw Error('Six reading beats are required');
  let end=0;
  ui.beats.forEach((beat,i)=>{
    for(const key of ['startFrame','endFrame','captionStartFrame','readStartFrame','readEndFrame','captionEndFrame'])if(!Number.isInteger(beat[key]))throw Error('Reading beat cues must use integer frames');
    if(beat.headline!==expected[i]||beat.startFrame!==end||beat.endFrame<=beat.startFrame||beat.captionStartFrame<beat.startFrame||beat.readStartFrame<beat.captionStartFrame||beat.readEndFrame<=beat.readStartFrame||beat.captionEndFrame<beat.readEndFrame||beat.captionEndFrame>beat.endFrame)throw Error('Invalid reading beat mapping');
    if(!['dark','light'].includes(beat.tone))throw Error('Invalid reading beat tone');
    end=beat.endFrame;
  });
  if(end!==m.media.frameCount)throw Error('Reading beats must cover the complete master');
  return ui.beats;
}
function readingBeatAtFrame(frame,beats){return Math.max(0,beats.findIndex(b=>frame>=b.startFrame&&frame<b.endFrame));}
function readingBeatOpacity(frame,beat){
  const enter=beat.readStartFrame===beat.captionStartFrame?1:clamp((frame-beat.captionStartFrame)/(beat.readStartFrame-beat.captionStartFrame));
  const exit=beat.holdAtEnd?1:clamp((beat.captionEndFrame-frame)/Math.max(1,beat.captionEndFrame-beat.readEndFrame));
  return Math.min(enter,exit);
}
const track=document.querySelector('#track'),mediaLayer=document.querySelector('#media'),canvas=document.querySelector('#film'),context=canvas.getContext('2d',{alpha:false}),poster=document.querySelector('#poster');
const articles=[...document.querySelectorAll('.scene')],buttons=[...document.querySelectorAll('nav [data-go]')],status=document.querySelector('#media-status');
const viewportProbe=document.createElement('div');viewportProbe.setAttribute('aria-hidden','true');viewportProbe.style.cssText='position:fixed;top:0;left:0;width:1px;height:100svh;visibility:hidden;pointer-events:none';document.body.append(viewportProbe);
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:700px)'),configURL=new URL(document.querySelector('script[data-config]').dataset.config,location.href);
const retry=document.createElement('button');retry.id='media-retry';retry.type='button';retry.hidden=true;status.after(retry);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
let readingBeats=null,activeBeat=0;
let config,manifest,map,chunks,cache,buffer,decoder,pendingDecoder,currentIndex=-1,pendingIndex=-1,pendingController,loadSerial=0;
let raf=0,viewportHeight=0,visibleHeight=innerHeight,wasReduced=reduced.matches,progress=0,active=0,requestedFrame=0,displayedFrame=0,videoBusy=false,mode='loading',firstFrameMs=null,totalBytes=0,firstFrameBytes=0,loadCount=0,seekCount=0,decodedFrames=0,lastRequested=0,direction=1,hasScrolled=false;
let failedIndex=-1,blockedDecoder=null,recoveryAttempts=0,presentationMethod=null,suspended=document.hidden;
const attempts=new Map(),errors=[],latencies=[],transfers=[];let quality='desktop';
const diagnostics=()=>({mode,quality,requestedFrame,displayedFrame,readingBeat:readingBeats?.[activeBeat]?.id??null,decodedMediaTime:displayedFrame/(manifest?.media.fps||24),totalFrames:manifest?.media.frameCount||0,sourceFps:manifest?.media.fps||null,activeChunk:currentIndex,pendingChunk:pendingIndex,chunkCount:chunks?.length||0,cacheEntries:cache?.entries.size||0,warmChunk:buffer?.spare?.index??-1,warmReady:buffer?.spare?.ready??false,bufferStats:buffer?{...buffer.stats}:null,cacheBytes:cache?.bytes||0,totalReadBytes:totalBytes,networkTransferBytes:performance.getEntriesByType('resource').filter(e=>/embed-media\/.*\.js/.test(e.name)).reduce((n,e)=>n+e.transferSize,0),firstContentfulPaintMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,firstFrameBytes,firstFrameMs,loadCount,seekCount,decodedFrames,activeVideoCount:mediaLayer.querySelectorAll('video').length,seekLatenciesMs:latencies.slice(-64),transfers:transfers.slice(-8),errors:[...errors],presentationMethod,recoveryAttempts,videoBusy,suspended,resourceTimings:performance.getEntriesByType('resource').filter(e=>/embed-media\/.*\.js/.test(e.name)).slice(-8).map(e=>({url:e.name.split('/').at(-1),durationMs:Math.round(e.duration),transferSize:e.transferSize,encodedBodySize:e.encodedBodySize}))});
Object.defineProperty(window,'__journeyDiagnostics',{get:diagnostics});
function announce(text){status.textContent=text;status.hidden=!text;}
function schedule(){if(!raf&&!suspended&&!document.hidden)raf=requestAnimationFrame(render);}
function clearFailure(){failedIndex=-1;retry.hidden=true;if(blockedDecoder){blockedDecoder.dispose();blockedDecoder=null;}}
function failure(error,index,recover){
  errors.push(`${error.kind||'configuration'}: ${error.message}`);if(errors.length>64)errors.shift();
  videoBusy=false;
  // Exactly one automatic decoder restart per target chunk until a successful presentation.
  const count=attempts.get(index)||0;
  if(error.kind==='decode' && count<1 && !suspended){attempts.set(index,count+1);recoveryAttempts++;recover();return;}
  failedIndex=index;mode=firstFrameMs===null?'unavailable':'video';
  retry.textContent=error.kind==='activation'?'Tap to enable video':'Retry video';retry.hidden=false;
  announce(error.kind==='network'?'Video download paused. Try again.':error.kind==='activation'?'Tap to enable video.':'Video could not be decoded. Try again.');
}
function drawFrame(current,index,local,method){
  if(suspended||document.hidden)throw new DOMException('Aborted','AbortError');
  if(canvas.width!==current.videoWidth||canvas.height!==current.videoHeight){canvas.width=current.videoWidth;canvas.height=current.videoHeight;}
  context.drawImage(current,0,0,canvas.width,canvas.height);
  canvas.hidden=false;poster.hidden=true;displayedFrame=chunks[index].startFrame+local;decodedFrames++;presentationMethod=method;
  if(firstFrameMs===null){firstFrameMs=performance.now();firstFrameBytes=totalBytes;}
  mode='video';renderText(displayedFrame);
}
function canPresent(index,frame){
  if(chunkAtFrame(chunks,requestedFrame)!==index)return false;
  if(frame===requestedFrame)return true;
  // Present completed work while travelling toward the latest target, but never
  // paint beyond it or take a stale step against a just-reversed direction.
  return requestedFrame>displayedFrame
    ? frame>displayedFrame&&frame<=requestedFrame
    : frame<displayedFrame&&frame>=requestedFrame;
}
function recordLatency(started){latencies.push(performance.now()-started);if(latencies.length>64)latencies.shift();}
async function requestSeek(){
  if(!decoder||videoBusy||pendingIndex>=0||failedIndex===currentIndex||chunkAtFrame(chunks,requestedFrame)!==currentIndex||displayedFrame===requestedFrame)return;
  const current=decoder,index=currentIndex,frame=requestedFrame,started=performance.now();videoBusy=true;seekCount++;
  try{
    await current.seek(frame-chunks[index].startFrame,(v,local,method)=>{
      if(decoder!==current||pendingIndex>=0||chunkAtFrame(chunks,requestedFrame)!==index)throw new DOMException('Superseded','AbortError');
      if(canPresent(index,chunks[index].startFrame+local))drawFrame(v,index,local,method);
    });
    if(decoder!==current)return;attempts.delete(index);recordLatency(started);
  }catch(error){
    if(error.name==='AbortError'||error.cause?.name==='AbortError'||decoder!==current||suspended)return;
    failure(error,index,()=>{currentIndex=-1;switchChunk(index);});
  }finally{if(decoder===current){videoBusy=false;if(!suspended&&!document.hidden)requestSeek();schedule();}}
}
function prefetch(index,serial){
  if(serial!==loadSerial||pendingIndex>=0||suspended||reduced.matches)return;
  buffer.prefetch(index,direction);
}
async function switchChunk(index){
  if(index===pendingIndex||failedIndex===index||suspended)return;
  const serial=++loadSerial;pendingController?.abort();pendingDecoder?.dispose();pendingDecoder=null;decoder?.cancelSeek();videoBusy=false;
  pendingController=new AbortController();const signal=pendingController.signal;
  const warm=buffer.take(index),cancelWarm=()=>warm?.cancel();
  signal.addEventListener('abort',cancelWarm,{once:true});
  pendingIndex=index;buffer.retain(index,direction);announce('');
  let next;
  try{
    const started=performance.now();let blob;
    if(warm){
      try{({decoder:next,blob}=await warm.promise);buffer.stats.reused++;}
      catch(error){if(signal.aborted)throw error;warm.cancel();next=null;}
    }
    if(serial!==loadSerial||signal.aborted)return;
    if(!next){
      blob=await cache.get(index);if(serial!==loadSerial||signal.aborted)return;
      next=new ChunkDecoder(mediaLayer,{fps:manifest.media.fps,frameCount:chunks[index].frameCount});pendingDecoder=next;
      await next.load(blob,signal);
    }else pendingDecoder=next;
    if(serial!==loadSerial||signal.aborted)return;
    const frame=requestedFrame;
    await next.seek(frame-chunks[index].startFrame,(v,local,method)=>{
      if(serial!==loadSerial||signal.aborted||chunkAtFrame(chunks,requestedFrame)!==index)throw new DOMException('Superseded','AbortError');
      if(canPresent(index,chunks[index].startFrame+local))drawFrame(v,index,local,method);
    },signal);
    if(serial!==loadSerial||signal.aborted)return;
    decoder?.dispose();decoder=next;pendingDecoder=null;next=null;currentIndex=index;pendingIndex=-1;loadCount++;videoBusy=false;
    attempts.delete(index);failedIndex=-1;retry.hidden=true;
    transfers.push({chunk:index,readyMs:Math.round(performance.now()-started),bytes:blob.size,warm:!!warm});announce('');schedule();prefetch(index,serial);
  }catch(error){
    if(error.name==='AbortError'||error.cause?.name==='AbortError'||serial!==loadSerial||suspended)return;
    pendingIndex=-1;pendingDecoder=null;
    if(error.kind==='activation'){blockedDecoder?.dispose();blockedDecoder=next;next=null;}
    failure(error,index,()=>{schedule();});
  }finally{signal.removeEventListener('abort',cancelWarm);next?.dispose();if(serial===loadSerial)pendingDecoder=null;}
}
function renderText(frame){
  active=sceneAtFrame(frame,manifest);mediaLayer.style.backgroundColor=config.sceneSkies?.[active]||config.sky||'#285571';
  activeBeat=readingBeats?readingBeatAtFrame(frame,readingBeats):active;
  const beat=readingBeats?.[activeBeat]?.id||String(active);if(mediaLayer.dataset.beat!==beat)mediaLayer.dataset.beat=beat;
  articles.forEach((article,i)=>{
    const selected=i===activeBeat;
    const opacity=selected?(readingBeats?readingBeatOpacity(frame,readingBeats[i]):captionOpacity(frame,manifest.scenes[i],i)):0;
    article.classList.toggle('active',selected);article.inert=!selected||opacity===0;
    article.setAttribute('aria-hidden',String(!selected||opacity===0));
    article.querySelector('.copy').style.opacity=opacity;buttons[i].toggleAttribute('aria-current',selected);if(selected)buttons[i].setAttribute('aria-current','step');
  });
  const final=document.querySelector('#final-sms'),lastScene=manifest.scenes.length-1,ready=config.finalApply!==false&&(active===lastScene&&frame>=manifest.scenes[lastScene].readStartFrame);final.hidden=!ready;final.inert=!ready;
}
function render(){
  raf=0;if(!manifest||!map||!chunks||suspended)return;
  if(reduced.matches){const steps=embedSteps();requestedFrame=embedReducedIndex===steps.length-1?manifest.media.frameCount-1:steps[embedReducedIndex].readStartFrame;}
  else{progress=clamp(embedOffset/embedSpan());requestedFrame=frameAtProgress(progress,map);}
  if(requestedFrame!==lastRequested){direction=requestedFrame>lastRequested?1:-1;hasScrolled=true;lastRequested=requestedFrame;}
  const index=chunkAtFrame(chunks,requestedFrame);
  if(failedIndex>=0&&failedIndex!==index)clearFailure();
  if(index!==currentIndex){if(index!==pendingIndex)switchChunk(index);}else{
    if(pendingIndex>=0){loadSerial++;pendingController?.abort();pendingDecoder?.dispose();pendingDecoder=null;pendingIndex=-1;buffer.retain(index,direction);announce('');}
    requestSeek();prefetch(index,loadSerial);
  }
  renderText(displayedFrame);
}
// Card playhead is internal. Host/page scroll never drives the movie.
let embedOffset=0,embedReducedIndex=0,embedInputLocks=0,embedDrag=null;
const embedSteps=()=>readingBeats||manifest?.scenes||[];
const embedSpan=()=>viewportHeight*(reduced.matches?Math.max(0,embedSteps().length-1):config.scrollHeight-1);
const embedInteractiveSelector='a,button,input,textarea,select,summary,[contenteditable],form,dialog,[role="dialog"],[data-embed-interactive]';
function embedInputBlocked(target){
  return embedInputLocks>0||!!target?.closest?.(embedInteractiveSelector)||[...document.querySelectorAll('dialog[open],[role="dialog"]')].some(node=>!node.hidden&&node.getAttribute('aria-hidden')!=='true'&&(node.tagName!=='DIALOG'||node.open));
}
function moveEmbed(delta){
  if(!config||suspended||!Number.isFinite(delta))return;
  embedOffset=clamp(embedOffset+delta,0,embedSpan());
  if(reduced.matches){embedReducedIndex=clamp(Math.round(embedOffset/viewportHeight),0,embedSteps().length-1);requestedFrame=embedReducedIndex===embedSteps().length-1?manifest.media.frameCount-1:embedSteps()[embedReducedIndex].readStartFrame;}
  else{progress=clamp(embedOffset/embedSpan());requestedFrame=frameAtProgress(progress,map);}
  schedule();
}
function embedViewport(){
  return {width:innerWidth,height:innerHeight};
}
function resize(){
  if(!config)return;
  const nextHeight=embedViewport().height;
  const initialized=viewportHeight>0,modeChanged=wasReduced!==reduced.matches;
  const targetProgress=(!wasReduced&&progress>=1-1e-8)||requestedFrame===manifest.media.frameCount-1?1:progressAtFrame(requestedFrame,map);
  if(initialized&&modeChanged)embedReducedIndex=readingBeats?readingBeatAtFrame(requestedFrame,readingBeats):sceneAtFrame(requestedFrame,manifest);
  viewportHeight=nextHeight;visibleHeight=innerHeight;wasReduced=reduced.matches;
  document.documentElement.classList.toggle('reduced',reduced.matches);
  track.style.height=`${viewportHeight}px`;track.style.paddingBottom='0px';
  embedOffset=reduced.matches?embedReducedIndex*viewportHeight:targetProgress*embedSpan();
  schedule();
}
function go(index){
  if(!manifest)return;
  const steps=embedSteps(),last=steps.length-1;index=clamp(index,0,last);
  const target=index===last?manifest.media.frameCount-1:steps[index].readStartFrame;
  requestedFrame=target;progress=index===last?1:progressAtFrame(target,map);embedReducedIndex=index;
  embedOffset=reduced.matches?index*viewportHeight:progress*embedSpan();schedule();
}
addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||embedInputBlocked(event.target))return;
  event.preventDefault();moveEmbed(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?viewportHeight:1));
},{passive:false});
track.addEventListener('pointerdown',event=>{
  if(event.button!==0||embedInputBlocked(event.target))return;
  embedDrag={id:event.pointerId,y:event.clientY};track.setPointerCapture(event.pointerId);event.preventDefault();
});
track.addEventListener('pointermove',event=>{
  if(!embedDrag||embedDrag.id!==event.pointerId)return;
  if(embedInputBlocked(event.target)){embedDrag=null;return;}
  const delta=embedDrag.y-event.clientY;embedDrag.y=event.clientY;moveEmbed(delta*2);event.preventDefault();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])track.addEventListener(name,event=>{if(embedDrag?.id===event.pointerId)embedDrag=null;});
addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||embedInputBlocked(event.target))return;
  const current=readingBeats?activeBeat:active,last=embedSteps().length-1;
  const targets={Home:0,End:last,ArrowRight:current+1,ArrowLeft:current-1};
  if(event.key in targets){event.preventDefault();go(targets[event.key]);return;}
  const delta={ArrowDown:80,ArrowUp:-80,PageDown:viewportHeight,PageUp:-viewportHeight,' ':event.shiftKey?-viewportHeight:viewportHeight}[event.key];
  if(delta!==undefined){event.preventDefault();moveEmbed(delta);}
});
document.querySelector('#embed-next')?.addEventListener('click',()=>{if(!embedInputLocks)go((readingBeats?activeBeat:active)+1);});
document.querySelector('#embed-prev')?.addEventListener('click',()=>{if(!embedInputLocks)go((readingBeats?activeBeat:active)-1);});
// Synchronous, explicit integration hook. No application data, fake success, or backend.
let embedApplicationHandler=null;
window.AscentPremiumEmbed=Object.freeze({
  version:'20261013-premium-embed1',
  registerApplicationHandler(handler){
    if(typeof handler!=='function')throw new TypeError('Application handler must be a function.');
    embedApplicationHandler=handler;
    return ()=>{if(embedApplicationHandler===handler)embedApplicationHandler=null;};
  },
  acquireInputLock(){
    embedInputLocks++;embedDrag=null;let released=false;
    return ()=>{if(!released){released=true;embedInputLocks--;}};
  },
  getState(){return {profile:document.documentElement.dataset.profile,requestedFrame,displayedFrame,readingBeat:readingBeats?.[activeBeat]?.id??null};},
});
for(const link of document.querySelectorAll('a[href="sms:+16287264285"]'))link.addEventListener('click',event=>{
  const detail={...window.AscentPremiumEmbed.getState(),source:link.id||'program-details'};
  const request=new CustomEvent('ascent:apply',{detail,cancelable:true});
  window.dispatchEvent(request);
  let handled=request.defaultPrevented;
  if(!handled&&embedApplicationHandler){try{handled=embedApplicationHandler(detail,event)===true;}catch(error){console.error('Application integration did not open.',error);}}
  if(handled)event.preventDefault();
});
window.dispatchEvent(new CustomEvent('ascent:embed-ready',{detail:{api:window.AscentPremiumEmbed}}));
async function retryVideo(){
  if(!manifest||suspended||retry.disabled)return;
  buffer.cancelSpare();
  const index=chunkAtFrame(chunks,requestedFrame),blocked=blockedDecoder;
  // Synchronous play preserves gesture activation; token guards every later stage.
  const serial=++loadSerial;pendingController?.abort();pendingController=new AbortController();
  const signal=pendingController.signal,activation=blocked?.activate({force:true});retry.disabled=true;
  try{
    if(blocked){
      const enabled=await activation;
      if(serial!==loadSerial||blockedDecoder!==blocked||suspended||chunkAtFrame(chunks,requestedFrame)!==index)return;
      if(!enabled){announce('Tap to enable video.');return;}
      const frame=requestedFrame;
      await blocked.seek(frame-chunks[index].startFrame,(v,local,method)=>{
        if(serial!==loadSerial||signal.aborted||blockedDecoder!==blocked||chunkAtFrame(chunks,requestedFrame)!==index)throw new DOMException('Superseded','AbortError');
        if(canPresent(index,chunks[index].startFrame+local))drawFrame(v,index,local,method);
      },signal);
      if(serial!==loadSerial||suspended||blockedDecoder!==blocked)return;
      decoder?.dispose();decoder=blocked;blockedDecoder=null;currentIndex=index;pendingIndex=-1;loadCount++;
    }else if(decoder&&currentIndex===index){decoder.dispose();decoder=null;currentIndex=-1;}
    clearFailure();attempts.delete(index);announce('');schedule();
  }catch(error){if(serial===loadSerial&&!suspended&&error.name!=='AbortError'&&error.cause?.name!=='AbortError')failure(error,index,()=>{clearFailure();currentIndex=-1;schedule();});}
  finally{retry.disabled=false;schedule();}
}
retry.addEventListener('click',retryVideo);
// A failed activation can also be retried by the next ordinary pointer gesture.
addEventListener('pointerdown',event=>{if(blockedDecoder&&!retry.contains(event.target)&&!retry.disabled&&!embedInputBlocked(event.target))retryVideo();},{passive:true});
buttons.forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.go))));
document.querySelector('[data-scroll-cue]')?.addEventListener('click',()=>go(1));
addEventListener('resize',resize,{passive:true});reduced.addEventListener('change',resize);
function suspend(){suspended=true;loadSerial++;pendingController?.abort();pendingDecoder?.dispose();pendingDecoder=null;pendingIndex=-1;decoder?.cancelSeek();decoder?.video.pause();videoBusy=false;buffer?.suspend(currentIndex);cancelAnimationFrame(raf);raf=0;}
function resume(){
  suspended=false;if(buffer&&currentIndex>=0)buffer.retain(currentIndex,direction);
  if(decoder){const current=decoder;videoBusy=true;current.activate().catch(()=>{}).finally(()=>{if(decoder===current){videoBusy=false;schedule();}});}
  else schedule();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});
addEventListener('pagehide',()=>{suspend();decoder?.dispose();decoder=null;blockedDecoder?.dispose();blockedDecoder=null;currentIndex=-1;cache?.clear();});
addEventListener('pageshow',event=>{if(event.persisted){clearFailure();resume();}});
try{
  const inline=bootstrapProfile(document,{viewportWidth:embedViewport().width,viewportHeight:embedViewport().height,configURL});
  config=inline.config;if(!Number.isFinite(config.scrollHeight)||config.scrollHeight<=1)throw Error('Invalid scroll limits');
  const manifestURL=new URL(config.desktopManifest,configURL);manifest=validateManifest(inline.manifest);map=buildScrollMap(manifest,config.scrollWeights);readingBeats=validateReadingBeats(config.uiTimeline,manifest);if(readingBeats&&articles.length!==readingBeats.length)throw Error('Reading beat markup differs from timeline');
  articles.forEach((article,i)=>{article.dataset.tone=readingBeats[i].tone;});
  const index=validateChunks(inline.chunkIndex,manifest);
  quality=mobile.matches||navigator.connection?.saveData?'mobile':'desktop';chunks=index.renditions[quality].chunks;
  cache=new ChunkCache(chunks,manifestURL,{onTransfer:bytes=>{totalBytes+=bytes;},onProgress:()=>{}});
  buffer=new ChunkBuffer({cache,createDecoder:index=>new ChunkDecoder(mediaLayer,{fps:manifest.media.fps,frameCount:chunks[index].frameCount}),isSuspended:()=>suspended||document.hidden,saveData:!!navigator.connection?.saveData});
  resize();schedule();
}catch(error){errors.push(error.message);mode='unavailable';announce('Video unavailable. You can still use the application form.');}
if(new URLSearchParams(location.search).has('qa')){const output=document.createElement('output');output.id='review-diagnostics';output.setAttribute('aria-label','Live video QA diagnostics');document.body.append(output);setInterval(()=>{output.textContent=JSON.stringify(diagnostics());},250);}

})();
