// MODELED DOM/video only. Executes the generated premium classic bundle and actual script payloads.
// Production player/lifecycle source executed unchanged except module syntax removal.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bootstrapProfile, selectInitialProfile} from '../dist/shared/profile-bootstrap.mjs';

// Both source files are executed unchanged except for module syntax removal.
// Point PLAYER_DIR at a separate candidate's dist/shared directory to run the same contract.
export const sourceDirectory = fileURLToPath(new URL('../dist/shared/', import.meta.url));
const playerSource = await fs.readFile(path.join(sourceDirectory, 'embed-runtime.js'), 'utf8');
const wrappers=new Map();
export const nativePayloads=new Map();
for(const profile of ['landscape','portrait'])for(const file of await fs.readdir(path.join(sourceDirectory,'../embed-media',profile))){
  const key=`embed-media/${profile}/${file}`;
  wrappers.set(key,await fs.readFile(path.join(sourceDirectory,'..',key),'utf8'));
  const nativePath=`profiles/${profile}/chunks/${file.replace('.js','.mp4')}`;
  nativePayloads.set(nativePath,await fs.readFile(path.join(sourceDirectory,'..',nativePath)));
}
const withoutExports=source=>source.replace(/^export /gm,'');
const nativeSource=(await Promise.all(['media-lifecycle.mjs','chunk-buffer.mjs','profile-bootstrap.mjs','player.js'].map(file=>fs.readFile(path.join(sourceDirectory,file),'utf8')))).map(source=>withoutExports(source).replace(/^import .*;\n/gm,'')).join('\n');
const helpers=playerSource.slice(playerSource.indexOf('const HEADLINES='),playerSource.indexOf('const track='));
const timeline=vm.runInNewContext(`(()=>{${helpers};return {HEADLINES,validateManifest,buildScrollMap,frameAtProgress,progressAtFrame,sceneAtFrame,captionOpacity,validateChunks,chunkAtFrame};})()`);


export const deferred = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
export async function settle(turns=5){for(let i=0;i<turns;i++)await new Promise(resolve=>setImmediate(resolve));}

export async function createPlayer({playerKind='embed',saveData=false,mobile=false,reduced=false,coarse=false,autoSeek=true,frameCallbacks=false,fetchChunk,decodeReady=true,height=1000,smallHeight=height,width=390,articleHeights=null,trackTop=0,roundScroll=false,manifestOverride,configOverride,bundleOverride,videoSetup,scriptSetup}={}) {
  const supplied = bundleOverride?.profiles[selectInitialProfile({viewportWidth:width,viewportHeight:height})];
  configOverride ??= supplied?.config; manifestOverride ??= supplied?.manifest;
  const reads=[],draws=[],videos=[],scrollRequests=[],callbacks=new Map(),timers=new Map(),windowEvents=new EventTarget();
  let counter=0,time=0,peakMountedVideos=0;
  const geometry={smallHeight,width,articleHeights,trackTop};let sandbox;const mediaQueries=[];
  class Element extends EventTarget {
    constructor(){super();this.style={setProperty(key,value){this[key]=value;}};this.dataset={};this.children=[];this.attributes=new Map();this.classList={values:new Set(),toggle(name,on){if(on)this.values.add(name);else this.values.delete(name);},contains(name){return this.values.has(name);}};this.hidden=false;this.tagName='DIV';this.offsetTop=0;this.textContent='';}
    getBoundingClientRect(){const h=this.style.cssText?.includes('height:100svh')?geometry.smallHeight:(this.offsetHeight||0);return {height:h,width:geometry.width,top:this.offsetTop-(sandbox?.scrollY||0),bottom:this.offsetTop-(sandbox?.scrollY||0)+h};}
    getAttribute(k){return this.attributes.get(k)??null;}
    setAttribute(k,v){this.attributes.set(k,v);}
    removeAttribute(k){this.attributes.delete(k);}
    toggleAttribute(k,v){if(v)this.setAttribute(k,'');else this.removeAttribute(k);}
    append(...children){this.children.push(...children);for(const child of children)child.parent=this;peakMountedVideos=Math.max(peakMountedVideos,this.children.filter(child=>child instanceof Video&&!child.removed).length);}
    after(child){this.afterElement=child;}
    contains(child){return child===this||this.children.includes(child);}
    querySelectorAll(selector){return selector==='video'?this.children.filter(child=>child instanceof Video&&!child.removed):[];}
    replaceChildren(...children){this.children=[...children];}
    querySelector(){return this.copy??=new Element();}
    remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
    closest(selector){return this.matchesSelector?.(selector)?this:this.parent?.closest(selector)??null;}
    setPointerCapture(id){this.pointerCapture=id;}
    focus(){document.activeElement=this;}
    showModal(){this.open=true;}
    close(){this.open=false;this.dispatchEvent(new Event('close'));}
  }
  class Video extends Element {
    constructor(){super();this.readyState=decodeReady?2:0;this.videoWidth=supplied?.chunkIndex.renditions[mobile||saveData?'mobile':'desktop'].width||1280;this.videoHeight=supplied?.chunkIndex.renditions[mobile||saveData?'mobile':'desktop'].height||720;this.duration=(supplied?.chunkIndex.renditions.desktop.chunks[0].frameCount||72)/(manifestOverride?.media.fps||24);this._currentTime=0;this.seeking=false;this.playCalls=0;this.pauseCalls=0;this.frameCallbacks=new Map();this.seekTargets=[];videos.push(this);if(frameCallbacks){this.requestVideoFrameCallback=fn=>{const id=++counter;this.frameCallbacks.set(id,fn);return id;};this.cancelVideoFrameCallback=id=>this.frameCallbacks.delete(id);}videoSetup?.(this,videos.length-1);}
    get currentTime(){return this._currentTime;}
    set currentTime(value){this.seeking=true;this._currentTime=value;this.seekTargets.push(value);if(autoSeek)queueMicrotask(()=>this.completeSeek());}
    completeSeek({present=true}={}){this.seeking=false;this.dispatchEvent(new Event('seeked'));if(present)for(const [id,fn] of [...this.frameCallbacks]){this.frameCallbacks.delete(id);fn(time,{mediaTime:Math.floor(this._currentTime*(manifestOverride?.media.fps||24))/(manifestOverride?.media.fps||24)});}}
    play(){this.playCalls++;return Promise.resolve();}
    pause(){this.pauseCalls++;}
    load(){queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')));}
  }
  const elements=Object.fromEntries(['track','media','film','poster','media-status','final-sms','experiment','embed-next','embed-prev','program-details','program-opener','sms'].map(id=>[id,new Element()]));
  elements.film.width=0;elements.film.height=0;elements.film.getContext=()=>({drawImage:video=>draws.push({video,time:video.currentTime,at:time})});
  const articles=Array.from({length:configOverride?.uiTimeline?.beats.length||5},()=>new Element()),buttons=Array.from({length:configOverride?.uiTimeline?.beats.length||5},(_,i)=>{const e=new Element();e.dataset.go=String(i);return e;});
  elements.track.offsetTop=trackTop;
  const isReduced=()=>document.documentElement.classList.contains('reduced');
  const panelHeight=i=>geometry.articleHeights?.[i]??geometry.smallHeight;
  articles.forEach((article,i)=>{Object.defineProperty(article,'offsetHeight',{get:()=>panelHeight(i)});Object.defineProperty(article,'offsetTop',{get:()=>isReduced()?articles.slice(0,i).reduce((h,_,j)=>h+panelHeight(j),0):0});});
  if(bundleOverride){elements['journey-data']=new Element();elements['journey-data'].textContent=JSON.stringify(bundleOverride);}
  const script=new Element();script.dataset.config='./config.json';
  const document=new Element();document.hidden=false;document.documentElement=new Element();document.body=new Element();document.head=new Element();
  document.querySelector=selector=>selector==='script[data-config]'?script:elements[selector.slice(1)];
  elements['program-details'].tagName='DIALOG';elements['program-details'].open=false;
  elements['program-details'].matchesSelector=s=>s.includes('dialog');
  elements['program-opener'].matchesSelector=s=>s.includes('button');
  for(const id of ['sms','final-sms']){elements[id].id=id;elements[id].matchesSelector=s=>s.includes('a,');}
  document.querySelectorAll=selector=>selector==='.scene'?articles:selector==='nav [data-go]'?buttons:selector==='[data-program-details]'?[elements['program-opener']]:selector==='dialog[open],[role="dialog"]'?(elements['program-details'].open?[elements['program-details']]:[]):selector==='a[href="sms:+16287264285"]'?[elements.sms,elements['final-sms']]:[];
  document.createElement=tag=>{const e=tag==='video'?new Video():new Element();e.tagName=tag.toUpperCase();return e;};
  const manifest=manifestOverride??{media:{fps:24,frameCount:360,src:'master.mp4',chunkIndex:'chunk-index.json'},scenes:timeline.HEADLINES.map((headline,i)=>({headline,startFrame:i*72,endFrame:(i+1)*72,readStartFrame:i*72+12,readEndFrame:i*72+60}))};
  const chunks=Array.from({length:Math.ceil(manifest.media.frameCount/72)},(_,i)=>({index:i,startFrame:i*72,endFrame:Math.min((i+1)*72,manifest.media.frameCount),frameCount:Math.min(72,manifest.media.frameCount-i*72),bytes:4,src:`chunks/${i}.mp4`}));
  const index={fps:24,totalFrames:manifest.media.frameCount,renditions:{desktop:{chunks},mobile:{chunks:structuredClone(chunks)}}};
  const config={desktopManifest:'media/manifest.json',scrollHeight:20,experiment:{},scrollWeights:{enter:1,read:3,exit:1},...configOverride};
  Object.defineProperty(document.documentElement,'scrollHeight',{get:()=>Math.round(geometry.trackTop+(isReduced()?articles.reduce((h,_,i)=>h+panelHeight(i),0)+(parseFloat(elements.track.style.paddingBottom)||0):(parseFloat(elements.track.style.height)||height*config.scrollHeight)))});
  Object.defineProperty(document.body,'scrollHeight',{get:()=>document.documentElement.scrollHeight});
  document.scrollingElement=document.documentElement;windowEvents.closest=()=>null;
  const fetcher=async(url,options={})=>{
    const versionedURL=String(url);url=versionedURL.split('?')[0];reads.push({url,versionedURL,signal:options.signal});
    if(url.endsWith('config.json'))return Response.json(config);
    if(url.endsWith('manifest.json'))return Response.json(manifest);
    if(url.endsWith('chunk-index.json'))return Response.json(index);
    const match=url.match(/chunks\/(?:desktop|mobile)-(\d+)\.mp4$/);
    if(!match)throw Error(`Unexpected fetch ${url}`);
    const nativePath=url.slice(url.indexOf('/profiles/')+1);
    return fetchChunk?fetchChunk(Number(match[1]),options,nativePath):new Response(nativePayloads.get(nativePath));
  };
  sandbox={...timeline,document,window:windowEvents,location:new URL('https://example.test/variant/'),navigator:{connection:{saveData}},innerHeight:height,innerWidth:width,scrollY:0,fetch:playerKind==='native'?fetcher:(...args)=>{throw Error('Opaque sandbox must not fetch: '+args[0]);},URL,URLSearchParams,AbortController,DOMException,Blob,Event,atob,Uint8Array,CustomEvent:class extends Event{constructor(type,opts={}){super(type,opts);this.detail=opts.detail;}},console,performance:{now:()=>time,getEntriesByType:()=>[],getEntriesByName:()=>[]},queueMicrotask,
    matchMedia:query=>{const mq=Object.assign(new EventTarget(),{media:query,matches:query.includes('max-width')?mobile:query.includes('pointer:coarse')?coarse:reduced});mediaQueries.push(mq);return mq;},
    addEventListener:(...args)=>windowEvents.addEventListener(...args),
    requestAnimationFrame:fn=>{const id=++counter;callbacks.set(id,fn);return id;},cancelAnimationFrame:id=>callbacks.delete(id),
    setTimeout:(fn,ms)=>{const id=++counter;timers.set(id,{fn,ms,due:time+ms});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++counter,
    scrollTo:({top})=>{scrollRequests.push(top);sandbox.scrollY=Math.max(0,Math.min(roundScroll?Math.floor(top):top,document.documentElement.scrollHeight-sandbox.innerHeight));},
  };
  const source=playerKind==='native'?nativeSource:playerSource.slice(playerSource.indexOf('(async()=>{')+'(async()=>{'.length,playerSource.lastIndexOf('})();'));
  const context=vm.createContext(sandbox);
  document.head.append=(script)=>{
    script.parent=document.head;document.head.children.push(script);
    reads.push({url:script.src,versionedURL:script.src,script});
    const deliver=()=>{if(script.removed)return;const pathname=new URL(script.src).pathname,key=pathname.slice(pathname.indexOf('embed-media/'));
      const wrapper=wrappers.get(key);if(!wrapper){script.onerror?.();return;}
      document.currentScript=script;try{vm.runInContext(wrapper,context);script.onload?.();}finally{document.currentScript=null;}
    };
    if(scriptSetup)scriptSetup(script,deliver,reads.length-1);else queueMicrotask(deliver);
  };
  const nativeCreate=URL.createObjectURL,nativeRevoke=URL.revokeObjectURL,blobs=new Map();
  class ModelURL extends URL{};
  ModelURL.createObjectURL=blob=>{const url=nativeCreate(blob);blobs.set(url,blob);return url;};
  ModelURL.revokeObjectURL=url=>{blobs.delete(url);nativeRevoke(url);};sandbox.URL=ModelURL;
  const originalLoad=Video.prototype.load;Video.prototype.load=function(){const blob=blobs.get(this.src);if(blob){const chunk=supplied.chunkIndex.renditions[mobile||saveData?'mobile':'desktop'].chunks.find(c=>c.bytes===blob.size);if(chunk)this.duration=chunk.frameCount/supplied.manifest.media.fps;}return originalLoad.call(this);};
  const api=await new vm.Script(`(async()=>{${source}\nreturn {moveEmbed:typeof moveEmbed==='undefined'?()=>{}:moveEmbed,getOffset(){return typeof embedOffset==='undefined'?0:embedOffset;},render,diagnostics,prefetch,switchChunk,requestSeek,go,getProgress(){return progress;},setRequestedFrame(frame){requestedFrame=frame;},setDirection(value){direction=value;hasScrolled=true;},getCache(){return cache;},getSerial(){return loadSerial;},retryVideo,getRetry(){return retry;},getDecoder(){return decoder;},getBlocked(){return blockedDecoder;},getPending(){return pendingDecoder;},getFailed(){return failedIndex;},getWarm(){return buffer?.spare;}};})()`,{filename:'actual-player.js'}).runInContext(context);
  async function advance(ms){
    const until=time+ms;let count=0;
    for(;;){
      const next=[...timers].filter(([,timer])=>timer.due<=until).sort((a,b)=>a[1].due-b[1].due)[0];
      if(!next)break;
      if(++count>10000)throw Error('Virtual timer loop');
      const [id,timer]=next;time=timer.due;timers.delete(id);timer.fn();await settle();
    }
    time=until;await settle();
  }
  const clampScroll=()=>{sandbox.scrollY=Math.max(0,Math.min(sandbox.scrollY,document.documentElement.scrollHeight-sandbox.innerHeight));};
  return {...api,geometry,mediaQueries,clampScroll,
    async changeViewport({height=sandbox.innerHeight,smallHeight=geometry.smallHeight,width=geometry.width,clampBeforeResize=false}={}){sandbox.innerHeight=height;sandbox.innerWidth=width;geometry.smallHeight=smallHeight;geometry.width=width;if(clampBeforeResize)clampScroll();windowEvents.dispatchEvent(new Event('resize'));clampScroll();await settle();},
    async changeReduced(value){const mq=mediaQueries.find(q=>q.media.includes('prefers-reduced-motion'));mq.matches=value;mq.dispatchEvent(new Event('change'));clampScroll();await settle();},
    async scroll(top){sandbox.scrollTo({top});windowEvents.dispatchEvent(new Event('scroll'));await settle();},
    blobs,context,elements,articles,buttons,reads,draws,videos,timers,manifest,chunks,scrollRequests,windowEvents,sandbox,advance,now:()=>time,peakMounted:()=>peakMountedVideos,
    async flushTimers(ms){for(const [id,timer] of [...timers]){if(timer.ms===ms){timers.delete(id);timer.fn();}}await settle();},
    async frame(ms=1000/60){await advance(ms);const pending=[...callbacks.values()];callbacks.clear();for(const callback of pending)callback(time);await settle();},
    async navigate(frame){const top=timeline.progressAtFrame(frame,timeline.buildScrollMap(manifest,config.scrollWeights))*geometry.smallHeight*(config.scrollHeight-1);if(playerKind==='native'){sandbox.scrollTo({top});windowEvents.dispatchEvent(new Event('scroll'));}else api.moveEmbed(top-api.getOffset());api.render();await settle();},
    async dispose(){windowEvents.dispatchEvent(new Event('pagehide'));await settle();},
  };
}
