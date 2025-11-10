// Autonomous movable character sprite using your PNG sequence (SparkWalk0001..SparkWalk0161)
// - sprite wanders around on its own
// - clicking/tapping the sprite briefly speeds movement + animation
// - responsive sizing for any mobile screen
// - after 60s without user input, switch to sleep animation and stay in place

let walkFrames = [];
let requestedFrameCount = 161;      // SparkWalk0001 .. SparkWalk0161
const basePath = 'assets/walk';
const prefix = 'SparkWalk';
const pad = 4;
const ext = '.png';

// NEW: sleep animation (loaded and stored; used for sleep state)
let sleepFrames = [];
let requestedSleepCount = 68;       // SparkSleep0001 .. SparkSleep0068
const sleepBasePath = 'assets/sleep';
const sleepPrefix = 'SparkSleep';
const sleepPad = 4;
const sleepExt = '.png';

let canvas;
let char = {
  x: 0, y: 0,
  vx: 0, vy: 0,
  baseSpeed: 140,       // px/s base wander speed
  speedMultiplier: 1,   // increases while pressed
  maxSpeed: 800,
  turnTimer: 0,
  changeInterval: 1.5,  // seconds between direction changes
  dirAngle: 0,
  smoothness: 8,        // how quickly velocity follows target
  frameIndex: 0,
  animTime: 0,
  fps: 12,
  pressedFps: 28,
  drawW: 0, drawH: 0,
  state: 'walk'         // 'walk' or 'sleep'
};

// NEW: frustration parameters (starts at 0)
let frustration = 0;                 // current frustration level (starts 0)
const frustrationIncrease = 10;      // added when clicked/tapped

// NEW: tick-based decay (1 point every 3 seconds)
const frustrationTickInterval = 3.0; // seconds per -1
let frustrationTickTimer = 0.0;

let isPressed = false;   // true while pointer is down on sprite
let pressTimeout = 0.0;  // seconds remaining for speed boost after tap
let dragging = false;    // not used for autonomous movement, but remains available
let spriteRect = { x:0, y:0, w:0, h:0 };
let attemptedFiles = [];

// NEW: idle-to-sleep timing based on user input
const sleepAfterSeconds = 30; // switch to sleep after 30s of no input
let lastInputTime = 0;        // seconds (set in setup)

function preload() {
  attemptedFiles = [];
  walkFrames = [];
  // load SparkWalk0001 .. SparkWalk0161
  for (let i = 1; i <= requestedFrameCount; i++) {
    const filename = `${basePath}/${prefix}${nf(i, pad)}${ext}`;
    attemptedFiles.push(filename);
    walkFrames.push(loadImage(filename,
      img => {},
      err => { console.warn('loadImage error for', filename); }
    ));
  }

  // load SparkSleep0001 .. SparkSleep0068
  sleepFrames = [];
  for (let i = 1; i <= requestedSleepCount; i++) {
    const filename = `${sleepBasePath}/${sleepPrefix}${nf(i, sleepPad)}${sleepExt}`;
    attemptedFiles.push(filename);
    sleepFrames.push(loadImage(filename,
      img => {},
      err => { console.warn('loadImage error for', filename); }
    ));
  }
}

function setup() {
  pixelDensity(1);
  canvas = createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  if (canvas && canvas.elt) canvas.elt.style.touchAction = 'none';

  // set last input time to now
  lastInputTime = millis() / 1000;

  // keep placeholders for missing walk frames so indexing stays stable
  for (let i = 0; i < walkFrames.length; i++) {
    const img = walkFrames[i];
    if (!img || !img.width || !img.height) {
      const pg = createGraphics(64, 64);
      pg.background(100);
      pg.fill(255);
      pg.textAlign(CENTER, CENTER);
      pg.textSize(10);
      pg.text('missing\n' + (i+1), 32, 32);
      walkFrames[i] = pg;
    }
  }

  // placeholders for missing sleep frames (keeps stored array consistent)
  for (let i = 0; i < sleepFrames.length; i++) {
    const img = sleepFrames[i];
    if (!img || !img.width || !img.height) {
      const pg = createGraphics(64, 64);
      pg.background(80);
      pg.fill(255);
      pg.textAlign(CENTER, CENTER);
      pg.textSize(10);
      pg.text('sleep\n' + (i+1), 32, 32);
      sleepFrames[i] = pg;
    }
  }

  // ensure at least one walk frame
  if (walkFrames.length === 0) {
    const pg = createGraphics(160, 160);
    pg.background(200,50,50);
    pg.fill(255);
    pg.textAlign(CENTER, CENTER);
    pg.textSize(16);
    pg.text('NO FRAMES', 80, 80);
    walkFrames = [pg];
  }

  // downscale large frames for performance (both walk and sleep)
  const desiredMax = Math.floor(min(windowWidth, windowHeight) * 0.35);
  for (let i = 0; i < walkFrames.length; i++) {
    const img = walkFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }
  for (let i = 0; i < sleepFrames.length; i++) {
    const img = sleepFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }

  // init char position and wander direction
  char.x = width / 2;
  char.y = height / 2;
  char.dirAngle = random(TWO_PI);
  char.changeInterval = random(0.6, 2.2);
  char.drawW = walkFrames[0].width;
  char.drawH = walkFrames[0].height;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  const desiredMax = Math.floor(min(windowWidth, windowHeight) * 0.35);
  for (let i = 0; i < walkFrames.length; i++) {
    const img = walkFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }
  for (let i = 0; i < sleepFrames.length; i++) {
    const img = sleepFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }
}

function draw() {
  background(30);

  const dt = deltaTime / 1000;
  const now = millis() / 1000;

  // --- frustration tick decay: decrease by 1 every frustrationTickInterval seconds when not pressed
  if (!isPressed && frustration > 0) {
    frustrationTickTimer += dt;
    while (frustrationTickTimer >= frustrationTickInterval && frustration > 0) {
      frustration = max(0, frustration - 1);
      frustrationTickTimer -= frustrationTickInterval;
    }
  }

  // --- SLEEP CHECK: if no input for sleepAfterSeconds, enter sleep state and stay in place
  if (now - lastInputTime >= sleepAfterSeconds) {
    if (char.state !== 'sleep') {
      char.state = 'sleep';
      // stop movement immediately
      char.vx = 0;
      char.vy = 0;
      // reset animation timing so sleep starts cleanly
      char.animTime = 0;
    }
  } else {
    // if not sleeping, keep state walking
    if (char.state === 'sleep') char.state = 'walk';
  }

  // If sleeping: do not run autonomous movement; just animate sleep frames in place
  if (char.state === 'sleep') {
    // animate sleep frames only
    const animFps = 8; // fixed sleep fps
    char.animTime += dt;
    const totalSleep = sleepFrames.length || 1;
    char.frameIndex = floor((char.animTime * animFps) % totalSleep);
    // draw sleep frame (no flipping)
    drawCharacterFrame(sleepFrames[char.frameIndex], char.x, char.y, false);

    // HUD (include state + frustration)
    push();
    noStroke();
    fill(255);
    textSize(12);
    textAlign(LEFT, TOP);
    text(`state: ${char.state}`, 8, 8);
    text(`frames (walk): ${walkFrames.length}`, 8, 24);
    text(`frustration: ${floor(frustration)}`, 8, 40);
    pop();

    return; // skip the rest of movement/update logic
  }

  // --- autonomous wander (only when not sleeping) ---
  char.turnTimer += dt;
  if (char.turnTimer >= char.changeInterval) {
    char.turnTimer = 0;
    char.changeInterval = random(0.8, 2.5);
    if (random() < 0.14) {
      char.dirAngle = random(TWO_PI);
    } else {
      char.dirAngle += random(-PI / 3, PI / 3);
    }
  }

  // compute target velocity from direction and base speed (modified by press)
  const targetSpeed = char.baseSpeed * char.speedMultiplier;
  const targetVx = cos(char.dirAngle) * targetSpeed;
  const targetVy = sin(char.dirAngle) * targetSpeed;

  // smooth velocity toward target
  const t = 1 - Math.exp(-char.smoothness * dt); // smoothing factor
  char.vx = lerp(char.vx, targetVx, t);
  char.vy = lerp(char.vy, targetVy, t);

  // clamp maximum
  const sp = Math.hypot(char.vx, char.vy);
  if (sp > char.maxSpeed) {
    const s = char.maxSpeed / sp;
    char.vx *= s; char.vy *= s;
  }

  // integrate position
  char.x += char.vx * dt;
  char.y += char.vy * dt;

  // --- COLLISION: bounce when sprite touches screen edges (uses current frame draw size) ---
  {
    const imgForSize = walkFrames[char.frameIndex] || walkFrames[0];
    const iw = imgForSize.width || 100;
    const ih = imgForSize.height || 100;
    const maxH = height * 0.35;
    const maxW = width * 0.5;
    const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.2);
    const w = iw * scaleFactor;
    const h = ih * scaleFactor;

    // use visible (non-transparent) portion for collision so sprite visually touches edge
    const pad = computeVisiblePadding(imgForSize);
    const visibleDrawW = w * (pad.visibleW / iw);
    const visibleDrawH = h * (pad.visibleH / ih);
    const halfVisibleW = visibleDrawW * 0.5;
    const halfVisibleH = visibleDrawH * 0.5;

    const leftLimit = halfVisibleW;
    const rightLimit = width - halfVisibleW;
    const topLimit = halfVisibleH;
    const bottomLimit = height - halfVisibleH;

    let bounced = false;

    // Left / Right collisions
    if (char.x < leftLimit) {
      char.x = leftLimit;
      char.dirAngle = PI - char.dirAngle;
      char.vx = Math.abs(char.vx) * 0.6;
      char.vy *= 0.8;
      bounced = true;
    } else if (char.x > rightLimit) {
      char.x = rightLimit;
      char.dirAngle = PI - char.dirAngle;
      char.vx = -Math.abs(char.vx) * 0.6;
      char.vy *= 0.8;
      bounced = true;
    }

    // Top / Bottom collisions
    if (char.y < topLimit) {
      char.y = topLimit;
      char.dirAngle = -char.dirAngle;
      char.vy = Math.abs(char.vy) * 0.6;
      char.vx *= 0.8;
      bounced = true;
    } else if (char.y > bottomLimit) {
      char.y = bottomLimit;
      char.dirAngle = -char.dirAngle;
      char.vy = -Math.abs(char.vy) * 0.6;
      char.vx *= 0.8;
      bounced = true;
    }

    if (bounced) {
      char.dirAngle += random(-0.25, 0.25);
      char.turnTimer = 0;
      char.changeInterval = random(0.8, 1.6);
    }
  }
  // --- end COLLISION ---

  // press timeout reduces speedMultiplier over time
  if (pressTimeout > 0) {
    pressTimeout -= dt;
    if (pressTimeout <= 0) {
      pressTimeout = 0;
      isPressed = false;
      char.speedMultiplier = 1;
    }
  }

  // animation timing and frame selection (walk frames)
  const moving = Math.hypot(char.vx, char.vy) > 6;
  const curFps = isPressed ? char.pressedFps : char.fps;
  char.animTime += dt * (moving ? 1 : 0.4);
  const total = walkFrames.length;
  char.frameIndex = floor((char.animTime * curFps) % total);

  // facing: when velocity points left, flip sprite
  const facingLeft = char.vx < -6;

  // draw main character
  drawCharacterFrame(walkFrames[char.frameIndex], char.x, char.y, facingLeft);

  // small HUD
  push();
  noStroke();
  fill(255);
  textSize(12);
  textAlign(LEFT, TOP);
  text(`state: ${char.state}`, 8, 8);
  text(`frames (walk): ${walkFrames.length}  idx: ${char.frameIndex}`, 8, 24);
  text(`speed x: ${nf(char.vx,1,1)}  y: ${nf(char.vy,1,1)}  mult: ${nf(char.speedMultiplier,1,2)}`, 8, 40);
  text(`frustration: ${floor(frustration)}`, 8, 56);
  pop();
}

function drawCharacterFrame(img, cx, cy, flipped) {
  if (!img) return;
  const maxH = height * 0.35;
  const maxW = width * 0.5;
  const iw = img.width || 100;
  const ih = img.height || 100;
  const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.2);
  const w = iw * scaleFactor;
  const h = ih * scaleFactor;
  char.drawW = w; char.drawH = h;

  push();
  translate(cx, cy);
  if (flipped) scale(-1, 1);
  imageMode(CENTER);
  image(img, 0, 0, w, h);
  pop();

  spriteRect.x = cx - w / 2;
  spriteRect.y = cy - h / 2;
  spriteRect.w = w;
  spriteRect.h = h;
}

// clicking/tapping the sprite speeds it up briefly -----------------------
function mousePressed() {
  lastInputTime = millis() / 1000; // record activity
  if (isPointInRect(mouseX, mouseY, spriteRect)) {
    // boost speed + animation briefly
    isPressed = true;
    char.speedMultiplier = 2.2;
    pressTimeout = 0.7; // seconds of boosted speed
    frustration = min(100, frustration + frustrationIncrease);
    // wake from sleep if was sleeping
    if (char.state === 'sleep') {
      char.state = 'walk';
      char.animTime = 0;
    }
    return false;
  }
}

function mouseReleased() {
  // let timeout handle reset
}

function touchStarted() {
  lastInputTime = millis() / 1000; // record activity
  const tx = touches && touches.length ? touches[0].x : mouseX;
  const ty = touches && touches.length ? touches[0].y : mouseY;
  if (isPointInRect(tx, ty, spriteRect)) {
    isPressed = true;
    char.speedMultiplier = 2.2;
    pressTimeout = 0.7;
    frustration = min(100, frustration + frustrationIncrease);
    if (char.state === 'sleep') {
      char.state = 'walk';
      char.animTime = 0;
    }
    return false;
  }
  return true;
}

function touchEnded() {
  // handled by pressTimeout
  return false;
}

function keyPressed() {
  lastInputTime = millis() / 1000; // keyboard counts as input and wakes
  if (char.state === 'sleep') {
    char.state = 'walk';
    char.animTime = 0;
  }
}

function isPointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// cache for computed visible padding per image
const visiblePaddingCache = new WeakMap();

function computeVisiblePadding(img) {
  if (!img || !img.width || !img.height) return { visibleW: img ? img.width : 0, visibleH: img ? img.height : 0, leftPad: 0, rightPad: 0, topPad: 0, bottomPad: 0 };
  if (visiblePaddingCache.has(img)) return visiblePaddingCache.get(img);

  img.loadPixels();
  const w = img.width, h = img.height;
  let left = w, right = -1, top = h, bottom = -1;
  const px = img.pixels;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = 4 * (y * w + x);
      const a = px[idx + 3];
      if (a > 10) { // threshold for "visible" pixel
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (right < left) {
    // fully transparent: fallback to full image size
    const result = { leftPad: 0, rightPad: 0, topPad: 0, bottomPad: 0, visibleW: w, visibleH: h };
    visiblePaddingCache.set(img, result);
    return result;
  }

  const leftPad = left;
  const rightPad = w - 1 - right;
  const topPad = top;
  const bottomPad = h - 1 - bottom;
  const visibleW = right - left + 1;
  const visibleH = bottom - top + 1;
  const result = { leftPad, rightPad, topPad, bottomPad, visibleW, visibleH };
  visiblePaddingCache.set(img, result);
  return result;
}