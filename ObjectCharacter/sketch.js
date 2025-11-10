// Autonomous movable character sprite using your PNG sequence (SparkWalk0001..SparkWalk0161)
// - sprite wanders around on its own
// - clicking/tapping the sprite briefly speeds movement + animation
// - responsive sizing for any mobile screen

let walkFrames = [];
let requestedFrameCount = 161;      // SparkWalk0001 .. SparkWalk0161
const basePath = 'assets/walk';
const prefix = 'SparkWalk';
const pad = 4;
const ext = '.png';

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
  drawW: 0, drawH: 0
};

let isPressed = false;   // true while pointer is down on sprite
let pressTimeout = 0.0;  // seconds remaining for speed boost after tap
let dragging = false;    // not used for autonomous movement, but remains available
let spriteRect = { x:0, y:0, w:0, h:0 };
let attemptedFiles = [];

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
}

function setup() {
  pixelDensity(1);
  canvas = createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  if (canvas && canvas.elt) canvas.elt.style.touchAction = 'none';

  // keep placeholders for missing frames so indexing stays stable
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

  // ensure at least one frame
  if (walkFrames.length === 0) {
    const pg = createGraphics(160, 160);
    pg.background(200,50,50);
    pg.fill(255);
    pg.textAlign(CENTER, CENTER);
    pg.textSize(16);
    pg.text('NO FRAMES', 80, 80);
    walkFrames = [pg];
  }

  // downscale large frames for performance
  const desiredMax = Math.floor(min(windowWidth, windowHeight) * 0.35);
  for (let i = 0; i < walkFrames.length; i++) {
    const img = walkFrames[i];
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
}

function draw() {
  background(30);

  const dt = deltaTime / 1000;

  // autonomous wander: occasionally change direction slightly
  char.turnTimer += dt;
  if (char.turnTimer >= char.changeInterval) {
    char.turnTimer = 0;
    char.changeInterval = random(0.8, 2.5);
    // random small turn or big turn sometimes
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
    const halfW = w * 0.5;
    const halfH = h * 0.5;

    const leftLimit = halfW;
    const rightLimit = width - halfW;
    const topLimit = halfH;
    const bottomLimit = height - halfH;

    let bounced = false;

    // Left / Right collisions
    if (char.x < leftLimit) {
      char.x = leftLimit;
      char.dirAngle = PI - char.dirAngle;
      char.vx = Math.abs(char.vx) * 0.6; // push right and dampen
      char.vy *= 0.8;
      bounced = true;
    } else if (char.x > rightLimit) {
      char.x = rightLimit;
      char.dirAngle = PI - char.dirAngle;
      char.vx = -Math.abs(char.vx) * 0.6; // push left and dampen
      char.vy *= 0.8;
      bounced = true;
    }

    // Top / Bottom collisions
    if (char.y < topLimit) {
      char.y = topLimit;
      char.dirAngle = -char.dirAngle;
      char.vy = Math.abs(char.vy) * 0.6; // push down and dampen
      char.vx *= 0.8;
      bounced = true;
    } else if (char.y > bottomLimit) {
      char.y = bottomLimit;
      char.dirAngle = -char.dirAngle;
      char.vy = -Math.abs(char.vy) * 0.6; // push up and dampen
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

  // animation timing and frame selection
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
  text(`frames:${walkFrames.length} idx:${char.frameIndex}`, 8, 8);
  text(`speed x:${nf(char.vx,1,1)} y:${nf(char.vy,1,1)} mult:${nf(char.speedMultiplier,1,2)}`, 8, 24);
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
  if (isPointInRect(mouseX, mouseY, spriteRect)) {
    // boost speed + animation briefly
    isPressed = true;
    char.speedMultiplier = 2.2;
    pressTimeout = 0.7; // seconds of boosted speed
    return false;
  }
}

function mouseReleased() {
  // let timeout handle reset; immediate release can also reset if desired:
  // isPressed = false; char.speedMultiplier = 1; pressTimeout = 0;
}

function touchStarted() {
  const tx = touches && touches.length ? touches[0].x : mouseX;
  const ty = touches && touches.length ? touches[0].y : mouseY;
  if (isPointInRect(tx, ty, spriteRect)) {
    isPressed = true;
    char.speedMultiplier = 2.2;
    pressTimeout = 0.7;
    return false;
  }
  return true;
}

function touchEnded() {
  // handled by pressTimeout
  return false;
}

function isPointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}