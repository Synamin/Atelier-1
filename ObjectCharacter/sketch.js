// Simple walker animation from a numbered PNG sequence.
// Configure the loader to match your file names and folder.

let walkFrames = [];
let FRAME_COUNT = 12;      // number of frames in your sequence
let normalFPS = 12;        // normal playback speed
let fastFPS = 30;          // faster speed when sprite is pressed
let currentIndex = 0;

const basePath = 'assets/walk'; // relative to this sketch.js; change if needed
const prefix = 'walk_';         // e.g. walk_000.png
const pad = 3;                  // zero-padding length (000, 00, etc.)
const ext = '.png';

// runtime state for pointer interaction
let isSpritePressed = false;
let spriteRect = { x: 0, y: 0, w: 0, h: 0 }; // current drawn sprite bounds

// add a canvas variable so we can safely access canvas.elt
let canvas;

function preload() {
  // load numbered frames: basePath/prefix + nf(i,pad) + ext
  for (let i = 0; i < FRAME_COUNT; i++) {
    const filename = `${basePath}/${prefix}${nf(i, pad)}${ext}`;
    // loadImage is async in p5 preload but blocks the sketch until loaded
    walkFrames.push(loadImage(filename, 
      img => {}, 
      err => {
        console.warn('Failed to load', filename, err);
      }
    ));
  }
}

function setup() {
  // limit pixelDensity to avoid huge canvases on very high-DPI devices (helps memory)
  pixelDensity(1);
  // store the returned renderer so 'canvas' exists
  canvas = createCanvas(windowWidth, windowHeight);

  console.log('canvas created:', !!canvas, 'size', windowWidth, windowHeight);
  console.log('frames loaded before filter:', walkFrames.length);

  // make image drawing centered by default
  imageMode(CENTER);
  // prevent browser gestures (pinch/scroll) interfering with the sketch on mobile
  if (canvas && canvas.elt) {
    canvas.elt.style.touchAction = 'none';
  }

  // remove any frames that failed to load (null/undefined)
  walkFrames = walkFrames.filter(f => f && f.width && f.height);
  console.log('frames after filter:', walkFrames.length);

  // resize loaded frames to a sensible maximum to reduce memory (keeps aspect ratio)
  if (walkFrames.length > 0) {
    const maxDim = Math.max(200, Math.floor(Math.min(windowWidth, windowHeight) * 0.8));
    for (let i = 0; i < walkFrames.length; i++) {
      const img = walkFrames[i];
      if (img.width > maxDim || img.height > maxDim) {
        img.resize(maxDim, 0); // resize with aspect ratio preserved
      }
    }
  }

  if (walkFrames.length === 0) {
    console.warn('No walk frames loaded. Check basePath/prefix/pad/ext and FRAME_COUNT.');
    textAlign(CENTER, CENTER);
    textSize(18);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Recalculate reasonable size for already-loaded frames on orientation/resize:
  if (walkFrames.length > 0) {
    const maxDim = Math.max(200, Math.floor(Math.min(windowWidth, windowHeight) * 0.8));
    for (let i = 0; i < walkFrames.length; i++) {
      const img = walkFrames[i];
      // Only downscale if necessary (resize doesn't enlarge if called with 0 as height)
      if (img.width > maxDim || img.height > maxDim) {
        img.resize(maxDim, 0);
      }
    }
  }
}

function draw() {
  background(240);

  // debug overlay so you can see canvas/activity immediately
  push();
  noStroke();
  fill(0);
  textSize(14);
  textAlign(LEFT, TOP);
  text('Canvas OK', 8, 8);
  text('frames: ' + walkFrames.length, 8, 26);
  text('currentIndex: ' + currentIndex, 8, 44);
  pop();

  if (walkFrames.length === 0) {
    fill(60);
    textAlign(CENTER, CENTER);
    text('No walk frames found.\nCheck file names and paths.', width/2, height/2);
    return;
  }

  // choose FPS based on whether sprite is pressed
  const fps = isSpritePressed ? fastFPS : normalFPS;

  // advance frame based on time and chosen fps
  const total = walkFrames.length;
  currentIndex = floor((millis() / (1000 / fps)) % total);

  // draw centered and fitted (also updates spriteRect for hit-testing)
  drawCentered(walkFrames[currentIndex]);
}

// helper: center and fit image into available area, responsive to any mobile screen
function drawCentered(img) {
  if (!img) return;
  push();
  imageMode(CENTER);

  // Responsive bounding box: use different vertical space depending on orientation
  const verticalRatio = (width > height) ? 0.7 : 0.55; // landscape gets more vertical room
  const maxW = width * 0.9;
  const maxH = height * verticalRatio;

  const iw = img.width || 100;
  const ih = img.height || 100;

  // compute scale to fit within maxW/maxH; allow slight upscaling (up to 1.2) for small assets
  const scale = Math.min(maxW / iw, maxH / ih, 1.2);
  const w = iw * scale;
  const h = ih * scale;

  const cx = width / 2;
  // position slightly lower than exact center (so top message area can exist)
  const cy = height / 2 + height * 0.04;

  image(img, cx, cy, w, h);
  pop();

  // update global sprite bounds used for hit-testing
  spriteRect.x = cx - w / 2;
  spriteRect.y = cy - h / 2;
  spriteRect.w = w;
  spriteRect.h = h;
}

// pointer handlers -------------------------------------------------------
function mousePressed() {
  if (isPointInRect(mouseX, mouseY, spriteRect)) {
    isSpritePressed = true;
  }
}

function mouseReleased() {
  isSpritePressed = false;
}

function touchStarted() {
  // p5 gives touches[] which contains coordinates in canvas space
  const tx = touches && touches.length ? touches[0].x : mouseX;
  const ty = touches && touches.length ? touches[0].y : mouseY;
  if (isPointInRect(tx, ty, spriteRect)) {
    isSpritePressed = true;
    return false; // prevent default scrolling on mobile when interacting with sprite
  }
  return true;
}

function touchEnded() {
  isSpritePressed = false;
  return false;
}

// utility: point in rect
function isPointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}