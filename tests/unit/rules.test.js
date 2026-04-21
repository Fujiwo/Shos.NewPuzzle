// rules.js のテスト: 場外判定 / 勝敗判定 / タイブレーク。

import { test } from '../assert.js';
import { assertEqual } from '../assert.js';
import { isOutOfBounds, evaluateWinner } from '../../src/game/rules.js';

const BOUNDS = { x: 0, y: 0, w: 1, h: 1 };

function makeBall(x, y, owner = 0) {
    return { x, y, vx: 0, vy: 0, r: 0.025, m: 1, owner };
}

function makeState(balls, status = 'ended') {
    // scores は呼び出し側で指定したいケースがあるので外側で上書きする
    const p0 = balls.filter(b => b.owner === 0).length;
    const p1 = balls.filter(b => b.owner === 1).length;
    return {
        world: { balls, bounds: BOUNDS, params: { G: 1e-3, e: 0.85, mu: 0.3 } },
        turn: 1,
        currentPlayer: 0,
        scores: [p0, p1],
        mode: '10ball',
        thinkDeadlineMs: 0,
        status,
    };
}

// ---- isOutOfBounds ----

test('rules: isOutOfBounds: 中央 (0.5, 0.5) は範囲内 → false', () => {
    assertEqual(isOutOfBounds(makeBall(0.5, 0.5), BOUNDS), false);
});

test('rules: isOutOfBounds: x<0 (中心が左縁を越えた) → true', () => {
    assertEqual(isOutOfBounds(makeBall(-0.001, 0.5), BOUNDS), true);
});

test('rules: isOutOfBounds: y>h (中心が下縁を越えた) → true', () => {
    assertEqual(isOutOfBounds(makeBall(0.5, 1.001), BOUNDS), true);
});

// ---- evaluateWinner ----

test('rules: evaluateWinner: in-progress (status="placing") → winner=null, reason=in-progress', () => {
    const state = makeState([makeBall(0.3, 0.3, 0), makeBall(0.7, 0.7, 1)], 'placing');
    const r = evaluateWinner(state);
    assertEqual(r.winner, null, 'winner');
    assertEqual(r.reason, 'in-progress', 'reason');
});

test('rules: evaluateWinner: ended + scores [3,2] → winner=0, reason=remaining-count', () => {
    const state = makeState([], 'ended');
    state.scores = [3, 2];
    const r = evaluateWinner(state);
    assertEqual(r.winner, 0);
    assertEqual(r.reason, 'remaining-count');
});

test('rules: evaluateWinner: ended + scores [2,3] → winner=1, reason=remaining-count', () => {
    const state = makeState([], 'ended');
    state.scores = [2, 3];
    const r = evaluateWinner(state);
    assertEqual(r.winner, 1);
    assertEqual(r.reason, 'remaining-count');
});

test('rules: evaluateWinner: 同数タイブレーク P0 が中心に近い → winner=0, reason=tiebreak-center-distance', () => {
    // P0 球を (0.5, 0.4) (0.5, 0.45) に置き、中心 (0.5, 0.5) からの距離合計 = 0.1+0.05 = 0.15
    // P1 球を (0.1, 0.9) (0.9, 0.1) に置き、距離合計 ≈ 2 * 0.566 = 1.13
    const balls = [
        makeBall(0.5, 0.4, 0),
        makeBall(0.5, 0.45, 0),
        makeBall(0.1, 0.9, 1),
        makeBall(0.9, 0.1, 1),
    ];
    const state = makeState(balls, 'ended');
    // タイブレーク発動条件: scores が同数。場面では balls から再カウントすると [2,2]
    const r = evaluateWinner(state);
    assertEqual(r.winner, 0, 'P0 closer wins');
    assertEqual(r.reason, 'tiebreak-center-distance');
});

test('rules: evaluateWinner: 同数タイブレーク P1 が中心に近い → winner=1', () => {
    const balls = [
        makeBall(0.1, 0.9, 0),
        makeBall(0.9, 0.1, 0),
        makeBall(0.5, 0.4, 1),
        makeBall(0.5, 0.45, 1),
    ];
    const state = makeState(balls, 'ended');
    const r = evaluateWinner(state);
    assertEqual(r.winner, 1, 'P1 closer wins');
    assertEqual(r.reason, 'tiebreak-center-distance');
});

test('rules: evaluateWinner: 完全対称配置 → winner=null, reason=draw', () => {
    // P0=(0.4,0.4), P1=(0.6,0.6) は中心 (0.5,0.5) から等距離
    const balls = [
        makeBall(0.4, 0.4, 0),
        makeBall(0.6, 0.6, 1),
    ];
    const state = makeState(balls, 'ended');
    const r = evaluateWinner(state);
    assertEqual(r.winner, null, 'draw');
    assertEqual(r.reason, 'draw');
});
