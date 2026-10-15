// Phone gestures advance exactly one reading chapter, independent of swipe speed.
export class ChapterSwipe {
  constructor({isEnabled,isBlocked,isReduced,isReady=()=>true,getCount,getIndex,getPosition,getTarget,setPosition,durationMs=900}) {
    Object.assign(this,{isEnabled,isBlocked,isReduced,isReady,getCount,getIndex,getPosition,getTarget,setPosition,durationMs});
    this.gesture=null;this.animation=null;this.raf=0;
  }
  begin(event) {
    if(event.pointerType!=='touch'||!this.isEnabled())return false;
    if(this.isBlocked(event.target)){this.stop();return false;}
    if(event.isPrimary===false||this.gesture&&this.gesture.id!==event.pointerId){this.gesture=null;return true;}
    this.gesture={id:event.pointerId,x:event.clientX||0,y:event.clientY,fired:false,ignored:!!this.animation||!this.isReady()};
    return true;
  }
  move(event) {
    const gesture=this.gesture;
    if(!gesture||gesture.id!==event.pointerId)return false;
    if(this.isBlocked(event.target)){this.stop();return true;}
    if(gesture.fired||gesture.ignored)return true;
    const dy=gesture.y-event.clientY,dx=gesture.x-(event.clientX||0);
    if(Math.abs(dy)>=24&&Math.abs(dy)>Math.abs(dx)*1.2){
      gesture.fired=true;
      this.to(Math.max(0,Math.min(this.getCount()-1,this.getIndex()+(dy>0?1:-1))));
    }
    return true;
  }
  end(event) {
    if(this.gesture?.id!==event.pointerId)return false;
    this.move(event);this.gesture=null;return true;
  }
  cancel(event) {
    if(this.gesture?.id!==event.pointerId)return false;
    // Once accepted, an ordinary lost capture must not interrupt the chapter.
    this.gesture=null;return true;
  }
  to(index) {
    this.stopAnimation();
    const from=this.getPosition(),to=this.getTarget(index);
    if(!Number.isFinite(from)||!Number.isFinite(to))return;
    if(this.isReduced()||Math.abs(to-from)<.5){this.setPosition(to);return;}
    this.animation={from,to,started:performance.now()};
    this.raf=requestAnimationFrame(now=>this.tick(now));
  }
  tick(now) {
    this.raf=0;
    const animation=this.animation;if(!animation)return;
    if(!this.isEnabled()||this.isBlocked()){this.stop();return;}
    if(this.isReduced()){this.setPosition(animation.to);this.stopAnimation();return;}
    const t=Math.max(0,Math.min(1,(now-animation.started)/this.durationMs));
    const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    this.setPosition(t===1?animation.to:animation.from+(animation.to-animation.from)*eased);
    if(t===1)this.animation=null;
    else this.raf=requestAnimationFrame(time=>this.tick(time));
  }
  stopAnimation(){cancelAnimationFrame(this.raf);this.raf=0;this.animation=null;}
  stop(){this.stopAnimation();this.gesture=null;}
}
