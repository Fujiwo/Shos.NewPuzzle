// rules.js のテスト: カーリング型得点ロジック (M1v2.2-B)。

import { test, assertEqual } from '../assert.js';
import { scoreEnd, evaluateWinner } from '../../src/game/rules.js';

// ---- scoreEnd ----

test('rules: scoreEnd: ハウス内 0 → side=null, points=0', () => {
    const r = scoreEnd([{ x: 0.40, y: 0.50, owner: 0 }]);
    assertEqual(r.side, null, 'side');
    assertEqual(r.points, 0, 'points');
});

test('rules: scoreEnd: ハウス内 1 球 → 1 点', () => {
    const r = scoreEnd([{ x: 0.25, y: 0.21, owner: 0 }]);
    assertEqual(r.side, 0, 'side');
    assertEqual(r.points, 1, 'points');
});

test('rules: scoreEnd: 相手最近接より内側の自陣ストーン数を返す', () => {
    const balls = [
        { x: 0.25, y: 0.20, owner: 0 }, // d=0
        { x: 0.27, y: 0.20, owner: 0 }, // d=0.02
        { x: 0.30, y: 0.20, owner: 1 }, // d=0.05 (相手最近接)
        { x: 0.35, y: 0.20, owner: 0 }, // d=0.10 (相手より遠い)
    ];
    const r = scoreEnd(balls);
    assertEqual(r.side, 0, 'side');
    assertEqual(r.points, 2, 'points');
});

test('rules: scoreEnd: ハウス外の球は無視', () => {
    const balls = [
        { x: 0.25, y: 0.20, owner: 0 }, // ハウス内 d=0
        { x: 0.45, y: 0.20, owner: 1 }, // ハウス外 d=0.20
    ];
    const r = scoreEnd(balls);
    assertEqual(r.side, 0, 'side');
    assertEqual(r.points, 1, 'points');
});

// ---- evaluateWinner ----

test('rules: evaluateWinner: 合計得点で勝者判定', () => {
    const state = {
        status: 'ended',
        endScores: [
            { side: 0, points: 2 },
            { side: 1, points: 1 },
        ],
    };
    const r = evaluateWinner(state);
    assertEqual(r.winner, 0, 'winner');
    assertEqual(r.totals[0], 2, 'totals[0]');
    assertEqual(r.totals[1], 1, 'totals[1]');
    assertEqual(r.reason, 'higher-score', 'reason');
});

test('rules: evaluateWinner: 同点で extra end 上限到達なら draw', () => {
    const state = {
        status: 'ended',
        endScores: [
            { side: 0, points: 1 },
            { side: 1, points: 1 },
        ],
        extraEndsUsed: 1,
    };
    const r = evaluateWinner(state);
    assertEqual(r.winner, null, 'winner');
    assertEqual(r.totals[0], 1, 'totals[0]');
    assertEqual(r.totals[1], 1, 'totals[1]');
    assertEqual(r.reason, 'draw', 'reason');
});
