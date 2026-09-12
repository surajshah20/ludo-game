/* =========================================================
   SOUND ENGINE
   Synthesized with the Web Audio API — no external audio
   files needed. A short generated impulse response feeds a
   convolver so every hit has a bit of natural "room" to it.
   ========================================================= */

const Sound = (() => {
  let ctx = null;
  let master = null, dry = null, wet = null, verb = null;
  let muted = localStorage.getItem("ludo-muted") === "1";

  function build(){
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    verb = ctx.createConvolver();
    verb.buffer = makeImpulse(1.6, 2.4);
    wet = ctx.createGain();
    wet.gain.value = 0.55;
    dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(master);
    verb.connect(wet).connect(master);
  }

  function makeImpulse(dur, decay){
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * dur);
    const impulse = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++){
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++){
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return impulse;
  }

  function getCtx(){
    if (!ctx) build();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function bus(sendAmt){
    // returns a gain node that splits to dry + a reverb send
    const g = getCtx().createGain();
    g.connect(dry);
    if (sendAmt > 0){
      const send = ctx.createGain();
      send.gain.value = sendAmt;
      g.connect(send).connect(verb);
    }
    return g;
  }

  function tone(freq, dur, {type="sine", gain=0.22, delay=0, glideTo=null, send=0.15, pan=0} = {}){
    if (muted) return;
    const c = getCtx();
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const panner = c.createStereoPanner ? c.createStereoPanner() : null;
    const out = bus(send);
    osc.connect(amp);
    if (panner){ panner.pan.value = pan; amp.connect(panner).connect(out); }
    else amp.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, {filterFreq=1200, gain=0.25, delay=0, q=0.8, type="bandpass", send=0.2, pan=0} = {}){
    if (muted) return;
    const c = getCtx();
    const t0 = c.currentTime + delay;
    const buffer = c.createBuffer(1, Math.max(1, c.sampleRate * dur), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filt = c.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = filterFreq;
    filt.Q.value = q;
    const amp = c.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const panner = c.createStereoPanner ? c.createStereoPanner() : null;
    const out = bus(send);
    src.connect(filt).connect(amp);
    if (panner){ panner.pan.value = pan; amp.connect(panner).connect(out); }
    else amp.connect(out);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    isMuted: () => muted,
    toggleMuted(){
      muted = !muted;
      localStorage.setItem("ludo-muted", muted ? "1" : "0");
      if (!muted) getCtx();
      return muted;
    },
    click(){ noiseBurst(0.03, { filterFreq:2600, gain:0.14, q:2.2, send:0.05 }); },
    roll(){
      // a tumbling handful of dice settling in a cup
      const hits = 6;
      for (let i = 0; i < hits; i++){
        const t = i / hits;
        noiseBurst(0.05, {
          filterFreq: 1100 + Math.random()*1800,
          gain: 0.16 * (1 - t*0.35),
          delay: i*0.065 + Math.random()*0.02,
          q: 1.3,
          pan: (Math.random()*2-1)*0.6,
          send: 0.25
        });
      }
      tone(90, 0.09, { type:"sine", gain:0.1, delay:hits*0.065, send:0.1 });
    },
    move(){
      const f = 480 + Math.random()*60;
      tone(f, 0.08, { type:"triangle", gain:0.15, send:0.12 });
      noiseBurst(0.03, { filterFreq:2000, gain:0.05, q:1, send:0.05 });
    },
    invalid(){ tone(190, 0.18, { type:"sine", gain:0.12, glideTo:120, send:0.05 }); },
    capture(){
      noiseBurst(0.16, { filterFreq:450, gain:0.32, q:0.5, send:0.4 });
      tone(280, 0.24, { type:"sawtooth", gain:0.16, glideTo:80, delay:0.02, send:0.3 });
      tone(1400, 0.05, { type:"square", gain:0.05, delay:0, send:0.1 });
    },
    home(){
      tone(523.25, 0.16, { gain:0.17, send:0.3 });
      tone(659.25, 0.16, { gain:0.17, delay:0.11, send:0.3 });
      tone(783.99, 0.26, { gain:0.19, delay:0.22, send:0.35 });
      tone(1046.5, 0.3, { type:"triangle", gain:0.08, delay:0.24, send:0.4 });
    },
    win(){
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f,i) =>
        tone(f, 0.32, { gain:0.2, delay:i*0.14, send:0.45 }));
      [659.25, 830.61, 987.77, 1318.5].forEach((f,i) =>
        tone(f, 0.3, { type:"triangle", gain:0.09, delay:i*0.14 + 0.05, send:0.4 }));
      setTimeout(() => noiseBurst(0.6, { filterFreq:5000, gain:0.06, q:0.4, send:0.6 }), 700);
    }
  };
})();

/* =========================================================
   BOARD DATA
   15x15 grid, 0-indexed rows/cols.
   ========================================================= */

const COLORS = ["red", "green", "yellow", "blue"];

// The 56-cell shared outer loop (52 arm cells + 4 corner connectors
// where the arms meet the center), in clockwise travel order.
const COMMON_PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [6,6],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [8,8],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],[6,0]
];

const CP_LEN = COMMON_PATH.length;        // 56
const COMMON_STEPS = CP_LEN - 1;          // 55 — cells each token travels on the shared loop
const HOME_LEN = 5;                       // cells in each color's home stretch
const FINISH_POS = COMMON_STEPS + HOME_LEN; // 60

const START_INDEX = { red: 0, green: 14, yellow: 28, blue: 42 };
const SAFE_INDICES = new Set([0, 8, 14, 22, 28, 36, 42, 50]);

const HOME_STRETCH = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7]]
};

const YARD_REGION = {
  red:    { r0:0, r1:5, c0:0, c1:5 },
  green:  { r0:0, r1:5, c0:9, c1:14 },
  yellow: { r0:9, r1:14, c0:9, c1:14 },
  blue:   { r0:9, r1:14, c0:0, c1:5 }
};

const YARD_SLOTS = { // token slot centers, in 15-unit grid coordinates
  red:    [[1.5,1.5],[1.5,4],[4,1.5],[4,4]],
  green:  [[1.5,10.5],[1.5,13],[4,10.5],[4,13]],
  yellow: [[10.5,10.5],[10.5,13],[13,10.5],[13,13]],
  blue:   [[10.5,1.5],[10.5,4],[13,1.5],[13,4]]
};

const HOME_SLOT_BASE = { // finished tokens cluster near center, offsets added per index
  red:    [6.6, 6.9],
  green:  [6.9, 6.6],
  yellow: [7.4, 7.1],
  blue:   [7.1, 7.4]
};
const HOME_SLOT_STEP = { red:[0,0.35], green:[0.35,0], yellow:[0,-0.35], blue:[-0.35,0] };

/* Lookups built once at startup */
const commonIndexByKey = {};      // "r,c" -> index 0-51
const homeStretchByKey = {};      // "r,c" -> {color, idx}
COMMON_PATH.forEach(([r,c], i) => commonIndexByKey[`${r},${c}`] = i);
COLORS.forEach(color => {
  HOME_STRETCH[color].forEach(([r,c], i) => {
    homeStretchByKey[`${r},${c}`] = { color, idx: i };
  });
});

/* =========================================================
   GAME STATE
   ========================================================= */

let state = null;

function makePlayer(color, isAI){
  return {
    color,
    isAI,
    finishedCount: 0,
    tokens: [ {pos:-1}, {pos:-1}, {pos:-1}, {pos:-1} ]
  };
}

function newGame(activeColors, aiSet){
  state = {
    players: activeColors.map(c => makePlayer(c, aiSet.has(c))),
    turnIndex: 0,
    dice: null,
    rolled: false,
    consecutiveSixes: 0,
    movable: [],       // token indices movable this turn
    over: false
  };
}

function currentPlayer(){ return state.players[state.turnIndex]; }

/* =========================================================
   COORDINATE HELPERS
   ========================================================= */

function tokenCoord(color, pos){
  if (pos < 0 || pos >= FINISH_POS) return null;
  if (pos <= COMMON_STEPS - 1){
    const idx = (START_INDEX[color] + pos) % CP_LEN;
    return COMMON_PATH[idx];
  }
  return HOME_STRETCH[color][pos - COMMON_STEPS];
}

function isSafeCell(color, pos){
  if (pos < 0 || pos > COMMON_STEPS - 1) return false;
  const idx = (START_INDEX[color] + pos) % CP_LEN;
  return SAFE_INDICES.has(idx);
}

/* =========================================================
   GAME LOGIC
   ========================================================= */

function isBlocked(playerIdx, pos){
  // blocks only exist on the shared common path — home stretches are private to one color
  if (pos < 0 || pos > COMMON_STEPS - 1) return false;
  const mover = state.players[playerIdx];
  const [r, c] = tokenCoord(mover.color, pos);
  return state.players.some((other, oi) => {
    if (oi === playerIdx) return false;
    const count = other.tokens.filter(ot => {
      if (ot.pos < 0 || ot.pos > COMMON_STEPS - 1) return false;
      const oc = tokenCoord(other.color, ot.pos);
      return oc && oc[0] === r && oc[1] === c;
    }).length;
    return count >= 2; // two-or-more of the same opposing color = an impassable block
  });
}

function computeMovable(player, dice){
  const out = [];
  const pi = state.players.indexOf(player);
  player.tokens.forEach((t, i) => {
    if (t.pos === -1){
      if (dice === 6 && !isBlocked(pi, 0)) out.push(i);
    } else if (t.pos < FINISH_POS){
      const newPos = t.pos + dice;
      if (newPos <= FINISH_POS && !isBlocked(pi, newPos)) out.push(i);
    }
  });
  return out;
}

function log(msg){
  const el = document.getElementById("log");
  const line = document.createElement("div");
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 40) el.removeChild(el.firstChild);
}

/* -------- dice cube -------- */

const DICE_BASE_ROTATION = {
  1: {x:0, y:0},
  2: {x:0, y:-90},
  3: {x:-90, y:0},
  4: {x:90, y:0},
  5: {x:0, y:90},
  6: {x:0, y:180}
};
const diceSpin = {x:0, y:0};

function animateDiceCube(n){
  const cube = document.getElementById("diceCube");
  const shadow = document.getElementById("diceShadow");
  const base = DICE_BASE_ROTATION[n];
  const dir = () => (Math.random() < 0.5 ? 1 : -1);
  diceSpin.x += (2 + Math.floor(Math.random()*2)) * 360 * dir();
  diceSpin.y += (2 + Math.floor(Math.random()*2)) * 360 * dir();
  cube.style.transform = `rotateX(${base.x + diceSpin.x}deg) rotateY(${base.y + diceSpin.y}deg)`;
  shadow.style.transform = "translateX(-50%) scale(0.65)";
  setTimeout(() => { shadow.style.transform = "translateX(-50%) scale(1)"; }, 720);
}

/* -------- confetti (win celebration) -------- */

function launchConfetti(){
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize();
  const colors = ["#d1495b","#4b9e63","#dfae3d","#3f7cbf","#f0c568","#fffdf6"];
  const particles = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    r: 4 + Math.random() * 5,
    c: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 3,
    rot: Math.random() * 360,
    vr: (Math.random() - 0.5) * 12,
    shape: Math.random() < 0.5 ? "rect" : "circle"
  }));
  let frame = 0;
  const resizeHandler = () => resize();
  window.addEventListener("resize", resizeHandler);

  function tick(){
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.c;
      if (p.shape === "rect") ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    if (frame < 230){
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener("resize", resizeHandler);
    }
  }
  tick();
}

function rollDice(){
  if (state.over || state.rolled) return;
  const dice = 1 + Math.floor(Math.random() * 6);
  state.dice = dice;
  state.rolled = true;
  animateDiceCube(dice);
  Sound.roll();

  const player = currentPlayer();
  log(`${cap(player.color)} rolled a ${dice}.`);

  if (dice === 6){
    state.consecutiveSixes++;
  } else {
    state.consecutiveSixes = 0;
  }

  if (state.consecutiveSixes === 3){
    log(`${cap(player.color)} rolled three sixes in a row — turn forfeited.`);
    state.movable = [];
    render();
    setTimeout(endTurn, 700);
    return;
  }

  state.movable = computeMovable(player, dice);

  if (state.movable.length === 0){
    log(`${cap(player.color)} has no valid move.`);
    Sound.invalid();
    render();
    setTimeout(endTurn, 700);
    return;
  }

  render();

  if (player.isAI){
    setTimeout(() => aiMove(player), 650);
  }
}

const teleportSet = new Set(); // "pi-ti" keys that should snap (no slide) on next render

function bounceToken(pi, ti){
  const el = tokenEls[pi][ti];
  const onEnd = (e) => {
    if (e.propertyName !== "left") return;
    el.removeEventListener("transitionend", onEnd);
    el.classList.add("landed");
    setTimeout(() => el.classList.remove("landed"), 400);
  };
  el.addEventListener("transitionend", onEnd);
}

function moveToken(playerIdx, tokenIdx){
  const player = state.players[playerIdx];
  if (playerIdx !== state.turnIndex || !state.rolled) return;
  if (!state.movable.includes(tokenIdx)) return;

  const dice = state.dice;
  const token = player.tokens[tokenIdx];
  const newPos = token.pos === -1 ? 0 : token.pos + dice;
  const finished = newPos === FINISH_POS;

  // work out captures before mutating anything
  const captureRefs = [];
  if (!finished && newPos <= COMMON_STEPS - 1 && !isSafeCell(player.color, newPos)){
    const [r, c] = tokenCoord(player.color, newPos);
    state.players.forEach((other, oi) => {
      if (oi === playerIdx) return;
      other.tokens.forEach((ot, oti) => {
        if (ot.pos >= 0 && ot.pos <= COMMON_STEPS - 1){
          const oc = tokenCoord(other.color, ot.pos);
          if (oc && oc[0] === r && oc[1] === c) captureRefs.push({ oi, oti });
        }
      });
    });
  }

  token.pos = newPos;
  if (finished) player.finishedCount++;

  state.rolled = false;
  state.movable = [];

  render();
  bounceToken(playerIdx, tokenIdx);

  if (finished){
    log(`${cap(player.color)} brought a token home!`);
    Sound.home();
  } else if (captureRefs.length){
    log(`${cap(player.color)} sent an opponent's token back to base!`);
    Sound.capture();
    captureRefs.forEach(ref => tokenEls[ref.oi][ref.oti].classList.add("captured"));
  } else {
    Sound.move();
  }

  function proceed(){
    if (player.finishedCount === 4){
      state.over = true;
      render();
      showWin(player.color);
      return;
    }
    const goAgain = dice === 6 || captureRefs.length > 0 || finished;
    if (goAgain){
      log(`${cap(player.color)} goes again.`);
      if (player.isAI) setTimeout(() => aiTurn(), 500);
    } else {
      setTimeout(endTurn, 400);
    }
  }

  if (captureRefs.length){
    setTimeout(() => {
      captureRefs.forEach(ref => {
        state.players[ref.oi].tokens[ref.oti].pos = -1;
        teleportSet.add(`${ref.oi}-${ref.oti}`);
      });
      render();
      proceed();
    }, 430);
  } else {
    setTimeout(proceed, finished ? 250 : 150);
  }
}

function endTurn(){
  if (state.over) return;
  state.rolled = false;
  state.dice = null;
  state.movable = [];
  state.consecutiveSixes = 0;
  state.turnIndex = (state.turnIndex + 1) % state.players.length;
  render();
  const player = currentPlayer();
  if (player.isAI) setTimeout(() => aiTurn(), 700);
}

/* -------- simple AI -------- */

function aiTurn(){
  if (state.over) return;
  const player = currentPlayer();
  if (!player.isAI) return;
  if (!state.rolled) rollDice();
}

function aiMove(player){
  if (state.over || state.movable.length === 0) return;
  const dice = state.dice;
  const playerIdx = state.players.indexOf(player);

  // priority: finish a token > capture an opponent > bring a token out on 6 > move furthest-along token
  let best = null, bestScore = -1;

  state.movable.forEach(i => {
    const t = player.tokens[i];
    const newPos = t.pos === -1 ? 0 : t.pos + dice;
    let score = newPos; // prefer furthest progress by default

    if (newPos === FINISH_POS) score += 1000;

    if (newPos <= COMMON_STEPS - 1 && !isSafeCell(player.color, newPos)){
      const [r,c] = tokenCoord(player.color, newPos);
      state.players.forEach((other, oi) => {
        if (oi === playerIdx) return;
        other.tokens.forEach(ot => {
          if (ot.pos >= 0 && ot.pos <= COMMON_STEPS - 1){
            const oc = tokenCoord(other.color, ot.pos);
            if (oc && oc[0] === r && oc[1] === c) score += 500;
          }
        });
      });
    }

    if (t.pos === -1) score += 50; // mild preference for getting tokens out

    if (score > bestScore){ bestScore = score; best = i; }
  });

  moveToken(playerIdx, best);
}

/* =========================================================
   RENDERING
   ========================================================= */

function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function buildBoardOnce(){
  const board = document.getElementById("board");
  board.innerHTML = "";

  // yards (with decorative token-slot pockets)
  COLORS.forEach(color => {
    const y = YARD_REGION[color];
    const div = document.createElement("div");
    div.className = `yard ${color}`;
    div.style.gridRow = `${y.r0+1} / ${y.r1+2}`;
    div.style.gridColumn = `${y.c0+1} / ${y.c1+2}`;

    const spanR = y.r1 - y.r0 + 1;
    const spanC = y.c1 - y.c0 + 1;
    YARD_SLOTS[color].forEach(([r, c]) => {
      const slot = document.createElement("div");
      slot.className = "yard-slot";
      slot.style.top = `${((r - y.r0) / spanR) * 100}%`;
      slot.style.left = `${((c - y.c0) / spanC) * 100}%`;
      div.appendChild(slot);
    });

    board.appendChild(div);
  });

  // center home
  const center = document.createElement("div");
  center.className = "center-home";
  center.style.gridRow = "7 / 10";
  center.style.gridColumn = "7 / 10";
  center.innerHTML = `
    <div class="tri tri-red"></div>
    <div class="tri tri-green"></div>
    <div class="tri tri-yellow"></div>
    <div class="tri tri-blue"></div>`;
  board.appendChild(center);

  // arm cells (common path + home stretches)
  for (let r = 0; r < 15; r++){
    for (let c = 0; c < 15; c++){
      if (inYard(r,c) || inCenter(r,c)) continue;
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.style.gridRow = `${r+1} / ${r+2}`;
      cell.style.gridColumn = `${c+1} / ${c+2}`;

      const key = `${r},${c}`;
      if (homeStretchByKey[key]){
        cell.classList.add(`path-${homeStretchByKey[key].color}`);
      } else if (commonIndexByKey[key] !== undefined){
        const idx = commonIndexByKey[key];
        if (SAFE_INDICES.has(idx)) cell.classList.add("safe");
        for (const color of COLORS){
          if (START_INDEX[color] === idx) cell.classList.add(`path-${color}`);
        }
      }
      board.appendChild(cell);
    }
  }
}

function inYard(r,c){
  return COLORS.some(color => {
    const y = YARD_REGION[color];
    return r >= y.r0 && r <= y.r1 && c >= y.c0 && c <= y.c1;
  });
}
function inCenter(r,c){
  // only the plus-shaped middle of the 3x3 center block is reserved —
  // its 4 corners are ordinary path cells (see COMMON_PATH).
  return (r === 7 && c >= 6 && c <= 8) || (c === 7 && r >= 6 && r <= 8);
}

/* -------- tokens: persistent DOM elements, updated in place so
   CSS transitions animate every move rather than teleporting -------- */

let tokenEls = [];

function buildTokenEls(){
  const layer = document.getElementById("tokenLayer");
  layer.innerHTML = "";
  tokenEls = state.players.map((player, pi) =>
    player.tokens.map((t, ti) => {
      const div = document.createElement("div");
      div.className = `token ${player.color}`;
      div.addEventListener("click", () => moveToken(pi, ti));
      layer.appendChild(div);
      return div;
    })
  );
}

function renderTokens(){
  const cellPct = 100 / 15;

  state.players.forEach((player, pi) => {
    const groups = {}; // group on-board tokens sharing a cell, to offset them slightly

    player.tokens.forEach((t, ti) => {
      const div = tokenEls[pi][ti];
      let gr, gc;

      if (t.pos === -1){
        [gr, gc] = YARD_SLOTS[player.color][ti];
      } else if (t.pos === FINISH_POS){
        const base = HOME_SLOT_BASE[player.color];
        const step = HOME_SLOT_STEP[player.color];
        const n = player.tokens.slice(0, ti).filter(o => o.pos === FINISH_POS).length;
        gr = base[0] + step[0]*n;
        gc = base[1] + step[1]*n;
      } else {
        const [r,c] = tokenCoord(player.color, t.pos);
        const key = `${r},${c}`;
        groups[key] = (groups[key] || 0);
        const n = groups[key]++;
        const jitter = n === 0 ? 0 : (n % 2 === 0 ? 1 : -1) * (0.13 + 0.1*Math.floor(n/2));
        gr = r + 0.5 + jitter*0.4;
        gc = c + 0.5 + jitter;
      }

      const teleKey = `${pi}-${ti}`;
      const left = `${gc * cellPct}%`;
      const top = `${gr * cellPct}%`;

      if (teleportSet.has(teleKey)){
        div.style.transition = "none";
        div.style.left = left;
        div.style.top = top;
        void div.offsetWidth; // force reflow so the snap applies before re-enabling transitions
        div.style.transition = "";
        div.classList.remove("captured");
        div.classList.add("entering");
        setTimeout(() => div.classList.remove("entering"), 350);
        teleportSet.delete(teleKey);
      } else {
        div.style.left = left;
        div.style.top = top;
      }

      const w = cellPct * 0.62;
      div.style.width = `${w}%`;
      div.style.height = `${w}%`;

      const isMovable = !state.over && pi === state.turnIndex && !player.isAI && state.movable.includes(ti);
      div.classList.toggle("movable", isMovable);
    });
  });
}

function renderPlayersStrip(){
  const wrap = document.getElementById("playersStrip");
  wrap.innerHTML = "";
  state.players.forEach((player, pi) => {
    const pill = document.createElement("div");
    pill.className = "player-pill" + (!state.over && pi === state.turnIndex ? " active" : "");
    pill.style.setProperty("--pill-color", `var(--${player.color})`);

    const dot = document.createElement("span");
    dot.className = "pdot";

    const label = document.createElement("span");
    label.textContent = cap(player.color);

    const pipsWrap = document.createElement("span");
    pipsWrap.className = "pips";
    for (let i = 0; i < 4; i++){
      const pip = document.createElement("span");
      pip.className = "pip" + (i < player.finishedCount ? " filled" : "");
      pipsWrap.appendChild(pip);
    }

    pill.append(dot, label, pipsWrap);

    if (player.isAI){
      const tag = document.createElement("span");
      tag.className = "ai-tag";
      tag.textContent = "CPU";
      pill.appendChild(tag);
    }

    wrap.appendChild(pill);
  });
}

function render(){
  renderTokens();
  renderPlayersStrip();

  const hud = document.getElementById("game");
  hud.className = "";
  hud.classList.add(`turn-${currentPlayer().color}`);

  const player = currentPlayer();
  document.getElementById("turnText").textContent = state.over
    ? "Game over"
    : `${cap(player.color)}'s turn${player.isAI ? " (computer)" : ""}`;

  const rollBtn = document.getElementById("rollBtn");
  rollBtn.disabled = state.over || state.rolled || player.isAI;
  rollBtn.textContent = state.rolled ? "Pick a token" : "Roll dice";

  fitBoard();
}

/* Keep the board (plus the HUD/strip/log around it) fully inside the
   viewport on any screen size, instead of relying on a guessed CSS
   constant — measure what's actually on screen and size to fit. */
let fitBoardRAF = null;
function fitBoard(){
  if (fitBoardRAF) cancelAnimationFrame(fitBoardRAF);
  fitBoardRAF = requestAnimationFrame(() => {
    const gameEl = document.getElementById("game");
    if (gameEl.classList.contains("hidden")) return;

    const hud = document.getElementById("hud");
    const strip = document.getElementById("playersStrip");
    const logEl = document.getElementById("log");
    const wrap = document.getElementById("boardWrap");

    const gap = parseFloat(getComputedStyle(gameEl).gap) || 0;
    const bodyPad = 48; // body's top+bottom padding
    const chrome = hud.offsetHeight + strip.offsetHeight + logEl.offsetHeight + gap * 3 + bodyPad;

    const maxByHeight = window.innerHeight - chrome;
    const maxByWidth = Math.min(window.innerWidth * 0.94, 640);
    const size = Math.max(220, Math.min(maxByWidth, maxByHeight));

    wrap.style.width = `${size}px`;
  });
}

window.addEventListener("resize", fitBoard);

function showWin(color){
  document.getElementById("winText").textContent = `${cap(color)} wins!`;
  document.getElementById("winOverlay").classList.remove("hidden");
  Sound.win();
  launchConfetti();
}

/* =========================================================
   SETUP SCREEN
   ========================================================= */

const setupState = {
  active: new Set(["red","green","yellow","blue"]),
  ai: new Set(["green","yellow","blue"])
};

function renderSetup(){
  const wrap = document.getElementById("playerRows");
  wrap.innerHTML = "";

  COLORS.forEach(color => {
    const row = document.createElement("div");
    row.className = "player-row" + (setupState.active.has(color) ? "" : " disabled");

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = `var(--${color})`;

    const name = document.createElement("div");
    name.className = "pname";
    name.textContent = cap(color);

    const modeBtn = document.createElement("button");
    modeBtn.className = "row-mode" + (setupState.ai.has(color) ? " active" : "");
    modeBtn.textContent = setupState.ai.has(color) ? "Computer" : "Human";
    modeBtn.disabled = !setupState.active.has(color);
    modeBtn.onclick = () => {
      Sound.click();
      if (setupState.ai.has(color)) setupState.ai.delete(color);
      else setupState.ai.add(color);
      renderSetup();
    };

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "row-toggle" + (setupState.active.has(color) ? " active" : "");
    toggleBtn.textContent = setupState.active.has(color) ? "Playing" : "Out";
    toggleBtn.onclick = () => {
      Sound.click();
      if (setupState.active.has(color)){
        if (setupState.active.size > 2) setupState.active.delete(color);
      } else {
        setupState.active.add(color);
      }
      renderSetup();
    };

    row.append(swatch, name, modeBtn, toggleBtn);
    wrap.appendChild(row);
  });

  const anyHuman = [...setupState.active].some(c => !setupState.ai.has(c));
  document.getElementById("startBtn").disabled = !anyHuman;
}

function startGame(){
  const activeColors = COLORS.filter(c => setupState.active.has(c));
  const aiSet = new Set([...setupState.ai].filter(c => setupState.active.has(c)));

  newGame(activeColors, aiSet);
  buildBoardOnce();
  buildTokenEls();

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  document.getElementById("log").innerHTML = "";
  document.getElementById("winOverlay").classList.add("hidden");

  log("Game started. Roll a 6 to bring a token onto the board.");
  render();

  if (currentPlayer().isAI) setTimeout(() => aiTurn(), 700);
}

function resetToSetup(){
  document.getElementById("winOverlay").classList.add("hidden");
  document.getElementById("game").classList.add("hidden");
  document.getElementById("setup").classList.remove("hidden");
}

/* =========================================================
   WIRE UP
   ========================================================= */

document.getElementById("startBtn").addEventListener("click", () => { Sound.click(); startGame(); });
document.getElementById("rollBtn").addEventListener("click", rollDice);
document.getElementById("restartBtn").addEventListener("click", () => { Sound.click(); resetToSetup(); });
document.getElementById("playAgainBtn").addEventListener("click", () => { Sound.click(); resetToSetup(); });

const soundBtn = document.getElementById("soundBtn");
function refreshSoundBtn(){
  soundBtn.textContent = Sound.isMuted() ? "🔇 Sound" : "🔊 Sound";
}
soundBtn.addEventListener("click", () => {
  Sound.toggleMuted();
  refreshSoundBtn();
});
refreshSoundBtn();

renderSetup();