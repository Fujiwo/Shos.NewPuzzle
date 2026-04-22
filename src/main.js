// Physical Ohajiki v2 (カーリング型) エントリポイント。
// ブラウザ専用 (DOM / Canvas / AudioContext / requestAnimationFrame に依存)。
// Node テストでは import されない。
//
// 役割:
// - v2 GameState (status='in-progress'|'ended') / FSM 入力 / 設定パネル / 予測線オーバーレイ統合
// - rAF ループで simulating フラグが立つ間 physics step、静止後に
//   場外球除去 + FGZ 違反判定 + stoneIndex/currentSide 進行 + closeEnd を実行
// - G7 (起動 → 初手 ≤15 秒) を performance.mark/measure で計測 (console 出力)

import { createInitialState, closeEnd } from './game/state.js';
import { evaluateWinner } from './game/rules.js';
import { applyShot } from './game/loop.js';
import { detectFgzViolation, isOutOfLane } from './game/fgz.js';
import { step, allAtRest } from './physics/engine.js';
import { createPointerFsm } from './input/pointer.js';
import { createKeyboardFsm } from './input/keyboard.js';
import { render, fitViewport } from './render/canvas.js';
import {
    renderHudV2,
    getMuteButtonLabel,
    renderSettingsPanel,
    renderShareControls,
} from './render/ui.js';
import { createEffectManager } from './render/effects.js';
import { createSfxController, createWebAudioSfx } from './audio/sfx.js';
import { loadSettings, saveSettings } from './game/settings.js';
import { encodeShareUrl, decodeShareUrl } from './game/replay.js';

// G7 計測: モジュールロード時刻を起点とする
performance.mark('app-start');
let firstShotMarked = false;

// シミュレーション dt (60fps 基準)
const SIM_DT = 1 / 60;
// 初期 seed (リスタート時は乱数化)
const INITIAL_SEED = 42;
// 1 エンドあたりの総投擲数 (4 stones × 2 sides)
const STONES_PER_END = 8;

/**
 * 描画座標 (px) を world.bounds 基準の世界座標へ逆変換する。
 * @param {number} px - 画面 X 座標 (ピクセル)
 * @param {number} py - 画面 Y 座標 (ピクセル)
 * @param {{width:number,height:number}} viewport - 描画領域サイズ (ピクセル)
 * @param {{x:number,y:number,w:number,h:number}} bounds - world.bounds
 * @returns {{x:number,y:number}}
 */
export function screenToWorldPoint(px, py, viewport, bounds) {
    const fitted = fitViewport(viewport, bounds);
    const contentWidth = bounds.w * fitted.scale;
    const contentHeight = bounds.h * fitted.scale;
    const offsetX = (fitted.width - contentWidth) / 2;
    const offsetY = (fitted.height - contentHeight) / 2;
    return {
        x: (px - offsetX) / fitted.scale + bounds.x,
        y: (py - offsetY) / fitted.scale + bounds.y,
    };
}

// Canvas のスクリーン座標を世界座標 (world.bounds) に変換するファクトリ
function makePointerToWorld(canvas, viewport, getBounds) {
    return (ev) => {
        const rect = canvas.getBoundingClientRect();
        const screenX = ev.clientX - rect.left;
        const screenY = ev.clientY - rect.top;
        // canvas の CSS サイズと描画解像度の比
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        const px = screenX * sx;
        const py = screenY * sy;
        const bounds = getBounds();
        return screenToWorldPoint(px, py, viewport, bounds);
    };
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   muteButton: HTMLButtonElement,
 *   modeSelect: HTMLSelectElement,
 *   statusEl: HTMLElement,
 *   restartButton?: HTMLButtonElement,
 *   settingsRoot?: HTMLElement,
 *   shareRoot?: HTMLElement,
 * }} deps
 */
export function bootstrap(deps) {
    const { canvas, muteButton, modeSelect, statusEl, restartButton, settingsRoot, shareRoot } = deps;
    const ctx = canvas.getContext('2d');
    const viewport = fitViewport({ width: canvas.width, height: canvas.height });

    // 各種マネージャ
    const effects = createEffectManager();
    const sfxCtl = createSfxController();
    const sfxAudio = createWebAudioSfx(sfxCtl);

    // 設定 (永続化)
    let settings = loadSettings();

    // M2v2.1: ?r= で共有された結果を解釈 (state には影響しない / 表示のみ)
    let importedResult = null;
    try {
        const params = new URLSearchParams(globalThis.location?.search ?? '');
        const r = params.get('r');
        if (r) importedResult = decodeShareUrl(r);
    } catch { /* SSR 等で location 未定義なら無視 */ }

    // 初期 state (v2)
    let state = createInitialState({
        mode: modeSelect.value === '1end' ? '1end' : '2end',
        seed: INITIAL_SEED,
    });

    // 物理シミュレーション中フラグ (state.status は使わない)
    let simulating = false;
    // applyShot 直前の world.balls スナップショット (FGZ 違反判定用)
    let preShotSnapshot = null;
    // 入力 FSM (1 投擲ごとに再生成)
    let pointerFsm = null;
    let keyboardFsm = null;
    // detach 用 listener
    let pointerListeners = null;
    let keyboardListener = null;
    // 現在の照準 (描画オーバーレイ用)
    let currentAim = { enabled: settings.aimPreview, launchX: 0.25, vx: 0, vy: 0 };

    function setStatusText(text) {
        if (statusEl) statusEl.textContent = text;
    }

    // --- ショット確定 ---
    function onShoot({ launchX, vx, vy }) {
        if (state.status !== 'in-progress' || simulating) return;
        sfxAudio.prime();
        // 投擲前スナップショット (applyShot で投擲球が追加される前)
        preShotSnapshot = state.world.balls.map((b) => ({ ...b }));
        state = applyShot(state, { launchX, vx, vy });
        simulating = true;
        currentAim.enabled = false; // ショット中は予測線を消す
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

    // --- 入力 FSM 再生成 (ショット間 or currentSide 切替後) ---
    function rebindInput() {
        if (pointerListeners) {
            canvas.removeEventListener('pointerdown', pointerListeners.down);
            canvas.removeEventListener('pointermove', pointerListeners.move);
            canvas.removeEventListener('pointerup', pointerListeners.up);
            canvas.removeEventListener('pointercancel', pointerListeners.cancel);
            pointerListeners = null;
        }
        if (keyboardListener) {
            window.removeEventListener('keydown', keyboardListener);
            keyboardListener = null;
        }

        pointerFsm = createPointerFsm({
            onPlace(launchX) {
                currentAim.launchX = launchX;
            },
            onAim({ vx, vy }) {
                currentAim.vx = vx;
                currentAim.vy = vy;
                currentAim.enabled = settings.aimPreview;
            },
            onShoot,
        });

        keyboardFsm = createKeyboardFsm({
            initialLaunchX: 0.25,
            onPlace(launchX) {
                currentAim.launchX = launchX;
            },
            onAim({ vx, vy }) {
                currentAim.vx = vx;
                currentAim.vy = vy;
                currentAim.enabled = settings.aimPreview;
            },
            onShoot,
            onTogglePreview() {
                settings = { ...settings, aimPreview: !settings.aimPreview };
                saveSettings(settings);
                currentAim.enabled = settings.aimPreview;
                refreshSettingsPanel();
            },
        });

        const toWorld = makePointerToWorld(
            canvas,
            viewport,
            () => state.world?.bounds ?? viewport.bounds ?? { x: 0, y: 0, w: 1, h: 1 }
        );
        pointerListeners = {
            down: (ev) => { const p = toWorld(ev); pointerFsm.dispatch({ type: 'pointerdown', x: p.x, y: p.y }); },
            move: (ev) => { const p = toWorld(ev); pointerFsm.dispatch({ type: 'pointermove', x: p.x, y: p.y }); },
            up:   (ev) => { const p = toWorld(ev); pointerFsm.dispatch({ type: 'pointerup',   x: p.x, y: p.y }); },
            cancel: () => pointerFsm.dispatch({ type: 'pointercancel' }),
        };
        canvas.addEventListener('pointerdown', pointerListeners.down);
        canvas.addEventListener('pointermove', pointerListeners.move);
        canvas.addEventListener('pointerup', pointerListeners.up);
        canvas.addEventListener('pointercancel', pointerListeners.cancel);

        keyboardListener = (ev) => keyboardFsm.dispatch({ type: 'keydown', key: ev.key, shiftKey: ev.shiftKey });
        window.addEventListener('keydown', keyboardListener);

        currentAim = { enabled: settings.aimPreview, launchX: 0.25, vx: 0, vy: 0 };
    }

    // --- 設定パネル ---
    function refreshSettingsPanel() {
        if (!settingsRoot) return;
        renderSettingsPanel(settingsRoot, settings, (patch) => {
            settings = { ...settings, ...patch };
            saveSettings(settings);
            currentAim.enabled = settings.aimPreview;
        });
    }

    // --- 結果共有 UI (M2v2.1) ---
    // state.status === 'ended' で encode して shareUrl を生成し、コピーボタンを描画。
    // importedResult があれば「共有された結果」バナーを常時表示。
    function refreshShareControls() {
        if (!shareRoot) return;
        let shareUrl = null;
        if (state.status === 'ended') {
            const totals = [0, 0];
            for (const es of state.endScores ?? []) {
                if (es.side !== null) totals[es.side] += es.points;
            }
            const encoded = encodeShareUrl({
                mode: state.mode,
                hammerSide: state.hammerSide ?? 0,
                endScores: totals,
            });
            const loc = globalThis.location;
            const base =
                loc && loc.origin && loc.origin !== 'null'
                    ? `${loc.origin}${loc.pathname}`
                    : '';
            shareUrl = base ? `${base}?r=${encoded}` : `?r=${encoded}`;
        }
        renderShareControls(shareRoot, {
            shareUrl,
            onCopy: copyToClipboard,
            importedResult,
        });
    }

    // navigator.clipboard が無い (古い Safari / file://) 場合の textarea fallback
    function copyToClipboard(text) {
        const nav = globalThis.navigator;
        if (nav?.clipboard?.writeText) {
            nav.clipboard.writeText(text).then(
                () => setStatusText('共有 URL をコピーしました'),
                () => fallbackCopy(text),
            );
            return;
        }
        fallbackCopy(text);
    }
    function fallbackCopy(text) {
        try {
            const doc = globalThis.document;
            const ta = doc.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            doc.body.appendChild(ta);
            ta.select();
            doc.execCommand('copy');
            doc.body.removeChild(ta);
            setStatusText('共有 URL をコピーしました');
        } catch {
            setStatusText('コピーに失敗しました');
        }
    }

    // --- リスタート ---
    function restart() {
        state = createInitialState({
            mode: modeSelect.value === '1end' ? '1end' : '2end',
            seed: Math.floor(Math.random() * 1e9),
        });
        simulating = false;
        preShotSnapshot = null;
        firstShotMarked = false;
        performance.clearMarks('first-shot');
        rebindInput();
        setStatusText('');
        refreshShareControls();
    }

    // --- ショット静止後の確定処理 ---
    function finalizeShot(now) {
        // 場外球除去
        const after = state.world.balls;
        const survivors = [];
        const removed = [];
        for (const b of after) {
            if (isOutOfLane(b, state.world.bounds)) removed.push(b);
            else survivors.push(b);
        }
        // FGZ 違反検出 (相手球のみ)
        const cs = state.currentSide;
        const violation = detectFgzViolation({
            before: (preShotSnapshot ?? []).filter((b) => b.owner !== cs),
            after: survivors.filter((b) => b.owner !== cs),
            stoneIndex: state.stoneIndex,
            currentSide: cs,
        });
        let nextBalls = survivors;
        if (violation.violated) {
            // 相手ガード復元
            const restored = [...survivors];
            for (const g of violation.restoreList) restored.push({ ...g, vx: 0, vy: 0 });
            // 違反した自分の最新投擲球を除去 (snapshot に無い currentSide 球)
            const beforeOwn = (preShotSnapshot ?? []).filter((b) => b.owner === cs);
            nextBalls = restored.filter((a) => {
                if (a.owner !== cs) return true;
                return beforeOwn.some((bo) => Math.hypot(a.x - bo.x, a.y - bo.y) < 0.001);
            });
        }
        // エフェクト
        for (const rb of removed) {
            effects.spawnScorePopup({ x: rb.x, y: rb.y, text: 'OUT', startMs: now });
            sfxCtl.enqueue('pop', now);
        }
        if (removed.length > 0) effects.triggerShake({ startMs: now });

        // state 更新 (純粋に新しいオブジェクトを構築)
        state = {
            ...state,
            world: { ...state.world, balls: nextBalls },
            stoneIndex: state.stoneIndex + 1,
            currentSide: 1 - state.currentSide,
        };
        preShotSnapshot = null;

        // エンド終了判定 (合計 8 投で 1 エンド完了)
        if (state.stoneIndex >= STONES_PER_END) {
            state = closeEnd(state);
            if (state.status === 'ended') {
                const result = evaluateWinner(state);
                const winnerText = result.winner === null ? '引き分け' : `P${result.winner} の勝ち`;
                setStatusText(`試合終了: ${winnerText} (合計 ${result.totals[0]} - ${result.totals[1]})`);
                refreshShareControls();
            } else {
                setStatusText(`エンド ${state.endIndex} 終了 → 次のエンドへ`);
            }
        }
        sfxCtl.enqueue('turn', now);
        rebindInput();
    }

    // ----- UI 配線 -----
    muteButton.textContent = getMuteButtonLabel(sfxCtl.isMuted());
    muteButton.addEventListener('click', () => {
        sfxAudio.prime();
        sfxCtl.setMuted(!sfxCtl.isMuted());
        muteButton.textContent = getMuteButtonLabel(sfxCtl.isMuted());
    });
    modeSelect.addEventListener('change', restart);
    if (restartButton) restartButton.addEventListener('click', restart);

    refreshSettingsPanel();
    rebindInput();
    refreshShareControls();

    // ----- rAF ループ -----
    let rafId = 0;
    function tick(now) {
        if (simulating) {
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
                simulating = false;
                finalizeShot(now);
            }
        }
        effects.tick(now);
        const aim = (!simulating && currentAim.enabled) ? {
            enabled: true,
            launchX: currentAim.launchX,
            vx: currentAim.vx,
            vy: currentAim.vy,
        } : { enabled: false, launchX: 0, vx: 0, vy: 0 };
        render(ctx, state, effects, viewport, now, aim);
        renderHudV2(ctx, state, viewport, now);
        sfxAudio.flush(now);
        rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return {
        destroy() {
            cancelAnimationFrame(rafId);
            if (pointerListeners) {
                canvas.removeEventListener('pointerdown', pointerListeners.down);
                canvas.removeEventListener('pointermove', pointerListeners.move);
                canvas.removeEventListener('pointerup', pointerListeners.up);
                canvas.removeEventListener('pointercancel', pointerListeners.cancel);
            }
            if (keyboardListener) window.removeEventListener('keydown', keyboardListener);
            sfxAudio.destroy();
        },
    };
}
