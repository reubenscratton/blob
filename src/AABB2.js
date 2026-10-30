// Gameplay bounds live only in X/Y. Rendering depth and animation never resize them.
export class AABB2 {
  constructor(left=0,bottom=0,right=0,top=0) { this.set(left,bottom,right,top); }
  set(left,bottom,right,top) {
    this.left=left; this.bottom=bottom; this.right=right; this.top=top;
    return this;
  }
  setFromFeet(x,y,width,height) { return this.set(x-width/2,y,x+width/2,y+height); }
  translate(x,y) { return this.set(this.left+x,this.bottom+y,this.right+x,this.top+y); }
  overlaps(other) {
    return this.left<other.right && this.right>other.left
      && this.bottom<other.top && this.top>other.bottom;
  }
  // Time of first contact, including touching while approaching, excluding moving away.
  sweep(other,dx,dy) {
    const slab=(min,max,otherMin,otherMax,delta)=>{
      if(delta===0) return min<otherMax && max>otherMin?[-Infinity,Infinity]:null;
      const a=(otherMin-max)/delta, b=(otherMax-min)/delta;
      return [Math.min(a,b),Math.max(a,b)];
    };
    const x=slab(this.left,this.right,other.left,other.right,dx);
    const y=slab(this.bottom,this.top,other.bottom,other.top,dy);
    if(!x||!y) return null;
    const entry=Math.max(x[0],y[0]), exit=Math.min(x[1],y[1]);
    if(entry<0 || entry>1 || entry>exit || exit<0) return null;
    return x[0]>y[0]?{time:entry,nx:dx>0?-1:1,ny:0}
      :{time:entry,nx:0,ny:dy>0?-1:1};
  }
}

// Sweep the whole box, then slide the remaining displacement along hit surfaces.
// Fast movement cannot skip through a thin wall or a platform between frames.
export function moveAABB(body,dx,dy,solids) {
  let movedX=0,movedY=0;
  const contacts=[];
  for(let iteration=0;iteration<4 && (dx!==0||dy!==0);iteration++) {
    let first=null;
    for(const solid of solids) {
      const hit=body.sweep(solid,dx,dy);
      if(hit && (!first||hit.time<first.time)) first={...hit,bounds:solid};
    }
    const time=first?.time??1;
    const x=dx*time,y=dy*time;
    body.translate(x,y); movedX+=x; movedY+=y;
    if(!first) break;
    contacts.push(first);
    dx*=1-time; dy*=1-time;
    if(first.nx) dx=0;
    if(first.ny) dy=0;
  }
  return {x:movedX,y:movedY,contacts};
}
