// テストランナー基盤の動作確認用スモークテスト。

import { test, assertEqual, assertClose } from '../assert.js';

test('smoke: assertEqual passes for 1+1===2', () => {
    assertEqual(1 + 1, 2);
});

test('smoke: assertEqual passes for string equality', () => {
    assertEqual('ohajiki', 'ohajiki');
});

test('smoke: assertClose tolerates float error', () => {
    assertClose(0.1 + 0.2, 0.3, 1e-9);
});
