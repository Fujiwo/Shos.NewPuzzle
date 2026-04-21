// 円-円弾性衝突 (resolveCircleCircle) のユニットテスト。

import { test, assertClose, assertEqual } from '../assert.js';
import { resolveCircleCircle } from '../../src/physics/collision.js';

const TOL = 1e-9;

test('collision: 等質量正面衝突 (e=1.0) → 速度交換', () => {
    const a = { x: 0, y: 0, vx: 1, vy: 0, r: 1, m: 1 };
    const b = { x: 1.5, y: 0, vx: -1, vy: 0, r: 1, m: 1 };
    const ret = resolveCircleCircle(a, b, 1.0);
    assertEqual(ret, true, '戻り値');
    assertClose(a.vx, -1, TOL, 'a.vx');
    assertClose(b.vx, 1, TOL, 'b.vx');
    assertClose(a.vy, 0, TOL, 'a.vy');
    assertClose(b.vy, 0, TOL, 'b.vy');
});

test('collision: 等質量正面衝突 (e=0.5) → 相対速度が半減', () => {
    // 物理仕様準拠 (Plans の "25% 損失" 記述は等質量では成立しない誤り)
    // 等質量 + e=0.5: a.vx = -0.5, b.vx = 0.5, KE_after = 0.25 (75% 損失)
    const a = { x: 0, y: 0, vx: 1, vy: 0, r: 1, m: 1 };
    const b = { x: 1.5, y: 0, vx: -1, vy: 0, r: 1, m: 1 };
    const ret = resolveCircleCircle(a, b, 0.5);
    assertEqual(ret, true);
    assertClose(a.vx, -0.5, TOL, 'a.vx');
    assertClose(b.vx, 0.5, TOL, 'b.vx');
    const keAfter = 0.5 * a.m * (a.vx * a.vx + a.vy * a.vy)
                  + 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
    assertClose(keAfter, 0.25, TOL, 'KE_after');
});

test('collision: 直交衝突 → 法線方向のみ運動量交換 (e=1.0)', () => {
    // A は x 軸方向に進行、B は y 軸方向から接近。法線は y 軸方向。
    const a = { x: 0, y: 0, vx: 1, vy: 0, r: 1, m: 1 };
    const b = { x: 0, y: 1.5, vx: 0, vy: -1, r: 1, m: 1 };
    const ret = resolveCircleCircle(a, b, 1.0);
    assertEqual(ret, true);
    // 法線 (y 軸) 方向は速度交換、接線 (x 軸) 方向は不変
    assertClose(a.vx, 1, TOL, 'a.vx (接線方向不変)');
    assertClose(b.vx, 0, TOL, 'b.vx (接線方向不変)');
    assertClose(a.vy, -1, TOL, 'a.vy (法線方向交換)');
    assertClose(b.vy, 0, TOL, 'b.vy (法線方向交換)');
    // 運動量保存
    assertClose(a.vx + b.vx, 1, TOL, 'p_x 保存');
    assertClose(a.vy + b.vy, -1, TOL, 'p_y 保存');
    // KE 保存 (e=1.0)
    const keAfter = 0.5 * (a.vx * a.vx + a.vy * a.vy)
                  + 0.5 * (b.vx * b.vx + b.vy * b.vy);
    assertClose(keAfter, 1.0, TOL, 'KE 保存');
});

test('collision: 離反中はスキップ (false / 速度不変)', () => {
    const a = { x: 0, y: 0, vx: -1, vy: 0, r: 1, m: 1 };
    const b = { x: 1.5, y: 0, vx: 1, vy: 0, r: 1, m: 1 };
    const ret = resolveCircleCircle(a, b, 1.0);
    assertEqual(ret, false, '戻り値');
    assertClose(a.vx, -1, TOL);
    assertClose(b.vx, 1, TOL);
});

test('collision: 重なり無し → false', () => {
    const a = { x: 0, y: 0, vx: 1, vy: 0, r: 1, m: 1 };
    const b = { x: 5, y: 0, vx: -1, vy: 0, r: 1, m: 1 };
    const ret = resolveCircleCircle(a, b, 1.0);
    assertEqual(ret, false);
});
