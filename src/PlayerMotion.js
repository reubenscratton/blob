// Gameplay lives in X/Y; depth Z stays locked. The original character remains Z-up.
export class PlayerMotion {
  constructor() { this.jumpHeight = 5.4; this.jumpDuration = 1; this.reset(); }
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
  }
  update(dt, input, jumpPressed = false) {
    if (jumpPressed && !this.airborne) {
      this.airborne = true;
      this.jumpTime = 0;
      if(this.platforms) this.velocityY=4*this.jumpHeight/this.jumpDuration;
    }
    if (this.airborne && !this.platforms) {
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
    if(this.platforms) this.updatePlatforms(dt,previousX);
    this.distance = Math.abs(this.x - previousX);
    return this.distance;
  }
  updatePlatforms(dt,previousX) {
    const previousY=this.y;
    const gravity=8*this.jumpHeight/(this.jumpDuration*this.jumpDuration);
    if(this.airborne) {
      this.y+=this.velocityY*dt-.5*gravity*dt*dt;
      this.velocityY-=gravity*dt;
    }
    const radius=.55, height=this.characterHeight??2.7;
    // Solid risers stop horizontal movement until the feet clear the ledge.
    for(const platform of this.platforms) {
      if(this.y>=platform.top-1e-6 || this.y+height<=platform.bottom) continue;
      if(previousX+radius<=platform.left && this.x+radius>platform.left)
        this.x=platform.left-radius;
      if(previousX-radius>=platform.right && this.x-radius<platform.right)
        this.x=platform.right+radius;
    }
    const beneath=this.platforms.filter(p=>this.x>=p.left && this.x<p.right)
      .sort((a,b)=>b.top-a.top);
    const landing=beneath.find(p=>this.velocityY<=0 && previousY>=p.top-1e-6 && this.y<=p.top);
    if(landing) {
      this.y=landing.top; this.velocityY=0; this.airborne=false;
    } else if(!beneath.some(p=>Math.abs(this.y-p.top)<1e-6) || this.velocityY>0) {
      this.airborne=true;
    }
    const ground=beneath.find(p=>p.top<=this.y+1e-6);
    this.airHeight=ground?Math.max(0,this.y-ground.top):1;
    // No neighbouring rooms yet: falling out of this room returns to the start.
    if(this.y < -15) this.reset();
  }

}
