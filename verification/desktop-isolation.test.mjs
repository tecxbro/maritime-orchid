import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {createPlayer} from './premium-card-harness.mjs';

const root=new URL('../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root),'utf8');
const loader=read('dist/shared/player-loader.js');
const receipt=JSON.parse(read('verification/desktop-baseline.json'));
const html=read('dist/video/player.html');
const bundle=JSON.parse(html.match(/<script type="application\/json" id="journey-data">([\s\S]*?)<\/script>/)[1]);

test('both desktop playback files exactly match the version 12 baseline',()=>{
 for(const [file,sha] of Object.entries(receipt.sha256)){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),sha,file);
  assert.doesNotMatch(read(file),/ChapterSwipe|phoneChapters|embedMomentum|phone-chapters/);
 }
});

function select(kind,{touch=0,coarse=false,width=1440,height=900,screenWidth=width,screenHeight=height}={}){
 const loaded=[],entry={src:'https://example.test/shared/player-loader.js?v=isolate',dataset:{player:kind,config:'./config.json?v=original'}};
 const document={currentScript:entry,createElement:tag=>({tag,dataset:{}}),head:{append(node){loaded.push(node);if(node.tag==='link')node.onload();}}};
 const sandbox={document,navigator:{maxTouchPoints:touch},screen:{width:screenWidth,height:screenHeight},innerWidth:width,innerHeight:height,matchMedia:()=>({matches:coarse}),URL};
 vm.runInNewContext(loader,sandbox);
 return loaded;
}

for(const kind of ['native','embed']){
 for(const [name,view] of [
  ['Mac full window',{}],
  ['Mac narrow window',{width:390,height:650,screenWidth:1440,screenHeight:900}],
  ['Mac small X iframe',{width:320,height:240,screenWidth:1440,screenHeight:900}],
  ['narrow window with coarse signal but no touch hardware',{width:390,height:650,coarse:true}],
  ['large touch computer in narrow window',{touch:10,coarse:true,width:390,height:650,screenWidth:1920,screenHeight:1080}],
 ])test(`${kind}: ${name} loads only the original desktop player`,()=>{
  const loaded=select(kind,view);assert.equal(loaded.length,1);assert.equal(loaded[0].tag,'script');
  assert.equal(new URL(loaded[0].src).pathname,kind==='native'?'/shared/player.js':'/shared/embed-runtime.js');
  assert.equal(loaded[0].dataset.config,'./config.json?v=original');
  assert.equal(loaded[0].type,kind==='native'?'module':undefined);
 });
 for(const [name,view] of [
  ['portrait phone',{touch:5,coarse:true,width:390,height:844}],
  ['landscape phone',{touch:5,coarse:true,width:844,height:390}],
  ['phone X iframe',{touch:5,coarse:true,width:390,height:292,screenWidth:390,screenHeight:844}],
 ])test(`${kind}: ${name} loads phone CSS and only the phone player`,()=>{
  const loaded=select(kind,view);assert.equal(loaded.length,2);assert.equal(loaded[0].tag,'link');
  assert.equal(loaded[1].tag,'script');
  assert.equal(new URL(loaded[1].src).pathname,kind==='native'?'/shared/mobile-player.js':'/shared/mobile-embed-runtime.js');
 });
}

test('all secondary video routes select one player and do not load chapter CSS on desktop',()=>{
 for(const file of ['dist/video.html','dist/video/index.html','dist/video/player.html','dist/video/player/index.html']){
  const source=read(file);
  assert.equal((source.match(/src="\.\/shared\/player-loader\.js\?v=20261014-isolate15"/g)||[]).length,1);
  assert.doesNotMatch(source,/src="\.\/shared\/(?:mobile-player|mobile-embed-runtime|player|embed-runtime)\.js/);
  assert(!source.includes('shared/chapter-swipe.css'));
 }
});

for(const kind of ['native','embed'])test(`${kind}: narrow Mac fixtures retain original desktop input behavior`,async()=>{
 const p=await createPlayer({playerKind:kind,bundleOverride:bundle,width:390,height:650,mobile:false,coarse:false});
 try{
  for(let i=0;i<8;i++)await p.frame();
  assert.equal(p.sandbox.document.documentElement.classList.contains('phone-chapters'),false);
  const down=Object.assign(new Event('pointerdown',{cancelable:true}),{pointerId:1,pointerType:'mouse',button:0,clientY:500});
  p.elements.track.dispatchEvent(down);
  p.elements.track.dispatchEvent(Object.assign(new Event('pointermove',{cancelable:true}),{pointerId:1,pointerType:'mouse',clientY:350}));
  p.elements.track.dispatchEvent(Object.assign(new Event('pointerup'),{pointerId:1,pointerType:'mouse',clientY:350}));
  if(kind==='embed'){assert.equal(p.getOffset(),300);for(let i=0;i<80;i++)await p.frame();assert.equal(p.getOffset(),300);}
  else{assert.equal(down.defaultPrevented,false);assert.equal(p.sandbox.scrollY,0);}
  await p.navigate(180);for(let i=0;i<8;i++)await p.frame();assert.equal(p.diagnostics().displayedFrame,180);
  assert.equal(p.diagnostics().errors.length,0);
 }finally{await p.dispose();}
});
