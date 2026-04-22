// M1.6 視覚目視確認用ドライバ。本番 index.html ではない (本番統合は M1.8)。
// 起動時に state を作って描画ループを回し、ボタン押下で各エフェクト API を叩く。

import { createInitialState, advanceTurn } from '../../src/game/state.js';
import { createEffectManager } from '../../src/render/effects.js';
import { render, fitViewport } from '../../src/render/canvas.js';
import { renderHud, getMuteButtonLabel } from '../../src/render/ui.js';
import { createSfxController, createWebAudioSfx } from '../../src/audio/sfx.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('canvas'));
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const viewport = fitViewport({ width: canvas.width, height: canvas.height });

let state = createInitialState({ mode: '10ball', seed: 42 });
const fx = createEffectManager();
const sfx = createSfxController();
const webAudio = createWebAudioSfx(sfx);

function log(msg) {
    logEl.textContent = `${msg}\n${logEl.textContent}`.slice(0, 2000);
}

// 任意のユーザー操作で初回 prime (autoplay policy 対応)。
function ensurePrimed() {
    if (!webAudio.isPrimed()) {
        webAudio.prime();
        log('AudioContext primed');
    }
}

// ----- ボタン -----

document.getElementById('btnNew10').addEventListener('click', () => {
    state = createInitialState({ mode: '10ball', seed: Math.floor(Math.random() * 1e6) });
    log('新規ゲーム: 10球');
});
document.getElementById('btnNew6').addEventListener('click', () => {
    state = createInitialState({ mode: '6ball', seed: Math.floor(Math.random() * 1e6) });
    log('新規ゲーム: 6球');
});
document.getElementById('btnRipple').addEventListener('click', () => {
    ensurePrimed();
    const now = performance.now();
    fx.spawnRipple({ x: 0.5, y: 0.5, startMs: now, durationMs: 200 });
    fx.spawnRipple({ x: 0.3, y: 0.3, startMs: now + 50, durationMs: 200 });
    sfx.enqueue('click', now);
    log('Ripple x2 spawned + click sfx');
});
document.getElementById('btnPopup').addEventListener('click', () => {
    ensurePrimed();
    const now = performance.now();
    fx.spawnScorePopup({ x: 0.5, y: 0.5, text: '+1', startMs: now, durationMs: 600 });
    sfx.enqueue('pop', now);
    log('Popup +1 spawned + pop sfx');
});
document.getElementById('btnShake').addEventListener('click', () => {
    ensurePrimed();
    fx.triggerShake({ startMs: performance.now(), durationMs: 50, magnitudePx: 2 });
    log('Shake triggered');
});
document.getElementById('btnTurn').addEventListener('click', () => {
    ensurePrimed();
    state = advanceTurn(state);
    sfx.enqueue('turn', performance.now());
    log(`advanceTurn → turn=${state.turn} cp=${state.currentPlayer} status=${state.status}`);
});

// ミュート切替。状態は controller 側に保持し、ボタンラベルだけ更新する。
const btnMute = /** @type {HTMLButtonElement} */ (document.getElementById('btnMute'));
btnMute.textContent = getMuteButtonLabel(sfx.isMuted());
btnMute.addEventListener('click', () => {
    ensurePrimed();
    sfx.setMuted(!sfx.isMuted());
    btnMute.textContent = getMuteButtonLabel(sfx.isMuted());
    log(`Mute: ${sfx.isMuted()}`);
});

// ----- パフォーマンス計測 (Step 7: G5 ≤16ms 確認) -----

document.getElementById('btnPerf').addEventListener('click', () => {
    const perfState = createInitialState('10ball', 7); // 10 球
    // 20 球相当を作るため、もう一度 6ball state を足してダミー描画する
    const extra = createInitialState('10ball', 8);
    perfState.world.balls = perfState.world.balls.concat(extra.world.balls);
    const perfFx = createEffectManager();
    const FRAMES = 100;
    const start = performance.now();
    for (let i = 0; i < FRAMES; i++) {
        const t = start + i * 16;
        render(ctx, perfState, perfFx, viewport, t);
        renderHud(ctx, perfState, viewport, t);
    }
    const total = performance.now() - start;
    const avg = total / FRAMES;
    const verdict = avg <= 16 ? 'PASS (G5 ≤16ms)' : 'FAIL (G5 超過)';
    const msg = `Perf: 20球×${FRAMES}f = ${total.toFixed(2)}ms, avg ${avg.toFixed(3)}ms/frame → ${verdict}`;
    console.log(msg);
    log(msg);
});

// ----- 描画ループ -----

function frame(now) {
    fx.tick(now);
    render(ctx, state, fx, viewport, now);
    renderHud(ctx, state, viewport, now);
    // 描画後に sfx キューを flush (prime 前は静かに drain のみ行う)。
    webAudio.flush(now);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
