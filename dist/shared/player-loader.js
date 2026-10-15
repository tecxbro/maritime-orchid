(function(){
  'use strict';
  const entry=document.currentScript;
  // Width alone must never turn a Mac/trackpad session into the phone experience.
  const shortScreen=Math.min(screen.width||innerWidth,screen.height||innerHeight);
  const phone=navigator.maxTouchPoints>0&&matchMedia('(any-pointer:coarse)').matches&&shortScreen<=700;
  const native=entry.dataset.player==='native';
  const file=native?(phone?'mobile-player.js?v=20261014-chapters14':'player.js?v=20261014-desktop-restore15')
    :(phone?'mobile-embed-runtime.js?v=20261014-chapters14':'embed-runtime.js?v=20261014-desktop-restore15');
  const runtime=document.createElement('script');
  if(native)runtime.type='module';
  runtime.src=new URL(file,entry.src).href;runtime.dataset.config=entry.dataset.config;
  const launch=()=>document.head.append(runtime);
  if(phone){
    const css=document.createElement('link');css.rel='stylesheet';
    css.href=new URL('chapter-swipe.css?v=20261014-chapters1',entry.src).href;
    css.onload=launch;css.onerror=launch;document.head.append(css);
  }else launch();
})();
