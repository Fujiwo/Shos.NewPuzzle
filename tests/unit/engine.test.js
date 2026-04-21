// 摩擦減衰と静止判定 (applyFriction / allAtRest / REST_EPS) のユニットテスト。
// step / runUntilRest シミュレーションループも検証。

import { test, assertClose, assertEqual } from '../assert.js';
import {
    applyFriction,
    allAtRest,
    REST_EPS,
    step,
    runUntilRest,
} from '../../src/physics/engine.js';

const TOL = 1e-9;

test('engine: 1 step 比率減衰の数式一致 (mu=0.3, dt=1/60)', () => {
    const ball = { x: 0, y: 0, vx: 0.1, vy: 0, r: 1, m: 1 };
    applyFriction(ball, 0.3, 1 / 60);
    const expected = 0.1 * (1 - 0.3 / 60);
    assertClose(ball.vx, expected, TOL, 'vx');
    assertClose(ball.vy, 0, TOL, 'vy');
});

test('engine: 60 step (= 1 sec) 累積減衰の予測一致', () => {
    const ball = { x: 0, y: 0, vx: 0.1, vy: 0, r: 1, m: 1 };
    for (let i = 0; i < 60; i++) {
        applyFriction(ball, 0.3, 1 / 60);
    }
    const expected = 0.1 * Math.pow(1 - 0.3 / 60, 60);
    assertClose(ball.vx, expected, TOL, 'vx');
});

test('engine: REST_EPS 未満は 0 に丸め (mu=0 でも判定実行)', () => {
    const ball = { x: 0, y: 0, vx: 5e-5, vy: 5e-5, r: 1, m: 1 };
    applyFriction(ball, 0, 1 / 60);
    assertEqual(ball.vx, 0, 'vx');
    assertEqual(ball.vy, 0, 'vy');
});

test('engine: 2D 等比率減衰 (vx/vy 比保持)', () => {
    const ball = { x: 0, y: 0, vx: 0.06, vy: 0.08, r: 1, m: 1 };
    applyFriction(ball, 0.3, 1 / 60);
    const ratio = 1 - 0.3 / 60;
    assertClose(ball.vx, 0.06 * ratio, TOL, 'vx');
    assertClose(ball.vy, 0.08 * ratio, TOL, 'vy');
    // 比率保持
    assertClose(ball.vx / ball.vy, 0.06 / 0.08, TOL, 'vx/vy');
});

test('engine: allAtRest 判定 (静止/動/閾値未満)', () => {
    assertEqual(
        allAtRest([{ vx: 0, vy: 0 }, { vx: 0, vy: 0 }]),
        true,
        '全静止'
    );
    assertEqual(
        allAtRest([{ vx: 0, vy: 0 }, { vx: 0.5, vy: 0 }]),
        false,
        '一つ動いている'
    );
    assertEqual(
        allAtRest([{ vx: 5e-5, vy: 0 }, { vx: 0, vy: 5e-5 }]),
        true,
        '両方 REST_EPS 未満'
    );
});

test('engine: REST_EPS 定数の値は 1e-4', () => {
    assertEqual(REST_EPS, 1e-4);
});

test('engine: step で位置が velocity*dt 進む (引力・衝突なし)', () => {
    const world = {
        balls: [{ x: 50, y: 50, vx: 1, vy: 0, r: 1, m: 1 }],
        bounds: { x: 0, y: 0, w: 100, h: 100 },
        params: { G: 0, e: 1, mu: 0 },
    };
    const ret = step(world, 1 / 60);
    assertEqual(ret, world, 'step は同じ world 参照を返す');
    assertClose(world.balls[0].x, 50 + 1 / 60, TOL, 'x');
    assertClose(world.balls[0].y, 50, TOL, 'y');
    assertClose(world.balls[0].vx, 1, TOL, 'vx');
});

test('engine: step で壁衝突が解決される (端から漏れない)', () => {
    const world = {
        balls: [{ x: 99.5, y: 50, vx: 5, vy: 0, r: 1, m: 1 }],
        bounds: { x: 0, y: 0, w: 100, h: 100 },
        params: { G: 0, e: 1, mu: 0 },
    };
    step(world, 1 / 60);
    // bounds.w - r = 99 が右壁内側。位置進行 99.5 + 5/60 ≈ 99.583 → 押し戻し
    assertEqual(world.balls[0].x, 99, '壁内側へ押し戻し');
    if (!(world.balls[0].vx < 0)) {
        throw new Error(`vx 反転していない: ${world.balls[0].vx}`);
    }
});

test('engine: step で円-円衝突が解決される (e=1 等質量で速度交換)', () => {
    const world = {
        balls: [
            { x: 48.5, y: 50, vx: 1, vy: 0, r: 1, m: 1 },
            { x: 49.5, y: 50, vx: -1, vy: 0, r: 1, m: 1 },
        ],
        bounds: { x: 0, y: 0, w: 100, h: 100 },
        params: { G: 0, e: 1, mu: 0 },
    };
    step(world, 1 / 60);
    // 等質量 e=1 → 法線方向の速度交換 (vx 符号反転)
    if (!(world.balls[0].vx < 0)) {
        throw new Error(`a.vx 反転していない: ${world.balls[0].vx}`);
    }
    if (!(world.balls[1].vx > 0)) {
        throw new Error(`b.vx 反転していない: ${world.balls[1].vx}`);
    }
});

test('engine: runUntilRest が全球静止で終了 (mu>0)', () => {
    const world = {
        balls: [{ x: 50, y: 50, vx: 0.5, vy: 0, r: 1, m: 1 }],
        bounds: { x: 0, y: 0, w: 100, h: 100 },
        params: { G: 0, e: 1, mu: 5 },
    };
    const ret = runUntilRest(world, 4000, 1 / 60);
    assertEqual(ret, world, '同じ world 参照');
    assertEqual(allAtRest(world.balls), true, '全球静止');
});

test('engine: runUntilRest が timeoutMs で強制終了 (mu=0 永久運動)', () => {
    const world = {
        balls: [{ x: 50, y: 50, vx: 1, vy: 0, r: 1, m: 1 }],
        bounds: { x: 0, y: 0, w: 100, h: 100 },
        params: { G: 0, e: 1, mu: 0 },
    };
    runUntilRest(world, 100, 1 / 60);
    if (world.balls[0].vx === 0) {
        throw new Error('mu=0 のはずなのに静止した');
    }
});

test('engine: runUntilRest 短い timeoutMs で 1〜2 step のみ実行', () => {
    const world = {
        balls: [{ x: 50, y: 50, vx: 1, vy: 0, r: 1, m: 1 }],
        bounds: { x: 0, y: 0, w: 100, h: 100 },
        params: { G: 0, e: 1, mu: 0 },
    };
    runUntilRest(world, 10, 1 / 60); // 10ms / 16.67ms ≈ 1 step
    const x = world.balls[0].x;
    if (!(x > 50 && x < 50.05)) {
        throw new Error(`x が 1〜2 step 進行範囲外: ${x}`);
    }
});
