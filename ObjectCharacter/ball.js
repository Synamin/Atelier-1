// electric ball module: load asset, init, draw and click-to-target handlers

let ballImg = null;
let ballLoaded = false;
let electricBall = {
  x: 80, y: 80, w: 84, h: 84,
  held: false, offsetX: 0, offsetY: 0,
  armed: false,    // legacy: if you still use arm->global click flow
  visible: true
};

function loadBallAssets() {
  const candidates = [
    'assets/Food/electricBall.png',
    'assets/Food/ball.png',
    'assets/Food/electricball.png',
    'assets/electricBall.png',
    './assets/Food/electricBall.png'
  ];
  let idx = 0;
  function tryOne() {
    if (idx >= candidates.length) { ballLoaded = false; console.warn('loadBallAssets: no ball found'); return; }
    const p = candidates[idx++];
    console.log('loadBallAssets: trying', p);
    ballImg = loadImage(p,
      img => { ballLoaded = true; console.log('loadBallAssets: loaded', p); },
      err => { console.warn('loadBallAssets: failed', p); tryOne(); }
    );
  }
  tryOne();
}

function initBall() {
  // increased base size
  electricBall.w = 84;
  electricBall.h = 84;
  electricBall.x = Math.round(width * 0.1);
  electricBall.y = Math.round(height - electricBall.h - 26);
  electricBall.armed = false;
  electricBall.held = false;
  electricBall.visible = true;
}

function drawBall() {
  if (!electricBall.visible) return;
  push();
  imageMode(CENTER);
  rectMode(CENTER);
  if (ballLoaded && ballImg && ballImg.width) {
    image(ballImg, electricBall.x, electricBall.y, electricBall.w, electricBall.h);
  } else {
    noStroke();
    fill(255, 230, 60);
    ellipse(electricBall.x, electricBall.y, electricBall.w, electricBall.h);
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('Ball', electricBall.x, electricBall.y);
  }
  if (electricBall.held) {
    noFill();
    stroke(0, 200, 80);
    strokeWeight(3);
    ellipse(electricBall.x, electricBall.y, electricBall.w + 16, electricBall.h + 16);
  } else if (electricBall.armed) {
    noFill();
    stroke(0, 180, 140);
    strokeWeight(2);
    ellipse(electricBall.x, electricBall.y, electricBall.w + 12, electricBall.h + 12);
  }
  pop();
}

// --- new drag/chase behavior ---

// When pressed on ball: start dragging and make player chase ball
function ballMousePressed(mx, my) {
  const r = { x: electricBall.x - electricBall.w/2, y: electricBall.y - electricBall.h/2, w: electricBall.w, h: electricBall.h };
  if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
    electricBall.held = true;
    electricBall.offsetX = mx - electricBall.x;
    electricBall.offsetY = my - electricBall.y;
    electricBall.armed = false;
    if (typeof player !== 'undefined' && player && typeof player.setLastInput === 'function') {
      player.setLastInput();
    }
    // start chase immediately toward current ball position
    if (typeof player !== 'undefined' && player) {
      player.followTarget = player.followTarget || {};
      player.followTarget.active = true;
      player.followTarget.x = electricBall.x;
      player.followTarget.y = electricBall.y;
      player.followTarget.tolerance = 14;
      player.state = 'walk';
      player.animTime = 0;
    }
    console.log('ball: picked up -> player will chase while dragging');
    return true;
  }
  return false;
}

function ballMouseDragged(mx, my) {
  if (!electricBall.held) return false;
  electricBall.x = mx - electricBall.offsetX;
  electricBall.y = my - electricBall.offsetY;
  // constrain inside canvas
  electricBall.x = Math.max(electricBall.w * 0.5, Math.min(width - electricBall.w * 0.5, electricBall.x));
  electricBall.y = Math.max(electricBall.h * 0.5, Math.min(height - electricBall.h * 0.5, electricBall.y));
  // update player's follow target continuously
  if (typeof player !== 'undefined' && player) {
    player.followTarget = player.followTarget || {};
    player.followTarget.active = true;
    player.followTarget.x = electricBall.x;
    player.followTarget.y = electricBall.y;
  }
  return true;
}

function ballMouseReleased() {
  if (!electricBall.held) return false;
  electricBall.held = false;
  // stop chase when release
  if (typeof player !== 'undefined' && player && player.followTarget) {
    player.followTarget.active = false;
  }
  console.log('ball: released -> player stops chasing');
  return true;
}

// touch wrappers (use first touch coords)
function ballTouchStarted(tx, ty) {
  return ballMousePressed(tx, ty);
}
function ballTouchMoved(tx, ty) {
  return ballMouseDragged(tx, ty);
}
function ballTouchEnded() {
  return ballMouseReleased();
}

// legacy: keep previous global-click flow (arm -> click elsewhere to set target)
function ballHandleGlobalClick(mx, my) {
  if (!electricBall.armed) return false;
  electricBall.armed = false;
  if (typeof player !== 'undefined' && player) {
    player.followTarget = { active: true, x: mx, y: my, tolerance: 14, speed: null };
    player.state = 'walk';
    player.animTime = 0;
    if (typeof player.setLastInput === 'function') player.setLastInput();
    console.log('ball: set player follow target to', mx, my);
  }
  return true;
}