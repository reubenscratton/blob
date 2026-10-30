import {AABB2,moveAABB} from './AABB2.js';

// Gameplay lives in X/Y; depth Z stays locked. The original character remains Z-up.
export class PlayerMotion {
  constructor() { this.aabb=new AABB2(); this.width=1.1; this.height=2.7; this.jumpHeight = 5.4; this.jumpDuration = 1; this.reset(); }
  reset() {
    this.x = this.startX ?? 0;
    this.y = 0;
    this.airborne = false;
    this.jumpTime = 0;
    this.velocityY = 0;
    this.airHeight = undefined;
    this.direction = 1;
    this.angle = Math.PI / 2;
    this.turnFrom = this.angle;
    this.turnTo = this.angle;
    this.turnTime = .18;
    this.distance = 0;
    this.syncBounds();
  }
  update(dt, input, jumpPressed = false) {
    if (jumpPressed && !this.airborne) {
      this.airborne = true;
      this.jumpTime = 0;
      if(this.colliders) this.velocityY=4*this.jumpHeight/this.jumpDuration;
    }
    if (this.airborne && !this.colliders) {
      this.jumpTime = Math.min(this.jumpDuration, this.jumpTime + dt);
      const t = this.jumpTime / this.jumpDuration;
      // An exact arcade arc: the feet rise twice the character's standing height.
      this.y = 4 * this.jumpHeight * t * (1 - t);
      if (t >= 1) { this.y = 0; this.airborne = false; }
    }
    if (input && input !== this.direction) {
      this.direction = input;
      this.turnFrom = this.angle;
      const target = input * Math.PI / 2;
      const delta = Math.atan2(Math.sin(target - this.angle), Math.cos(target - this.angle));
      this.turnTo = this.angle + delta;
      this.turnTime = 0;
    }
    this.turnTime = Math.min(.18, this.turnTime + dt);
    const t = this.turnTime / .18;
    this.angle = this.turnFrom + (this.turnTo - this.turnFrom) * t * t * (3 - 2 * t);
    const previousX = this.x;
    // Pivot in place on the ground; air steering responds immediately.
    if (input && (this.airborne || this.turnTime >= .18)) this.x = Math.max(this.bounds?.[0] ?? -22, Math.min(this.bounds?.[1] ?? 22, this.x + input * 16 * dt));
    if(this.colliders) this.updateCollisions(dt,previousX);
    this.syncBounds();
    this.distance = Math.abs(this.x - previousX);
    return this.distance;
  }
  syncBounds() { this.aabb.setFromFeet(this.x,this.y,this.width,this.height); }
  updateCollisions(dt,previousX) {
    const gravity=8*this.jumpHeight/(this.jumpDuration*this.jumpDuration);
    const dx=this.x-previousX;
    this.x=previousX;
    this.syncBounds();
    const dy=this.airborne?this.velocityY*dt-.5*gravity*dt*dt:0;
    if(this.airborne) this.velocityY-=gravity*dt;
    const result=moveAABB(this.aabb,dx,dy,this.colliders);
    this.x+=result.x; this.y+=result.y;
    if(result.contacts.some(hit=>hit.ny!==0)) this.velocityY=0;
    const beneath=this.colliders.filter(p=>this.aabb.right>p.left+1e-6
      && this.aabb.left<p.right-1e-6 && p.top<=this.y+1e-6);
    const ground=beneath.reduce((best,p)=>!best||p.top>best.top?p:best,null);
    const supported=ground && Math.abs(this.y-ground.top)<1e-6;
    this.airborne=!(supported && this.velocityY<=0);
    this.airHeight=ground?Math.max(0,this.y-ground.top):1;
    // No neighbouring rooms yet: falling out of this room returns to the start.
    if(this.y < -15) this.reset();
    this.syncBounds();
  }
}
