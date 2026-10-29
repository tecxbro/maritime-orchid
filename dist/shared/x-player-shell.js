// X-only application access and a reading view independent of video playback.
(function(){
  'use strict';
  const get=id=>document.getElementById(id);
  const panel=get('x-reading-view'),apply=get('x-always-apply'),read=get('x-read-program'),back=get('x-try-video');
  const notice=get('x-reading-notice'),track=get('track'),poster=get('poster'),status=get('media-status');
  if(!panel||!apply||!read||!back||!notice||!track||!poster||!status)return;
  const videoTitle=document.title;
  let timer=0,release=null,previousInert=false,opener=null;
  const videoAvailable=()=>poster.hidden;
  const hasDialog=()=>document.querySelectorAll('dialog[open]').length>0;
  const lock=()=>{if(!release)release=window.AscentPremiumEmbed?.acquireInputLock?.()||null;};
  const clearOpeningTimer=()=>{clearTimeout(timer);timer=0;};
  function show(reason='manual',source){
    clearOpeningTimer();
    const opening=panel.hidden;
    notice.hidden=reason==='manual';
    notice.textContent=reason==='slow'?'The video is taking longer to load. Explore the program here.'
      :'The video is unavailable. You can explore the program and apply here.';
    if(!opening)return;
    document.title='The First 1,000';
    opener=source||document.activeElement;previousInert=!!track.inert;track.inert=true;
    panel.hidden=false;document.documentElement.classList.add('x-reading-mode');lock();
    if(!hasDialog())panel.focus({preventScroll:true});
  }
  function watchOpening(){
    clearOpeningTimer();
    if(videoAvailable()||!panel.hidden||document.hidden)return;
    // This changes only the visible UI; the existing media loading policy stays intact.
    timer=setTimeout(()=>{timer=0;if(!videoAvailable()&&!document.hidden)show('slow');},6000);
  }
  function close(){
    if(panel.hidden)return;
    document.title=videoTitle;
    panel.hidden=true;document.documentElement.classList.remove('x-reading-mode');track.inert=previousInert;
    release?.();release=null;
    const retry=get('media-retry');
    if(retry&&!retry.hidden&&!retry.disabled)retry.click();
    if(!hasDialog())(opener?.isConnected?opener:read).focus({preventScroll:true});
    watchOpening();
  }
  function inspectStatus(){
    if(status.hidden)return;
    if(/video (?:could not be decoded|download paused|unavailable)|tap to enable video/i.test(status.textContent))show('error');
  }
  read.addEventListener('click',()=>show('manual',read));
  back.addEventListener('click',close);
  const statusObserver=new MutationObserver(inspectStatus);
  statusObserver.observe(status,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  const posterObserver=new MutationObserver(()=>{
    if(videoAvailable()){clearOpeningTimer();posterObserver.disconnect();}
  });
  posterObserver.observe(poster,{attributes:true,attributeFilter:['hidden']});
  if(videoAvailable())posterObserver.disconnect();
  window.addEventListener('ascent:embed-ready',()=>{if(!panel.hidden)lock();inspectStatus();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearOpeningTimer();else watchOpening();});
  window.addEventListener('pagehide',clearOpeningTimer);
  window.addEventListener('pageshow',watchOpening);
  document.addEventListener('close',()=>{
    if(!panel.hidden)queueMicrotask(()=>{if(!hasDialog())apply.focus({preventScroll:true});});
  },true);
  // A review/share link opens the reading page without changing playback.
  if(window.location?.hash==='#read')show('manual',read);
  else watchOpening();
  inspectStatus();
})();
