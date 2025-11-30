// Autonomous movable character sprite using your PNG sequence (SparkWalk0001..SparkWalk0161)
// - sprite wanders around on its own
// - clicking/tapping the sprite briefly speeds movement + animation
// - responsive sizing for any mobile screen
// - after 30s without user input, switch to sleep animation and stay in place
// - when frustration reaches 100, play angry animation for 10s and disable interaction
// - additional animations: sleep, angry, happy
// - speed boost on touches, decay after idle, hold behavior at high frustration

let canvas;
let lastInputTime = 0;

let walkFrames = [];
let requestedFrameCount = 161;      // SparkWalk0001 .. SparkWalk0161
const basePath = 'assets/walk';
const prefix = 'SparkWalk';
const pad = 4;
const ext = '.png';

// sleep animation
let sleepFrames = [];
let requestedSleepCount = 68;       // SparkSleep0001 .. SparkSleep0068
const sleepBasePath = 'assets/sleep';
const sleepPrefix = 'SparkSleep';
const sleepPad = 4;
const sleepExt = '.png';

// angry animation
let angryFrames = [];
let requestedAngryCount = 85;       // SparkAngry0001 .. SparkAngry0085
const angryBasePath = 'assets/angry';
const angryPrefix = 'SparkAngry';
const angryPad = 4;
const angryExt = '.png';

// happy animation
let happyFrames = [];
let requestedHappyCount = 200;      // SparkHappy0001 .. SparkHappy0200
const happyBasePath = 'assets/happy';
const happyPrefix = 'SparkHappy';
const happyPad = 4;
const happyExt = '.png';

let player;

// Angry state control
let isAngry = false;
let angryTimer = 0;
const angryDuration = 10.0;   // seconds to stay angry
let angryAnimTime = 0;
const angryFps = 18;

// NEW: incremental speed boost on touch, then decay to default after 10s idle
let defaultBaseSpeed = null;
let speedBoost = 0;
const speedBoostPerTouch = 30;   // increase each touch (px/s)
const speedBoostMax = 300;       // cap boost
const speedDecayDelay = 10.0;    // seconds of no touch before decay starts
const speedDecayRate = 30;       // px/s decay rate while decaying
let lastSpeedInputTime = 0;

// NEW: hold behavior threshold: at or above this frustration the character keeps current speed and never sleeps
const frustrationHoldThreshold = 70;

// sleep timeout
const sleepAfterSeconds = 30; // seconds without input to go to sleep

// NEW: save/restore speed across angry mode
let savedSpeedBoost = 0;
let savedPlayerBaseSpeed = null;

// NEW: factor to use when frustration >= threshold (keeps character moving fast)
const holdBoostFactor = 1.6;

// NEW: happiness meter (starts at 0)
let happiness = 0;
const happinessMax = 100;

// NEW: happiness decay timer — decrease by 1 every 2 seconds
const happinessTickInterval = 2.0; // seconds per -1
let happinessTickTimer = 0.0;

// NEW: happy playback controller (for one-loop happy animation)
// const happyFps = 18;
const happyFps = 36; // increased FPS to make happy animation play faster
let happyPlayback = {
  active: false,
  animTime: 0,
  duration: 0
};

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

  // load SparkAngry0001 .. SparkAngry0085
  angryFrames = [];
  for (let i = 1; i <= requestedAngryCount; i++) {
    const filename = `${angryBasePath}/${angryPrefix}${nf(i, angryPad)}${angryExt}`;
    attemptedFiles.push(filename);
    angryFrames.push(loadImage(filename,
      img => {},
      err => { console.warn('loadImage error for', filename); }
    ));
  }

  // load SparkHappy0001 .. SparkHappy0200
  happyFrames = [];
  for (let i = 1; i <= requestedHappyCount; i++) {
    const filename = `${happyBasePath}/${happyPrefix}${nf(i, happyPad)}${happyExt}`;
    attemptedFiles.push(filename);
    // load into array (preload blocks till images load)
    happyFrames.push(loadImage(filename,
      img => { /* loaded */ },
      err => { console.warn('loadImage error for', filename); }
    ));
  }

  // verify loaded happy frames and log counts (helps diagnose 0-frame issues)
  let loadedHappyCount = 0;
  for (let i = 0; i < happyFrames.length; i++) {
    const img = happyFrames[i];
    if (img && img.width && img.height) loadedHappyCount++;
  }
  console.log(`preload: attempted happy frames = ${happyFrames.length}, loaded = ${loadedHappyCount}`);
  if (loadedHappyCount === 0) {
    console.warn('No happy frames loaded from assets/happy. Verify files SparkHappy0001..SparkHappy0200 exist, the path is correct, and casing matches exactly.');
  }

  // --- plate asset load moved to plate.js ---
  loadPlateAssets(); // make sure plate.js is already included in index.html
}

function setup() {
  pixelDensity(1);
  canvas = createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  // remove white page/canvas border and ensure canvas sits flush
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  // match body background to sketch background so no white shows through
  document.body.style.background = '#1e1e1e';

  // ensure canvas element has no margin/border and is block-level
  if (canvas) {
    canvas.style('display', 'block');
    canvas.style('margin', '0');
    canvas.style('padding', '0');
    canvas.style('border', '0');
  }
  if (canvas && canvas.elt) {
    canvas.elt.style.touchAction = 'none';
    canvas.elt.style.display = 'block';
    canvas.elt.style.margin = '0';
    canvas.elt.style.padding = '0';
    canvas.elt.style.border = '0';
  }

  // set last input time to now
  lastInputTime = millis() / 1000;

  // placeholders for missing frames
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
  for (let i = 0; i < angryFrames.length; i++) {
    const img = angryFrames[i];
    if (!img || !img.width || !img.height) {
      const pg = createGraphics(64, 64);
      pg.background(120, 20, 20);
      pg.fill(255);
      pg.textAlign(CENTER, CENTER);
      pg.textSize(10);
      pg.text('angry\n' + (i+1), 32, 32);
      angryFrames[i] = pg;
    }
  }
  for (let i = 0; i < happyFrames.length; i++) {
    const img = happyFrames[i];
    if (!img || !img.width || !img.height) {
      const pg = createGraphics(64, 64);
      pg.background(20, 120, 20);
      pg.fill(255);
      pg.textAlign(CENTER, CENTER);
      pg.textSize(10);
      pg.text('happy\n' + (i+1), 32, 32);
      happyFrames[i] = pg;
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

  // downscale large frames for performance (walk, sleep, angry, happy)
  const desiredMax = Math.floor(min(windowWidth, windowHeight) * 0.35);
  for (let i = 0; i < walkFrames.length; i++) {
    const img = walkFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }
  for (let i = 0; i < sleepFrames.length; i++) {
    const img = sleepFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }
  for (let i = 0; i < angryFrames.length; i++) {
    const img = angryFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }
  for (let i = 0; i < happyFrames.length; i++) {
    const img = happyFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }

  player = new Character(width/2, height/2, walkFrames, sleepFrames);

  // initialize speed baseline
  defaultBaseSpeed = player.baseSpeed || 140;
  lastSpeedInputTime = millis() / 1000;

  // --- initialize plate (moved) ---
  initPlate(walkFrames); // <-- NEW: set plate size & position
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
  for (let i = 0; i < angryFrames.length; i++) {
    const img = angryFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }
  for (let i = 0; i < happyFrames.length; i++) {
    const img = happyFrames[i];
    if (img.width > desiredMax || img.height > desiredMax) img.resize(0, desiredMax);
  }

  // reposition plate to bottom-center on resize (unless being dragged)
  const plateMargin = 24;
  electricPlate.resetX = Math.round(width * 0.5);
  electricPlate.resetY = Math.round(height - plateMargin - electricPlate.h * 0.5);
  if (!electricPlate.held) {
    electricPlate.x = electricPlate.resetX;
    electricPlate.y = electricPlate.resetY;
  }
}

function draw() {
  background(30);
  const dt = deltaTime / 1000;

  // --- happiness decay: -1 every happinessTickInterval seconds ---
  if (typeof happiness === 'number' && happiness > 0) {
    happinessTickTimer += dt;
    if (happinessTickTimer >= happinessTickInterval) {
      happiness = Math.max(0, happiness - 1);
      happinessTickTimer -= happinessTickInterval;
      // guard: prevent multiple immediate decrements if timer is large
      happinessTickTimer = Math.min(happinessTickTimer, happinessTickInterval * 1.5);
    }
  }

  // --- draw plate early (moved) ---
  drawPlate(); // <-- NEW: draw plate from plate.js

  // If a one-loop happy playback is active, render the happy animation at the player's position
  if (happyPlayback.active) {
    const pd = happyFrames.length || 1;
    // duration already computed when starting; fallback compute if needed
    if (!happyPlayback.duration || happyPlayback.duration <= 0) {
      happyPlayback.duration = pd / happyFps;
    }
    happyPlayback.animTime += dt;

    // choose frame index for current animTime
    const idx = floor((happyPlayback.animTime * happyFps) % pd);
    const img = happyFrames[idx];
    if (img) {
      const iw = img.width || 100;
      const ih = img.height || 100;
      const maxH = height * 0.35;
      const maxW = width * 0.5;
      const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.2);
      const w = iw * scaleFactor;
      const h = ih * scaleFactor;
      push();
      imageMode(CENTER);
      translate(player.x, player.y);
      image(img, 0, 0, w, h);
      pop();
    }

    // when the loop finishes, stop playback and resume normal behavior
    if (happyPlayback.animTime >= happyPlayback.duration) {
      happyPlayback.active = false;
      happyPlayback.animTime = 0;
      happyPlayback.duration = 0;
      // ensure player returns to walk state after happy playback
      if (player) {
        player.state = 'walk';
        player.animTime = 0;
      }
    }
    // skip normal update/draw while playing happy one-loop
    return;
  }

  // set base speed depending on frustration hold state
  if (!isAngry && player) {
    if (player.frustration >= frustrationHoldThreshold) {
      // lock to a faster base speed while in "hold" (frustration >= 70)
      player.baseSpeed = (defaultBaseSpeed || 140) * holdBoostFactor;
    } else {
      // normal idle base speed (temporary boosts come from player.onClick / pressTimeout)
      player.baseSpeed = defaultBaseSpeed || 140;
    }
  }
  
  // --- trigger angry mode when frustration reaches 100 ---
  if (!isAngry && player && player.frustration >= 100) {
    // save current speed state so it can be restored after angry finishes
    savedSpeedBoost = speedBoost;
    savedPlayerBaseSpeed = player.baseSpeed;

    isAngry = true;
    angryTimer = angryDuration;
    angryAnimTime = 0;
    // freeze player and disable interaction state
    player.vx = 0;
    player.vy = 0;
    player.isPressed = false;
    // avoid immediate retrigger while angry
    player.frustration = 0;

    // prevent immediate decay while angry (keeps timers consistent)
    lastSpeedInputTime = millis() / 1000;
  }

  if (isAngry) {
    // Angry mode: animate angryFrames at player's position, disable player update/draw & interactions
    angryTimer -= dt;
    angryAnimTime += dt;
    const total = angryFrames.length || 1;
    const idx = floor((angryAnimTime * angryFps) % total);
    const img = angryFrames[idx];

    // compute draw size similar to drawCharacterFrame
    if (img) {
      const iw = img.width || 100;
      const ih = img.height || 100;
      const maxH = height * 0.35;
      const maxW = width * 0.5;
      const scaleFactor = Math.min(maxW / iw, maxH / ih, 1.2);
      const w = iw * scaleFactor;
      const h = ih * scaleFactor;
      push();
      imageMode(CENTER);
      translate(player.x, player.y);
      image(img, 0, 0, w, h);
      pop();
    }

    // HUD show angry and remaining time
    push();
    noStroke();
    fill(255, 150, 150);
    textSize(12);
    textAlign(LEFT, TOP);
    // show countdown (seconds remaining) next to the angry label
    const timeLeft = max(0, angryTimer);
    text(`About-to-explode-level ANGRY  ${nf(timeLeft, 1, 1)}s`, 8, 8);
    pop();

    if (angryTimer <= 0) {
      isAngry = false;
      angryTimer = 0;
      angryAnimTime = 0;
      // ensure player resumes normal state and set frustration to 50
      if (player) {
        player.vx = 0;
        player.vy = 0;
        player.isPressed = false;
        player.frustration = 50; // set frustration to 50 after angry finishes

        // restore speed state from before angry mode so speed doesn't drop
        speedBoost = savedSpeedBoost;
        if (savedPlayerBaseSpeed != null) {
          player.baseSpeed = savedPlayerBaseSpeed;
        } else {
          player.baseSpeed = (defaultBaseSpeed || 140) + speedBoost;
        }
        // reset decay timer so boost doesn't immediately decay
        lastSpeedInputTime = millis() / 1000;

        // KEEP THE CHARACTER MOVING: restore walk state and reset activity timer
        player.state = 'walk';
        player.animTime = 0;
        lastInputTime = millis() / 1000; // prevents immediate sleep after angry ends
      }
    }
    return; // skip normal update/draw while angry
  }

  // normal operation when not angry
  player.update(dt);
  player.draw();

  // HUD
  push();
  noStroke();
  fill(255);
  textSize(12);
  textAlign(LEFT, TOP);
  const leftX = 8; // left alignment for HUD items
  text(`state: ${player.state}`, leftX, 8);
  text(`frames (walk): ${walkFrames.length}  idx: ${player.frameIndex}`, leftX, 24);
  const frustrationY = 40;
  text(`frustration: ${floor(player.frustration)}`, leftX, frustrationY);

  // happiness meter (starts at 0) shown under frustration
  text(`happiness: ${floor(happiness)}`, leftX, frustrationY + 16);
  pop();
}

// clicking/tapping handlers: make boost temporary only
function increaseSpeedBoost() {
  // no persistent speedBoost anymore — touch only yields temporary speed via player.onClick()
  lastSpeedInputTime = millis() / 1000;
}

function mousePressed() {
  // plate gets first dibs
  if (plateMousePressed(mouseX, mouseY)) return false;

  // original behavior: clicking player
  if (isAngry) return false;
  if (player && player.isPointInside(mouseX, mouseY)) {
    player.onClick();
    increaseSpeedBoost();
  }
  if (player) player.setLastInput();
  return false;
}

function mouseDragged() {
  if (plateMouseDragged(mouseX, mouseY)) return false;
  return false;
}

function mouseReleased() {
  if (plateMouseReleased()) return false;
  return false;
}

function touchStarted() {
  const tx = touches?.[0]?.x ?? mouseX;
  const ty = touches?.[0]?.y ?? mouseY;
  if (plateTouchStarted(tx, ty)) return false;

  if (isAngry) return false;
  if (player && player.isPointInside(tx, ty)) {
    player.onClick();
    increaseSpeedBoost();
  }
  if (player) player.setLastInput();
  return false;
}

function touchMoved() {
  const tx = touches?.[0]?.x ?? mouseX;
  const ty = touches?.[0]?.y ?? mouseY;
  if (plateTouchMoved(tx, ty)) return false;
  return true;
}

function touchEnded() {
  if (plateTouchEnded()) return false;
  return false;
}

// helper: point in rect
function _ptInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// NEW: start happy playback (one-loop happy animation)
function startHappyPlayback() {
  if (!happyFrames || happyFrames.length === 0) {
    console.warn('startHappyPlayback: no happyFrames available');
    return;
  }
  happyPlayback.active = true;
  happyPlayback.animTime = 0;
  happyPlayback.duration = happyFrames.length / happyFps; // one full loop
  console.log('startHappyPlayback: started, duration', happyPlayback.duration);
  if (player) {
    player.state = 'happy';
    player.animTime = 0;
  }
}