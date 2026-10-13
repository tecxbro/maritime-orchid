import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createPlayer,settle,nativePayloads} from './premium-card-harness.mjs';

const html=await fs.readFile(new URL('../dist/player.html',import.meta.url),'utf8');
const bundle=JSON.parse(html.match(/<script type="application\/json" id="journey-data">([\s\S]*?)<\/script>/)[1]);
const flush=async player=>{for(let i=0;i<8;i++)await player.frame();};
const nativeResponse=async path=>new Response(nativePayloads.get(path));
const options=(playerKind,extra={})=>({playerKind,bundleOverride:bundle,width:800,height:600,...extra});

for(const playerKind of ['embed','native']){
  test(`${playerKind}: poster-to-first-frame does not await speculative downloads`,async()=>{
    const held=[];
    const player=await createPlayer(options(playerKind,{
      scriptSetup:(script,deliver)=>script.src.includes('desktop-000')?deliver():held.push({script,deliver}),
      fetchChunk:(index,request,path)=>index===0?nativeResponse(path):new Promise((resolve,reject)=>{
        request.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
        held.push({deliver:async()=>resolve(await nativeResponse(path))});
      }),
    }));
    try{
      await flush(player);
      const state=player.diagnostics();
      assert.equal(state.mode,'video');assert.equal(state.displayedFrame,0);
      assert.equal(state.pendingChunk,-1);assert.equal(player.draws.length,1);
      assert.equal(player.reads.length,3);assert.equal(held.length,2);
      assert.equal(state.errors.length,0);
    }finally{await player.dispose();}
  });

  test(`${playerKind}: adjacent boundary reuses the prepared decoder`,async()=>{
    const player=await createPlayer(options(playerKind));
    try{
      await flush(player);
      const warm=player.getWarm();
      assert.equal(warm.index,1);assert.equal(warm.ready,true);
      const next=warm.decoder,loads=next.video.playCalls;
      await player.navigate(30);await flush(player);
      assert.equal(player.getDecoder(),next);
      assert.equal(next.video.playCalls,loads,'boundary must not load/reactivate the prepared video');
      assert.equal(player.diagnostics().displayedFrame,30);
      assert.equal(player.diagnostics().bufferStats.reused,1);
      assert(player.peakMounted()<=2);assert(player.diagnostics().cacheEntries<=4);
      assert.equal(player.diagnostics().errors.length,0);
    }finally{await player.dispose();}
  });

  test(`${playerKind}: rapid jumps and reversals discard stale work and stay bounded`,async()=>{
    const player=await createPlayer(options(playerKind));
    try{
      await flush(player);
      for(const frame of [30,80,696,534,892,180,0,960,60]){
        await player.navigate(frame);await player.frame();
      }
      await flush(player);
      assert.equal(player.diagnostics().displayedFrame,60);
      assert.equal(player.diagnostics().readingBeat,'personal');
      assert(player.peakMounted()<=2);assert(player.diagnostics().cacheEntries<=4);
      assert.equal(player.diagnostics().errors.length,0);
    }finally{await player.dispose();}
    assert.equal(player.blobs.size,0);assert.equal(player.diagnostics().activeVideoCount,0);
  });

  test(`${playerKind}: data-saving mode loads only the requested chunk`,async()=>{
    const player=await createPlayer(options(playerKind,{saveData:true}));
    try{
      await flush(player);
      assert.equal(player.reads.length,1);assert.equal(player.getWarm(),null);
      await player.navigate(180);await flush(player);
      assert.equal(player.reads.length,2);assert.equal(player.diagnostics().displayedFrame,180);
    }finally{await player.dispose();}
  });

  test(`${playerKind}: hidden pages release the spare; resume restores look-ahead`,async()=>{
    const player=await createPlayer(options(playerKind));
    try{
      await flush(player);assert(player.getWarm()?.ready);
      player.sandbox.document.hidden=true;
      player.sandbox.document.dispatchEvent(new Event('visibilitychange'));
      await settle();
      assert.equal(player.getWarm(),null);assert.equal(player.diagnostics().cacheEntries,1);
      assert.equal(player.diagnostics().activeVideoCount,1);
      player.sandbox.document.hidden=false;
      player.sandbox.document.dispatchEvent(new Event('visibilitychange'));
      await flush(player);
      assert(player.getWarm()?.ready);assert(player.peakMounted()<=2);
    }finally{await player.dispose();}
  });
}

test('embed: slow in-flight preparation is claimed without allocating a third decoder',async()=>{
  let release;
  const player=await createPlayer(options('embed',{videoSetup:(video,index)=>{
    if(index===1)video.play=()=>new Promise(resolve=>{release=resolve;});
  }}));
  try{
    await flush(player);const warming=player.getWarm();assert(warming&&!warming.ready);
    await player.navigate(30);await player.frame();
    assert.equal(player.diagnostics().displayedFrame,0);
    release();await flush(player);
    assert.equal(player.getDecoder(),warming.decoder);
    assert.equal(player.diagnostics().displayedFrame,30);assert(player.peakMounted()<=2);
  }finally{await player.dispose();}
});

test('embed: speculative failure is quiet and foreground retry remains usable',async()=>{
  const failed=new Set();
  const player=await createPlayer(options('embed',{scriptSetup:(script,deliver)=>{
    if(script.src.includes('desktop-001')&&!failed.has(script.src)){
      failed.add(script.src);queueMicrotask(()=>script.onerror());
    }else deliver();
  }}));
  try{
    await flush(player);assert.equal(player.diagnostics().mode,'video');
    assert.equal(player.diagnostics().errors.length,0);
    await player.navigate(30);await flush(player);
    assert.equal(player.diagnostics().displayedFrame,30);
    assert.equal(player.diagnostics().errors.length,0);
  }finally{await player.dispose();}
});

test('embed: a failed speculative request is not retried on every scroll event',async()=>{
  let failures=0;
  const player=await createPlayer(options('embed',{scriptSetup:(script,deliver)=>{
    if(script.src.includes('desktop-002')){failures++;queueMicrotask(()=>script.onerror());}
    else deliver();
  }}));
  try{
    await flush(player);
    for(const frame of [2,4,6,8,10,12]){await player.navigate(frame);await flush(player);}
    assert.equal(failures,1);assert.equal(player.diagnostics().errors.length,0);
  }finally{await player.dispose();}
});

test('embed: cancellation during a warm seek releases its Blob and prevents stale frames',async()=>{
  let warming;
  const player=await createPlayer(options('embed',{videoSetup:(video,index)=>{
    if(index===1){warming=video;video.completeSeek=()=>{};}
  }}));
  try{
    await flush(player);assert(player.getWarm()&&!player.getWarm().ready);
    await player.navigate(696);await flush(player);
    assert.equal(warming.removed,true);
    assert.equal(player.diagnostics().displayedFrame,696);
    assert(player.peakMounted()<=2);assert.equal(player.diagnostics().errors.length,0);
  }finally{await player.dispose();}
  assert.equal(player.blobs.size,0);
});

for(const playerKind of ['embed','native'])test(`${playerKind}: portrait selects once and buffers within the portrait route`,async()=>{
  const player=await createPlayer(options(playerKind,{width:390,height:844,mobile:true}));
  try{
    await flush(player);
    assert.equal(player.sandbox.document.documentElement.dataset.profile,'portrait');
    assert(player.reads.every(read=>read.url.includes('/portrait/')));
    await player.navigate(30);await flush(player);
    assert.equal(player.diagnostics().displayedFrame,30);
    assert.equal(player.diagnostics().bufferStats.reused,1);
    assert(player.peakMounted()<=2);
  }finally{await player.dispose();}
});
