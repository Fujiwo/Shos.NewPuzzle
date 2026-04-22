// effects.js / canvas.js / ui.js の純粋ロジックのユニットテスト。
// DOM/Canvas には依存しない範囲のみを対象とする。

import { test } from '../assert.js';
import { assertEqual, assertClose, AssertionError } from '../assert.js';
import { createEffectManager } from '../../src/render/effects.js';
import { worldToScreen, getBallStyle } from '../../src/render/canvas.js';
import { formatRemainingSeconds, formatScoreboard, TUTORIAL_TEXT, getMuteButtonLabel } from '../../src/render/ui.js';

// 範囲アサート (assert.js には含まれないので局所定義)
function assertInRange(actual, lo, hi, msg) {
    if (!(actual >= lo && actual <= hi)) {
        throw new AssertionError(`${msg ?? ''}: ${actual} not in [${lo}, ${hi}]`);
    }
}

// ---------- effects: ripple ----------

test('effects: ripple spawn 直後 (now=startMs) は progress=0 / opacity=1', () => {
    const fx = createEffectManager();
    fx.spawnRipple({ x: 0.5, y: 0.5, startMs: 1000, durationMs: 200 });
    const ripples = fx.getActiveRipples(1000);
    assertEqual(ripples.length, 1);
    assertClose(ripples[0].progress, 0, 1e-9);
    assertClose(ripples[0].opacity, 1, 1e-9);
    assertEqual(ripples[0].x, 0.5);
    assertEqual(ripples[0].y, 0.5);
});

test('effects: ripple duration 半ばで progress=0.5 / opacity=0.5 (リニア)', () => {
    const fx = createEffectManager();
    fx.spawnRipple({ x: 0.1, y: 0.2, startMs: 1000, durationMs: 200 });
    const ripples = fx.getActiveRipples(1100);
    assertEqual(ripples.length, 1);
    assertClose(ripples[0].progress, 0.5, 1e-9);
    assertClose(ripples[0].opacity, 0.5, 1e-9);
});

test('effects: ripple duration 経過後は配列から除外', () => {
    const fx = createEffectManager();
    fx.spawnRipple({ x: 0, y: 0, startMs: 1000, durationMs: 200 });
    assertEqual(fx.getActiveRipples(1201).length, 0);
});

test('effects: tick 後に期限切れ ripple は getActive で返らない', () => {
    const fx = createEffectManager();
    fx.spawnRipple({ x: 0, y: 0, startMs: 1000, durationMs: 200 });
    fx.spawnRipple({ x: 0, y: 0, startMs: 1500, durationMs: 200 });
    fx.tick(1300); // 1 つ目期限切れ
    const ripples = fx.getActiveRipples(1500);
    assertEqual(ripples.length, 1);
});

test('effects: 複数 ripple が同時アクティブ可能', () => {
    const fx = createEffectManager();
    fx.spawnRipple({ x: 0.1, y: 0.1, startMs: 1000, durationMs: 200 });
    fx.spawnRipple({ x: 0.9, y: 0.9, startMs: 1000, durationMs: 200 });
    fx.spawnRipple({ x: 0.5, y: 0.5, startMs: 1050, durationMs: 200 });
    assertEqual(fx.getActiveRipples(1100).length, 3);
});

// ---------- effects: score popup ----------

test('effects: scorePopup は text/x/y 保持、半ばで dy が正の上昇 (0..20 線形)', () => {
    const fx = createEffectManager();
    fx.spawnScorePopup({ x: 0.3, y: 0.4, text: '+1', startMs: 2000, durationMs: 600 });
    const mid = fx.getActivePopups(2300);
    assertEqual(mid.length, 1);
    assertEqual(mid[0].text, '+1');
    assertEqual(mid[0].x, 0.3);
    assertEqual(mid[0].y, 0.4);
    assertClose(mid[0].progress, 0.5, 1e-9);
    assertClose(mid[0].dy, 10, 1e-9);
    assertClose(mid[0].opacity, 0.5, 1e-9);
    // 期限切れ
    assertEqual(fx.getActivePopups(2601).length, 0);
});

// ---------- effects: shake ----------

test('effects: triggerShake — duration 中は magnitude <= magnitudePx', () => {
    const fx = createEffectManager();
    fx.triggerShake({ startMs: 5000, durationMs: 50, magnitudePx: 2 });
    for (let t = 5000; t <= 5050; t += 5) {
        const o = fx.getShakeOffset(t);
        assertInRange(Math.hypot(o.dx, o.dy), 0, 2 + 1e-9, `t=${t}`);
    }
});

test('effects: shake は終了時刻後に必ず {0, 0}', () => {
    const fx = createEffectManager();
    fx.triggerShake({ startMs: 5000, durationMs: 50, magnitudePx: 2 });
    const o = fx.getShakeOffset(5051);
    assertEqual(o.dx, 0);
    assertEqual(o.dy, 0);
});

// ---------- canvas: worldToScreen ----------

test('canvas: worldToScreen({0.5,0.5}, 600x600 scale 600) → {300,300}', () => {
    const p = worldToScreen({ x: 0.5, y: 0.5 }, { width: 600, height: 600, scale: 600 });
    assertClose(p.x, 300, 1e-9);
    assertClose(p.y, 300, 1e-9);
});

// ---------- canvas: getBallStyle (二重符号化) ----------

test('canvas: getBallStyle owner=0 → ライトイエロー無地', () => {
    const s = getBallStyle({ owner: 0 });
    assertEqual(s.fillColor, '#F5E663');
    assertEqual(s.hasRing, false);
});

test('canvas: getBallStyle owner=1 → ライトピンク + 中央リング', () => {
    const s = getBallStyle({ owner: 1 });
    assertEqual(s.fillColor, '#F58FA0');
    assertEqual(s.hasRing, true);
});

// ---------- ui: formatRemainingSeconds ----------

test('ui: formatRemainingSeconds(11000, 10500) → "0.5秒"', () => {
    assertEqual(formatRemainingSeconds(11000, 10500), '0.5秒');
});

test('ui: formatRemainingSeconds(0, 5000) → "" (未設定)', () => {
    assertEqual(formatRemainingSeconds(0, 5000), '');
});

test('ui: formatRemainingSeconds(11000, 11500) → "0.0秒" (負はクランプ)', () => {
    assertEqual(formatRemainingSeconds(11000, 11500), '0.0秒');
});

// ---------- ui: formatScoreboard ----------

test('ui: formatScoreboard 10ball モード', () => {
    const s = formatScoreboard({ turn: 3, scores: [5, 4], currentPlayer: 0, mode: '10ball' });
    assertEqual(s, 'ターン 3  P0:5 P1:4 (10球)');
});

test('ui: formatScoreboard 6ball モード', () => {
    const s = formatScoreboard({ turn: 3, scores: [5, 4], currentPlayer: 0, mode: '6ball' });
    assertEqual(s, 'ターン 3  P0:5 P1:4 (6球)');
});

// TUTORIAL_TEXT 定数は ui.js から import してロード時の存在を担保 (テストカウント外)。
void TUTORIAL_TEXT;

// ---------- ui: getMuteButtonLabel ----------

test('ui: getMuteButtonLabel(true) → "🔇 音 OFF"', () => {
    assertEqual(getMuteButtonLabel(true), '🔇 音 OFF');
});

test('ui: getMuteButtonLabel(false) → "🔊 音 ON"', () => {
    assertEqual(getMuteButtonLabel(false), '🔊 音 ON');
});
