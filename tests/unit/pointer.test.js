// 入力系: スリングショット FSM (createPointerController) のユニットテスト。
// DOM 非依存で世界座標 [0,1]^2 上の point を直接渡して状態遷移と velocity 計算を検証する。

import { test, assertEqual, assertClose } from '../assert.js';
import { createPointerController } from '../../src/input/pointer.js';

const TOL = 1e-9;

// 自陣矩形 (下辺寄り): y=0.85〜1.0 を player own side とみなす
const OWN_SIDE = { x0: 0.0, y0: 0.85, x1: 1.0, y1: 1.0 };

test('pointer: 自陣内 pointerdown で onPlace 発火、状態は aiming へ', () => {
    let placed = null;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        onPlace: (p) => { placed = p; },
    });
    assertEqual(ctrl.getState(), 'idle', 'initial state');
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    assertEqual(placed !== null, true, 'onPlace called');
    assertClose(placed.x, 0.5, TOL, 'placed.x');
    assertClose(placed.y, 0.9, TOL, 'placed.y');
    assertEqual(ctrl.getState(), 'aiming', 'state aiming');
});

test('pointer: 自陣外 pointerdown は no-op (相手陣タップ無視)', () => {
    let placed = null;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        onPlace: (p) => { placed = p; },
    });
    ctrl.handleDown({ x: 0.5, y: 0.3 }); // 相手陣
    assertEqual(placed, null, 'onPlace not called');
    assertEqual(ctrl.getState(), 'idle', 'still idle');
});

test('pointer: handleMove で velocity = (origin - current) × strengthCoef', () => {
    let aim = null;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        strengthCoef: 2,
        onAimAdjust: (a) => { aim = a; },
    });
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    ctrl.handleMove({ x: 0.5, y: 0.7 });
    assertEqual(aim !== null, true, 'onAimAdjust called');
    assertClose(aim.velocity.vx, 0, TOL, 'vx');
    assertClose(aim.velocity.vy, (0.9 - 0.7) * 2, TOL, 'vy = 0.4');
    assertClose(aim.origin.x, 0.5, TOL, 'origin.x');
    assertClose(aim.origin.y, 0.9, TOL, 'origin.y');
    assertClose(aim.current.x, 0.5, TOL, 'current.x');
    assertClose(aim.current.y, 0.7, TOL, 'current.y');
});

test('pointer: handleUp で onShoot 同 velocity 発火、状態 idle へ復帰', () => {
    let shot = null;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        strengthCoef: 2,
        onShoot: (s) => { shot = s; },
    });
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    ctrl.handleMove({ x: 0.5, y: 0.7 });
    ctrl.handleUp({ x: 0.5, y: 0.7 });
    assertEqual(shot !== null, true, 'onShoot called');
    assertClose(shot.velocity.vx, 0, TOL, 'vx');
    assertClose(shot.velocity.vy, 0.4, TOL, 'vy');
    assertClose(shot.origin.x, 0.5, TOL, 'origin.x');
    assertClose(shot.origin.y, 0.9, TOL, 'origin.y');
    assertEqual(ctrl.getState(), 'idle', 'back to idle');
});

test('pointer: maxDragDistance クランプ (drag 0.3 → 0.1 に制限、方向維持)', () => {
    let aim = null;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        strengthCoef: 2,
        maxDragDistance: 0.1,
        onAimAdjust: (a) => { aim = a; },
    });
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    // drag = origin - current = (0.3, 0.0), |drag|=0.3 → clamp to 0.1
    ctrl.handleMove({ x: 0.2, y: 0.9 });
    const speed = Math.hypot(aim.velocity.vx, aim.velocity.vy);
    // クランプ後速度長 = strengthCoef * maxDragDistance = 2 * 0.1 = 0.2
    assertClose(speed, 0.2, TOL, 'clamped speed');
    // 方向: drag は +x 方向 → velocity も +x 方向 (vx > 0, vy = 0)
    assertClose(aim.velocity.vy, 0, TOL, 'vy = 0');
    assertEqual(aim.velocity.vx > 0, true, 'vx positive (same dir as drag)');
});

test('pointer: handleCancel で aiming → idle, onCancel 発火', () => {
    let cancelled = 0;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        onCancel: () => { cancelled++; },
    });
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    assertEqual(ctrl.getState(), 'aiming', 'aiming');
    ctrl.handleCancel();
    assertEqual(cancelled, 1, 'onCancel once');
    assertEqual(ctrl.getState(), 'idle', 'idle');
});

test('pointer: aiming 中の handleDown 再実行 (multi-touch) で onCancel + idle', () => {
    let cancelled = 0;
    let placedCount = 0;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        onPlace: () => { placedCount++; },
        onCancel: () => { cancelled++; },
    });
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    assertEqual(placedCount, 1, 'first place');
    ctrl.handleDown({ x: 0.6, y: 0.9 }); // 2 本目の指
    assertEqual(cancelled, 1, 'onCancel fired');
    assertEqual(ctrl.getState(), 'idle', 'state idle');
});

test('pointer: idle 状態での handleMove / handleUp は no-op', () => {
    let aimCount = 0;
    let shootCount = 0;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        onAimAdjust: () => { aimCount++; },
        onShoot: () => { shootCount++; },
    });
    ctrl.handleMove({ x: 0.5, y: 0.5 });
    ctrl.handleUp({ x: 0.5, y: 0.5 });
    assertEqual(aimCount, 0, 'no aim');
    assertEqual(shootCount, 0, 'no shoot');
    assertEqual(ctrl.getState(), 'idle', 'still idle');
});

test('pointer: 全 callback 未指定でもエラーにならない', () => {
    const ctrl = createPointerController({ ownSideRect: OWN_SIDE });
    // 例外が出なければ OK
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    ctrl.handleMove({ x: 0.5, y: 0.7 });
    ctrl.handleUp({ x: 0.5, y: 0.7 });
    ctrl.handleCancel();
    assertEqual(ctrl.getState(), 'idle', 'final idle');
});

test('pointer: 自陣下方 (y=0.9) から下向きに引くと vy 負 = 上方向に飛ぶ', () => {
    let shot = null;
    const ctrl = createPointerController({
        ownSideRect: OWN_SIDE,
        strengthCoef: 2,
        onShoot: (s) => { shot = s; },
    });
    ctrl.handleDown({ x: 0.5, y: 0.9 });
    // 下に引く: current.y > origin.y
    ctrl.handleMove({ x: 0.5, y: 0.95 });
    ctrl.handleUp({ x: 0.5, y: 0.95 });
    // vy = (0.9 - 0.95) * 2 = -0.1 → 上方向 (相手陣)
    assertClose(shot.velocity.vy, -0.1, TOL, 'vy negative');
    assertEqual(shot.velocity.vy < 0, true, 'flies upward (toward opponent)');
});
