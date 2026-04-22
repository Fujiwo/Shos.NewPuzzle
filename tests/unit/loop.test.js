// loop.js のユニットテスト (v2 完全版 / M1v2.4-B)。
// applyShot は currentSide 所有のストーンを 1 球追加する v2 仕様に変更。
// simulateShot で物理シミュレート + FGZ 違反処理 + 場外除去を行う。

import { test, assertEqual, assertClose } from '../assert.js';
import { createInitialState } from '../../src/game/state.js';
import { applyShot, simulateShot, purgeOutOfBoundsBalls } from '../../src/game/loop.js';

const TOL = 1e-9;

test('loop: applyShot は currentSide 所有のストーンを 1 球追加する (v2)', () => {
    const state = createInitialState({ mode: '2end', seed: 42 });
    const before = state.world.balls.length;
    const next = applyShot(state, { launchX: 0.20, vx: 0, vy: -0.5 });
    assertEqual(next.world.balls.length, before + 1, '1 球追加');
    const added = next.world.balls[next.world.balls.length - 1];
    assertEqual(added.owner, state.currentSide, 'owner=currentSide');
    assertClose(added.x, 0.20, TOL, 'launchX');
    assertClose(added.y, 1.45, TOL, 'LAUNCH_Y');
    assertClose(added.vy, -0.5, TOL, 'vy');
    // 元 state は破壊されない
    assertEqual(state.world.balls.length, before, '元 state.world.balls 不変');
});

test('loop: simulateShot は静止まで物理シミュレートし最終 state を返す', () => {
    let s = createInitialState({ mode: '2end', seed: 42 });
    s = applyShot(s, { launchX: 0.25, vx: 0, vy: -0.6 });
    const result = simulateShot(s, { maxSteps: 3000 });
    assertEqual(result.fgzViolated, false, '最初の単独投擲は違反でない');
    // 1 球が前進して最終的に静止している (vy ≈ 0)
    const stone = result.newState.world.balls.find((b) => b.owner === s.currentSide);
    if (stone) {
        assertClose(stone.vy, 0, 1e-3, '静止 (摩擦で減衰)');
    }
});

test('loop: simulateShot 1-rock rule: stoneIndex=0 で相手 FGZ ガードをはじき出すと違反 → 復元', () => {
    let s = createInitialState({ mode: '2end', seed: 42 });
    // 相手の FGZ ガード球を手動配置
    const opponent = 1 - s.currentSide;
    s.world.balls.push({ x: 0.25, y: 0.32, vx: 0, vy: 0, r: 0.020, m: 1, owner: opponent });
    s.stoneIndex = 0; // 1 投目
    // 自分のストーンを直撃軌道で投げる
    s = applyShot(s, { launchX: 0.25, vx: 0, vy: -3.0 });
    const result = simulateShot(s, { maxSteps: 2000 });
    assertEqual(result.fgzViolated, true, '違反検出');
    // 相手ガード球が復元されている (元位置近傍)
    const restored = result.newState.world.balls.find((b) => b.owner === opponent
        && Math.hypot(b.x - 0.25, b.y - 0.32) < 0.005);
    if (!restored) throw new Error('相手ガード球が復元されていない');
    assertClose(restored.x, 0.25, 0.005, 'restored.x');
    assertClose(restored.y, 0.32, 0.005, 'restored.y');
});

test('loop: simulateShot stoneIndex>=1 では FGZ ガード除去しても違反でない', () => {
    let s = createInitialState({ mode: '2end', seed: 42 });
    const opponent = 1 - s.currentSide;
    s.world.balls.push({ x: 0.25, y: 0.32, vx: 0, vy: 0, r: 0.020, m: 1, owner: opponent });
    s.stoneIndex = 2; // 3 投目以降
    s = applyShot(s, { launchX: 0.25, vx: 0, vy: -3.0 });
    const result = simulateShot(s, { maxSteps: 2000 });
    assertEqual(result.fgzViolated, false, '違反でない');
});

test('loop: purgeOutOfBoundsBalls は v2 state (scores 無し) でも壊れない', () => {
    const s = createInitialState({ mode: '2end', seed: 42 });
    s.world.balls.push({ x: 0.25, y: 0.50, vx: 0, vy: 0, r: 0.020, m: 1, owner: 0 });
    s.world.balls.push({ x: -0.5, y: 0.50, vx: 0, vy: 0, r: 0.020, m: 1, owner: 1 }); // 場外
    const isOob = (b, bounds) => b.x < bounds.x || b.x > bounds.x + bounds.w
        || b.y < bounds.y || b.y > bounds.y + bounds.h;
    const r = purgeOutOfBoundsBalls(s, isOob);
    assertEqual(r.newState.world.balls.length, 1, '場外 1 件除去');
    assertEqual(r.removedBalls.length, 1, 'removed 1 件');
    assertEqual(r.newState.scores, undefined, 'v2 では scores を生成しない');
});
