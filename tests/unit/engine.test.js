// 摩擦減衰と静止判定 (applyFriction / allAtRest / REST_EPS) のユニットテスト。

import { test, assertClose, assertEqual } from '../assert.js';
import { applyFriction, allAtRest, REST_EPS } from '../../src/physics/engine.js';

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
