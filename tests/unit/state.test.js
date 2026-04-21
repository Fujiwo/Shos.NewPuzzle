// state.js のテスト: ターン制御 / 残数判定 / 試合長モード / 思考時間上限。

import { test } from '../assert.js';
import { assertEqual, assertClose, assertThrows } from '../assert.js';
import {
    createInitialState,
    advanceTurn,
} from '../../src/game/state.js';

// ---- Sub-task 1.5.A: createInitialState / advanceTurn ----

test('state: createInitialState("10ball", 1) → 球数 10、scores=[5,5]', () => {
    const s = createInitialState('10ball', 1);
    assertEqual(s.world.balls.length, 10, 'balls.length');
    assertEqual(s.scores[0], 5, 'scores[0]');
    assertEqual(s.scores[1], 5, 'scores[1]');
    assertEqual(s.mode, '10ball', 'mode');
    assertEqual(s.turn, 1, 'turn');
    assertEqual(s.currentPlayer, 0, 'currentPlayer');
    assertEqual(s.status, 'placing', 'status');
    assertEqual(s.thinkDeadlineMs, 0, 'thinkDeadlineMs');
});

test('state: createInitialState("6ball", 1) → 球数 6、scores=[3,3]', () => {
    const s = createInitialState('6ball', 1);
    assertEqual(s.world.balls.length, 6, 'balls.length');
    assertEqual(s.scores[0], 3, 'scores[0]');
    assertEqual(s.scores[1], 3, 'scores[1]');
});

test('state: 同シードで 2 回呼ぶと balls の (x, y) が一致 (決定論性)', () => {
    const s1 = createInitialState('10ball', 42);
    const s2 = createInitialState('10ball', 42);
    assertEqual(s1.world.balls.length, s2.world.balls.length, 'length');
    for (let i = 0; i < s1.world.balls.length; i++) {
        assertClose(s1.world.balls[i].x, s2.world.balls[i].x, 1e-12, `balls[${i}].x`);
        assertClose(s1.world.balls[i].y, s2.world.balls[i].y, 1e-12, `balls[${i}].y`);
    }
});

test('state: P0 球は y < 0.5、P1 球は y >= 0.5 (自陣配置)', () => {
    const s = createInitialState('10ball', 7);
    for (const b of s.world.balls) {
        if (b.owner === 0) {
            if (!(b.y < 0.5)) throw new Error(`P0 ball at y=${b.y} not in lower half`);
        } else if (b.owner === 1) {
            if (!(b.y >= 0.5)) throw new Error(`P1 ball at y=${b.y} not in upper half`);
        } else {
            throw new Error(`unknown owner ${b.owner}`);
        }
    }
});

test('state: 球同士の重なりなし (全ペア距離 ≥ 2r)', () => {
    const s = createInitialState('10ball', 3);
    const balls = s.world.balls;
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            const dx = balls[i].x - balls[j].x;
            const dy = balls[i].y - balls[j].y;
            const d = Math.hypot(dx, dy);
            const minD = balls[i].r + balls[j].r;
            if (d < minD - 1e-9) {
                throw new Error(`balls ${i},${j} overlap: d=${d} < ${minD}`);
            }
        }
    }
});

test('state: advanceTurn で turn+1, currentPlayer 切替, status="placing"', () => {
    const s0 = createInitialState('10ball', 1);
    const s1 = advanceTurn(s0);
    assertEqual(s1.turn, 2, 'turn');
    assertEqual(s1.currentPlayer, 1, 'currentPlayer');
    assertEqual(s1.status, 'placing', 'status');
    const s2 = advanceTurn(s1);
    assertEqual(s2.turn, 3, 'turn');
    assertEqual(s2.currentPlayer, 0, 'currentPlayer');
});

test('state: advanceTurn は元 state を破壊しない (純粋)', () => {
    const s0 = createInitialState('10ball', 1);
    const origTurn = s0.turn;
    const origPlayer = s0.currentPlayer;
    const origX = s0.world.balls[0].x;
    const origLen = s0.world.balls.length;
    const s1 = advanceTurn(s0);
    // 返り値を破壊しても元 state は不変であること
    s1.world.balls[0].x = 999;
    s1.turn = 999;
    assertEqual(s0.turn, origTurn, 's0.turn unchanged');
    assertEqual(s0.currentPlayer, origPlayer, 's0.currentPlayer unchanged');
    assertEqual(s0.world.balls[0].x, origX, 's0.world.balls[0].x unchanged');
    assertEqual(s0.world.balls.length, origLen, 's0.world.balls.length unchanged');
});

test('state: P0 球を 1 つ pop して advanceTurn → scores=[4,5]', () => {
    const s0 = createInitialState('10ball', 1);
    // 元 state を破壊しないよう世界をコピーし、P0 球の最初を取り除く
    const newBalls = s0.world.balls.slice();
    const idx = newBalls.findIndex(b => b.owner === 0);
    newBalls.splice(idx, 1);
    const removed = { ...s0, world: { ...s0.world, balls: newBalls } };
    const s1 = advanceTurn(removed);
    assertEqual(s1.scores[0], 4, 'scores[0]');
    assertEqual(s1.scores[1], 5, 'scores[1]');
});

test('state: P1 球を全削除して advanceTurn → status="ended", currentPlayer 保持', () => {
    const s0 = createInitialState('10ball', 1);
    const newBalls = s0.world.balls.filter(b => b.owner === 0);
    const removed = { ...s0, world: { ...s0.world, balls: newBalls } };
    // s0.currentPlayer は 0 (P0 が直前の手番)
    const s1 = advanceTurn(removed);
    assertEqual(s1.status, 'ended', 'status');
    assertEqual(s1.currentPlayer, 0, 'currentPlayer 保持');
    assertEqual(s1.turn, removed.turn, 'turn 保持');
    assertEqual(s1.scores[0], 5, 'scores[0]');
    assertEqual(s1.scores[1], 0, 'scores[1]');
});

test('state: 未知の mode を渡すと throw', () => {
    assertThrows(() => createInitialState('99ball', 1), 'unknown mode should throw');
});
