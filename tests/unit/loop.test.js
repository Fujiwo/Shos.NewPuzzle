// loop.js (purgeOutOfBoundsBalls / applyShot) のユニットテスト。
// M1v2.3-A+C で v1 placeBall / scores 前提の purgeOutOfBoundsBalls テスト 4 件を全削除。
// applyShot テストは v2 仕様 (balls 手動 push / currentSide 互換) で書き直し。
//
// TODO(M1v2.4-B): v2 順次投擲モデル + fgz.js 実装後に下記を再追加予定:
//   - purgeOutOfBoundsBalls: FGZ 内に静止した場外/FGZ 違反球の除去検証
//     (fgz.js から isOutOfBounds / isInsideFreeGuardZone を取り込む)

import { test, assertEqual, assertClose } from '../assert.js';
import { createInitialState } from '../../src/game/state.js';
import { applyShot } from '../../src/game/loop.js';

const TOL = 1e-9;

// v2 では state.currentPlayer は存在しないが、loop.js は M1v2.4-B まで
// state.currentPlayer に依存しているため、テスト内で互換用に手動付与する。
// (v2 順次投擲モデルでは state.currentSide に置き換え予定)
function v2WithCurrentPlayer(state, player) {
    return { ...state, currentPlayer: player };
}

test('loop: applyShot は origin に最も近い currentPlayer 球に velocity を付与', () => {
    const base = createInitialState({ mode: '2end', seed: 42 });
    // v2: balls=[] スタートのため手動 push
    base.world.balls.push({ x: 0.25, y: 0.40, vx: 0, vy: 0, r: 0.020, m: 1, owner: 0 });
    base.world.balls.push({ x: 0.25, y: 0.10, vx: 0, vy: 0, r: 0.020, m: 1, owner: 0 });
    const state = v2WithCurrentPlayer(base, 0);
    const target = state.world.balls[0];
    const next = applyShot(state, {
        origin: { x: target.x, y: target.y },
        velocity: { vx: 0.5, vy: -0.7 },
    });
    assertEqual(next.status, 'simulating', 'status 遷移');
    const shot = next.world.balls.find((b) => Math.hypot(b.x - target.x, b.y - target.y) < 1e-9);
    if (!shot) throw new Error('発射対象球が見つからない');
    assertClose(shot.vx, 0.5, TOL, 'vx');
    assertClose(shot.vy, -0.7, TOL, 'vy');
    // 元 state は破壊されない
    assertEqual(state.status, 'in-progress', '元 state.status 不変');
    assertEqual(state.world.balls[0].vx, 0, '元 state の vx 不変');
});

test('loop: applyShot は currentPlayer ≠ owner の球を発射対象にしない', () => {
    const base = createInitialState({ mode: '2end', seed: 42 });
    base.world.balls.push({ x: 0.25, y: 0.40, vx: 0, vy: 0, r: 0.020, m: 1, owner: 0 });
    base.world.balls.push({ x: 0.25, y: 1.10, vx: 0, vy: 0, r: 0.020, m: 1, owner: 1 });
    const state = v2WithCurrentPlayer(base, 0);
    const p1Ball = state.world.balls.find((b) => b.owner === 1);
    const next = applyShot(state, {
        origin: { x: p1Ball.x, y: p1Ball.y },
        velocity: { vx: 1, vy: 0 },
    });
    const p1After = next.world.balls.find((b) => b.owner === 1);
    if (!p1After) throw new Error('P1 球が見つからない');
    assertEqual(p1After.vx, 0, 'P1 球は発射されない');
    const movedP0 = next.world.balls.filter((b) => b.owner === 0 && (b.vx !== 0 || b.vy !== 0));
    assertEqual(movedP0.length, 1, '発射された P0 球は 1 つ');
});

test('loop: applyShot は currentPlayer の球が皆無なら state を返す (status 不変)', () => {
    const base = createInitialState({ mode: '2end', seed: 42 });
    // P0 球を 1 つも置かない (P1 のみ)
    base.world.balls.push({ x: 0.25, y: 1.10, vx: 0, vy: 0, r: 0.020, m: 1, owner: 1 });
    const state = v2WithCurrentPlayer(base, 0);
    const next = applyShot(state, {
        origin: { x: 0.25, y: 0.5 },
        velocity: { vx: 1, vy: 0 },
    });
    assertEqual(next, state, '同じ参照を返す');
    assertEqual(next.status, 'in-progress', 'status 不変');
});