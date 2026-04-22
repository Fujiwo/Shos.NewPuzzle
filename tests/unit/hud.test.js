// ui.js v2 拡張 (computePowerLevel / computeScorePreview / formatHammerLabel /
// renderSettingsPanel / TUTORIAL_TEXT_V2) のユニットテスト。
// 既存 v1 ヘルパ (formatScoreboard 等) は対象外。

import { test, assertEqual, assertClose } from '../assert.js';
import {
    computePowerLevel,
    computeScorePreview,
    formatHammerLabel,
    formatScoreboardV2,
    renderSettingsPanel,
    TUTORIAL_TEXT_V2,
} from '../../src/render/ui.js';

const TOL = 1e-9;

test('hud: computePowerLevel は pull/max の比率 (0..1 クランプ)', () => {
    assertClose(computePowerLevel(0, 0.20), 0, TOL, '0');
    assertClose(computePowerLevel(0.10, 0.20), 0.5, TOL, '中間');
    assertClose(computePowerLevel(0.20, 0.20), 1, TOL, '上限');
    assertClose(computePowerLevel(0.30, 0.20), 1, TOL, '超過クランプ');
    assertClose(computePowerLevel(-0.10, 0.20), 0, TOL, '負クランプ');
    assertClose(computePowerLevel(0.5, 0), 0, TOL, 'max=0 防御');
});

test('hud: computeScorePreview は scoreEnd と同等を返す', () => {
    // P0 がボタン至近 / P1 はハウス内に存在 (P0 1 点)
    const balls = [
        { x: 0.25, y: 0.20, owner: 0, r: 0.020 }, // ボタン中心
        { x: 0.25, y: 0.25, owner: 1, r: 0.020 }, // ハウス内 (距離 0.05)
    ];
    const p = computeScorePreview(balls);
    assertEqual(p.side, 0, 'side=0');
    assertEqual(p.points, 1, '1 点');
});

test('hud: computeScorePreview は誰もハウスにいなければ 0 点', () => {
    const balls = [
        { x: 0.05, y: 1.40, owner: 0, r: 0.020 },
    ];
    const p = computeScorePreview(balls);
    assertEqual(p.side, null, 'side=null');
    assertEqual(p.points, 0, '0 点');
});

test('hud: formatHammerLabel は side ラベル', () => {
    assertEqual(formatHammerLabel(0), 'P0', 'P0');
    assertEqual(formatHammerLabel(1), 'P1', 'P1');
    assertEqual(formatHammerLabel(null), '', 'null は空文字');
});

test('hud: TUTORIAL_TEXT_V2 は 100 文字以内 (G2 制約)', () => {
    if (TUTORIAL_TEXT_V2.length === 0) throw new Error('空文字列');
    if (TUTORIAL_TEXT_V2.length > 100) throw new Error(`100 文字超過: ${TUTORIAL_TEXT_V2.length}`);
});

// --- DOM-like モック (jsdom 不要) ---
function createElementMock(tag, doc) {
    return {
        tagName: tag.toUpperCase(),
        type: '',
        checked: false,
        textContent: '',
        className: '',
        children: [],
        listeners: {},
        ownerDocument: doc,
        firstChild: null,
        appendChild(child) {
            this.children.push(child);
            this.firstChild = this.children[0];
        },
        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx !== -1) this.children.splice(idx, 1);
            this.firstChild = this.children[0] ?? null;
        },
        addEventListener(type, fn) {
            (this.listeners[type] ??= []).push(fn);
        },
        dispatch(type) {
            for (const fn of this.listeners[type] ?? []) fn();
        },
    };
}

function createDocMock() {
    const doc = {};
    doc.createElement = (tag) => createElementMock(tag, doc);
    return doc;
}

test('hud: renderSettingsPanel は container に panel + checkbox を構築する', () => {
    const doc = createDocMock();
    const container = createElementMock('div', doc);
    const panel = renderSettingsPanel(container, { aimPreview: true }, () => {});
    assertEqual(container.children.length, 1, 'panel 1 件追加');
    assertEqual(container.children[0], panel, '戻り値 = 子要素');
    // panel > label > [checkbox, span]
    const label = panel.children[0];
    if (!label) throw new Error('label 未生成');
    assertEqual(label.children.length, 2, 'label に checkbox + span');
    const cb = label.children[0];
    assertEqual(cb.type, 'checkbox', 'checkbox type');
    assertEqual(cb.checked, true, '初期 checked=true');
});

test('hud: renderSettingsPanel checkbox 変更で onChange({aimPreview}) が呼ばれる', () => {
    const doc = createDocMock();
    const container = createElementMock('div', doc);
    let received = null;
    const panel = renderSettingsPanel(container, { aimPreview: true }, (patch) => { received = patch; });
    const cb = panel.children[0].children[0];
    cb.checked = false;
    cb.dispatch('change');
    if (!received) throw new Error('onChange 未呼出');
    assertEqual(received.aimPreview, false, 'patch.aimPreview=false');
});

test('hud: renderSettingsPanel 再呼出で container がクリアされる', () => {
    const doc = createDocMock();
    const container = createElementMock('div', doc);
    renderSettingsPanel(container, { aimPreview: true }, () => {});
    renderSettingsPanel(container, { aimPreview: false }, () => {});
    assertEqual(container.children.length, 1, '再呼出後も panel は 1 件のみ');
});
