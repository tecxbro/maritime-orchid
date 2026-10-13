// Blob chunk lifecycle. No native master URL or Range dependency.
export class MediaFailure extends Error {
  constructor(kind, message, cause) { super(message, {cause}); this.name = 'MediaFailure'; this.kind = kind; }
}
const aborted = () => new DOMException('Aborted', 'AbortError');
export function deadline(task, ms, signal, failure, onTimeout = () => {}) {
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
export class ChunkCache {
  constructor(chunks, base, {onProgress=()=>{}, onTransfer=()=>{}, fetcher=(...args)=>fetch(...args), stallMs=10000, totalMs=30000}={}) {
    Object.assign(this, {chunks, base, onProgress, onTransfer, fetcher, stallMs, totalMs});
    this.entries = new Map(); this.allowed = new Set();
  }
  retain(indices) {
    this.allowed = new Set(indices.filter(i=>i>=0 && i<this.chunks.length));
    for (const [i,e] of this.entries) if (!this.allowed.has(i)) { e.controller.abort(); this.entries.delete(i); }
  }
  get(index) {
    if (this.entries.has(index)) return this.entries.get(index).promise;
    if (!this.allowed.has(index)) return Promise.reject(aborted());
    const chunk = this.chunks[index], controller = new AbortController();
    const entry = {controller, bytes:0, blob:null};
    this.entries.set(index, entry);
    entry.promise = this.download(chunk, index, entry).catch(error=>{
      if (this.entries.get(index)===entry) this.entries.delete(index);
      if (error.name==='AbortError' || error instanceof MediaFailure) throw error;
      throw new MediaFailure('network', 'Could not download this video moment.', error);
    });
    return entry.promise;
  }
  async download(chunk, index, entry) {
    const {controller} = entry, started = performance.now();
    const timedOut = () => new MediaFailure('network', 'Video download timed out.');
    let reader;
    const remaining = () => Math.max(1, Math.min(this.stallMs, this.totalMs-(performance.now()-started)));
    const bounded = task => {
      if(performance.now()-started>=this.totalMs) { controller.abort(); Promise.resolve(task).catch(()=>{}); return Promise.reject(timedOut()); }
      return deadline(task, remaining(), controller.signal, timedOut(), ()=>controller.abort());
    };
    try {
      const response = await bounded(this.fetcher(new URL(chunk.src,this.base), {signal:controller.signal}));
      if (!response.ok) throw new MediaFailure('network', `Video chunk HTTP ${response.status}`);
      const parts = []; this.onProgress(index,0,chunk.bytes);
      if (response.body) {
        reader = response.body.getReader();
        while (true) {
          const {done,value} = await bounded(reader.read());
          if (done) break;
          entry.bytes += value.byteLength;
          if (entry.bytes>chunk.bytes) throw new MediaFailure('network','Chunk exceeds its byte limit.');
          parts.push(value); this.onTransfer(value.byteLength); this.onProgress(index,entry.bytes,chunk.bytes);
        }
        entry.blob = new Blob(parts,{type:'video/mp4'});
      } else {
        entry.blob = await bounded(response.blob()); entry.bytes = entry.blob.size; this.onTransfer(entry.bytes);
      }
      if (entry.bytes!==chunk.bytes) throw new MediaFailure('network','Incomplete media chunk.');
      if (controller.signal.aborted) throw aborted();
      entry.fetchMs = performance.now()-started;
      return entry.blob;
    } finally {
      // Do not await a stalled implementation's cancel promise.
      if (reader) { try { Promise.resolve(reader.cancel()).catch(()=>{}); } catch {} }
    }
  }
  get bytes() { return [...this.entries.values()].reduce((n,e)=>n+e.bytes,0); }
  clear() { this.retain([]); }
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
export class ChunkDecoder {
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
