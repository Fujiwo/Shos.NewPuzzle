// replay.js: 試合結果を URL クエリで共有するための encode/decode テスト。
// 純粋関数モジュール (DOM/btoa/atob は Node でも利用可)。

import { test, assertEqual } from '../assert.js';
import { encodeShareUrl, decodeShareUrl } from '../../src/game/replay.js';

test('replay: round-trip 2end / hammer P0 / [3,1]', () => {
    const original = { mode: '2end', hammerSide: 0, endScores: [3, 1] };
    const encoded = encodeShareUrl(original);
    if (typeof encoded !== 'string' || encoded.length === 0) throw new Error('encoded が空');
    const decoded = decodeShareUrl(encoded);
    assertEqual(decoded.mode, '2end', 'mode');
    assertEqual(decoded.hammerSide, 0, 'hammerSide');
    assertEqual(decoded.endScores.length, 2, 'endScores 長');
    assertEqual(decoded.endScores[0], 3, 'endScores[0]');
    assertEqual(decoded.endScores[1], 1, 'endScores[1]');
});

test('replay: round-trip 1end / hammer P1 / [2]', () => {
    const original = { mode: '1end', hammerSide: 1, endScores: [2] };
    const decoded = decodeShareUrl(encodeShareUrl(original));
    assertEqual(decoded.mode, '1end', 'mode');
    assertEqual(decoded.hammerSide, 1, 'hammerSide');
    assertEqual(decoded.endScores.length, 1, 'endScores 長');
    assertEqual(decoded.endScores[0], 2, 'endScores[0]');
});

test('replay: round-trip 2end / 両ブランク [0,0]', () => {
    const original = { mode: '2end', hammerSide: 0, endScores: [0, 0] };
    const decoded = decodeShareUrl(encodeShareUrl(original));
    assertEqual(decoded.endScores[0], 0, 'blank end 0');
    assertEqual(decoded.endScores[1], 0, 'blank end 1');
});

test('replay: round-trip 2end / 大量得点 [8,0]', () => {
    const original = { mode: '2end', hammerSide: 1, endScores: [8, 0] };
    const decoded = decodeShareUrl(encodeShareUrl(original));
    assertEqual(decoded.hammerSide, 1, 'hammerSide');
    assertEqual(decoded.endScores[0], 8, '大量得点');
    assertEqual(decoded.endScores[1], 0, 'ゼロ得点');
});

test('replay: decodeShareUrl は不正文字列に対し null を返す', () => {
    assertEqual(decodeShareUrl('!!!不正!!!'), null, '不正は null');
    assertEqual(decodeShareUrl(''), null, '空は null');
    assertEqual(decodeShareUrl('djk='), null, 'デコード結果が形式不一致なら null');
});

test('replay: encodeShareUrl は URL-safe (=, +, / を含まない)', () => {
    const encoded = encodeShareUrl({ mode: '2end', hammerSide: 0, endScores: [3, 1] });
    if (encoded.includes('=') || encoded.includes('+') || encoded.includes('/')) {
        throw new Error(`URL-unsafe 文字を含む: ${encoded}`);
    }
});
