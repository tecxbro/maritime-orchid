import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const source=read('dist/shared/x-player-shell.js');
const settle=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
function shell({video=false,runtime=true,dialog=false,missing=false,hash=''}={}){
 const observers=[],timers=new Map();let now=0,serial=0,locks=0,acquired=0,released=0,retries=0;
 const window=new EventTarget(),document=new EventTarget();window.location={hash};
 const notify=(node,type)=>{for(const o of observers)if(o.node===node)queueMicrotask(()=>o.callback([{type,target:node}]));};
 class Element extends EventTarget{
  constructor(id){super();this.id=id;this.isConnected=true;this.inert=false;this._hidden=false;this._text='';}
  get hidden(){return this._hidden;}
  set hidden(value){if(this._hidden===value)return;this._hidden=value;notify(this,'attributes');}
  get textContent(){return this._text;}
  set textContent(value){this._text=value;notify(this,'childList');}
  focus(){document.activeElement=this;}
  click(){if(this.id==='media-retry')retries++;this.dispatchEvent(new Event('click'));}
 }
 const ids=['x-reading-view','x-always-apply','x-read-program','x-try-video','x-reading-notice','track','poster','media-status','media-retry'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
 elements['x-reading-view'].hidden=true;elements['x-reading-notice'].hidden=true;
 elements['media-status'].hidden=true;elements['media-retry'].hidden=true;elements.poster.hidden=video;
 document.activeElement=elements['x-read-program'];document.hidden=false;document.title='The First 1,000';
 document.documentElement={classList:{values:new Set(),add(name){this.values.add(name);},remove(name){this.values.delete(name);},contains(name){return this.values.has(name);}}};
 document.getElementById=id=>missing&&id==='x-reading-view'?null:elements[id];
 document.querySelectorAll=()=>dialog?[{}]:[];
 const attachRuntime=()=>{window.AscentPremiumEmbed={acquireInputLock(){locks++;acquired++;let done=false;return()=>{if(!done){done=true;locks--;released++;}};}};};
 if(runtime)attachRuntime();
 const sandbox={window,document,queueMicrotask,MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(node){this.node=node;}disconnect(){this.node=null;}},setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,due:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(source,sandbox);
 return {document,window,elements,timers,observers,attachRuntime,setDialog:value=>dialog=value,
  stats:()=>({locks,acquired,released,retries}),
  async advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.due<=now){timers.delete(id);t.fn();}await settle();},
  async error(text){elements['media-status'].textContent=text;elements['media-status'].hidden=false;await settle();},
 };
}

test('a delayed first frame opens the reading view after six seconds, without requiring a retry',async()=>{
 const p=shell();await p.advance(5999);assert.equal(p.elements['x-reading-view'].hidden,true);
 await p.advance(1);assert.equal(p.elements['x-reading-view'].hidden,false);
 assert.equal(p.elements.track.inert,true);assert.equal(p.stats().locks,1);
 assert(p.elements['x-reading-notice'].textContent.includes('taking longer'));
 assert.equal(p.timers.size,0);assert.equal(p.stats().retries,0);
});

test('a timely first frame cancels the opening deadline and keeps the video view',async()=>{
 const p=shell();await p.advance(1000);p.elements.poster.hidden=true;await settle();
 assert.equal(p.timers.size,0);await p.advance(10000);assert.equal(p.elements['x-reading-view'].hidden,true);
 assert.equal(p.stats().acquired,0);
 assert(!p.observers.some(observer=>observer.node===p.elements.poster));
});

for(const message of ['Video could not be decoded. Try again.','Video download paused. Try again.','Video unavailable. You can still use the application form.','Tap to enable video.']){
 test(`reported failure opens readable program UI: ${message}`,async()=>{
  const p=shell({video:true});await p.error(message);
  assert.equal(p.elements['x-reading-view'].hidden,false);assert.equal(p.elements['x-reading-notice'].hidden,false);
  assert.equal(p.stats().locks,1);assert.equal(p.timers.size,0);
 });
}

test('manual reading access works before any frame arrives and restores video controls',async()=>{
 const p=shell();p.elements['x-read-program'].click();assert.equal(p.elements['x-reading-view'].hidden,false);
 assert.equal(p.elements['x-reading-notice'].hidden,true);assert.equal(p.stats().locks,1);
 p.elements['x-try-video'].click();assert.equal(p.elements['x-reading-view'].hidden,true);
 assert.equal(p.elements.track.inert,false);assert.equal(p.stats().locks,0);
 assert.equal(p.document.activeElement,p.elements['x-read-program']);assert.equal(p.timers.size,1);
});

test('a direct reading link opens immediately, retains the reading view after video readiness, and can return to video',async()=>{
 const p=shell({hash:'#read'});
 assert.equal(p.document.title,'The First 1,000');
 assert.equal(p.elements['x-reading-view'].hidden,false);
 assert.equal(p.elements['x-reading-notice'].hidden,true);
 assert.equal(p.elements.track.inert,true);assert.equal(p.stats().locks,1);assert.equal(p.timers.size,0);
 p.elements.poster.hidden=true;await settle();
 assert.equal(p.elements['x-reading-view'].hidden,false);
 p.elements['x-try-video'].click();
 assert.equal(p.elements['x-reading-view'].hidden,true);assert.equal(p.elements.track.inert,false);
 assert.equal(p.document.title,'The First 1,000');
 assert.equal(p.stats().locks,0);assert.equal(p.timers.size,0);
});

test('repeated failures acquire one lock, and returning invokes the existing retry only once',async()=>{
 const p=shell({video:true});await p.error('Video could not be decoded. Try again.');
 await p.error('Video could not be decoded. Try again.');assert.equal(p.stats().acquired,1);
 p.elements['media-retry'].hidden=false;p.elements['x-try-video'].click();p.elements['x-try-video'].click();
 assert.equal(p.stats().locks,0);assert.equal(p.stats().released,1);assert.equal(p.stats().retries,1);
});

test('a late first frame does not interrupt someone reading the fallback',async()=>{
 const p=shell();await p.advance(6000);p.elements.poster.hidden=true;await settle();
 assert.equal(p.elements['x-reading-view'].hidden,false);assert.equal(p.stats().locks,1);
 p.elements['x-try-video'].click();assert.equal(p.elements['x-reading-view'].hidden,true);assert.equal(p.timers.size,0);
});

test('fallback is usable when the video runtime has not initialized',async()=>{
 const p=shell({runtime:false});await p.advance(6000);assert.equal(p.elements['x-reading-view'].hidden,false);
 assert.equal(p.stats().locks,0);p.attachRuntime();p.window.dispatchEvent(new Event('ascent:embed-ready'));
 assert.equal(p.stats().locks,1);p.window.dispatchEvent(new Event('ascent:embed-ready'));assert.equal(p.stats().acquired,1);
});

test('fallback never steals focus from an open application dialog',async()=>{
 const p=shell({dialog:true});const before=p.document.activeElement;await p.advance(6000);
 assert.equal(p.elements['x-reading-view'].hidden,false);assert.equal(p.document.activeElement,before);
 p.setDialog(false);p.document.dispatchEvent(new Event('close'));await settle();
 assert.equal(p.document.activeElement,p.elements['x-always-apply']);
});

test('background pages have no fallback deadline running',async()=>{
 const p=shell();p.document.hidden=true;p.document.dispatchEvent(new Event('visibilitychange'));
 assert.equal(p.timers.size,0);await p.advance(10000);assert.equal(p.elements['x-reading-view'].hidden,true);
 p.document.hidden=false;p.document.dispatchEvent(new Event('visibilitychange'));await p.advance(6000);
 assert.equal(p.elements['x-reading-view'].hidden,false);
});

test('the healthy player has no repeating timer or frame polling from the UI layer',async()=>{
 const p=shell({video:true});assert.equal(p.timers.size,0);await p.advance(60000);
 assert.equal(p.elements['x-reading-view'].hidden,true);assert.equal(p.stats().acquired,0);
});

test('the shell does nothing outside the X player markup',()=>{
 const p=shell({missing:true});assert.equal(p.timers.size,0);assert.equal(p.observers.length,0);
});

test('Apply uses the existing in-frame application handler in both the film and reading view',()=>{
 for(const file of ['dist/video/player.html','dist/video/player/index.html']){
  const html=read(file);
  assert(html.includes('id="x-always-apply" class="x-always-apply" data-application-open'));
  assert.match(html, /class="x-reading-apply[^"]*" data-application-open/);
  assert.equal((html.match(/id="x-always-apply"/g)||[]).length,1);
  for(const label of ['Personal.','Business.','1,000 users.','6 weeks.','3 days in San Francisco.'])assert(html.includes('<h2>'+label+'</h2>'));
 }
 assert(read('dist/shared/application.js').includes("const trigger=event.target.closest?.('[data-application-open]')"));
 const css=read('dist/shared/x-player-shell.css');
 assert(css.includes('position:fixed'));assert(css.includes('overflow-y:auto'));assert(css.includes('touch-action:pan-y'));
 assert(!css.includes('backdrop-filter'));assert(!css.includes('animation:'));
});

test('playback, buffering, transition timing, form and approved terms files stay protected',()=>{
 const protectedFiles=JSON.parse(read('verification/x-player-protected-files.json'));
 for(const [file,sha] of Object.entries(protectedFiles))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),sha,file);
 assert(!read('dist/index.html').includes('journey-data'));
 assert(!read('dist/index.html').includes('player-loader.js'));
});
