// Bounded look-ahead shared by the native page and the classic X player.
// One displayed decoder plus one prepared decoder; at most four cached chunks.
export class ChunkBuffer {
  constructor({cache, createDecoder, isSuspended, saveData=false}) {
    Object.assign(this,{cache,createDecoder,isSuspended,saveData});
    this.spare=null;this.failedWarm=-1;this.windowKey='';this.failedPrefetch=new Set();
    this.stats={prepared:0,reused:0,cancelled:0};
  }
  retain(index,direction=1) {
    direction=direction<0?-1:1;
    const key=`${index}/${direction}`;
    if(key!==this.windowKey){this.windowKey=key;this.failedWarm=-1;this.failedPrefetch.clear();}
    const ahead=index+direction;
    if(this.spare&&this.spare.index!==ahead)this.cancelSpare();
    this.cache.retain(this.saveData?[index,index-1,index+1]:[index,index-direction,ahead,index+2*direction]);
  }
  prefetch(index,direction=1) {
    if(this.saveData||this.isSuspended())return;
    direction=direction<0?-1:1;this.retain(index,direction);
    const windowKey=this.windowKey;
    for(const target of [index+direction,index+2*direction]){
      if(this.cache.allowed.has(target)&&!this.failedPrefetch.has(target))this.cache.get(target).catch(()=>{
        if(this.windowKey===windowKey)this.failedPrefetch.add(target);
      });
    }
    const target=index+direction;
    if(!this.cache.allowed.has(target)||this.spare?.index===target||this.failedWarm===target)return;
    this.cancelSpare();
    const controller=new AbortController();
    const slot={index:target,controller,decoder:null,claimed:false,ready:false};
    slot.cancel=()=>{controller.abort();slot.decoder?.dispose();};
    this.spare=slot;
    const valid=()=>!controller.signal.aborted&&!this.isSuspended()&&(slot.claimed||this.spare===slot);
    slot.promise=(async()=>{
      try{
        const blob=await this.cache.get(target);
        if(!valid())throw new DOMException('Aborted','AbortError');
        slot.decoder=this.createDecoder(target);
        await slot.decoder.load(blob,controller.signal);
        if(!valid())throw new DOMException('Aborted','AbortError');
        await slot.decoder.seek(0,()=>{},controller.signal);
        if(!valid())throw new DOMException('Aborted','AbortError');
        slot.ready=true;this.stats.prepared++;
        return {decoder:slot.decoder,blob};
      }catch(error){
        slot.decoder?.dispose();
        if(this.spare===slot){this.spare=null;this.failedWarm=target;}
        throw error;
      }
    })();
    // Speculative failure never prevents using the page or retrying on demand.
    slot.promise.catch(()=>{});
  }
  take(index) {
    const slot=this.spare;
    if(!slot||slot.index!==index){this.cancelSpare();return null;}
    this.spare=null;slot.claimed=true;
    return slot;
  }
  cancelSpare() {
    if(!this.spare)return;
    const slot=this.spare;this.spare=null;this.stats.cancelled++;slot.cancel();
  }
  suspend(index) {
    this.cancelSpare();this.cache.retain(index<0?[]:[index]);
  }
}
