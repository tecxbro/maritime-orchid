import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createPlayer,nativePayloads} from './premium-card-harness.mjs';

const html=await fs.readFile(new URL('../dist/video/player.html',import.meta.url),'utf8');
const bundle=JSON.parse(html.match(/<script type="application\/json" id="journey-data">([\s\S]*?)<\/script>/)[1]);
const options={bundleOverride:bundle,width:390,height:650,mobile:true,coarse:true};
const flush=async(p,count=75,ms=1000/60)=>{for(let i=0;i<count;i++)await p.frame(ms);};
function pointer(p,type,y,extra={}){
 const event=Object.assign(new Event(type,{cancelable:true}),{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:200,clientY:y,...extra});
 p.elements.track.dispatchEvent(event);return event;
}
async function swipe(p,{from=500,to=350,extra={}}={}){
 pointer(p,'pointerdown',from,extra);await p.advance(30);pointer(p,'pointermove',to,extra);
 await p.advance(10);pointer(p,'pointerup',to,extra);
}
async function run(kind,body,extra={}){
 const p=await createPlayer({...options,playerKind:kind,...extra});
 try{await flush(p,8);await body(p);}finally{await p.dispose();}
}
const anchor=(index,profile='portrait')=>index===0?0:index===5?960:bundle.profiles[profile].config.uiTimeline.beats[index].readStartFrame+2;
const position=p=>p.sandbox.scrollY||p.getOffset();
function assertChapter(p,index,profile='portrait'){
 assert.equal(p.diagnostics().requestedFrame,anchor(index,profile));
 assert.equal(p.diagnostics().displayedFrame,anchor(index,profile));
 assert.equal(p.diagnostics().readingBeat,bundle.profiles[profile].config.uiTimeline.beats[index].id);
 assert.equal(Number(p.articles[index].copy.style.opacity),1);
 assert.equal(p.articles[index].inert,false);
 assert.equal(p.diagnostics().errors.length,0);
}

for(const kind of ['embed','native']){
 test(`${kind}: each phone swipe reveals exactly the next chapter and stops`,()=>run(kind,async p=>{
  for(let index=1;index<=5;index++){
   await swipe(p);await flush(p);assertChapter(p,index);
   const stopped=position(p);await flush(p,20);assert.equal(position(p),stopped);
  }
  assert.equal(p.elements['final-sms'].hidden,false);
  await swipe(p);await flush(p);assertChapter(p,5);
  assert(p.peakMounted()<=2);assert(p.diagnostics().cacheEntries<=4);assert.equal(p.draws.length,0);
 }));

 test(`${kind}: downward swipes return through chapters to the opening`,()=>run(kind,async p=>{
  p.go(5);await flush(p,8);
  for(let index=4;index>=0;index--){await swipe(p,{from:300,to:450});await flush(p);assertChapter(p,index);}
  await swipe(p,{from:300,to:450});await flush(p);assertChapter(p,0);
 }));

 test(`${kind}: one long held gesture cannot skip chapters`,()=>run(kind,async p=>{
  pointer(p,'pointerdown',500);await p.advance(30);pointer(p,'pointermove',350);
  await flush(p);assertChapter(p,1);
  pointer(p,'pointermove',-2000);await flush(p);assertChapter(p,1);
  pointer(p,'pointerup',-2000);await flush(p);assertChapter(p,1);
  await swipe(p);await flush(p);assertChapter(p,2);
 }));

 test(`${kind}: an additional swipe during a transition is ignored rather than queued`,()=>run(kind,async p=>{
  await swipe(p);await flush(p,8);await swipe(p,{to:-2000});await flush(p);assertChapter(p,1);
  await swipe(p);await flush(p);assertChapter(p,2);
 }));

 test(`${kind}: taps, horizontal gestures and canceled short gestures do not advance`,()=>run(kind,async p=>{
  await swipe(p,{to:490});await flush(p);assertChapter(p,0);
  pointer(p,'pointerdown',500);pointer(p,'pointermove',450,{clientX:400});pointer(p,'pointerup',450,{clientX:400});
  await flush(p);assertChapter(p,0);
  pointer(p,'pointerdown',500);pointer(p,'pointermove',490);pointer(p,'pointercancel',490);pointer(p,'pointerup',350);
  await flush(p);assertChapter(p,0);
  pointer(p,'pointerdown',500);pointer(p,'pointerdown',300,{pointerId:2,isPrimary:false});pointer(p,'pointerup',350);
  await flush(p);assertChapter(p,0);
 }));

 test(`${kind}: final pointerup movement can reveal a chapter without pointermove`,()=>run(kind,async p=>{
  pointer(p,'pointerdown',500);await p.advance(50);pointer(p,'pointerup',350);
  await flush(p);assertChapter(p,1);
 }));

 test(`${kind}: implicit capture loss after release preserves the accepted transition`,()=>run(kind,async p=>{
  await swipe(p);pointer(p,'lostpointercapture',350);await flush(p);assertChapter(p,1);
 }));

 test(`${kind}: dialogs stop animation and retain their own scrolling`,()=>run(kind,async p=>{
  await swipe(p);await flush(p,8);p.elements['program-details'].showModal();const stopped=position(p);
  await flush(p);assert.equal(position(p),stopped);
  assert.equal(pointer(p,'pointerdown',500).defaultPrevented,false);
  p.elements['program-details'].close();p.go(0);await flush(p,8);await swipe(p);await flush(p);assertChapter(p,1);
 }));

 test(`${kind}: hidden pages stop transitions without restarting them on return`,()=>run(kind,async p=>{
  await swipe(p);await flush(p,8);const stopped=position(p);
  p.sandbox.document.hidden=true;p.sandbox.document.dispatchEvent(new Event('visibilitychange'));await flush(p);
  assert.equal(position(p),stopped);
  p.sandbox.document.hidden=false;p.sandbox.document.dispatchEvent(new Event('visibilitychange'));await flush(p);
  assert.equal(position(p),stopped);assert.equal(p.diagnostics().errors.length,0);
 }));

 test(`${kind}: rotation stops old animation and preserves the current story position`,()=>run(kind,async p=>{
  await swipe(p);await flush(p,8);await p.changeViewport({height:700,smallHeight:700});
  const stopped=position(p);await flush(p);assert.equal(position(p),stopped);assert.equal(p.diagnostics().errors.length,0);
 }));

 test(`${kind}: landscape phones also advance by chapter`,()=>run(kind,async p=>{
  await swipe(p);await flush(p);assertChapter(p,1,'landscape');
 },{width:844,height:390,mobile:false,coarse:true}));

 test(`${kind}: desktop mouse behavior is retained`,()=>run(kind,async p=>{
  const down=pointer(p,'pointerdown',500,{pointerType:'mouse'});
  pointer(p,'pointermove',350,{pointerType:'mouse'});pointer(p,'pointerup',350,{pointerType:'mouse'});
  if(kind==='embed'){assert.equal(p.getOffset(),300);await flush(p);assert.equal(p.getOffset(),300);}
  else{assert.equal(down.defaultPrevented,false);assert.equal(p.sandbox.scrollY,0);await p.navigate(180);await flush(p,8);assert.equal(p.diagnostics().displayedFrame,180);}
 },{width:1200,height:900,mobile:false,coarse:false}));

 test(`${kind}: whole-pixel browser scroll positions still reveal the complete headline`,()=>run(kind,async p=>{
  await swipe(p);await flush(p);const frame=p.diagnostics().displayedFrame;
  assert(frame>=60&&frame<=63);assert.equal(Number(p.articles[1].copy.style.opacity),1);
 },{roundScroll:true}));
}

test('embed: input lock stops the transition synchronously and release does not resume it',()=>run('embed',async p=>{
 await swipe(p);await flush(p,8);const unlock=p.sandbox.window.AscentPremiumEmbed.acquireInputLock(),stopped=p.getOffset();
 await flush(p);assert.equal(p.getOffset(),stopped);await swipe(p);await flush(p);assert.equal(p.getOffset(),stopped);
 unlock();await flush(p);assert.equal(p.getOffset(),stopped);
}));

test('embed: reduced motion changes chapters immediately without an animated journey',()=>run('embed',async p=>{
 await swipe(p);await flush(p,8);assert.equal(p.diagnostics().requestedFrame,60);
 assert.equal(p.diagnostics().readingBeat,'personal');const stopped=p.getOffset();await flush(p);assert.equal(p.getOffset(),stopped);
},{reduced:true}));

test('native: reduced motion retains native scrolling through readable sections',()=>run('native',async p=>{
 assert.equal(pointer(p,'pointerdown',500).defaultPrevented,false);
 pointer(p,'pointermove',350);pointer(p,'pointerup',350);await flush(p);
 assert.equal(p.sandbox.scrollY,0);assert.equal(p.sandbox.document.documentElement.classList.contains('phone-chapters'),false);
 await p.scroll(650);await flush(p,8);assert.equal(p.diagnostics().readingBeat,'personal');
},{reduced:true}));

for(const kind of ['embed','native'])test(`${kind}: delayed downloads catch up to the requested chapter without overshooting`,async()=>{
 const held=[];
 await run(kind,async p=>{
  await swipe(p);await flush(p);assert.equal(p.diagnostics().requestedFrame,62);assert(p.diagnostics().displayedFrame<24);
  await swipe(p);await flush(p,8);assert.equal(p.diagnostics().requestedFrame,62,'another gesture must wait for the new information to appear');
  for(let i=0;i<5;i++){for(const deliver of held.splice(0))await deliver();await flush(p,8);}
  assertChapter(p,1);assert(p.peakMounted()<=2);assert(p.diagnostics().cacheEntries<=4);
 },{
  scriptSetup:(script,deliver)=>script.src.includes('mobile-000')?deliver():held.push(deliver),
  fetchChunk:(index,request,path)=>index===0?new Response(nativePayloads.get(path)):new Promise((resolve,reject)=>{
   request.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
   held.push(()=>resolve(new Response(nativePayloads.get(path))));
  }),
 });
});

test('chapter duration reaches the same anchor at 30, 60 and 120 Hz',async()=>{
 for(const kind of ['embed','native'])for(const hz of [30,60,120])await run(kind,async p=>{
  await swipe(p);await flush(p,hz*1.2,1000/hz);assertChapter(p,1);
 });
});
