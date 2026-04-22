// 円-円弾性衝突 (resolveCircleCircle) のユニットテスト。

import { test, assertClose, assertEqual } from '../assert.js';
import { resolveCircleCircle, resolveCircleWall } from '../../src/physics/collision.js';

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

// --- 円-壁反射 (resolveCircleWall) ---

test('wall: 左壁反射 (e=1.0) → 位置補正と vx 反転', () => {
    const ball = { x: -0.5, y: 50, vx: -2, vy: 0, r: 1, m: 1 };
    const bounds = { x: 0, y: 0, w: 100, h: 100 };
    const ret = resolveCircleWall(ball, bounds, 1.0);
    assertEqual(ret, true, '戻り値');
    assertClose(ball.x, 1, TOL, 'ball.x (= bounds.x + r)');
    assertClose(ball.vx, 2, TOL, 'ball.vx 反転');
    assertClose(ball.vy, 0, TOL, 'ball.vy 不変');
    assertClose(ball.y, 50, TOL, 'ball.y 不変');
});

test('wall: 右壁反射 (e=0.5) → 位置補正と vx 反転×減衰', () => {
    const ball = { x: 100.3, y: 50, vx: 3, vy: 0, r: 1, m: 1 };
    const bounds = { x: 0, y: 0, w: 100, h: 100 };
    const ret = resolveCircleWall(ball, bounds, 0.5);
    assertEqual(ret, true);
    assertClose(ball.x, 99, TOL, 'ball.x (= bounds.x + w - r)');
    assertClose(ball.vx, -1.5, TOL, 'ball.vx 反転×0.5');
    assertClose(ball.vy, 0, TOL);
});

test('wall: 上壁反射 (e=0.7) → 位置補正と vy 反転×減衰', () => {
    const ball = { x: 50, y: -0.2, vx: 0, vy: -2, r: 1, m: 1 };
    const bounds = { x: 0, y: 0, w: 100, h: 100 };
    const ret = resolveCircleWall(ball, bounds, 0.7);
    assertEqual(ret, true);
    assertClose(ball.y, 1, TOL, 'ball.y (= bounds.y + r)');
    assertClose(ball.vy, 1.4, TOL, 'ball.vy 反転×0.7');
    assertClose(ball.vx, 0, TOL);
});

test('wall: 内側にいる場合 → no-op (false / 不変)', () => {
    const ball = { x: 50, y: 50, vx: 1, vy: 1, r: 1, m: 1 };
    const bounds = { x: 0, y: 0, w: 100, h: 100 };
    const ret = resolveCircleWall(ball, bounds, 1.0);
    assertEqual(ret, false, '戻り値');
    assertClose(ball.x, 50, TOL);
    assertClose(ball.y, 50, TOL);
    assertClose(ball.vx, 1, TOL);
    assertClose(ball.vy, 1, TOL);
});

test('wall: 角に同時接触 (左下隅) → x/y 両軸補正＆反転', () => {
    const ball = { x: 0, y: 100.5, vx: -1, vy: 2, r: 1, m: 1 };
    const bounds = { x: 0, y: 0, w: 100, h: 100 };
    const ret = resolveCircleWall(ball, bounds, 1.0);
    assertEqual(ret, true);
    assertClose(ball.x, 1, TOL, 'ball.x 補正 (左壁)');
    assertClose(ball.y, 99, TOL, 'ball.y 補正 (下壁)');
    assertClose(ball.vx, 1, TOL, 'vx 反転');
    assertClose(ball.vy, -2, TOL, 'vy 反転');
});
