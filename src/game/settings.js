// プレイヤー設定の localStorage 永続化。
// 既定値とのマージにより、後方互換性を保ちつつ新規キー追加に対応する。

const KEY = 'physicalOhajiki.v2.settings';

export const DEFAULT_SETTINGS = Object.freeze({
    aimPreview: true, // 軌道予測線の表示 (T キーでトグル)
});

function getDefaultStorage() {
    return typeof localStorage !== 'undefined' ? localStorage : null;
}

/**
 * localStorage から設定をロードする。未保存 / パース失敗時は DEFAULT_SETTINGS のコピーを返す。
 * 部分的に保存されたキーは DEFAULT_SETTINGS で穴埋めされる。
 * @param {Storage} [storage] - localStorage 互換オブジェクト (テスト時にモック注入)
 * @returns {{aimPreview:boolean}}
 */
export function loadSettings(storage = getDefaultStorage()) {
    if (!storage) return { ...DEFAULT_SETTINGS };
    try {
        const raw = storage.getItem(KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * 設定を localStorage に保存する。容量超過等は静かに失敗。
 * @param {{aimPreview?:boolean}} settings
 * @param {Storage} [storage]
 */
export function saveSettings(settings, storage = getDefaultStorage()) {
    if (!storage) return;
    try {
        storage.setItem(KEY, JSON.stringify(settings));
    } catch {
        // 容量超過などは無視
    }
}
