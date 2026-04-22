// M1.8 ゲームループ純粋ヘルパ (purgeOutOfBoundsBalls / applyShot) のユニットテスト。
// DOM 非依存。state.js / rules.js を直接利用するので、それらは無修正で動作。

import { test, assertEqual, assertClose } from '../assert.js';
import { createInitialState } from '../../src/game/state.js';
import { purgeOutOfBoundsBalls, applyShot } from '../../src/game/loop.js';

// M1v2.2-B: rules.js から isOutOfBounds が削除されたため、ローカルに同等実装を持つ。
// (M1v2.4-A で fgz.js に集約予定)
function isOutOfBounds(ball, bounds) {
    return ball.x < bounds.x || ball.x > bounds.x + bounds.w
        || ball.y < bounds.y || ball.y > bounds.y + bounds.h;
}

const TOL = 1e-9;

// TODO(M1v2.3): v2 順次投擲モデル導入で placeBall を bounds 0.5x1.5 対応にすると復活予定 (現状は v1 placeBall が x>0.5 に配置するため初期状態で OOB が発生)
test('loop: purgeOutOfBoundsBalls 全球内側なら不変', () => {
    const state = createInitialState('6ball', 42);
    const before = state.world.balls.length;
    const r = purgeOutOfBoundsBalls(state, isOutOfBounds);
    assertEqual(r.newState.world.balls.length, before, 'balls 数不変');
    assertEqual(r.newState.scores[0], state.scores[0], 'P0 score 不変');
    assertEqual(r.newState.scores[1], state.scores[1], 'P1 score 不変');
    assertEqual(r.removedBalls.length, 0, 'removed 空');
});

// TODO(M1v2.3): v2 順次投擲モデルで placeBall を再設計後に修正予定 (v1 placeBall が新 bounds 外に配置するため事前 OOB が発生)
test('loop: purgeOutOfBoundsBalls P0 球 1 つを場外配置 → -1 / score-1 / removed=1', () => {
    const state = createInitialState('6ball', 42);
    // P0 球を 1 つ場外 (x=-1) へ移動
    const idx = state.world.balls.findIndex((b) => b.owner === 0);
    state.world.balls[idx] = { ...state.world.balls[idx], x: -1, y: 0.5 };
    const r = purgeOutOfBoundsBalls(state, isOutOfBounds);
    assertEqual(r.newState.world.balls.length, 5, 'balls -1');
    assertEqual(r.newState.scores[0], 2, 'P0 score -1');
    assertEqual(r.newState.scores[1], 3, 'P1 score 不変');
    assertEqual(r.removedBalls.length, 1, 'removed 1');
    assertEqual(r.removedBalls[0].owner, 0, 'removed owner=0');
});

// TODO(M1v2.3): v2 順次投擲モデルで placeBall を再設計後に修正予定 (v1 placeBall が新 bounds 外に配置するため事前 OOB が発生)
test('loop: purgeOutOfBoundsBalls P0/P1 同時場外 → 両 score -1, removed=2', () => {
    const state = createInitialState('6ball', 42);
    const i0 = state.world.balls.findIndex((b) => b.owner === 0);
    const i1 = state.world.balls.findIndex((b) => b.owner === 1);
    state.world.balls[i0] = { ...state.world.balls[i0], x: -1 };
    state.world.balls[i1] = { ...state.world.balls[i1], y: 2 };
    const r = purgeOutOfBoundsBalls(state, isOutOfBounds);
    assertEqual(r.newState.world.balls.length, 4, 'balls -2');
    assertEqual(r.newState.scores[0], 2);
    assertEqual(r.newState.scores[1], 2);
    assertEqual(r.removedBalls.length, 2, 'removed 2');
});

test('loop: purgeOutOfBoundsBalls 元 state を破壊しない', () => {
    const state = createInitialState('6ball', 42);
    const i0 = state.world.balls.findIndex((b) => b.owner === 0);
    state.world.balls[i0] = { ...state.world.balls[i0], x: -1 };
    const lengthBefore = state.world.balls.length;
    const scoresBefore = [state.scores[0], state.scores[1]];
    purgeOutOfBoundsBalls(state, isOutOfBounds);
    assertEqual(state.world.balls.length, lengthBefore, '元 state.balls 不変');
    assertEqual(state.scores[0], scoresBefore[0], '元 scores[0] 不変');
    assertEqual(state.scores[1], scoresBefore[1], '元 scores[1] 不変');
});

test('loop: applyShot は origin に最も近い currentPlayer 球に velocity を付与', () => {
    const state = createInitialState('6ball', 42);
    // 自陣 (P0=上半 y<0.5) のいずれかの球に近い origin を使う
    const p0Balls = state.world.balls.filter((b) => b.owner === 0);
    const target = p0Balls[0];
    const next = applyShot(state, {
        origin: { x: target.x, y: target.y },
        velocity: { vx: 0.5, vy: -0.7 },
    });
    assertEqual(next.status, 'simulating', 'status 遷移');
    // 新 world の同 owner 球から target 位置の球を探す
    const shot = next.world.balls.find((b) => b.owner === 0 && Math.hypot(b.x - target.x, b.y - target.y) < 1e-9);
    if (!shot) throw new Error('発射対象球が見つからない');
    assertClose(shot.vx, 0.5, TOL, 'vx');
    assertClose(shot.vy, -0.7, TOL, 'vy');
    // 元 state は破壊されない
    assertEqual(state.status, 'placing', '元 state.status 不変');
    assertEqual(state.world.balls.find((b) => b.owner === 0 && Math.hypot(b.x - target.x, b.y - target.y) < 1e-9).vx, 0, '元 state の vx 不変');
});

test('loop: applyShot は currentPlayer ≠ owner の球を発射対象にしない', () => {
    const state = createInitialState('6ball', 42);
    // P1 球の位置を origin にしても、currentPlayer=0 なので P0 球が選ばれる
    const p1Ball = state.world.balls.find((b) => b.owner === 1);
    const next = applyShot(state, {
        origin: { x: p1Ball.x, y: p1Ball.y },
        velocity: { vx: 1, vy: 0 },
    });
    // P1 球は速度 0 のまま
    const p1After = next.world.balls.find((b, i) => state.world.balls[i].owner === 1
        && Math.abs(b.x - p1Ball.x) < 1e-9 && Math.abs(b.y - p1Ball.y) < 1e-9);
    if (!p1After) throw new Error('P1 球が見つからない');
    assertEqual(p1After.vx, 0, 'P1 球は発射されない');
    // どこかの P0 球が発射されている
    const movedP0 = next.world.balls.filter((b) => b.owner === 0 && (b.vx !== 0 || b.vy !== 0));
    assertEqual(movedP0.length, 1, '発射された P0 球は 1 つ');
});

test('loop: applyShot は currentPlayer の球が皆無なら state を返す (status 不変)', () => {
    const state = createInitialState('6ball', 42);
    // 全 P0 球を除去
    state.world.balls = state.world.balls.filter((b) => b.owner !== 0);
    const next = applyShot(state, {
        origin: { x: 0.5, y: 0.5 },
        velocity: { vx: 1, vy: 0 },
    });
    assertEqual(next, state, '同じ参照を返す');
    assertEqual(next.status, 'placing', 'status 不変');
});
