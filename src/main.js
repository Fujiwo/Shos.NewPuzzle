// Physical Ohajiki MVP-α エントリポイント。
// ブラウザ専用 (DOM / Canvas / AudioContext / requestAnimationFrame に依存)。
// Node テストでは import されない。
//
// 役割:
// - state / effects / sfx / 入力 controller / 描画 を統合
// - rAF ループで simulating 中は physics step、静止後に場外除去 → ターン進行
// - G7 (起動 → 初手 ≤15 秒) を performance.mark/measure で計測 (console 出力)
//
// ownSideRect の扱い: currentPlayer が変わるたびに pointer/keyboard controller を
// detach → 再 attach する素朴な方針 (M1.3 で flagged の通り)。
// 性能問題が出たら setOwnSideRect 拡張を検討する。

import { createInitialState, advanceTurn } from './game/state.js';
import { evaluateWinner } from './game/rules.js';
import { purgeOutOfBoundsBalls, applyShot } from './game/loop.js';

// v2 暫定: 場外判定 (M1v2.4-A で fgz.js に集約予定)
function isOutOfBoundsLocal(ball, bounds) {
    return ball.x < bounds.x || ball.x > bounds.x + bounds.w
        || ball.y < bounds.y || ball.y > bounds.y + bounds.h;
}
import { step, allAtRest } from './physics/engine.js';
import { attachPointerInput } from './input/pointer.js';
import { attachKeyboardInput } from './input/keyboard.js';
import { render, fitViewport } from './render/canvas.js';
import { renderHud, getMuteButtonLabel } from './render/ui.js';
import { createEffectManager } from './render/effects.js';
import { createSfxController, createWebAudioSfx } from './audio/sfx.js';

// G7 計測: モジュールロード時刻を起点とする
performance.mark('app-start');
let firstShotMarked = false;

// シミュレーション dt (60fps 基準)
const SIM_DT = 1 / 60;
// 初期 seed (リスタート時は乱数化)
const INITIAL_SEED = 42;

// currentPlayer 別の自陣矩形 (世界座標 0..1)
function ownSideRectFor(player) {
    return player === 0
        ? { x0: 0, y0: 0, x1: 1, y1: 0.5 }
        : { x0: 0, y0: 0.5, x1: 1, y1: 1 };
}

// Canvas のスクリーン座標を世界座標 (0..1) に変換するファクトリ
function makePointerToWorld(canvas, viewport) {
    return (ev) => {
        const rect = canvas.getBoundingClientRect();
        const screenX = ev.clientX - rect.left;
        const screenY = ev.clientY - rect.top;
        // canvas の CSS サイズと描画解像度の比
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        const px = screenX * sx;
        const py = screenY * sy;
        const offsetX = (viewport.width - viewport.scale) / 2;
        const offsetY = (viewport.height - viewport.scale) / 2;
        return {
            x: (px - offsetX) / viewport.scale,
            y: (py - offsetY) / viewport.scale,
        };
    };
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   muteButton: HTMLButtonElement,
 *   modeSelect: HTMLSelectElement,
 *   statusEl: HTMLElement,
 *   restartButton?: HTMLButtonElement,
 * }} deps
 */
export function bootstrap(deps) {
    const { canvas, muteButton, modeSelect, statusEl, restartButton } = deps;
    const ctx = canvas.getContext('2d');
    const viewport = fitViewport({ width: canvas.width, height: canvas.height });

    // 各種マネージャ
    const effects = createEffectManager();
    const sfxCtl = createSfxController();
    const sfxAudio = createWebAudioSfx(sfxCtl);

    // 初期 state (v2: object 引数 / mode は '2end'|'1end')。selector の HTML option 値は
    // 後続タスク (M1v2.7-C / M1v2.8-A) で更新予定。当面は何が来ても 2end をデフォルト。
    let state = createInitialState({ mode: modeSelect.value === '1end' ? '1end' : '2end', seed: INITIAL_SEED });

    // 入力 controller の attach 結果 (detach 用)
    let pointerHandle = null;
    let keyboardHandle = null;

    function setStatusText(text) {
        if (statusEl) statusEl.textContent = text;
    }

    // 入力ハンドラ: ショット確定
    function onShoot({ origin, velocity }) {
        if (state.status !== 'placing') return;
        // ユーザー操作のタイミングで AudioContext を prime (autoplay policy 配慮)
        sfxAudio.prime();
        state = applyShot(state, { origin, velocity });
        if (!firstShotMarked) {
            performance.mark('first-shot');
            try {
                performance.measure('time-to-first-shot', 'app-start', 'first-shot');
                const m = performance.getEntriesByName('time-to-first-shot').pop();
                if (m) console.info('[G7] Time to first shot:', m.duration.toFixed(1), 'ms');
            } catch (_e) { /* measure 失敗は無視 */ }
            firstShotMarked = true;
        }
    }

    // 入力 controller を currentPlayer の自陣で再構成
    function rebindInput() {
        if (pointerHandle) { pointerHandle.detach(); pointerHandle = null; }
        if (keyboardHandle) { keyboardHandle.detach(); keyboardHandle = null; }
        const ownSideRect = ownSideRectFor(state.currentPlayer);
        const pointerToWorld = makePointerToWorld(canvas, viewport);
        pointerHandle = attachPointerInput(canvas, pointerToWorld, {
            ownSideRect,
            onShoot,
        });
        keyboardHandle = attachKeyboardInput(window, {
            ownSideRect,
            onShoot,
        });
    }

    // ゲーム再初期化
    function restart() {
        state = createInitialState({
            mode: modeSelect.value === '1end' ? '1end' : '2end',
            seed: Math.floor(Math.random() * 1e9),
        });
        firstShotMarked = false;
        performance.clearMarks('first-shot');
        rebindInput();
        setStatusText('');
    }

    // ----- UI 配線 -----
    muteButton.textContent = getMuteButtonLabel(sfxCtl.isMuted());
    muteButton.addEventListener('click', () => {
        sfxAudio.prime(); // ユーザー操作で prime
        sfxCtl.setMuted(!sfxCtl.isMuted());
        muteButton.textContent = getMuteButtonLabel(sfxCtl.isMuted());
    });
    modeSelect.addEventListener('change', restart);
    if (restartButton) restartButton.addEventListener('click', restart);

    // 初回 input attach
    rebindInput();

    // ----- rAF ループ -----
    let lastPlayer = state.currentPlayer;
    let rafId = 0;
    function tick(now) {
        if (state.status === 'simulating') {
            step(state.world, SIM_DT, {
                onCollision(a, b) {
                    effects.spawnRipple({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, startMs: now });
                    sfxCtl.enqueue('click', now);
                },
                onWallHit() {
                    sfxCtl.enqueue('click', now);
                },
            });
            if (allAtRest(state.world.balls)) {
                const purged = purgeOutOfBoundsBalls(state, isOutOfBoundsLocal);
                for (const rb of purged.removedBalls) {
                    effects.spawnScorePopup({ x: rb.x, y: rb.y, text: '+1', startMs: now });
                    sfxCtl.enqueue('pop', now);
                }
                if (purged.removedBalls.length > 0) {
                    effects.triggerShake({ startMs: now });
                }
                // advanceTurn は scores=0 で自動的に status='ended' へ遷移する (M1.5)
                state = advanceTurn(purged.newState);
                if (state.status === 'placing') {
                    sfxCtl.enqueue('turn', now);
                }
                if (state.status === 'ended') {
                    const result = evaluateWinner(state);
                    setStatusText(`試合終了: ${result.winner === null ? '引き分け' : `P${result.winner} の勝ち`} (${result.reason})`);
                }
                // currentPlayer が変わったら入力を再構成
                if (state.currentPlayer !== lastPlayer) {
                    lastPlayer = state.currentPlayer;
                    rebindInput();
                }
            }
        }
        effects.tick(now);
        render(ctx, state, effects, viewport, now);
        renderHud(ctx, state, viewport, now);
        sfxAudio.flush(now);
        rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return {
        destroy() {
            cancelAnimationFrame(rafId);
            if (pointerHandle) pointerHandle.detach();
            if (keyboardHandle) keyboardHandle.detach();
            sfxAudio.destroy();
        },
    };
}
