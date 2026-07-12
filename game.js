// ============================================================
//  OLIVER'S HERO ADVENTURE — GAME ENGINE
//  You usually don't need to edit this file.
//  Heroes and levels live in config.js!
// ============================================================

(() => {
const TILE = 48;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// ---------- State ----------
let hero = null;            // chosen hero from HEROES
let levelIndex = 0;
let level = null;           // parsed level
let player = null;
let camX = 0;
let frame = 0;
let mode = "select";        // select | play | winpause
let confetti = [];
let sparkles = [];
let winTimer = 0;

// ---------- Input ----------
const keys = { left: false, right: false, jump: false };
let jumpBuffered = 0;       // frames remaining on buffered jump press

function pressJump() { jumpBuffered = 9; unlockAudio(); }

addEventListener("keydown", (e) => {
  if (["ArrowLeft", "a", "A"].includes(e.key)) keys.left = true;
  if (["ArrowRight", "d", "D"].includes(e.key)) keys.right = true;
  if (["ArrowUp", "w", "W", " "].includes(e.key)) {
    if (!keys.jump) pressJump();
    keys.jump = true;
    e.preventDefault();
  }
});
addEventListener("keyup", (e) => {
  if (["ArrowLeft", "a", "A"].includes(e.key)) keys.left = false;
  if (["ArrowRight", "d", "D"].includes(e.key)) keys.right = false;
  if (["ArrowUp", "w", "W", " "].includes(e.key)) keys.jump = false;
});

// Touch buttons
function bindTouch(id, on, off) {
  const el = document.getElementById(id);
  for (const ev of ["pointerdown", "touchstart"]) el.addEventListener(ev, (e) => { e.preventDefault(); on(); });
  for (const ev of ["pointerup", "pointercancel", "touchend", "pointerleave"]) el.addEventListener(ev, (e) => { e.preventDefault(); off(); });
}
if ("ontouchstart" in window) {
  document.getElementById("touch-controls").classList.remove("hidden");
  bindTouch("tc-left", () => keys.left = true, () => keys.left = false);
  bindTouch("tc-right", () => keys.right = true, () => keys.right = false);
  bindTouch("tc-jump", () => { pressJump(); keys.jump = true; }, () => keys.jump = false);
}

// ---------- Sound (tiny synth, no files needed) ----------
let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}
function beep(freq, dur = 0.12, type = "square", vol = 0.15, slideTo = null) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + dur);
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + dur);
}
const sfx = {
  jump: () => beep(330, 0.15, "square", 0.12, 660),
  double: () => beep(440, 0.15, "square", 0.12, 880),
  collect: () => { beep(880, 0.08, "sine", 0.18); setTimeout(() => beep(1320, 0.12, "sine", 0.18), 70); },
  spring: () => beep(220, 0.25, "sawtooth", 0.12, 880),
  bounce: () => beep(260, 0.15, "triangle", 0.18, 520),
  splash: () => beep(300, 0.3, "sine", 0.12, 80),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, "square", 0.14), i * 130)); },
  power: () => { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.1, "square", 0.14), i * 60)); },
  super: () => { [1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => beep(f, 0.12, "sine", 0.16), i * 55)); },
};

// ---------- Level parsing ----------
function parseLevel(def) {
  const rows = def.map;
  const solids = [];   // 2 = full block, 1 = one-way platform
  const items = [];
  const springs = [];
  const turtles = [];
  const powerups = [];
  let flag = null;
  let start = { x: 2 * TILE, y: 2 * TILE };
  const cols = Math.max(...rows.map(r => r.length));

  for (let r = 0; r < rows.length; r++) {
    solids.push(new Array(cols).fill(0));
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      const x = c * TILE, y = r * TILE;
      if (ch === "#") solids[r][c] = 2;
      else if (ch === "=") solids[r][c] = 1;
      else if (ch === "o") items.push({ x: x + TILE / 2, y: y + TILE / 2, got: false });
      else if (ch === "!") powerups.push({ x: x + TILE / 2, y: y + TILE / 2, got: false });
      else if (ch === "^") springs.push({ x, y });
      else if (ch === "T") turtles.push({ x: x + TILE / 2, y: y + TILE - 14, dir: 1, baseX: x + TILE / 2, squish: 0 });
      else if (ch === "F") flag = { x: x + TILE / 2, y: y + TILE };
      else if (ch === "P") start = { x, y };
    }
  }
  // Snap springs and turtles down onto the nearest ground below,
  // so kids can place them anywhere in a column and they still work.
  const groundRowBelow = (col, fromRow) => {
    for (let r = fromRow; r < rows.length; r++) if (solids[r][col]) return r;
    return rows.length - 1;
  };
  for (const s of springs) {
    const col = Math.floor(s.x / TILE);
    s.y = (groundRowBelow(col, Math.floor(s.y / TILE)) - 1) * TILE;
  }
  for (const t of turtles) {
    const col = Math.floor(t.baseX / TILE);
    t.y = groundRowBelow(col, Math.floor(t.y / TILE)) * TILE - 14;
  }

  return {
    name: def.name, sky: def.sky, solids, items, springs, turtles, powerups, flag, start,
    superCount: 0,
    rows: rows.length, cols, width: cols * TILE, height: rows.length * TILE,
  };
}

function solidAt(col, row) {
  if (col < 0 || col >= level.cols || row < 0 || row >= level.rows) return 0;
  return level.solids[row][col];
}

// ---------- Player ----------
function spawnPlayer() {
  player = {
    x: level.start.x + 6, y: level.start.y,
    w: 34, h: 42,
    vx: 0, vy: 0,
    facing: 1,
    onGround: false,
    coyote: 0,
    airJumps: 0,
    power: 0,            // powerup frames remaining
    flash: FEEL.respawnFlash / 2,
  };
}

function respawn() {
  sfx.splash();
  const keepPower = player ? player.power : 0;   // don't lose your powerup!
  spawnPlayer();
  player.power = keepPower;
  player.flash = FEEL.respawnFlash;
  camX = Math.max(0, Math.min(player.x - W / 3, level.width - W));
}

function startLevel(i) {
  levelIndex = i;
  level = parseLevel(LEVELS[i]);
  spawnPlayer();
  camX = 0;
  confetti = [];
  sparkles = [];
  mode = "play";
  document.getElementById("win-screen").classList.add("hidden");
  document.getElementById("select-screen").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  updateHud();
}

function updateHud() {
  const got = level.items.filter(i => i.got).length;
  document.getElementById("hud-level").textContent = `${level.name}  (${levelIndex + 1}/${LEVELS.length})`;
  let score = `${itemEmoji()} ${got}/${level.items.length}`;
  if (level.superCount > 0) score += `   💎x${level.superCount}`;
  if (player && player.power > 0) score += `   ⚡${Math.ceil(player.power / 60)}`;
  document.getElementById("hud-score").textContent = score;
}

function itemEmoji() {
  return { bone: "🦴", star: "⭐", gem: "💎" }[hero.collectible] || "⭐";
}

// ---------- Physics ----------
function updatePlayer() {
  const p = player;

  // Powerup makes you play better: faster runs, higher jumps!
  const powered = p.power > 0;
  if (powered) {
    p.power--;
    if (p.power === 0) updateHud();   // clear the ⚡ from the HUD when it runs out
  }
  const runSpeed = hero.speed * (powered ? POWERUP.speedBoost : 1);
  const jumpPower = hero.jumpPower * (powered ? POWERUP.jumpBoost : 1);

  // Run
  const accel = 0.7;
  if (keys.left) { p.vx = Math.max(p.vx - accel, -runSpeed); p.facing = -1; }
  else if (keys.right) { p.vx = Math.min(p.vx + accel, runSpeed); p.facing = 1; }
  else p.vx *= 0.75;
  if (Math.abs(p.vx) < 0.05) p.vx = 0;

  // Jump (with buffer + coyote time = very forgiving)
  if (jumpBuffered > 0) {
    if (p.onGround || p.coyote > 0) {
      p.vy = -jumpPower;
      p.onGround = false;
      p.coyote = 0;
      jumpBuffered = 0;
      sfx.jump();
    } else if (hero.doubleJump && p.airJumps > 0) {
      p.vy = -jumpPower * 0.95;
      p.airJumps--;
      jumpBuffered = 0;
      sfx.double();
      burst(p.x + p.w / 2, p.y + p.h, "#f1faee", 8);
    }
  }
  if (jumpBuffered > 0) jumpBuffered--;

  // Shorter hop if you let go early
  if (!keys.jump && p.vy < -4) p.vy = -4;

  // Gravity
  p.vy = Math.min(p.vy + FEEL.gravity, 16);

  // --- Move & collide: X ---
  p.x += p.vx;
  if (p.x < 0) p.x = 0;
  let top = Math.floor(p.y / TILE), bot = Math.floor((p.y + p.h - 1) / TILE);
  if (p.vx > 0) {
    const col = Math.floor((p.x + p.w) / TILE);
    for (let r = top; r <= bot; r++) if (solidAt(col, r) === 2) { p.x = col * TILE - p.w; p.vx = 0; }
  } else if (p.vx < 0) {
    const col = Math.floor(p.x / TILE);
    for (let r = top; r <= bot; r++) if (solidAt(col, r) === 2) { p.x = (col + 1) * TILE; p.vx = 0; }
  }

  // --- Move & collide: Y ---
  const prevBottom = p.y + p.h;
  p.y += p.vy;
  const left = Math.floor((p.x + 4) / TILE), right = Math.floor((p.x + p.w - 4) / TILE);
  const wasOnGround = p.onGround;
  p.onGround = false;
  if (p.vy >= 0) {
    const row = Math.floor((p.y + p.h) / TILE);
    for (let c = left; c <= right; c++) {
      const s = solidAt(c, row);
      // Full blocks always stop you; platforms only if you were above them
      if (s === 2 || (s === 1 && prevBottom <= row * TILE + 1)) {
        p.y = row * TILE - p.h;
        p.vy = 0;
        p.onGround = true;
      }
    }
  } else {
    const row = Math.floor(p.y / TILE);
    for (let c = left; c <= right; c++) if (solidAt(c, row) === 2) { p.y = (row + 1) * TILE; p.vy = 0; }
  }

  // Coyote time & double-jump refill
  if (p.onGround) { p.coyote = FEEL.coyoteTime; p.airJumps = hero.doubleJump ? 1 : 0; }
  else if (wasOnGround && p.coyote === 0) p.coyote = FEEL.coyoteTime;
  else if (p.coyote > 0) p.coyote--;

  // Springs
  for (const s of level.springs) {
    if (p.x + p.w > s.x + 8 && p.x < s.x + TILE - 8 &&
        p.y + p.h > s.y + TILE - 20 && p.y + p.h < s.y + TILE + 10 && p.vy >= 0) {
      p.vy = -20;
      p.onGround = false;
      sfx.spring();
      burst(s.x + TILE / 2, s.y + TILE - 10, "#ffd700", 10);
    }
  }

  // Friendly turtles: bounce on top, gentle nudge from the side
  for (const t of level.turtles) {
    const tw = 40, th = 26;
    if (p.x + p.w > t.x - tw / 2 && p.x < t.x + tw / 2 &&
        p.y + p.h > t.y - th && p.y + p.h < t.y + 10) {
      if (p.vy > 0 && prevBottom <= t.y - th + 12) {
        p.vy = -14;
        t.squish = 12;
        sfx.bounce();
      } else {
        p.vx = p.x + p.w / 2 < t.x ? -3 : 3;  // soft push, never hurts
      }
    }
  }

  // Powerups! ⚡
  for (const pu of level.powerups) {
    if (!pu.got && Math.abs(p.x + p.w / 2 - pu.x) < 36 && Math.abs(p.y + p.h / 2 - pu.y) < 38) {
      pu.got = true;
      p.power = POWERUP.duration;
      sfx.power();
      burst(pu.x, pu.y, "#ffd700", 14);
      burst(pu.x, pu.y, "#00e5ff", 10);
      updateHud();
    }
  }

  // Collectibles — SUPER DIAMONDS if you're powered up!
  for (const it of level.items) {
    if (!it.got && Math.abs(p.x + p.w / 2 - it.x) < 34 && Math.abs(p.y + p.h / 2 - it.y) < 36) {
      it.got = true;
      if (p.power > 0) {
        level.superCount++;
        sfx.super();
        // rainbow mega-burst for a super diamond!
        for (let i = 0; i < 5; i++) burst(it.x, it.y, `hsl(${i * 72}, 90%, 60%)`, 8);
      } else {
        sfx.collect();
        burst(it.x, it.y, "#ffd700", 12);
      }
      updateHud();
    }
  }

  // Rainbow sparkle trail while powered up
  if (p.power > 0 && frame % 3 === 0) {
    sparkles.push({
      x: p.x + p.w / 2 + (Math.random() - 0.5) * 20,
      y: p.y + p.h - Math.random() * 20,
      vx: (Math.random() - 0.5) * 1.5, vy: -0.5,
      life: 22, color: `hsl(${(frame * 9) % 360}, 90%, 65%)`,
    });
  }

  // Fell in water? No problem — pop right back!
  if (p.y > level.height + 60) respawn();

  // Reached the flag?
  const f = level.flag;
  if (f && Math.abs(p.x + p.w / 2 - f.x) < 40 && p.y + p.h > f.y - TILE * 2.2) {
    winLevel();
  }

  if (p.flash > 0) p.flash--;

  // Camera follows gently
  const target = Math.max(0, Math.min(p.x - W / 3, level.width - W));
  camX += (target - camX) * 0.1;
}

function updateTurtles() {
  for (const t of level.turtles) {
    t.x += t.dir * 0.6;
    if (Math.abs(t.x - t.baseX) > TILE * 1.2) t.dir *= -1;
    if (t.squish > 0) t.squish--;
  }
}

// ---------- Win ----------
function winLevel() {
  mode = "winpause";
  winTimer = 90;
  sfx.win();
  for (let i = 0; i < 80; i++) {
    confetti.push({
      x: player.x + player.w / 2 + (Math.random() - 0.5) * 300,
      y: player.y - Math.random() * 250,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2,
      color: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"][i % 5],
      spin: Math.random() * Math.PI,
    });
  }
}

function showWinScreen() {
  const got = level.items.filter(i => i.got).length;
  const total = level.items.length;
  let stars = 1;
  if (got >= total / 2) stars = 2;
  if (got === total) stars = 3;
  const last = levelIndex === LEVELS.length - 1;
  document.getElementById("win-title").textContent = last ? "🏆 YOU BEAT THE WHOLE GAME! 🏆" : "YOU DID IT!";
  document.getElementById("win-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars) +
    ` ${itemEmoji()} ${got}/${total}` +
    (level.superCount > 0 ? `  💎x${level.superCount} SUPER!` : "");
  document.getElementById("next-btn").textContent = last ? "Play Again 🔁" : "Next Level ➡️";
  document.getElementById("win-screen").classList.remove("hidden");
}

document.getElementById("next-btn").addEventListener("click", () => {
  unlockAudio();
  startLevel((levelIndex + 1) % LEVELS.length);
});
document.getElementById("heroes-btn").addEventListener("click", () => {
  document.getElementById("win-screen").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("select-screen").classList.remove("hidden");
  mode = "select";
});

// ---------- Particles ----------
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    sparkles.push({ x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1, life: 30, color });
  }
}
function updateParticles() {
  for (const s of sparkles) { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life--; }
  sparkles = sparkles.filter(s => s.life > 0);
  for (const c of confetti) { c.x += c.vx; c.y += c.vy; c.vy += 0.12; c.spin += 0.1; }
  confetti = confetti.filter(c => c.y < level.height + 100);
}

// ============================================================
//  DRAWING
// ============================================================

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, level.sky[0]);
  g.addColorStop(1, level.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Sun
  ctx.fillStyle = "#fff7ae";
  ctx.beginPath(); ctx.arc(W - 110, 90, 45, 0, Math.PI * 2); ctx.fill();

  // Clouds (parallax)
  ctx.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 340 - camX * 0.3) % (W + 300) + W + 300) % (W + 300) - 150;
    const cy = 60 + (i % 3) * 55;
    for (const [dx, dy, r] of [[0, 0, 26], [22, -8, 20], [-22, -5, 18], [40, 4, 16], [-40, 6, 14]]) {
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Hills (parallax)
  ctx.fillStyle = "rgba(120, 200, 120, .5)";
  for (let i = 0; i < 8; i++) {
    const hx = ((i * 420 - camX * 0.5) % (W + 500) + W + 500) % (W + 500) - 250;
    ctx.beginPath(); ctx.arc(hx, H + 60, 190, Math.PI, 0); ctx.fill();
  }

  // Water at the bottom of gaps
  ctx.fillStyle = "rgba(70, 160, 240, .8)";
  ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(255,255,255,.4)";
  for (let i = 0; i < 12; i++) {
    const wx = ((i * 120 - camX) % (W + 120) + W + 120) % (W + 120) - 60;
    ctx.beginPath();
    ctx.arc(wx + Math.sin(frame / 20 + i) * 8, H - 26, 8, Math.PI, 0);
    ctx.fill();
  }
}

function drawTiles() {
  const c0 = Math.max(0, Math.floor(camX / TILE)), c1 = Math.min(level.cols - 1, Math.ceil((camX + W) / TILE));
  for (let r = 0; r < level.rows; r++) {
    for (let c = c0; c <= c1; c++) {
      const s = level.solids[r][c];
      if (!s) continue;
      const x = c * TILE - camX, y = r * TILE - (level.height - H);
      if (s === 2) {
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#a0522d";
        ctx.fillRect(x + 4, y + 10, 16, 12);
        ctx.fillRect(x + 26, y + 26, 16, 12);
        if (solidAt(c, r - 1) === 0) {   // grass on top
          ctx.fillStyle = "#4caf50";
          ctx.fillRect(x, y, TILE, 14);
          ctx.fillStyle = "#66bb6a";
          for (let b = 0; b < 4; b++) ctx.fillRect(x + b * 12 + 3, y - 4, 5, 6);
        }
      } else {
        ctx.fillStyle = "#e6a23c";
        ctx.beginPath(); ctx.roundRect(x, y + 6, TILE, 20, 8); ctx.fill();
        ctx.fillStyle = "#f7c873";
        ctx.beginPath(); ctx.roundRect(x + 3, y + 8, TILE - 6, 8, 6); ctx.fill();
      }
    }
  }
}

const offY = () => level.height - H;   // level is bottom-aligned to canvas

function drawItems() {
  // While powered up, treats become SUPER DIAMONDS! 💎
  const powered = player && player.power > 0;
  const emoji = powered ? "💎" : itemEmoji();
  for (const it of level.items) {
    if (it.got) continue;
    const x = it.x - camX, y = it.y - offY() + Math.sin(frame / 12 + it.x) * 5;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = powered ? `hsl(${(frame * 6) % 360}, 90%, 60%)` : "#fff";
    ctx.shadowBlur = powered ? 20 : 12;
    ctx.font = "30px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }
}

function drawPowerups() {
  for (const pu of level.powerups) {
    if (pu.got) continue;
    const x = pu.x - camX, y = pu.y - offY() + Math.sin(frame / 10 + pu.x) * 6;
    const pulse = 1 + Math.sin(frame / 6) * 0.15;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    // glowing ring
    ctx.strokeStyle = `hsl(${(frame * 4) % 360}, 90%, 60%)`;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 18;
    ctx.font = "28px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", 0, 0);
    ctx.restore();
  }
}

function drawSprings() {
  for (const s of level.springs) {
    const x = s.x - camX, y = s.y - offY();
    ctx.fillStyle = "#d33";
    ctx.beginPath(); ctx.roundRect(x + 8, y + TILE - 16, TILE - 16, 10, 4); ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + TILE - 6);
    ctx.lineTo(x + TILE - 14, y + TILE - 2);
    ctx.stroke();
    ctx.fillStyle = "#ffd700";
    ctx.font = "16px serif"; ctx.textAlign = "center";
    ctx.fillText("⬆", x + TILE / 2, y + TILE - 18);
  }
}

function drawTurtles() {
  for (const t of level.turtles) {
    const x = t.x - camX, y = t.y - offY();
    const sq = t.squish > 0 ? 0.7 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sq);
    // shell
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath(); ctx.arc(0, -8, 20, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#66bb6a";
    ctx.beginPath(); ctx.arc(0, -8, 13, Math.PI, 0); ctx.fill();
    // head + smile
    ctx.fillStyle = "#8bc34a";
    ctx.beginPath(); ctx.arc(t.dir * 22, -10, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(t.dir * 24, -12, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(t.dir * 24, -9, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    // feet
    ctx.fillStyle = "#8bc34a";
    const step = Math.sin(frame / 8) * 3;
    ctx.fillRect(-14 + step, -4, 8, 6);
    ctx.fillRect(6 - step, -4, 8, 6);
    ctx.restore();
  }
}

function drawFlag() {
  const f = level.flag;
  if (!f) return;
  const x = f.x - camX, y = f.y - offY();
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - TILE * 2.6); ctx.stroke();
  const wave = Math.sin(frame / 10) * 6;
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.moveTo(x + 3, y - TILE * 2.6);
  ctx.lineTo(x + 60, y - TILE * 2.35 + wave);
  ctx.lineTo(x + 3, y - TILE * 2.1);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath(); ctx.arc(x, y - TILE * 2.6, 7, 0, Math.PI * 2); ctx.fill();
}

// ---------- Hero drawings (simple, cute, original) ----------
function drawHero(c, style, colors, opts) {
  const { facing = 1, run = 0, jumping = false } = opts;
  c.save();
  c.scale(facing, 1);
  const bob = jumping ? 0 : Math.abs(Math.sin(run)) * 2;
  c.translate(0, -bob);

  if (style === "puppy") {
    // tail
    c.strokeStyle = colors.body; c.lineWidth = 6; c.lineCap = "round";
    c.beginPath(); c.moveTo(-16, 2); c.quadraticCurveTo(-26, -6 + Math.sin(run * 2) * 6, -24, -14 + Math.sin(run * 2) * 6); c.stroke();
    // body
    c.fillStyle = colors.body;
    c.beginPath(); c.ellipse(0, 6, 16, 13, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = colors.belly;
    c.beginPath(); c.ellipse(2, 10, 9, 7, 0, 0, Math.PI * 2); c.fill();
    // legs
    c.fillStyle = colors.body;
    const lr = jumping ? 4 : Math.sin(run * 2) * 5;
    c.fillRect(-12 + lr, 14, 7, 8); c.fillRect(5 - lr, 14, 7, 8);
    // head
    c.beginPath(); c.arc(8, -10, 12, 0, Math.PI * 2); c.fill();
    // ears (floppy!)
    c.beginPath(); c.ellipse(0, -16, 5, 9, -0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#8a5a2b";
    c.beginPath(); c.ellipse(15, -16, 5, 9, 0.5, 0, Math.PI * 2); c.fill();
    // snout + nose + eye
    c.fillStyle = colors.belly;
    c.beginPath(); c.ellipse(15, -6, 6, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#222";
    c.beginPath(); c.arc(18, -8, 2.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(10, -12, 2.2, 0, Math.PI * 2); c.fill();
    // hero collar + badge
    c.fillStyle = colors.accent;
    c.fillRect(0, -2, 14, 5);
    c.fillStyle = colors.badge;
    c.beginPath(); c.arc(7, 4, 4, 0, Math.PI * 2); c.fill();
  }

  if (style === "spider") {
    // body suit
    c.fillStyle = colors.body;
    c.beginPath(); c.roundRect(-9, -6, 18, 22, 7); c.fill();
    c.fillStyle = colors.belly;   // blue legs
    const lr = jumping ? 5 : Math.sin(run * 2) * 5;
    c.fillRect(-8 + lr, 14, 7, 9); c.fillRect(2 - lr, 14, 7, 9);
    // arms
    c.strokeStyle = colors.body; c.lineWidth = 5; c.lineCap = "round";
    const arm = jumping ? -14 : Math.sin(run * 2) * 6;
    c.beginPath(); c.moveTo(-7, -2); c.lineTo(-13, 6 + arm); c.stroke();
    c.beginPath(); c.moveTo(7, -2); c.lineTo(13, 6 - arm); c.stroke();
    // head (masked)
    c.fillStyle = colors.body;
    c.beginPath(); c.arc(0, -14, 11, 0, Math.PI * 2); c.fill();
    // big friendly eyes
    c.fillStyle = colors.accent;
    c.beginPath(); c.ellipse(5, -15, 4.5, 6, 0.35, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(-4, -15, 3.5, 5, -0.35, 0, Math.PI * 2); c.fill();
    // web lines on chest
    c.strokeStyle = colors.accent; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -4); c.lineTo(0, 8); c.stroke();
    c.beginPath(); c.moveTo(-7, 0); c.lineTo(7, 0); c.stroke();
    c.beginPath(); c.moveTo(-6, 6); c.lineTo(6, -4); c.stroke();
    c.beginPath(); c.moveTo(-6, -4); c.lineTo(6, 6); c.stroke();
  }

  if (style === "wizard") {
    // robe
    c.fillStyle = colors.body;
    c.beginPath();
    c.moveTo(0, -8); c.lineTo(13, 20); c.lineTo(-13, 20); c.closePath(); c.fill();
    // stars on robe
    c.fillStyle = colors.belly;
    c.font = "8px serif"; c.textAlign = "center";
    c.fillText("★", -5, 10); c.fillText("★", 6, 16);
    // feet
    c.fillStyle = "#5a3e2b";
    const lr = jumping ? 4 : Math.sin(run * 2) * 4;
    c.fillRect(-9 + lr, 19, 7, 5); c.fillRect(3 - lr, 19, 7, 5);
    // head
    c.fillStyle = "#ffd9b3";
    c.beginPath(); c.arc(0, -13, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#222";
    c.beginPath(); c.arc(4, -14, 1.8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#222"; c.lineWidth = 1.2;
    c.beginPath(); c.arc(2, -10, 3.5, 0.3, Math.PI - 0.6); c.stroke();
    // wizard hat
    c.fillStyle = colors.accent;
    c.beginPath(); c.moveTo(-1, -38); c.lineTo(10, -18); c.lineTo(-12, -18); c.closePath(); c.fill();
    c.beginPath(); c.roundRect(-14, -20, 28, 5, 3); c.fill();
    c.fillStyle = "#ffd700";
    c.font = "9px serif"; c.fillText("★", -1, -24);
    // little sword (held up when jumping!)
    c.save();
    c.translate(13, jumping ? -18 : -2);
    c.rotate(jumping ? -0.9 : 0.5);
    c.fillStyle = colors.badge;
    c.beginPath(); c.roundRect(-2, -16, 4, 16, 2); c.fill();
    c.fillStyle = "#8d6e63";
    c.fillRect(-5, 0, 10, 3);
    c.fillRect(-1.5, 2, 3, 6);
    c.restore();
    // sword sparkle when jumping
    if (jumping) {
      c.fillStyle = "#fff";
      c.font = "10px serif";
      c.fillText("✦", 18, -32);
    }
  }

  c.restore();
}

function drawPlayer() {
  const p = player;
  if (p.flash > 0 && Math.floor(p.flash / 4) % 2 === 0) return;  // blink on respawn
  ctx.save();
  ctx.translate(p.x + p.w / 2 - camX, p.y + p.h / 2 - offY() + 2);
  // Rainbow power aura (blinks when it's about to run out)
  if (p.power > 0 && !(p.power < 120 && Math.floor(p.power / 8) % 2 === 0)) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = `hsl(${(frame * 7) % 360}, 90%, 60%)`;
    ctx.beginPath();
    ctx.arc(0, 0, 34 + Math.sin(frame / 5) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawHero(ctx, hero.style, hero.colors, {
    facing: p.facing,
    run: Math.abs(p.vx) > 0.5 && p.onGround ? frame / 4 : 0,
    jumping: !p.onGround,
  });
  ctx.restore();
}

function drawParticles() {
  for (const s of sparkles) {
    ctx.globalAlpha = s.life / 30;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.x - camX, s.y - offY(), 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x - camX, c.y - offY());
    ctx.rotate(c.spin);
    ctx.fillStyle = c.color;
    ctx.fillRect(-5, -3, 10, 6);
    ctx.restore();
  }
}

// ---------- Character select ----------
function buildSelectScreen() {
  const wrap = document.getElementById("hero-cards");
  wrap.innerHTML = "";
  for (const h of HEROES) {
    const card = document.createElement("button");
    card.className = "hero-card";
    const cv = document.createElement("canvas");
    cv.width = 120; cv.height = 120;
    const cc = cv.getContext("2d");
    card.appendChild(cv);
    const title = document.createElement("h2");
    title.textContent = h.name;
    const tag = document.createElement("p");
    tag.textContent = h.tagline;
    card.appendChild(title);
    card.appendChild(tag);
    card.addEventListener("click", () => {
      unlockAudio();
      hero = h;
      sfx.collect();
      startLevel(0);
    });
    wrap.appendChild(card);
    h._previewCtx = cc;   // animate previews in the main loop
  }
}

function animatePreviews() {
  for (const h of HEROES) {
    const cc = h._previewCtx;
    if (!cc) continue;
    cc.clearRect(0, 0, 120, 120);
    cc.save();
    cc.translate(60, 72);
    cc.scale(2, 2);
    drawHero(cc, h.style, h.colors, { facing: 1, run: frame / 8, jumping: false });
    cc.restore();
  }
}

// ---------- Main loop ----------
function tick() {
  frame++;
  if (mode === "select") {
    animatePreviews();
  } else if (mode === "play" || mode === "winpause") {
    if (mode === "play") updatePlayer();
    // keep the ⚡ countdown in the HUD ticking
    if (mode === "play" && player.power > 0 && frame % 15 === 0) updateHud();
    updateTurtles();
    updateParticles();
    if (mode === "winpause" && --winTimer <= 0) {
      mode = "won";
      showWinScreen();
    }
    drawBackground();
    drawTiles();
    drawSprings();
    drawPowerups();
    drawItems();
    drawTurtles();
    drawFlag();
    drawPlayer();
    drawParticles();
  } else if (mode === "won") {
    updateParticles();
    drawBackground();
    drawTiles();
    drawSprings();
    drawPowerups();
    drawItems();
    drawTurtles();
    drawFlag();
    drawPlayer();
    drawParticles();
  }
}

function loop() {
  tick();
  requestAnimationFrame(loop);
}

buildSelectScreen();
loop();

// Manual stepping for automated tests
window.__step = (n = 1) => { for (let i = 0; i < n; i++) tick(); };

// Debug peek (used for automated testing; harmless to leave in)
window.__peek = () => ({
  mode, levelIndex,
  player: player ? { x: Math.round(player.x), y: Math.round(player.y), vx: +player.vx.toFixed(1), vy: +player.vy.toFixed(1), onGround: player.onGround, power: player.power } : null,
  keys: { ...keys },
  got: level ? level.items.filter(i => i.got).length : 0,
  superCount: level ? level.superCount : 0,
  powerupsLeft: level ? level.powerups.filter(p => !p.got).length : 0,
});
})();
