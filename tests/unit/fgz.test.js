// fgz.js のテスト: FGZ 判定 + 1-rock rule (M1v2.4-A)。

import { test, assertEqual } from '../assert.js';
import { isInFgz, isOutOfLane, detectFgzViolation, HOG_LINE_Y, TEE_LINE_Y } from '../../src/game/fgz.js';

test('fgz: 定数 HOG_LINE_Y=0.40 / TEE_LINE_Y=0.20', () => {
    assertEqual(HOG_LINE_Y, 0.40, 'HOG_LINE_Y');
    assertEqual(TEE_LINE_Y, 0.20, 'TEE_LINE_Y');
});

test('fgz: isInFgz は ティーライン下 / ホッグライン上 / ハウス外で true', () => {
    assertEqual(isInFgz({ x: 0.25, y: 0.32 }), true, 'FGZ 内中央 (距離=0.12, house 外)');
    assertEqual(isInFgz({ x: 0.25, y: 0.20 }), false, 'ハウス内 (ボタン位置)');
    assertEqual(isInFgz({ x: 0.25, y: 0.50 }), false, 'ホッグラインより手前 (FGZ 外)');
    assertEqual(isInFgz({ x: 0.25, y: 0.15 }), false, 'ティーラインより奥 (FGZ 外)');
});

test('fgz: isOutOfLane は bounds 矩形外で true', () => {
    const bounds = { x: 0, y: 0, w: 0.5, h: 1.5 };
    assertEqual(isOutOfLane({ x: -0.01, y: 0.50 }, bounds), true, '左外');
    assertEqual(isOutOfLane({ x: 0.51, y: 0.50 }, bounds), true, '右外');
    assertEqual(isOutOfLane({ x: 0.25, y: -0.01 }, bounds), true, '下外');
    assertEqual(isOutOfLane({ x: 0.25, y: 1.51 }, bounds), true, '上外');
    assertEqual(isOutOfLane({ x: 0.25, y: 0.50 }, bounds), false, '内側');
});

test('fgz: detectFgzViolation は stoneIndex=0 で相手 FGZ ガード消失なら違反', () => {
    const before = [{ x: 0.25, y: 0.32, owner: 1 }];
    const after = []; // テイクアウトされて消失
    const result = detectFgzViolation({ before, after, stoneIndex: 0, currentSide: 0 });
    assertEqual(result.violated, true, 'violated');
    assertEqual(result.restoreList.length, 1, 'restoreList 1 件');
});

test('fgz: detectFgzViolation は stoneIndex>=1 では違反検出しない', () => {
    const before = [{ x: 0.25, y: 0.32, owner: 1 }];
    const after = [];
    const result = detectFgzViolation({ before, after, stoneIndex: 1, currentSide: 0 });
    assertEqual(result.violated, false, 'violated');
    assertEqual(result.restoreList.length, 0, 'restoreList 空');
});
