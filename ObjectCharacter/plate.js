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
  console.log('loadPlateAssets: start');
  const candidates = [
    'assets/Food/electricPlate.png',   // try lowercase filename first
    'assets/Food/ElectricPlate.png',
    'assets/Food/electricplate.png',
    'assets/Food/ElectricPlate.PNG',
    'assets/Food/ElectricPlate.jpg',
    'assets/Food/ElectricPlate.webp',
    'assets/Food/electric_plate.png',
    'assets/Food/Plate.png',
    // fallback to top-level assets folder if moved
    'assets/electricPlate.png',
    'assets/ElectricPlate.png',
    './assets/Food/electricPlate.png',
    './assets/Food/ElectricPlate.png'
  ];

  let tried = [];
  function tryLoad(idx) {
    if (idx >= candidates.length) {
      plateLoaded = false;
      console.warn('loadPlateAssets: all candidates failed:', tried);
      return;
    }
    const path = candidates[idx];
    tried.push(path);
    console.log('loadPlateAssets: trying', path);
    plateImg = loadImage(path,
      img => {
        plateLoaded = true;
        console.log('loadPlateAssets: plate image loaded from', path, img.width, img.height);
      },
      err => {
        console.warn('loadPlateAssets: failed to load', path);
        tryLoad(idx + 1);
      }
    );
  }

  tryLoad(0);
}

// call from sketch.setup(), pass walkFrames for sizing reference
function initPlate(walkFramesLocal) {
  const refW = (walkFramesLocal && walkFramesLocal[0] && walkFramesLocal[0].width) ? walkFramesLocal[0].width : 96;
  const refH = (walkFramesLocal && walkFramesLocal[0] && walkFramesLocal[0].height) ? walkFramesLocal[0].height : 48;
  electricPlate.w = max(32, Math.round(refW * 0.45));
  electricPlate.h = max(24, Math.round(refH * 0.45));

  const plateMargin = 24;
  electricPlate.resetX = Math.round(width * 0.5);
  electricPlate.resetY = Math.round(height - plateMargin - electricPlate.h * 0.5);
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

  // debug outline + coords (always visible)
  noFill();
  stroke(255, 0, 0);
  strokeWeight(2);
  ellipse(electricPlate.x, electricPlate.y, max(electricPlate.w, electricPlate.h) * 1.8);
  noStroke();
  fill(255);
  textSize(12);
  textAlign(LEFT, TOP);
  text(`plate: ${floor(electricPlate.x)}, ${floor(electricPlate.y)} held:${electricPlate.held}`, 8, 8);

  pop();
}

// helpers
function _ptInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// pointer handlers return true if they handled the event
function plateMousePressed(mx, my) {
  const plateRect = { x: electricPlate.x - electricPlate.w/2, y: electricPlate.y - electricPlate.h/2, w: electricPlate.w, h: electricPlate.h };
  if (_ptInRect(mx, my, plateRect)) {
    electricPlate.held = true;
    electricPlate.offsetX = mx - electricPlate.x;
    electricPlate.offsetY = my - electricPlate.y;
    if (typeof player !== 'undefined' && player) player.setLastInput?.();
    return true;
  }
  return false;
}

function plateMouseDragged(mx, my) {
  if (electricPlate.held) {
    electricPlate.x = mx - electricPlate.offsetX;
    electricPlate.y = my - electricPlate.offsetY;
    return true;
  }
  return false;
}

function plateMouseReleased() {
  if (electricPlate.held) {
    electricPlate.held = false;
    return true;
  }
  return false;
}

// touch wrappers (use first touch)
function plateTouchStarted(tx, ty) {
  return plateMousePressed(tx, ty);
}
function plateTouchMoved(tx, ty) {
  return plateMouseDragged(tx, ty);
}
function plateTouchEnded() {
  return plateMouseReleased();
}