// シード可能 RNG (mulberry32) のユニットテスト。

import { test, assertEqual } from '../assert.js';
import { createRng } from '../../src/physics/rng.js';

test('rng: 同シード → 同系列 (100 回連続一致)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [];
    const seqB = [];
    for (let i = 0; i < 100; i++) {
        seqA.push(a());
        seqB.push(b());
    }
    assertEqual(JSON.stringify(seqA), JSON.stringify(seqB));
});

test('rng: 異シード → 系列が異なる (最初の値)', () => {
    const a = createRng(1);
    const b = createRng(2);
    const va = a();
    const vb = b();
    if (va === vb) {
        throw new Error(`expected different first values, got ${va} === ${vb}`);
    }
});

test('rng: 値域 [0, 1) を 1000 回満たす', () => {
    const r = createRng(12345);
    for (let i = 0; i < 1000; i++) {
        const v = r();
        if (!(v >= 0 && v < 1)) {
            throw new Error(`out of range at i=${i}: ${v}`);
        }
    }
});

test('rng: 0 シード対応 (決定的かつ最初の 10 値が一致)', () => {
    const a = createRng(0);
    const b = createRng(0);
    for (let i = 0; i < 10; i++) {
        assertEqual(a(), b(), `index ${i}`);
    }
});
