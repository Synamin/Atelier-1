/**
 * Character - encapsulates movement, animation, frustration, sleep state
 * Usage:
 *   // in preload() load walkFrames and sleepFrames (arrays)
 *   // in setup():
 *   player = new Character(x, y, walkFrames, sleepFrames);
 *   // in draw():
 *   player.update(dt);
 *   player.draw();
 */
class Character {
  constructor(x, y, walkFrames = [], sleepFrames = []) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.walkFrames = walkFrames;
    this.sleepFrames = sleepFrames;
    this.state = 'walk'; // 'walk'|'sleep'
    this.dirAngle = random(TWO_PI);
    this.turnTimer = 0;
    this.changeInterval = random(0.6, 2.2);
    this.baseSpeed = 140;
    this.speedMultiplier = 1;
    this.maxSpeed = 800;
    this.smoothness = 8;
    this.animTime = 0;
    this.frameIndex = 0;
    this.fps = 12;
    this.pressedFps = 28;
    this.isPressed = false;
    this.pressTimeout = 0;
    this.frustration = 0;
    this.frustrationIncrease = 10;
    this.frustrationTickInterval = 3.0;
    this.frustrationTickTimer = 0;
    this.spriteRect = { x:0, y:0, w:0, h:0 };
    this.lastInputTime = millis() / 1000;
    this.sleepAfterSeconds = 30;
  }

  setLastInput() {
    this.lastInputTime = millis() / 1000;
    if (this.state === 'sleep') {
      this.state = 'walk';
      this.animTime = 0;
    }
  }

  onClick() {
    this.setLastInput();
    this.isPressed = true;
    this.speedMultiplier = 2.2;
    this.pressTimeout = 0.7;
    this.frustration = min(100, this.frustration + this.frustrationIncrease);
    if (this.state === 'sleep') {
      this.state = 'walk';
    }
  }

  isPointInside(px, py) {
    return px >= this.spriteRect.x && px <= this.spriteRect.x + this.spriteRect.w &&
           py >= this.spriteRect.y && py <= this.spriteRect.y + this.spriteRect.h;
  }

  update(dt) {
    // record last input -> handle sleep
    const now = millis() / 1000;
    if (now - this.lastInputTime >= this.sleepAfterSeconds) {
      if (this.state !== 'sleep') {
        this.state = 'sleep';
        this.vx = 0; this.vy = 0; this.animTime = 0;
      }
    } else if (this.state === 'sleep') {
      this.state = 'walk';
    }

    // frustration tick decay: -1 every tick interval when not pressed
    if (!this.isPressed && this.frustration > 0) {
      this.frustrationTickTimer += dt;
      while (this.frustrationTickTimer >= this.frustrationTickInterval && this.frustration > 0) {
        this.frustration = max(0, this.frustration - 1);
        this.frustrationTickTimer -= this.frustrationTickInterval;
      }
    }

    if (this.state === 'sleep') {
      // animate sleep only
      const animFps = 8;
      this.animTime += dt;
      const total = this.sleepFrames.length || 1;
      this.frameIndex = floor((this.animTime * animFps) % total);
      return;
    }

    // wandering
    this.turnTimer += dt;
    if (this.turnTimer >= this.changeInterval) {
      this.turnTimer = 0;
      this.changeInterval = random(0.8, 2.5);
      if (random() < 0.14) this.dirAngle = random(TWO_PI);
      else this.dirAngle += random(-PI/3, PI/3);
    }

    const targetSpeed = this.baseSpeed * this.speedMultiplier;
    const targetVx = cos(this.dirAngle) * targetSpeed;
    const targetVy = sin(this.dirAngle) * targetSpeed;
    const t = 1 - Math.exp(-this.smoothness * dt);
    this.vx = lerp(this.vx, targetVx, t);
    this.vy = lerp(this.vy, targetVy, t);

    // clamp
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > this.maxSpeed) {
      const s = this.maxSpeed / sp;
      this.vx *= s; this.vy *= s;
    }

    // integrate
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // collision using current visible frame size (approx)
    const img = this.walkFrames[this.frameIndex] || this.walkFrames[0];
    const iw = (img && img.width) || 100;
    const ih = (img && img.height) || 100;
    const maxH = height * 0.35;
    const maxW = width * 0.5;
    const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.2);
    const w = iw * scaleFactor;
    const h = ih * scaleFactor;
    const halfW = w * 0.5;
    const halfH = h * 0.5;

    // clamp to screen so visible sprite touches edges
    if (this.x < halfW) { this.x = halfW; this.vx = Math.abs(this.vx) * 0.6; this.dirAngle = PI - this.dirAngle; }
    if (this.x > width - halfW) { this.x = width - halfW; this.vx = -Math.abs(this.vx) * 0.6; this.dirAngle = PI - this.dirAngle; }
    if (this.y < halfH) { this.y = halfH; this.vy = Math.abs(this.vy) * 0.6; this.dirAngle = -this.dirAngle; }
    if (this.y > height - halfH) { this.y = height - halfH; this.vy = -Math.abs(this.vy) * 0.6; this.dirAngle = -this.dirAngle; }

    // press timeout
    if (this.pressTimeout > 0) {
      this.pressTimeout -= dt;
      if (this.pressTimeout <= 0) { this.pressTimeout = 0; this.isPressed = false; this.speedMultiplier = 1; }
    }

    // animate walk frames
    const moving = Math.hypot(this.vx, this.vy) > 6;
    const curFps = this.isPressed ? this.pressedFps : this.fps;
    this.animTime += dt * (moving ? 1 : 0.4);
    const total = this.walkFrames.length || 1;
    this.frameIndex = floor((this.animTime * curFps) % total);

    // update sprite rect for input tests
    this.spriteRect.x = this.x - w/2;
    this.spriteRect.y = this.y - h/2;
    this.spriteRect.w = w;
    this.spriteRect.h = h;
  }

  draw() {
    if (this.state === 'sleep') {
      const img = this.sleepFrames[this.frameIndex] || this.sleepFrames[0];
      if (img) image(img, this.x, this.y, this.spriteRect.w || img.width, this.spriteRect.h || img.height);
      return;
    }
    const img = this.walkFrames[this.frameIndex] || this.walkFrames[0];
    if (!img) return;
    imageMode(CENTER);
    const iw = img.width || 100;
    const ih = img.height || 100;
    const maxH = height * 0.35;
    const maxW = width * 0.5;
    const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.2);
    const w = iw * scaleFactor;
    const h = ih * scaleFactor;
    push();
    image(img, this.x, this.y, w, h);
    pop();
    // update spriteRect
    this.spriteRect.x = this.x - w/2;
    this.spriteRect.y = this.y - h/2;
    this.spriteRect.w = w;
    this.spriteRect.h = h;
  }
}