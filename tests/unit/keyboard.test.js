// 入力系: キーボード操作 FSM (createKeyboardController) のユニットテスト。
// アクセシビリティ用キー操作 (placing → aiming-direction → aiming-power → shoot)
// の状態遷移と velocity 計算を DOM 非依存で検証する。

import { test, assertEqual, assertClose } from '../assert.js';
import { createKeyboardController } from '../../src/input/keyboard.js';

const TOL = 1e-9;

// 自陣矩形 (下辺寄り)。placement Y = (y0+y1)/2 = 0.925、X は x0..x1 を等分。
const OWN_SIDE = { x0: 0.0, y0: 0.85, x1: 1.0, y1: 1.0 };

// 既定オプション一式 (テスト間で共有)
function makeOptions(overrides = {}) {
    return {
        ownSideRect: OWN_SIDE,
        placementSteps: 10,
        directionCount: 24,
        powerLevels: 10,
        maxPowerVelocity: 1.2,
        initialDirectionRadians: -Math.PI / 2,
        ...overrides,
    };
}

test('keyboard: placing で ArrowRight → placementIndex 増加、左端で ArrowLeft しても 0 から動かず', () => {
    const ctrl = createKeyboardController(makeOptions());
    assertEqual(ctrl.getState(), 'placing', 'initial state');
    assertEqual(ctrl.getSnapshot().placementIndex, 0, 'initial index 0');
    ctrl.handleKey('ArrowLeft'); // 0 で左端、動かない
    assertEqual(ctrl.getSnapshot().placementIndex, 0, 'still 0 at left edge');
    ctrl.handleKey('ArrowRight');
    assertEqual(ctrl.getSnapshot().placementIndex, 1, 'index 1');
    ctrl.handleKey('ArrowRight');
    assertEqual(ctrl.getSnapshot().placementIndex, 2, 'index 2');
});

test('keyboard: placing で ArrowRight 連打、placementSteps-1 で頭打ち', () => {
    const ctrl = createKeyboardController(makeOptions({ placementSteps: 5 }));
    for (let i = 0; i < 10; i++) ctrl.handleKey('ArrowRight');
    assertEqual(ctrl.getSnapshot().placementIndex, 4, 'capped at steps-1');
});

test('keyboard: placing → aiming-direction: Enter で onPlace 発火、状態遷移', () => {
    let placed = null;
    const ctrl = createKeyboardController(makeOptions({
        onPlace: (p) => { placed = p; },
    }));
    ctrl.handleKey('ArrowRight'); // placementIndex = 1
    ctrl.handleKey('Enter');
    assertEqual(placed !== null, true, 'onPlace called');
    assertEqual(placed.index, 1, 'placed index');
    // x = x0 + (1/9) * (x1-x0) = 1/9
    assertClose(placed.x, 1 / 9, TOL, 'placed x');
    // y = (y0+y1)/2 = 0.925
    assertClose(placed.y, 0.925, TOL, 'placed y');
    assertEqual(ctrl.getState(), 'aiming-direction', 'state aiming-direction');
});

test('keyboard: aiming-direction で ArrowLeft → directionIndex が N-1 に wrap', () => {
    const ctrl = createKeyboardController(makeOptions());
    ctrl.handleKey('Enter'); // → aiming-direction
    assertEqual(ctrl.getSnapshot().directionIndex, 0, 'initial direction 0');
    ctrl.handleKey('ArrowLeft');
    assertEqual(ctrl.getSnapshot().directionIndex, 23, 'wrap to N-1');
});

test('keyboard: aiming-direction で ArrowRight → directionIndex が 1 になる', () => {
    const ctrl = createKeyboardController(makeOptions());
    ctrl.handleKey('Enter');
    ctrl.handleKey('ArrowRight');
    assertEqual(ctrl.getSnapshot().directionIndex, 1, 'index 1');
});

test('keyboard: aiming-direction → aiming-power: Enter で powerLevel=0 開始', () => {
    const ctrl = createKeyboardController(makeOptions());
    ctrl.handleKey('Enter'); // placing → aiming-direction
    ctrl.handleKey('Enter'); // aiming-direction → aiming-power
    assertEqual(ctrl.getState(), 'aiming-power', 'state aiming-power');
    assertEqual(ctrl.getSnapshot().powerLevel, 0, 'powerLevel 0');
});

test('keyboard: aiming-power: Space で powerLevel が 1→2→...→powerLevels→1 と環状', () => {
    const ctrl = createKeyboardController(makeOptions({ powerLevels: 4 }));
    ctrl.handleKey('Enter'); // → aiming-direction
    ctrl.handleKey('Enter'); // → aiming-power, level 0
    ctrl.handleKey(' ');
    assertEqual(ctrl.getSnapshot().powerLevel, 1, 'level 1');
    ctrl.handleKey(' ');
    assertEqual(ctrl.getSnapshot().powerLevel, 2, 'level 2');
    ctrl.handleKey(' ');
    assertEqual(ctrl.getSnapshot().powerLevel, 3, 'level 3');
    ctrl.handleKey(' ');
    assertEqual(ctrl.getSnapshot().powerLevel, 4, 'level 4 (max)');
    ctrl.handleKey(' ');
    assertEqual(ctrl.getSnapshot().powerLevel, 1, 'wrap back to 1');
});

test('keyboard: aiming-power: ArrowUp/Down で powerLevel 線形 (端で頭打ち)', () => {
    const ctrl = createKeyboardController(makeOptions({ powerLevels: 5 }));
    ctrl.handleKey('Enter');
    ctrl.handleKey('Enter'); // → aiming-power, level 0
    ctrl.handleKey('ArrowUp');
    assertEqual(ctrl.getSnapshot().powerLevel, 1, 'up to 1');
    for (let i = 0; i < 10; i++) ctrl.handleKey('ArrowUp');
    assertEqual(ctrl.getSnapshot().powerLevel, 5, 'capped at powerLevels');
    for (let i = 0; i < 10; i++) ctrl.handleKey('ArrowDown');
    assertEqual(ctrl.getSnapshot().powerLevel, 1, 'floored at 1');
});

test('keyboard: aiming-power → shoot: Enter で onShoot 発火、velocity 大きさ = maxPowerVelocity * level/powerLevels', () => {
    let shot = null;
    const ctrl = createKeyboardController(makeOptions({
        powerLevels: 4,
        maxPowerVelocity: 2.0,
        onShoot: (s) => { shot = s; },
    }));
    ctrl.handleKey('Enter'); // → aiming-direction
    ctrl.handleKey('Enter'); // → aiming-power
    ctrl.handleKey(' ');     // level 1
    ctrl.handleKey(' ');     // level 2
    ctrl.handleKey('Enter'); // shoot
    assertEqual(shot !== null, true, 'onShoot called');
    const speed = Math.hypot(shot.velocity.vx, shot.velocity.vy);
    // 2.0 * 2 / 4 = 1.0
    assertClose(speed, 1.0, TOL, 'speed = maxPowerVelocity * level/powerLevels');
    assertEqual(ctrl.getState(), 'placing', 'back to placing');
});

test('keyboard: velocity 方向: directionIndex=0 + initialDirectionRadians=-π/2 で vy ≈ -magnitude (上方向), vx ≈ 0', () => {
    let shot = null;
    const ctrl = createKeyboardController(makeOptions({
        powerLevels: 1,
        maxPowerVelocity: 1.0,
        onShoot: (s) => { shot = s; },
    }));
    ctrl.handleKey('Enter'); // → aiming-direction (directionIndex=0)
    ctrl.handleKey('Enter'); // → aiming-power
    ctrl.handleKey(' ');     // level 1
    ctrl.handleKey('Enter'); // shoot
    assertClose(shot.velocity.vx, 0, 1e-12, 'vx ≈ 0');
    assertClose(shot.velocity.vy, -1.0, TOL, 'vy ≈ -magnitude (upward)');
});

test('keyboard: Escape from aiming-direction: onCancel 発火、状態 placing、placementIndex 保持', () => {
    let cancelled = 0;
    const ctrl = createKeyboardController(makeOptions({
        onCancel: () => { cancelled++; },
    }));
    ctrl.handleKey('ArrowRight'); // index 1
    ctrl.handleKey('ArrowRight'); // index 2
    ctrl.handleKey('Enter');      // → aiming-direction
    ctrl.handleKey('Escape');
    assertEqual(cancelled, 1, 'onCancel once');
    assertEqual(ctrl.getState(), 'placing', 'back to placing');
    assertEqual(ctrl.getSnapshot().placementIndex, 2, 'placementIndex preserved');
});

test('keyboard: Escape from aiming-power: onCancel 発火、状態 aiming-direction、direction 保持', () => {
    let cancelled = 0;
    const ctrl = createKeyboardController(makeOptions({
        onCancel: () => { cancelled++; },
    }));
    ctrl.handleKey('Enter');       // → aiming-direction
    ctrl.handleKey('ArrowRight');
    ctrl.handleKey('ArrowRight');
    ctrl.handleKey('ArrowRight');  // directionIndex = 3
    ctrl.handleKey('Enter');       // → aiming-power
    ctrl.handleKey(' ');           // level 1
    ctrl.handleKey('Escape');
    assertEqual(cancelled, 1, 'onCancel once');
    assertEqual(ctrl.getState(), 'aiming-direction', 'back to aiming-direction (not placing)');
    assertEqual(ctrl.getSnapshot().directionIndex, 3, 'direction preserved');
    assertEqual(ctrl.getSnapshot().powerLevel, 0, 'powerLevel reset');
});

test('keyboard: 全 callback 未指定でも全キー操作でエラーにならない', () => {
    const ctrl = createKeyboardController(makeOptions());
    ctrl.handleKey('ArrowRight');
    ctrl.handleKey('ArrowLeft');
    ctrl.handleKey('Enter');
    ctrl.handleKey('ArrowRight');
    ctrl.handleKey('ArrowLeft');
    ctrl.handleKey('Enter');
    ctrl.handleKey(' ');
    ctrl.handleKey('ArrowUp');
    ctrl.handleKey('ArrowDown');
    ctrl.handleKey('Enter'); // shoot
    ctrl.handleKey('Escape');
    assertEqual(ctrl.getState(), 'placing', 'final placing');
});

test('keyboard: 無関係なキー (例 "a") は no-op', () => {
    let placed = 0, shot = 0, cancelled = 0;
    const ctrl = createKeyboardController(makeOptions({
        onPlace: () => { placed++; },
        onShoot: () => { shot++; },
        onCancel: () => { cancelled++; },
    }));
    ctrl.handleKey('a');
    ctrl.handleKey('Tab');
    ctrl.handleKey('Shift');
    assertEqual(placed, 0, 'no place');
    assertEqual(shot, 0, 'no shoot');
    assertEqual(cancelled, 0, 'no cancel');
    assertEqual(ctrl.getState(), 'placing', 'still placing');
    assertEqual(ctrl.getSnapshot().placementIndex, 0, 'no index change');
});
