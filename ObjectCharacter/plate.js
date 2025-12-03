// electric plate module: load assets, init sizing/placement, draw and pointer handlers

// plate image + state
let plateImg = null;
let plateLoaded = false;
let electricPlate = {
  x: 0, y: 0, w: 96, h: 48,
  resetX: 0, resetY: 0,
  held: false, offsetX: 0, offsetY: 0
};

// call from sketch.preload()
function loadPlateAssets() {
  // try a set of likely paths (include exact location & case variants)
  const candidates = [
    'assets/electricPlate.PNG',
    'assets/electricPlate.png',
    'assets/ElectricPlate.PNG',
    'assets/ElectricPlate.png',
    'assets/Food/electricPlate.png',
    'assets/Food/ElectricPlate.png',
    'assets/Food/electricPlate.PNG',
    'assets/Food/ElectricPlate.PNG',
    './assets/electricPlate.PNG',
    './assets/electricPlate.png',
    'ObjectCharacter/assets/electricPlate.PNG',
    'ObjectCharacter/assets/electricPlate.png',
    '../ObjectCharacter/assets/electricPlate.PNG'
  ];
  let idx = 0;
  function tryOne() {
    if (idx >= candidates.length) { plateLoaded = false; console.warn('loadPlateAssets: no plate found'); return; }
    const p = candidates[idx++];
    console.log('loadPlateAssets: trying', p);
    plateImg = loadImage(p,
      img => { plateLoaded = true; console.log('loadPlateAssets: plate image loaded from', p, img.width, img.height); },
      err => { console.warn('loadPlateAssets: failed to load', p); tryOne(); }
    );
  }
  tryOne();
}

// call from sketch.setup(), pass walkFrames for sizing reference
function initPlate(walkFramesLocal) {
  const refW = (walkFramesLocal && walkFramesLocal[0] && walkFramesLocal[0].width) ? walkFramesLocal[0].width : 96;
  const refH = (walkFramesLocal && walkFramesLocal[0] && walkFramesLocal[0].height) ? walkFramesLocal[0].height : 48;
  // make the plate a bit bigger than before (larger multiplier and higher minimum)
  electricPlate.w = Math.max(48, Math.round(refW * 0.65));
  electricPlate.h = Math.max(36, Math.round(refH * 0.65));

  // place plate near bottom-right with a larger margin and slight upward offset
  const plateMargin = 32; // distance from right/bottom edges
  const bottomOffset = 12; // extra lift above bottom edge
  electricPlate.resetX = Math.round(width - plateMargin - electricPlate.w * 0.5);
  electricPlate.resetY = Math.round(height - plateMargin - electricPlate.h * 0.5 - bottomOffset);
  // set initial position to the reset position
  electricPlate.x = electricPlate.resetX;
  electricPlate.y = electricPlate.resetY;
  electricPlate.held = false;
  console.log('initPlate:', electricPlate);
}

// draw plate (call early in draw so it's visible during all states)
function drawPlate() {
  // keep plate coords inside canvas
  if (!electricPlate.held) {
    electricPlate.x = constrain(electricPlate.x ?? electricPlate.resetX, electricPlate.w * 0.5, width - electricPlate.w * 0.5);
    electricPlate.y = constrain(electricPlate.y ?? electricPlate.resetY, electricPlate.h * 0.5, height - electricPlate.h * 0.5);
  } else {
    electricPlate.x = constrain(electricPlate.x, electricPlate.w * 0.5, width - electricPlate.w * 0.5);
    electricPlate.y = constrain(electricPlate.y, electricPlate.h * 0.5, height - electricPlate.h * 0.5);
  }

  push();
  imageMode(CENTER);
  rectMode(CENTER);

  // attempt to draw image; if missing, draw a bright fallback so it's obvious
  if (plateLoaded && plateImg && plateImg.width) {
    image(plateImg, electricPlate.x, electricPlate.y, electricPlate.w, electricPlate.h);
  } else {
    // very visible fallback (bright yellow) so you can confirm placement
    noStroke();
    fill(255, 220, 50, 255);
    rect(electricPlate.x, electricPlate.y, electricPlate.w * 1.2, electricPlate.h * 1.2, 8);
    // label
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('Plate (fallback)', electricPlate.x, electricPlate.y);
  }

  // debug outline (removed to avoid HUD overlap)
  // (previous red debug ellipse removed)
  pop();
}

// helpers
function _ptInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function rectsOverlap(a, b) {
  return !(a.x > b.x + b.w || a.x + a.w < b.x || a.y > b.y + b.h || a.y + a.h < b.y);
}

// New helper: robust player overlap test (distance-based, works even if player.spriteRect is missing)
function _playerOverlap() {
  if (typeof player === 'undefined' || player == null) return false;
  const px = (typeof player.x === 'number') ? player.x : (player.pos && player.pos.x);
  const py = (typeof player.y === 'number') ? player.y : (player.pos && player.pos.y);
  if (typeof px !== 'number' || typeof py !== 'number') return false;

  // estimate player visual size from walkFrames[0] (fallback to 64)
  const refImg = (typeof walkFrames !== 'undefined' && walkFrames && walkFrames[0]) ? walkFrames[0] : null;
  const playerSize = refImg ? Math.max(refImg.width || 0, refImg.height || 0) : 64;

  // distance between plate center and player center
  const dx = electricPlate.x - px;
  const dy = electricPlate.y - py;
  const d = Math.hypot(dx, dy);

  // threshold: half plate + ~45% of player visual size (tweak if needed)
  const threshold = (Math.max(electricPlate.w, electricPlate.h) * 0.5) + (playerSize * 0.45);
  return d <= threshold;
}

// pointer handlers return true if they handled the event
function plateMousePressed(mx, my) {
  const plateRect = { x: electricPlate.x - electricPlate.w/2, y: electricPlate.y - electricPlate.h/2, w: electricPlate.w, h: electricPlate.h };
  if (_ptInRect(mx, my, plateRect)) {
    electricPlate.held = true;
    electricPlate.offsetX = mx - electricPlate.x;
    electricPlate.offsetY = my - electricPlate.y;
    electricPlate.justFed = false; // allow feeding this drag
    if (typeof player !== 'undefined' && player && typeof player.setLastInput === 'function') {
      player.setLastInput();
    }
    return true;
  }
  return false;
}

function plateMouseDragged(mx, my) {
  if (electricPlate.held) {
    electricPlate.x = mx - electricPlate.offsetX;
    electricPlate.y = my - electricPlate.offsetY;

    // robust overlap check using player's position (not spriteRect)
    if (!electricPlate.justFed && _playerOverlap()) {
      console.log('plate fed (drag) — overlap detected');
      if (typeof happiness === 'number') {
        const cap = (typeof happinessMax === 'number') ? happinessMax : 100;
        happiness = Math.min(cap, happiness + 15);
      }
      // reset plate and mark fed
      electricPlate.x = electricPlate.resetX;
      electricPlate.y = electricPlate.resetY;
      electricPlate.held = false;
      electricPlate.justFed = true;

      // NEW: force the character into a happy state for 5 seconds
      if (typeof player !== 'undefined' && player) {
        player.state = 'happy';
        player.happyAnimTime = 0;
        player.playHappyOnceFlag = true;
        player.happyDuration = 5.0; // 5 seconds happy
        // ensure Character has happy frames set already (sketch.setup does this)
      } else {
        // fallback: call existing starter if available
        if (typeof startHappyPlayback === 'function') {
          console.log('plate: calling startHappyPlayback() (fallback)');
          startHappyPlayback();
        }
      }
      return true;
    }

    return true;
  }
  return false;
}

function plateMouseReleased() {
  if (electricPlate.held) {
    // first try robust overlap test
    const overlapped = _playerOverlap();

    if (overlapped) {
      console.log('plate fed (release) — overlap detected');
      if (typeof happiness === 'number') {
        const cap = (typeof happinessMax === 'number') ? happinessMax : 100;
        happiness = Math.min(cap, happiness + 15);
      }
      electricPlate.x = electricPlate.resetX;
      electricPlate.y = electricPlate.resetY;
      electricPlate.held = false;
      electricPlate.justFed = true;

      // NEW: force the character into a happy state for 5 seconds
      if (typeof player !== 'undefined' && player) {
        player.state = 'happy';
        player.happyAnimTime = 0;
        player.playHappyOnceFlag = true;
        player.happyDuration = 5.0; // 5 seconds happy
      } else {
        if (typeof startHappyPlayback === 'function') {
          console.log('plate: calling startHappyPlayback() (fallback)');
          startHappyPlayback();
        }
      }
      return true;
    }

    // fallback: just release the plate
    electricPlate.held = false;
    return true;
  }
  return false;
}

// Touch wrappers: forward first-touch coords to existing mouse handlers
function plateTouchStarted(tx, ty) {
  if (typeof plateMousePressed === 'function') return plateMousePressed(tx, ty);
  return false;
}
function plateTouchMoved(tx, ty) {
  if (typeof plateMouseDragged === 'function') return plateMouseDragged(tx, ty);
  return false;
}
function plateTouchEnded() {
  if (typeof plateMouseReleased === 'function') return plateMouseReleased();
  return false;
}