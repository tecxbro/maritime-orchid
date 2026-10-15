import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createPlayer} from './premium-card-harness.mjs';

const html=await fs.readFile(new URL('../dist/video/player.html',import.meta.url),'utf8');
const bundle=JSON.parse(html.match(/<script type="application\/json" id="journey-data">([\s\S]*?)<\/script>/)[1]);
const flush=async player=>{for(let i=0;i<8;i++)await player.frame();};
const visible=player=>player.elements.media.querySelectorAll('video').filter(video=>video.getAttribute('data-presented')!==null);

for(const playerKind of ['embed','native']){
 test(`${playerKind}: phone presents one native surface without canvas copies`,async()=>{
  const player=await createPlayer({playerKind,bundleOverride:bundle,width:390,height:650,mobile:true,coarse:true});
  try{
   await flush(player);
   assert.equal(player.diagnostics().presentationSurface,'native-video');
   assert.equal(player.elements.film.hidden,true);assert.equal(player.elements.poster.hidden,true);
   assert.equal(player.draws.length,0);assert.deepEqual(visible(player),[player.getDecoder().video]);
   assert.equal(player.getWarm().decoder.video.getAttribute('data-presented'),null);
   const warmed=player.getWarm().decoder;
   await player.navigate(30);await flush(player);
   assert.equal(player.getDecoder(),warmed);assert.deepEqual(visible(player),[warmed.video]);
   for(const frame of [80,696,534,892,180,0,960,60]){await player.navigate(frame);await player.frame();}
   await flush(player);
   assert.equal(player.diagnostics().displayedFrame,60);
   assert.equal(player.diagnostics().readingBeat,'personal');
   assert.deepEqual(visible(player),[player.getDecoder().video]);
   assert.equal(player.draws.length,0);assert(player.peakMounted()<=2);
   assert.equal(player.diagnostics().errors.length,0);
  }finally{await player.dispose();}
 });

 test(`${playerKind}: touchscreen landscape also avoids canvas copies`,async()=>{
  const player=await createPlayer({playerKind,bundleOverride:bundle,width:844,height:390,coarse:true});
  try{await flush(player);assert.equal(player.diagnostics().presentationSurface,'native-video');assert.equal(player.draws.length,0);assert.equal(visible(player).length,1);}
  finally{await player.dispose();}
 });

 test(`${playerKind}: desktop continues to present canvas`,async()=>{
  const player=await createPlayer({playerKind,bundleOverride:bundle,width:800,height:600});
  try{await flush(player);assert.equal(player.diagnostics().presentationSurface,'canvas');assert.equal(player.elements.film.hidden,false);assert(player.draws.length>0);assert.equal(visible(player).length,0);}
  finally{await player.dispose();}
 });
}

test('embed: delayed phone chunk keeps the previous native surface and captions',async()=>{
 const held=[];
 const player=await createPlayer({bundleOverride:bundle,width:390,height:650,mobile:true,scriptSetup:(script,deliver)=>script.src.includes('mobile-000')?deliver():held.push(deliver)});
 try{
  await flush(player);const first=player.getDecoder().video;
  player.go(5);await flush(player);
  assert.equal(player.diagnostics().displayedFrame,0);assert.deepEqual(visible(player),[first]);
  assert.equal(player.elements['final-sms'].hidden,true);
  for(const deliver of held)deliver();await flush(player);
  assert.equal(player.diagnostics().displayedFrame,960);assert.equal(player.elements['final-sms'].hidden,false);
  assert.deepEqual(visible(player),[player.getDecoder().video]);assert.equal(player.draws.length,0);
 }finally{await player.dispose();}
});

test('secondary video routes load sky layout after their existing styles',async()=>{
 const css=await fs.readFile(new URL('../dist/shared/mobile-presentation.css',import.meta.url),'utf8');
 for(const route of ['video.html','video/index.html','video/player.html','video/player/index.html']){
  const source=await fs.readFile(new URL('../dist/'+route,import.meta.url),'utf8');
  assert(source.includes('shared/mobile-presentation.css?v=20261013-mobile11'));
  assert(source.lastIndexOf('shared/mobile-presentation.css')>source.lastIndexOf('shared/premium-layout.css'));
 }
 assert(css.includes('inset:0 0 auto!important'));assert(css.includes('height:auto!important'));
 assert(css.includes('justify-content:flex-start!important'));
 assert(css.includes('backdrop-filter:none'));assert(css.includes('.sms::before{animation:none;display:none}'));
 assert(css.includes('video.chunk-decoder[data-presented]{z-index:1}'));
});
