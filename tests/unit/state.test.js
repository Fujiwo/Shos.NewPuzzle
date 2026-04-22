// state.js のテスト (v2 カーリング型 / 順次投擲モデル)。
// 旧 v1 (球数 / scores / placeBall / turn・currentPlayer) 前提のテストは
// M1v2.3-A+C で削除。closeEnd ベースで M1v2.3-B で再追加予定。

import { test } from '../assert.js';
import { assertEqual, assertThrows } from '../assert.js';
import {
    createInitialState,
    setThinkDeadline,
    isThinkTimeout,
} from '../../src/game/state.js';

// TODO(M1v2.3-B): closeEnd 実装後に v2 仕様 (endIndex / endScores / status 'ended') で再追加予定:
//   - createInitialState の球数/スコア初期値検証
//   - placeBall / 自陣配置 / 重なりなし → fgz.js (M1v2.4-A) で再構成
//   - advanceTurn / forceSkipShot の遷移検証 (closeEnd ベース)
//   - 残数=0 で status='ended' 判定

test('state: 未知の mode を渡すと throw', () => {
    assertThrows(() => createInitialState({ mode: '99ball', seed: 1 }), 'unknown mode should throw');
});

// ---- 思考時間制御 (setThinkDeadline / isThinkTimeout) ----

test('state: setThinkDeadline(now=1000, dur=10000) → thinkDeadlineMs=11000、元不変', () => {
    const s0 = createInitialState({ mode: '2end', seed: 1, thinkDeadlineMs: 0 });
    const s1 = setThinkDeadline(s0, 1000, 10000);
    assertEqual(s1.thinkDeadlineMs, 11000, 'thinkDeadlineMs');
    assertEqual(s0.thinkDeadlineMs, 0, 's0 unchanged');
});

test('state: isThinkTimeout(deadline=11000, now=10500) → false', () => {
    const s0 = createInitialState({ mode: '2end', seed: 1, thinkDeadlineMs: 0 });
    const s1 = setThinkDeadline(s0, 1000, 10000);
    assertEqual(isThinkTimeout(s1, 10500), false, 'before deadline');
});

test('state: isThinkTimeout(deadline=11000, now=11001) → true', () => {
    const s0 = createInitialState({ mode: '2end', seed: 1, thinkDeadlineMs: 0 });
    const s1 = setThinkDeadline(s0, 1000, 10000);
    assertEqual(isThinkTimeout(s1, 11001), true, 'after deadline');
});

test('state: thinkDeadlineMs=0 (未設定) は常に false', () => {
    const s0 = createInitialState({ mode: '2end', seed: 1, thinkDeadlineMs: 0 });
    assertEqual(isThinkTimeout(s0, 0), false, 'now=0');
    assertEqual(isThinkTimeout(s0, 1e12), false, 'now huge');
});

// ---- M1v2.1-B: v2 lane dimensions / no gravity (v2 仕様: balls=[] のため ball.r 検証は削除) ----

test('createInitialState (v2 dimensions): bounds 0.5x1.5, params {e,mu} only, no G', () => {
    const s = createInitialState({ mode: '2end', seed: 1 });
    assertEqual(s.world.bounds.x, 0, 'bounds.x');
    assertEqual(s.world.bounds.y, 0, 'bounds.y');
    assertEqual(s.world.bounds.w, 0.5, 'bounds.w (v2 lane width)');
    assertEqual(s.world.bounds.h, 1.5, 'bounds.h (v2 lane height)');
    assertEqual(s.world.params.e, 0.85, 'params.e');
    assertEqual(s.world.params.mu, 0.3, 'params.mu');
    assertEqual(s.world.params.G, undefined, 'params.G must be undefined (gravity removed)');
});

// ---- M1v2.3-A+C: v2 順次投擲モデル (object 引数 / endIndex / hammerSide) ----

test('state: createInitialState (v2) は空 balls / endIndex=0 / stoneIndex=0 / endScores=[] / extraEndsUsed=0', () => {
    const s = createInitialState({ mode: '2end', seed: 1 });
    assertEqual(s.world.balls.length, 0, 'balls 空');
    assertEqual(s.endIndex, 0, 'endIndex');
    assertEqual(s.stoneIndex, 0, 'stoneIndex');
    assertEqual(Array.isArray(s.endScores), true, 'endScores is array');
    assertEqual(s.endScores.length, 0, 'endScores empty');
    assertEqual(s.extraEndsUsed, 0, 'extraEndsUsed');
    assertEqual(s.status, 'in-progress', 'status');
});

test('state: createInitialState は seed 同一なら hammerSide が決定論的', () => {
    const a = createInitialState({ mode: '2end', seed: 42 });
    const b = createInitialState({ mode: '2end', seed: 42 });
    assertEqual(a.hammerSide, b.hammerSide, 'hammerSide 一致');
    assertEqual(a.currentSide, 1 - a.hammerSide, 'currentSide = 1 - hammerSide');
});

test('state: mode 2end は totalStones=16 / mode 1end は totalStones=8', () => {
    const a = createInitialState({ mode: '2end', seed: 1 });
    const b = createInitialState({ mode: '1end', seed: 1 });
    assertEqual(a.totalStones, 16, '2end totalStones');
    assertEqual(b.totalStones, 8, '1end totalStones');
});