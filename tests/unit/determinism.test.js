// 決定論性テスト: 同シード → 同結果 (浮動小数点 bit 一致) を保証する。
// リプレイ機能 (M2.1) と URL シード非同期対戦 (§7.1) の前提。

import { test, assertEqual } from '../assert.js';
import { buildInitialWorld, INPUTS, runOneTurn } from '../fixtures/scenario-seed-42.js';
import { SNAPSHOT } from '../snapshots/seed-42-20turn.js';

// world.balls の最終状態を snapshot 比較用に正規化 (位置と速度のみ)。
function extractFinal(balls) {
    return balls.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy }));
}

// JSON 文字列で完全一致比較 (浮動小数点を toString フル精度でシリアライズ)。
function serialize(finalBalls) {
    return JSON.stringify(finalBalls);
}

function runScenario(seed = 42) {
    const world = buildInitialWorld(seed);
    for (const input of INPUTS) {
        runOneTurn(world, input);
    }
    return extractFinal(world.balls);
}

test('determinism: single run matches snapshot (seed=42, 20 turns)', () => {
    const actual = runScenario(42);
    const actualStr = serialize(actual);
    const expectedStr = serialize(SNAPSHOT.finalBalls);
    assertEqual(actualStr, expectedStr, 'finalBalls mismatch');
});

test('determinism: 100 consecutive runs all match snapshot', () => {
    const expectedStr = serialize(SNAPSHOT.finalBalls);
    for (let i = 0; i < 100; i++) {
        const actualStr = serialize(runScenario(42));
        if (actualStr !== expectedStr) {
            throw new Error(`run #${i} diverged from snapshot`);
        }
    }
});

test('determinism: different seed (43) produces different result', () => {
    const seed42 = serialize(runScenario(42));
    const seed43 = serialize(runScenario(43));
    if (seed42 === seed43) {
        throw new Error('seed 42 and 43 produced identical results (snapshot not seed-sensitive)');
    }
});
