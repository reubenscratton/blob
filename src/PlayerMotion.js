// Gameplay lives in X/Y; depth Z stays locked. The original character remains Z-up.
export class PlayerMotion {
  constructor() { this.reset(); }
  reset() {
    this.x = 0;
    this.y = 0;
    this.direction = 1;
    this.angle = Math.PI / 2;
    this.turnFrom = this.angle;
    this.turnTo = this.angle;
    this.turnTime = .18;
    this.distance = 0;
  }
  update(dt, input) {
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
    // Pivot in place before setting off in the new direction.
    if (input && this.turnTime >= .18) this.x = Math.max(-22, Math.min(22, this.x + input * 9 * dt));
    this.distance = Math.abs(this.x - previousX);
    return this.distance;
  }
}
