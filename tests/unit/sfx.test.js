// 効果音 (sfx) の純粋ロジック層のユニットテスト。
// AudioContext を必要とする WebAudio adapter は Node では実行不能のためテスト対象外。
// (preview ページで目視・耳視確認する)

import { test } from '../assert.js';
import { assertEqual, assertThrows } from '../assert.js';
import { createSfxController, getSoundParams } from '../../src/audio/sfx.js';

// ---------- createSfxController: enqueue / drain ----------

test('sfx: enqueue("click", 100) → drain で [{event:"click", atMs:100}] を返す', () => {
    const c = createSfxController();
    c.enqueue('click', 100);
    const out = c.drain();
    assertEqual(out.length, 1);
    assertEqual(out[0].event, 'click');
    assertEqual(out[0].atMs, 100);
});

test('sfx: drain 直後に再 drain は空配列', () => {
    const c = createSfxController();
    c.enqueue('click', 100);
    c.drain();
    const second = c.drain();
    assertEqual(second.length, 0);
});

test('sfx: 連続 enqueue [click, pop, turn] を drain で順序保持', () => {
    const c = createSfxController();
    c.enqueue('click', 10);
    c.enqueue('pop', 20);
    c.enqueue('turn', 30);
    const out = c.drain();
    assertEqual(out.length, 3);
    assertEqual(out[0].event, 'click');
    assertEqual(out[1].event, 'pop');
    assertEqual(out[2].event, 'turn');
    assertEqual(out[0].atMs, 10);
    assertEqual(out[1].atMs, 20);
    assertEqual(out[2].atMs, 30);
});

// ---------- ミュート ----------

test('sfx: setMuted(true) 後の enqueue は queue に積まれない', () => {
    const c = createSfxController();
    c.setMuted(true);
    c.enqueue('click', 100);
    c.enqueue('pop', 200);
    assertEqual(c.getQueueLength(), 0);
    assertEqual(c.drain().length, 0);
});

test('sfx: setMuted(false) で enqueue 再開可能', () => {
    const c = createSfxController();
    c.setMuted(true);
    c.enqueue('click', 100);
    c.setMuted(false);
    c.enqueue('click', 200);
    assertEqual(c.getQueueLength(), 1);
    const out = c.drain();
    assertEqual(out.length, 1);
    assertEqual(out[0].atMs, 200);
});

test('sfx: isMuted() 初期値は false', () => {
    const c = createSfxController();
    assertEqual(c.isMuted(), false);
});

test('sfx: 未知イベント名でも enqueue は throw せず queue に積まれる (将来追加耐性)', () => {
    const c = createSfxController();
    c.enqueue('future-event', 50);
    assertEqual(c.getQueueLength(), 1);
    const out = c.drain();
    assertEqual(out[0].event, 'future-event');
});

// ---------- getSoundParams ----------

test('sfx: getSoundParams("click") → freq=1200 / type="triangle"', () => {
    const p = getSoundParams('click');
    assertEqual(p.freq, 1200);
    assertEqual(p.type, 'triangle');
});

test('sfx: getSoundParams("pop") → freq=600 / type="square"', () => {
    const p = getSoundParams('pop');
    assertEqual(p.freq, 600);
    assertEqual(p.type, 'square');
});

test('sfx: getSoundParams("turn") → freq=440 / type="sine"', () => {
    const p = getSoundParams('turn');
    assertEqual(p.freq, 440);
    assertEqual(p.type, 'sine');
});

test('sfx: getSoundParams("unknown") は throw', () => {
    assertThrows(() => getSoundParams('unknown'));
});

test('sfx: options.initialMuted=true で初期から mute', () => {
    const c = createSfxController({ initialMuted: true });
    assertEqual(c.isMuted(), true);
    c.enqueue('click', 100);
    assertEqual(c.getQueueLength(), 0);
});
