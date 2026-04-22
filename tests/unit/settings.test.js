// settings.js (loadSettings / saveSettings) のユニットテスト。
// localStorage モックを差し込んで永続化と既定値マージを検証する。

import { test, assertEqual } from '../assert.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../../src/game/settings.js';

function createMockStorage() {
    const data = {};
    return {
        getItem: (k) => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: (k) => { delete data[k]; },
        clear: () => { for (const k of Object.keys(data)) delete data[k]; },
    };
}

test('settings: loadSettings は未保存時に DEFAULT_SETTINGS を返す', () => {
    const storage = createMockStorage();
    const s = loadSettings(storage);
    assertEqual(s.aimPreview, DEFAULT_SETTINGS.aimPreview, 'aimPreview 既定');
    // 返値は DEFAULT_SETTINGS 自身ではなく可変コピー
    s.aimPreview = !s.aimPreview;
    assertEqual(DEFAULT_SETTINGS.aimPreview, true, 'DEFAULT_SETTINGS は不変');
});

test('settings: saveSettings → loadSettings で値が永続化される', () => {
    const storage = createMockStorage();
    saveSettings({ aimPreview: false }, storage);
    const s = loadSettings(storage);
    assertEqual(s.aimPreview, false, 'aimPreview=false 復元');
});

test('settings: loadSettings は壊れた JSON を許容して DEFAULT を返す', () => {
    const storage = createMockStorage();
    storage.setItem('physicalOhajiki.v2.settings', '{invalid json');
    const s = loadSettings(storage);
    assertEqual(s.aimPreview, DEFAULT_SETTINGS.aimPreview, '壊れた JSON で DEFAULT');
});

test('settings: loadSettings は部分保存に対し DEFAULT で穴埋めする', () => {
    const storage = createMockStorage();
    storage.setItem('physicalOhajiki.v2.settings', '{}');
    const s = loadSettings(storage);
    assertEqual(s.aimPreview, DEFAULT_SETTINGS.aimPreview, '欠損キーは DEFAULT で補完');
});
