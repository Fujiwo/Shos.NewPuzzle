// 万有引力 (applyGravity) のユニットテスト。

import { test, assertClose, assertEqual } from '../assert.js';
import { applyGravity } from '../../src/physics/gravity.js';

const DT = 1 / 60;

test('gravity: G=0 は no-op (全球速度不変)', () => {
    const balls = [
        { x: 0, y: 0, vx: 1, vy: 2, r: 1, m: 1 },
        { x: 10, y: 0, vx: -1, vy: 0, r: 1, m: 1 }
    ];
    applyGravity(balls, 0, DT);
    assertEqual(balls[0].vx, 1, 'a.vx');
    assertEqual(balls[0].vy, 2, 'a.vy');
    assertEqual(balls[1].vx, -1, 'b.vx');
    assertEqual(balls[1].vy, 0, 'b.vy');
});

test('gravity: G=1e-3 で互いに引き寄せる方向の加速度', () => {
    const balls = [
        { x: 0, y: 0, vx: 0, vy: 0, r: 1, m: 1 },
        { x: 10, y: 0, vx: 0, vy: 0, r: 1, m: 1 }
    ];
    applyGravity(balls, 1e-3, DT);
    // f = 1e-3 / 100 = 1e-5、Δv = 1e-5 / 60 ≈ 1.6667e-7
    assertClose(balls[0].vx, 1.6667e-7, 1e-9, 'a.vx');
    assertClose(balls[1].vx, -1.6667e-7, 1e-9, 'b.vx');
});

test('gravity: 一対の球で運動量保存 (等しく逆向き)', () => {
    const balls = [
        { x: 0, y: 0, vx: 0, vy: 0, r: 1, m: 1 },
        { x: 10, y: 0, vx: 0, vy: 0, r: 1, m: 1 }
    ];
    applyGravity(balls, 1e-3, DT);
    assertClose(balls[0].vx + balls[1].vx, 0, 1e-12, 'sum vx');
    assertClose(balls[0].vy + balls[1].vy, 0, 1e-12, 'sum vy');
});

test('gravity: 距離下限 d ≥ 2r でクランプ (発散防止)', () => {
    const balls = [
        { x: 0, y: 0, vx: 0, vy: 0, r: 1, m: 1 },
        { x: 0.5, y: 0, vx: 0, vy: 0, r: 1, m: 1 }
    ];
    applyGravity(balls, 1e-3, DT);
    // d=2 にクランプ → f = 1e-3/4 = 2.5e-4、ux = dx/d_clamped = 0.5/2 = 0.25
    // Δv = (f/m) * ux * dt = 2.5e-4 * 0.25 / 60 ≈ 1.0417e-6
    assertClose(Math.abs(balls[0].vx), 1.0417e-6, 1e-9, '|a.vx|');
    assertEqual(Number.isFinite(balls[0].vx), true, 'a.vx finite');
    assertEqual(Number.isFinite(balls[1].vx), true, 'b.vx finite');
});

test('gravity: 3 球系の重ね合わせ (A は B と C の両方に引かれる)', () => {
    const balls = [
        { x: 0, y: 0, vx: 0, vy: 0, r: 1, m: 1 },
        { x: 10, y: 0, vx: 0, vy: 0, r: 1, m: 1 },
        { x: 0, y: 10, vx: 0, vy: 0, r: 1, m: 1 }
    ];
    applyGravity(balls, 1e-3, DT);
    if (!(balls[0].vx > 0)) throw new Error(`A.vx > 0 expected, got ${balls[0].vx}`);
    if (!(balls[0].vy > 0)) throw new Error(`A.vy > 0 expected, got ${balls[0].vy}`);
});

test('gravity: 純 Y 方向の引力 (X 成分は 0)', () => {
    const balls = [
        { x: 0, y: 0, vx: 0, vy: 0, r: 1, m: 1 },
        { x: 0, y: 10, vx: 0, vy: 0, r: 1, m: 1 }
    ];
    applyGravity(balls, 1e-3, DT);
    if (!(balls[0].vy > 0)) throw new Error(`a.vy > 0 expected, got ${balls[0].vy}`);
    if (!(balls[1].vy < 0)) throw new Error(`b.vy < 0 expected, got ${balls[1].vy}`);
    assertEqual(balls[0].vx, 0, 'a.vx');
    assertEqual(balls[1].vx, 0, 'b.vx');
});
