// 物理おはじき パラメータ感度確認プロト (M0.1)
// 構成: [物理] [描画] [入力] [UI バインド] / 物理関数は DOM 非依存で export

// =============================================================
// [物理] 純粋関数 (DOM 非依存・テスト対象)
// =============================================================

/**
 * 円-円弾性衝突 (in-place 更新)。重なりがある場合のみ法線方向の運動量を交換し、
 * 反発係数 e を適用、最後に重なり量を半分ずつ押し戻す。
 * @returns {boolean} 衝突解決を行ったか
 */
export function resolveCircleCircle(a, b, e) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || dist >= a.r + b.r) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return false;
  const j = -(1 + e) * velAlongNormal / (1 / a.m + 1 / b.m);
  const ix = j * nx;
  const iy = j * ny;
  a.vx -= ix / a.m;
  a.vy -= iy / a.m;
  b.vx += ix / b.m;
  b.vy += iy / b.m;
  const overlap = (a.r + b.r - dist) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;
  return true;
}

/**
 * 円-壁反射。壁にめり込んだ場合のみ法線方向速度を反転し、反発係数 e を適用。
 * bounds = { x:0, y:0, w:600, h:600 }
 * @returns {boolean} いずれかの壁で反射したか
 */
export function resolveCircleWall(ball, bounds, e) {
  let hit = false;
  if (ball.x - ball.r < bounds.x) {
    ball.x = bounds.x + ball.r;
    if (ball.vx < 0) { ball.vx = -ball.vx * e; hit = true; }
  } else if (ball.x + ball.r > bounds.x + bounds.w) {
    ball.x = bounds.x + bounds.w - ball.r;
    if (ball.vx > 0) { ball.vx = -ball.vx * e; hit = true; }
  }
  if (ball.y - ball.r < bounds.y) {
    ball.y = bounds.y + ball.r;
    if (ball.vy < 0) { ball.vy = -ball.vy * e; hit = true; }
  } else if (ball.y + ball.r > bounds.y + bounds.h) {
    ball.y = bounds.y + bounds.h - ball.r;
    if (ball.vy > 0) { ball.vy = -ball.vy * e; hit = true; }
  }
  return hit;
}

/**
 * 摩擦適用: 速度ベクトルを μ * dt 減衰 (線形)。|v| < REST_EPS で静止。
 */
export const REST_EPS = 1e-4;
export function applyFriction(ball, mu, dt) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < REST_EPS) {
    ball.vx = 0;
    ball.vy = 0;
    return;
  }
  const decay = mu * dt;
  const newSpeed = Math.max(0, speed - decay * speed); // 線形比率減衰 (= (1 - μ*dt) スケール)
  if (newSpeed < REST_EPS) {
    ball.vx = 0;
    ball.vy = 0;
  } else {
    const k = newSpeed / speed;
    ball.vx *= k;
    ball.vy *= k;
  }
}

/**
 * 万有引力 (全球ペア): F = G * m_a * m_b / d^2、距離下限 d ≥ 2r でクランプし発散防止。
 * G===0 で no-op。
 */
export function applyGravity(balls, G, dt) {
  if (G === 0) return;
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dMin = a.r + b.r;
      const d = Math.max(Math.hypot(dx, dy), dMin);
      const f = G * a.m * b.m / (d * d);
      const ux = dx / d;
      const uy = dy / d;
      a.vx += (f / a.m) * ux * dt;
      a.vy += (f / a.m) * uy * dt;
      b.vx -= (f / b.m) * ux * dt;
      b.vy -= (f / b.m) * uy * dt;
    }
  }
}

/**
 * 1 frame の物理ステップ: 引力 → 速度積分 → 壁反射 → 円-円衝突 → 摩擦
 */
export function stepWorld(balls, params, dt) {
  applyGravity(balls, params.G, dt);
  for (const ball of balls) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  }
  for (const ball of balls) {
    resolveCircleWall(ball, params.bounds, params.e);
  }
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveCircleCircle(balls[i], balls[j], params.e);
    }
  }
  for (const ball of balls) {
    applyFriction(ball, params.mu, dt);
  }
}

/** 全球が静止しているか */
export function allAtRest(balls) {
  for (const b of balls) {
    if (Math.hypot(b.vx, b.vy) >= REST_EPS) return false;
  }
  return true;
}

// =============================================================
// 以下は DOM が存在する環境 (ブラウザ) でのみ実行する。
// テストハーネス (proto.test.html をブラウザで開いた場合) から
// import された際は #stage が無いので initApp は呼ばれず副作用ゼロ。
// (Node からの import は未対応: 本ファイルはブラウザ専用)
// =============================================================
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
if (isBrowser && document.getElementById('stage')) {
  initApp();
}

function initApp() {
  // ----- 定数 -----
  const CANVAS_W = 600;
  const CANVAS_H = 600;
  const BALL_R = 12;
  const BALL_M = 1;
  const DT = 1 / 60;
  const SLINGSHOT_K = 0.1;
  const TURN_TIMEOUT_MS = 4000;
  const REST_FRAMES_FOR_LOG = 60; // 60 frame 連続静止で restTime 記録
  const BREAK_WATCH_MS = 1000;    // 静止後 1 秒以内の再運動を検出

  // ----- 状態 -----
  /** @type {{x:number,y:number,vx:number,vy:number,r:number,m:number,id:number,
   *          restFrames:number,restTime:number|null,color:string}[]} */
  const balls = [];
  let nextId = 0;
  const params = {
    G: 0.001,
    e: 0.85,
    mu: 0.30,
    bounds: { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }
  };
  let phase = 'idle';        // 'idle' | 'aiming' | 'simulating'
  let turnStartMs = 0;
  /** @type {{ballId:number,startX:number,startY:number,curX:number,curY:number}|null} */
  let aim = null;

  // ----- DOM 参照 -----
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const sliderG = document.getElementById('sliderG');
  const sliderE = document.getElementById('sliderE');
  const sliderMu = document.getElementById('sliderMu');
  const valG = document.getElementById('valG');
  const valE = document.getElementById('valE');
  const valMu = document.getElementById('valMu');
  const btnReset = document.getElementById('btnReset');
  const btnAdd = document.getElementById('btnAdd');
  const ballCountEl = document.getElementById('ballCount');
  const phaseEl = document.getElementById('phase');
  const elapsedEl = document.getElementById('elapsed');

  // =============================================================
  // [描画]
  // =============================================================
  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ボール
    for (const b of balls) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#333';
      ctx.stroke();
    }

    // 引き矢印 (スリングショット)
    if (aim) {
      const ball = balls.find(b => b.id === aim.ballId);
      if (ball) {
        const dx = aim.startX - aim.curX;
        const dy = aim.startY - aim.curY;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + dx, ball.y + dy);
        ctx.strokeStyle = '#d33';
        ctx.lineWidth = 2;
        ctx.stroke();
        // 矢頭
        const ang = Math.atan2(dy, dx);
        const tipX = ball.x + dx;
        const tipY = ball.y + dy;
        const ah = 8;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ah * Math.cos(ang - 0.4), tipY - ah * Math.sin(ang - 0.4));
        ctx.lineTo(tipX - ah * Math.cos(ang + 0.4), tipY - ah * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fillStyle = '#d33';
        ctx.fill();
      }
    }
  }

  // =============================================================
  // [入力] スリングショット (Pointer Events: マウス + タッチ + ペン統合)
  // =============================================================
  function getPointerPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  // 同時 1 ポインタのみ受け付ける (マルチタッチで狙いが乱れないように)
  let activePointerId = null;

  canvas.addEventListener('pointerdown', (ev) => {
    if (phase !== 'idle') return;
    if (activePointerId !== null) return;
    ev.preventDefault(); // iOS Safari のスクロール/ズーム抑止
    const p = getPointerPos(ev);
    // クリック/タップされたボールを探す
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r) {
        aim = { ballId: b.id, startX: p.x, startY: p.y, curX: p.x, curY: p.y };
        phase = 'aiming';
        activePointerId = ev.pointerId;
        try { canvas.setPointerCapture(ev.pointerId); } catch (_) { /* noop */ }
        return;
      }
    }
  });

  canvas.addEventListener('pointermove', (ev) => {
    if (phase !== 'aiming' || !aim) return;
    if (ev.pointerId !== activePointerId) return;
    ev.preventDefault();
    const p = getPointerPos(ev);
    aim.curX = p.x;
    aim.curY = p.y;
  });

  function endAim(ev, commit) {
    if (phase !== 'aiming' || !aim) return;
    if (ev.pointerId !== activePointerId) return;
    ev.preventDefault();
    try { canvas.releasePointerCapture(ev.pointerId); } catch (_) { /* noop */ }
    activePointerId = null;
    if (!commit) {
      // pointercancel: ショットを中断
      phase = 'idle';
      aim = null;
      return;
    }
    const p = getPointerPos(ev);
    const ball = balls.find(b => b.id === aim.ballId);
    if (ball) {
      ball.vx = (aim.startX - p.x) * SLINGSHOT_K / DT; // 1 frame 内の見かけ速度を秒速へ
      ball.vy = (aim.startY - p.y) * SLINGSHOT_K / DT;
      // 静止監視リセット
      for (const b of balls) {
        b.restFrames = 0;
        b.restTime = null;
      }
      phase = 'simulating';
      turnStartMs = performance.now();
    } else {
      phase = 'idle';
    }
    aim = null;
  }

  canvas.addEventListener('pointerup', (ev) => endAim(ev, true));
  canvas.addEventListener('pointercancel', (ev) => endAim(ev, false));

  // =============================================================
  // [UI バインド]
  // =============================================================
  function bindSlider(slider, label, key, decimals) {
    const update = () => {
      const v = parseFloat(slider.value);
      params[key] = v;
      label.textContent = v.toFixed(decimals);
    };
    slider.addEventListener('input', update);
    update();
  }
  bindSlider(sliderG, valG, 'G', 4);
  bindSlider(sliderE, valE, 'e', 2);
  bindSlider(sliderMu, valMu, 'mu', 2);

  btnReset.addEventListener('click', () => {
    balls.length = 0;
    nextId = 0;
    phase = 'idle';
    aim = null;
    spawnInitialBalls();
  });

  btnAdd.addEventListener('click', () => {
    if (balls.length >= 10) return;
    spawnBallRandom();
  });

  function spawnBallRandom() {
    // 重ならない位置を 30 回試行
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = BALL_R + Math.random() * (CANVAS_W - 2 * BALL_R);
      const y = BALL_R + Math.random() * (CANVAS_H - 2 * BALL_R);
      let ok = true;
      for (const b of balls) {
        if (Math.hypot(x - b.x, y - b.y) < BALL_R * 2 + 2) { ok = false; break; }
      }
      if (ok) {
        balls.push(makeBall(x, y));
        return;
      }
    }
  }

  function makeBall(x, y) {
    const hue = (nextId * 53) % 360;
    return {
      x, y, vx: 0, vy: 0,
      r: BALL_R, m: BALL_M,
      id: nextId++,
      restFrames: 0,
      restTime: null,
      color: `hsl(${hue}, 70%, 60%)`
    };
  }

  function spawnInitialBalls() {
    for (let i = 0; i < 4; i++) spawnBallRandom();
  }

  // =============================================================
  // [破綻挙動検出ロガー]
  // =============================================================
  function updateBreakWatch(nowMs) {
    for (const b of balls) {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed < REST_EPS) {
        b.restFrames++;
        if (b.restFrames === REST_FRAMES_FOR_LOG) {
          b.restTime = nowMs;
        }
      } else {
        if (b.restTime !== null && (nowMs - b.restTime) <= BREAK_WATCH_MS) {
          // 静止後 1 秒以内に再運動 → 警告
          // eslint-disable-next-line no-console
          console.warn(`[BREAK] ball #${b.id} moved after rest (Δ=${(nowMs - b.restTime).toFixed(0)}ms, |v|=${speed.toExponential(2)})`);
        }
        b.restFrames = 0;
        b.restTime = null;
      }
    }
  }

  // =============================================================
  // [メインループ]
  // =============================================================
  function tick() {
    const now = performance.now();

    if (phase === 'simulating') {
      stepWorld(balls, params, DT);
      updateBreakWatch(now);
      const elapsed = now - turnStartMs;
      if (allAtRest(balls) || elapsed > TURN_TIMEOUT_MS) {
        // ターン終了
        for (const b of balls) { b.vx = 0; b.vy = 0; }
        phase = 'idle';
      }
      elapsedEl.textContent = String(Math.floor(elapsed));
    } else {
      elapsedEl.textContent = '0';
    }

    ballCountEl.textContent = String(balls.length);
    phaseEl.textContent = phase;
    render();
    requestAnimationFrame(tick);
  }

  // 初期化
  spawnInitialBalls();
  requestAnimationFrame(tick);
}
