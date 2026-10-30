// Gameplay lives in X/Y; depth Z stays locked. The original character remains Z-up.
export class PlayerMotion {
  constructor() { this.jumpHeight = 5.4; this.jumpDuration = 1; this.reset(); }
  reset() {
    this.x = this.startX ?? 0;
    this.y = 0;
    this.airborne = false;
    this.jumpTime = 0;
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
    }
    if (this.airborne) {
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
    this.distance = Math.abs(this.x - previousX);
    return this.distance;
  }
}
