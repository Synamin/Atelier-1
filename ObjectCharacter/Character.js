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
    // overall multiplier to make the sprite a bit bigger
    this.displayScale = 1.30; // change this value to make sprite larger/smaller
    // celebration / rotation state
    this.rotationAngle = 0;           // current rotation applied when drawing
    this.celebrating = false;         // true while celebration animation runs
    this._celebrateTime = 0;
    this._celebrateDuration = 0;
    this._celebrateStartX = 0;
    this._celebrateStartY = 0;
    this._celebratePeak = 0;
    this._celebrateRotations = 0;
    // replace p5 random/TWO_PI with Math equivalents to satisfy linters
    this.dirAngle = Math.random() * Math.PI * 2;
    this.turnTimer = 0;
    this.changeInterval = 0.6 + Math.random() * (2.2 - 0.6);
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
    // happy animation support
    this.happyFrames = [];
    this.happyAnimTime = 0;
    this.happyFps = 36;
    this.playHappyOnceFlag = false;
    this.happyDuration = 0;

    // follow-target used by ball module
    this.followTarget = { active: false, x: 0, y: 0, tolerance: 12, speed: null };
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
    this.frustration = Math.min(100, this.frustration + this.frustrationIncrease);
    if (this.state === 'sleep') {
      this.state = 'walk';
    }
  }

  isPointInside(px, py) {
    return px >= this.spriteRect.x && px <= this.spriteRect.x + this.spriteRect.w &&
           py >= this.spriteRect.y && py <= this.spriteRect.y + this.spriteRect.h;
  }

  // allow external code to provide happy frames and optionally fps
  setHappyFrames(frames = [], fps = 36) {
    this.happyFrames = frames || [];
    this.happyFps = fps || 36;
    this.happyDuration = (this.happyFrames.length > 0) ? (this.happyFrames.length / this.happyFps) : 0;
  }

  // start a single loop happy playback that temporarily replaces the character animation
  playHappyOnce() {
    if (!this.happyFrames || this.happyFrames.length === 0) return;
    this.state = 'happy';
    this.happyAnimTime = 0;
    this.happyDuration = this.happyFrames.length / this.happyFps;
    this.playHappyOnceFlag = true;
    // stop movement while showing happy (matches how sleep/angry replace behavior)
    this.vx = 0;
    this.vy = 0;
    this.isPressed = false;
  }

  // start a celebratory jump+spin that returns to original position/rotation
  startCelebrate(duration = 2.2, peak = 120, rotations = 2) {
    if (this.celebrating) return;
    this.celebrating = true;
    this._celebrateTime = 0;
    this._celebrateDuration = duration;
    this._celebrateStartX = this.x;
    this._celebrateStartY = this.y;
    this._celebratePeak = peak;
    this._celebrateRotations = rotations;
    // ensure other movement stops
    this.vx = 0; this.vy = 0;
    // lock state (optional)
    this.state = 'happy';
  }

  update(dt) {
    // celebration animation overrides other movement/AI while active
    if (this.celebrating) {
      this._celebrateTime += dt;
      const t = Math.min(1, this._celebrateTime / this._celebrateDuration);
      // vertical offset: up then down using sin(pi * t) so it returns to 0 at end
      const offsetY = -this._celebratePeak * Math.sin(Math.PI * t);
      this.y = this._celebrateStartY + offsetY;
      // rotation: clockwise full rotations (positive angle)
      this.rotationAngle = (2 * Math.PI) * this._celebrateRotations * t;
      // keep spriteRect aligned while celebrating (use current frame size)
      const img = (this.walkFrames && this.walkFrames[this.frameIndex]) ? this.walkFrames[this.frameIndex] : null;
      const iw = (img && img.width) || 100;
      const ih = (img && img.height) || 100;
      const maxH = height * 0.35;
      const maxW = width * 0.5;
      const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.35);
      const w = iw * scaleFactor * this.displayScale;
      const h = ih * scaleFactor * this.displayScale;
      this.spriteRect.x = this.x - w/2;
      this.spriteRect.y = this.y - h/2;
      this.spriteRect.w = w;
      this.spriteRect.h = h;
      // finish celebration
      if (this._celebrateTime >= this._celebrateDuration) {
        this.celebrating = false;
        this._celebrateTime = 0;
        this.rotationAngle = 0;
        // ensure exact landing at original position
        this.x = this._celebrateStartX;
        this.y = this._celebrateStartY;
        // recompute spriteRect final
        this.spriteRect.x = this.x - w/2;
        this.spriteRect.y = this.y - h/2;
        this.spriteRect.w = w;
        this.spriteRect.h = h;
        // STOP happy playback when celebration ends so animation returns to idle
        this.state = 'walk';
        this.animTime = 0;
        this.happyAnimTime = 0;
        this.playHappyOnceFlag = false;
        this.happyDuration = 0;
      }
      // skip normal movement while celebrating
      return;
    }

    // If in happy state: advance happy timer and when finished, return to walk.
    // Also update spriteRect so the character keeps its on-screen size/position
    if (this.state === 'happy') {
      this.happyAnimTime += dt;
      if (this.playHappyOnceFlag && this.happyAnimTime >= this.happyDuration) {
        // one loop complete -> return to normal walk
        this.playHappyOnceFlag = false;
        this.happyAnimTime = 0;
        this.state = 'walk';
        this.animTime = 0;
      }

      // ensure spriteRect remains valid while happy is playing so UI/overlays continue to align
      // use current happy frame size if available, otherwise fallback to walk frame sizing
      const hfLen = (this.happyFrames && this.happyFrames.length) ? this.happyFrames.length : 0;
      const img = hfLen > 0
        ? this.happyFrames[Math.floor((this.happyAnimTime * this.happyFps) % hfLen)]
        : (this.walkFrames[this.frameIndex] || this.walkFrames[0]);
      const iw = (img && img.width) || 100;
      const ih = (img && img.height) || 100;
      const maxH = height * 0.35;
      const maxW = width * 0.5;
      const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.2);
      const w = iw * scaleFactor * this.displayScale;
      const h = ih * scaleFactor * this.displayScale;
      this.spriteRect.x = this.x - w/2;
      this.spriteRect.y = this.y - h/2;
      this.spriteRect.w = w;
      this.spriteRect.h = h;

      // do NOT stop the rest of the sketch from drawing — update returns so only character movement is paused
      return;
    }

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
        this.frustration = Math.max(0, this.frustration - 1);
        this.frustrationTickTimer -= this.frustrationTickInterval;
      }
    }

    if (this.state === 'sleep') {
      // animate sleep only
      const animFps = 8;
      this.animTime += dt;
      const total = this.sleepFrames.length || 1;
      this.frameIndex = Math.floor((this.animTime * animFps) % total);
      return;
    }

    // follow-target movement overrides wandering
    if (this.followTarget && this.followTarget.active) {
      const tx = this.followTarget.x;
      const ty = this.followTarget.y;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      // stop if within tolerance
      const tol = (typeof this.followTarget.tolerance === 'number') ? this.followTarget.tolerance : 12;
      if (dist <= tol) {
        this.followTarget.active = false;
        this.vx = 0; this.vy = 0;
      } else {
        // steer toward target smoothly
        const angle = Math.atan2(dy, dx);
        const targetSpeed = (this.followTarget.speed || (this.baseSpeed * 1.0)) * this.speedMultiplier;
        const targetVx = Math.cos(angle) * targetSpeed;
        const targetVy = Math.sin(angle) * targetSpeed;
        const t = 1 - Math.exp(-this.smoothness * dt);
        this.vx += (targetVx - this.vx) * t;
        this.vy += (targetVy - this.vy) * t;
        // integrate
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        // update animation/time so sprite animates while moving
        const moving = Math.hypot(this.vx, this.vy) > 6;
        const curFps = this.isPressed ? this.pressedFps : this.fps;
        this.animTime += dt * (moving ? 1 : 0.4);
        const total = this.walkFrames.length || 1;
        this.frameIndex = Math.floor((this.animTime * curFps) % total);
        // update sprite rect to match new position
        const img = this.walkFrames[this.frameIndex] || this.walkFrames[0];
        const iw = (img && img.width) || 100;
        const ih = (img && img.height) || 100;
        const maxH = height * 0.35;
        const maxW = width * 0.5;
        const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.35);
        const w = iw * scaleFactor * this.displayScale;
        const h = ih * scaleFactor * this.displayScale;
        this.spriteRect.x = this.x - w/2;
        this.spriteRect.y = this.y - h/2;
        this.spriteRect.w = w;
        this.spriteRect.h = h;
        return;
      }
    }

    // wandering
    this.turnTimer += dt;
    if (this.turnTimer >= this.changeInterval) {
      this.turnTimer = 0;
      this.changeInterval = 0.8 + Math.random() * (2.5 - 0.8);
      if (Math.random() < 0.14) this.dirAngle = Math.random() * Math.PI * 2;
      else this.dirAngle += (Math.random() * (2 * Math.PI / 3) - Math.PI / 3);
    }

    const targetSpeed = this.baseSpeed * this.speedMultiplier;
    const targetVx = Math.cos(this.dirAngle) * targetSpeed;
    const targetVy = Math.sin(this.dirAngle) * targetSpeed;
    const t = 1 - Math.exp(-this.smoothness * dt);
    this.vx += (targetVx - this.vx) * t;
    this.vy += (targetVy - this.vy) * t;

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
    const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.35);
    const w = iw * scaleFactor * this.displayScale;
    const h = ih * scaleFactor * this.displayScale;
    const halfW = w * 0.5;
    const halfH = h * 0.5;

    // clamp to screen so visible sprite touches edges
    if (this.x < halfW) { this.x = halfW; this.vx = Math.abs(this.vx) * 0.6; this.dirAngle = Math.PI - this.dirAngle; }
    if (this.x > width - halfW) { this.x = width - halfW; this.vx = -Math.abs(this.vx) * 0.6; this.dirAngle = Math.PI - this.dirAngle; }
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
    this.frameIndex = Math.floor((this.animTime * curFps) % total);

    // update sprite rect for input tests
    this.spriteRect.x = this.x - w/2;
    this.spriteRect.y = this.y - h/2;
    this.spriteRect.w = w;
    this.spriteRect.h = h;
  }

  draw() {
    // If happy state, draw happy frame using the character's spriteRect size/position
    if (this.state === 'happy' && this.happyFrames && this.happyFrames.length > 0) {
      const idx = Math.floor((this.happyAnimTime * this.happyFps) % this.happyFrames.length);
      const img = this.happyFrames[idx];
      if (img) {
        imageMode(CENTER);
        push();
        translate(this.x, this.y);
        rotate(this.rotationAngle);
        image(img, 0, 0, img.width * this.displayScale, img.height * this.displayScale);
        pop();
        return;
      }
    }

    // rotation/scale for celebration state
    const rot = (this.celebrating && this.rotationAngle !== 0) ? this.rotationAngle : 0;
    const scl = this.displayScale;
    const img = (this.state === 'sleep' && this.sleepFrames.length > 0)
      ? this.sleepFrames[this.frameIndex]
      : this.walkFrames[this.frameIndex];

    if (img) {
      imageMode(CENTER);
      push();
      translate(this.x, this.y);
      rotate(rot);
      image(img, 0, 0, img.width * scl, img.height * scl);
      pop();
    }
  }
}