// electric ball module: load asset, init, draw and click-to-target handlers

let ballImg = null;
let ballLoaded = false;
let electricBall = {
  x: 80, y: 80, w: 56, h: 56,
  armed: false,    // true after clicking the ball; next click sets target
  visible: true
};

function loadBallAssets() {
  // try common paths; adjust if needed
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
  // size smaller than character by default
  // make ball noticeably larger
  electricBall.w = 84;
  electricBall.h = 84;
  electricBall.x = Math.round(width * 0.1);
  electricBall.y = Math.round(height - electricBall.h - 26);
  electricBall.armed = false;
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
    // visible fallback
    noStroke();
    fill(255, 230, 60);
    ellipse(electricBall.x, electricBall.y, electricBall.w, electricBall.h);
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('Ball', electricBall.x, electricBall.y);
  }
  // small armed indicator
  if (electricBall.armed) {
    noFill();
    stroke(0, 200, 80);
    strokeWeight(2);
    ellipse(electricBall.x, electricBall.y, electricBall.w + 12, electricBall.h + 12);
  }
  pop();
}

// return true if this click was handled (click on ball)
function ballMousePressed(mx, my) {
  const r = { x: electricBall.x - electricBall.w/2, y: electricBall.y - electricBall.h/2, w: electricBall.w, h: electricBall.h };
  if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
    electricBall.armed = true;
    // provide instant visual feedback
    if (typeof player !== 'undefined' && player && typeof player.setLastInput === 'function') {
      player.setLastInput();
    }
    console.log('ball: armed. Click anywhere to send player to that spot.');
    return true;
  }
  return false;
}

// if ball is armed, handle a global click (set player's follow target)
function ballHandleGlobalClick(mx, my) {
  if (!electricBall.armed) return false;
  electricBall.armed = false;
  if (typeof player !== 'undefined' && player) {
    // set follow target directly on player
    player.followTarget = { active: true, x: mx, y: my, tolerance: 14, speed: null };
    // ensure player is in walking state
    player.state = 'walk';
    player.animTime = 0;
    player.setLastInput?.();
    console.log('ball: set player follow target to', mx, my);
  }
  return true;
}