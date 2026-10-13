// First1000 progressive2 lifecycle repair. Media remains independent Blob chunks.
import {ChunkCache,ChunkDecoder} from './media-lifecycle.mjs?v=20261013-scroll2';
import {bootstrapProfile} from './profile-bootstrap.mjs?v=20261013-premium-bootstrap1';
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
let config,manifest,map,chunks,cache,decoder,pendingDecoder,currentIndex=-1,pendingIndex=-1,pendingController,loadSerial=0;
let raf=0,viewportHeight=0,visibleHeight=innerHeight,wasReduced=reduced.matches,progress=0,active=0,requestedFrame=0,displayedFrame=0,videoBusy=false,mode='loading',firstFrameMs=null,totalBytes=0,firstFrameBytes=0,loadCount=0,seekCount=0,decodedFrames=0,lastRequested=0,direction=1,hasScrolled=false;
let failedIndex=-1,blockedDecoder=null,recoveryAttempts=0,presentationMethod=null,suspended=document.hidden;
const attempts=new Map(),errors=[],latencies=[],transfers=[];let quality='desktop';
const diagnostics=()=>({mode,quality,requestedFrame,displayedFrame,readingBeat:readingBeats?.[activeBeat]?.id??null,decodedMediaTime:displayedFrame/(manifest?.media.fps||24),totalFrames:manifest?.media.frameCount||0,sourceFps:manifest?.media.fps||null,activeChunk:currentIndex,pendingChunk:pendingIndex,chunkCount:chunks?.length||0,cacheEntries:cache?.entries.size||0,cacheBytes:cache?.bytes||0,totalReadBytes:totalBytes,networkTransferBytes:performance.getEntriesByType('resource').filter(e=>/chunks\/.*mp4/.test(e.name)).reduce((n,e)=>n+e.transferSize,0),firstContentfulPaintMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,firstFrameBytes,firstFrameMs,loadCount,seekCount,decodedFrames,activeVideoCount:mediaLayer.querySelectorAll('video').length,seekLatenciesMs:latencies.slice(-64),transfers:transfers.slice(-8),errors:[...errors],presentationMethod,recoveryAttempts,videoBusy,suspended,resourceTimings:performance.getEntriesByType('resource').filter(e=>/chunks\/.*mp4/.test(e.name)).slice(-8).map(e=>({url:e.name.split('/').at(-1),durationMs:Math.round(e.duration),transferSize:e.transferSize,encodedBodySize:e.encodedBodySize}))});
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
async function prefetch(index,serial){
  if(!hasScrolled||navigator.connection?.saveData||suspended)return;
  for(const neighbor of [index+direction,index-direction]){
    if(serial!==loadSerial||suspended)return;if(neighbor<0||neighbor>=chunks.length)continue;
    try{await cache.get(neighbor);}catch(error){if(error.name!=='AbortError')transfers.push({prefetch:neighbor,error:error.message});}
  }
}
async function switchChunk(index){
  if(index===pendingIndex||failedIndex===index||suspended)return;
  const serial=++loadSerial;pendingController?.abort();pendingDecoder?.dispose();pendingDecoder=null;decoder?.cancelSeek();videoBusy=false;
  pendingController=new AbortController();const signal=pendingController.signal;
  pendingIndex=index;cache.retain([index,index-1,index+1]);announce('');
  let next;
  try{
    const started=performance.now(),blob=await cache.get(index);if(serial!==loadSerial||signal.aborted)return;
    next=new ChunkDecoder(mediaLayer,{fps:manifest.media.fps,frameCount:chunks[index].frameCount});pendingDecoder=next;
    await next.load(blob,signal);
    if(serial!==loadSerial||signal.aborted)return;
    // Read newest target after startup, then drain any in-chunk scroll updates.
    const frame=requestedFrame;
    await next.seek(frame-chunks[index].startFrame,(v,local,method)=>{
      if(serial!==loadSerial||signal.aborted||chunkAtFrame(chunks,requestedFrame)!==index)throw new DOMException('Superseded','AbortError');
      if(canPresent(index,chunks[index].startFrame+local))drawFrame(v,index,local,method);
    },signal);
    if(serial!==loadSerial||signal.aborted)return;
    decoder?.dispose();decoder=next;pendingDecoder=null;next=null;currentIndex=index;pendingIndex=-1;loadCount++;videoBusy=false;
    attempts.delete(index);failedIndex=-1;retry.hidden=true;
    transfers.push({chunk:index,readyMs:Math.round(performance.now()-started),bytes:blob.size});announce('');schedule();prefetch(index,serial);
  }catch(error){
    if(error.name==='AbortError'||error.cause?.name==='AbortError'||serial!==loadSerial||suspended)return;
    pendingIndex=-1;pendingDecoder=null;
    if(error.kind==='activation'){blockedDecoder?.dispose();blockedDecoder=next;next=null;}
    failure(error,index,()=>{schedule();});
  }finally{next?.dispose();if(serial===loadSerial)pendingDecoder=null;}
}
function renderText(frame){
  active=sceneAtFrame(frame,manifest);mediaLayer.style.backgroundColor=config.sceneSkies?.[active]||config.sky||'#285571';
  activeBeat=readingBeats?readingBeatAtFrame(frame,readingBeats):active;
  const beat=readingBeats?.[activeBeat]?.id||String(active);if(mediaLayer.dataset.beat!==beat)mediaLayer.dataset.beat=beat;
  articles.forEach((article,i)=>{
    const selected=i===activeBeat;
    const opacity=selected?(readingBeats?readingBeatOpacity(frame,readingBeats[i]):captionOpacity(frame,manifest.scenes[i],i)):0;
    article.classList.toggle('active',selected);article.inert=(!selected||opacity===0)&&!reduced.matches;
    if(reduced.matches)article.removeAttribute('aria-hidden');else article.setAttribute('aria-hidden',String(!selected||opacity===0));
    article.querySelector('.copy').style.opacity=opacity;buttons[i].toggleAttribute('aria-current',selected);if(selected)buttons[i].setAttribute('aria-current','step');
  });
  const final=document.querySelector('#final-sms'),lastScene=manifest.scenes.length-1,ready=config.finalApply!==false&&(reduced.matches||active===lastScene&&frame>=manifest.scenes[lastScene].readStartFrame);final.hidden=!ready;final.inert=!ready;
}
function render(){
  raf=0;if(!manifest||!map||!chunks||suspended)return;
  if(reduced.matches){const steps=readingBeats||manifest.scenes;const center=scrollY-track.offsetTop+Math.min(innerHeight,viewportHeight)/2;let chapter=0;articles.forEach((article,i)=>{if(article.offsetTop<=center)chapter=i;});requestedFrame=steps[clamp(chapter,0,steps.length-1)].readStartFrame;}
  else{progress=scrollY+innerHeight>=document.documentElement.scrollHeight-2?1:clamp((scrollY-track.offsetTop)/(viewportHeight*(config.scrollHeight-1)));requestedFrame=frameAtProgress(progress,map);}
  if(requestedFrame!==lastRequested){direction=requestedFrame>lastRequested?1:-1;hasScrolled=true;lastRequested=requestedFrame;}
  const index=chunkAtFrame(chunks,requestedFrame);
  if(failedIndex>=0&&failedIndex!==index)clearFailure();
  if(index!==currentIndex){if(index!==pendingIndex)switchChunk(index);}else{
    if(pendingIndex>=0){loadSerial++;pendingController?.abort();pendingDecoder?.dispose();pendingDecoder=null;pendingIndex=-1;cache.retain([index,index-1,index+1]);announce('');}
    requestSeek();if(hasScrolled)prefetch(index,loadSerial);
  }
  renderText(displayedFrame);
}
function resize(){
  if(!config)return;
  // CSS small-viewport geometry is stable while mobile browser bars expand/collapse.
  // Only a real layout-size change remaps the track, and it preserves story position.
  const measured=viewportProbe.getBoundingClientRect().height,nextHeight=Number.isFinite(measured)&&measured>0?measured:innerHeight;
  const initialized=viewportHeight>0,layoutChanged=initialized&&Math.abs(nextHeight-viewportHeight)>.5,modeChanged=wasReduced!==reduced.matches;
  const oldSpan=viewportHeight*(config.scrollHeight-1),atEnd=!wasReduced&&progress>=1-1e-8;
  const targetProgress=atEnd?1:progressAtFrame(requestedFrame,map);
  // A growing visual viewport can clamp the old document before resize fires.
  const oldMaximumAfterGrow=oldSpan+visibleHeight-innerHeight;
  const endWasClamped=initialized&&!wasReduced&&!reduced.matches&&innerHeight>visibleHeight&&targetProgress*oldSpan>oldMaximumAfterGrow&&Math.abs(scrollY-track.offsetTop-Math.max(0,oldMaximumAfterGrow))<=2;
  viewportHeight=nextHeight;visibleHeight=innerHeight;wasReduced=reduced.matches;
  document.documentElement.classList.toggle('reduced',reduced.matches);
  // Dynamic tail cancels the changing visible height; actual scroll span stays fixed.
  track.style.height=reduced.matches?'auto':`${viewportHeight*(config.scrollHeight-1)+innerHeight}px`;
  track.style.paddingBottom=reduced.matches?`${Math.max(0,innerHeight-viewportHeight)}px`:'0px';
  if(initialized&&(layoutChanged||modeChanged||endWasClamped)){
    const top=reduced.matches?track.offsetTop+articles[readingBeats?readingBeatAtFrame(requestedFrame,readingBeats):sceneAtFrame(requestedFrame,manifest)].offsetTop:track.offsetTop+targetProgress*viewportHeight*(config.scrollHeight-1);
    scrollTo({top,behavior:'instant'});
  }
  schedule();
}
function go(index){if(!manifest)return;const steps=readingBeats||manifest.scenes,last=steps.length-1;index=clamp(index,0,last);const target=index===last?Math.min(steps[last].readEndFrame,steps[last].endFrame-1):steps[index].readStartFrame;requestedFrame=target;progress=index===last?1:progressAtFrame(target,map);scrollTo({top:track.offsetTop+(reduced.matches?articles[index].offsetTop:progress*viewportHeight*(config.scrollHeight-1)),behavior:'instant'});schedule();}
async function retryVideo(){
  if(!manifest||suspended)return;
  const index=chunkAtFrame(chunks,requestedFrame),blocked=blockedDecoder;
  // Calling play before the first await preserves the browser's gesture activation.
  const activation=blocked?.activate({force:true});retry.disabled=true;
  try{
    if(blocked){
      const enabled=await activation;
      if(blockedDecoder!==blocked||suspended)return;
      if(!enabled){announce('Tap to enable video.');return;}
      // Reuse the activated element; a fresh decoder would lose this gesture.
      const serial=++loadSerial;pendingController?.abort();pendingController=new AbortController();
      const signal=pendingController.signal,frame=requestedFrame;
      await blocked.seek(frame-chunks[index].startFrame,(v,local,method)=>{
        if(serial!==loadSerial||signal.aborted)throw new DOMException('Superseded','AbortError');
        drawFrame(v,index,local,method);
      },signal);
      decoder?.dispose();decoder=blocked;blockedDecoder=null;currentIndex=index;loadCount++;
    }else{if(decoder&&currentIndex===index){decoder.dispose();decoder=null;currentIndex=-1;}}
    clearFailure();attempts.delete(index);announce('');schedule();
  }catch(error){if(error.name!=='AbortError'&&error.cause?.name!=='AbortError')failure(error,index,()=>{clearFailure();currentIndex=-1;schedule();});}
  finally{retry.disabled=false;}
}
retry.addEventListener('click',retryVideo);
// A failed activation can also be retried by the next ordinary pointer gesture.
addEventListener('pointerdown',event=>{if(blockedDecoder&&!retry.contains(event.target)&&!retry.disabled)retryVideo();},{passive:true});
buttons.forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.go))));
document.querySelector('[data-scroll-cue]')?.addEventListener('click',()=>go(1));
addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable]'))return;const current=readingBeats?activeBeat:active,last=(readingBeats||manifest?.scenes||HEADLINES).length-1;const targets={Home:0,End:last,ArrowRight:current+1,ArrowLeft:current-1};if(event.key in targets){event.preventDefault();go(targets[event.key]);}});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',resize,{passive:true});reduced.addEventListener('change',resize);
function suspend(){suspended=true;loadSerial++;pendingController?.abort();pendingDecoder?.dispose();pendingDecoder=null;pendingIndex=-1;decoder?.cancelSeek();decoder?.video.pause();videoBusy=false;cache?.retain(currentIndex<0?[]:[currentIndex]);cancelAnimationFrame(raf);raf=0;}
function resume(){
  suspended=false;if(cache&&currentIndex>=0)cache.retain([currentIndex,currentIndex-1,currentIndex+1]);
  if(decoder){const current=decoder;videoBusy=true;current.activate().catch(()=>{}).finally(()=>{if(decoder===current){videoBusy=false;schedule();}});}
  else schedule();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});
addEventListener('pagehide',()=>{suspend();decoder?.dispose();decoder=null;blockedDecoder?.dispose();blockedDecoder=null;currentIndex=-1;cache?.clear();});
addEventListener('pageshow',event=>{if(event.persisted){clearFailure();resume();}});
function experimentInfo(){
  const data={...config.experiment,...manifest?.experiment,versionLinks:config.experiment.versionLinks},details=document.querySelector('#experiment'),content=details.querySelector('div');content.replaceChildren();
  const warning=document.createElement('p');warning.textContent='Preview. Editorial transitions and scroll presentation are still being refined.';content.append(warning);
  const records=[...new Map((manifest?.clips?.filter(c=>c.generation?.prompt)||[]).map(c=>[c.generation.outputId||c.id,c])).values()],prompts=records.map(c=>`${c.plannedShot||c.id}: ${c.generation.prompt}`).join('\n\n');
  for(const [label,value] of [['Model',data.model],['Settings',data.settings],['Recorded prompts',prompts],['Credits',data.credits==null?'Not recorded':String(data.credits)]])if(value){const p=document.createElement('p');p.textContent=`${label}: ${value}`;content.append(p);}
  for(const link of data.versionLinks||[]){let url;try{url=new URL(link.url,location.href);}catch{continue;}if(!['https:','http:'].includes(url.protocol))continue;const a=document.createElement('a');a.href=url.href;a.textContent=link.label;content.append(a);}details.hidden=false;
}
async function json(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error(`Metadata HTTP ${response.status}`);return await response.json();}finally{clearTimeout(timer);}}
try{
  const inline=bootstrapProfile(document,{viewportWidth:innerWidth,viewportHeight:innerHeight,configURL});
  config=inline?.config||await json(configURL);if(!Number.isFinite(config.scrollHeight)||config.scrollHeight<=1)throw Error('Invalid scroll limits');
  const manifestURL=new URL(config.desktopManifest,configURL);manifest=validateManifest(inline?.manifest||await json(manifestURL));map=buildScrollMap(manifest,config.scrollWeights);readingBeats=validateReadingBeats(config.uiTimeline,manifest);if(readingBeats&&articles.length!==readingBeats.length)throw Error('Reading beat markup differs from timeline');
  articles.forEach((article,i)=>{article.dataset.tone=readingBeats[i].tone;});
  const index=validateChunks(inline?.chunkIndex||await json(new URL(manifest.media.chunkIndex,manifestURL)),manifest);
  quality=mobile.matches||navigator.connection?.saveData?'mobile':'desktop';chunks=index.renditions[quality].chunks;
  cache=new ChunkCache(chunks,manifestURL,{onTransfer:bytes=>{totalBytes+=bytes;},onProgress:()=>{}});
  experimentInfo();resize();schedule();
}catch(error){errors.push(error.message);mode='unavailable';announce('Video unavailable. You can still apply by SMS.');}
if(new URLSearchParams(location.search).has('qa')){const output=document.createElement('output');output.id='review-diagnostics';output.setAttribute('aria-label','Live video QA diagnostics');document.body.append(output);setInterval(()=>{output.textContent=JSON.stringify(diagnostics());},250);}
