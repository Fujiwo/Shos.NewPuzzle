// replay.js: 試合結果を URL クエリで共有するための encode / decode。
// フォーマット: 'v1.{modeChar}.{hammerSide}.{endScores joined by "-"}' を btoa し、
// '+/=' を '-_' に置換した URL-safe 短文字列。
//
// modeChar: '2end' → '2', '1end' → '1'
// 例: {mode:'2end', hammerSide:0, endScores:[3,1]}
//   → 'v1.2.0.3-1' → 'djEuMi4wLjMtMQ==' → 'djEuMi4wLjMtMQ'
//
// DOM-free 純粋関数。ブラウザの btoa/atob と Node の同名 API のみ使用。

const VERSION = 'v1';
const MODE_TO_CHAR = { '2end': '2', '1end': '1' };
const CHAR_TO_MODE = { '2': '2end', '1': '1end' };

/**
 * 試合結果を URL-safe な短文字列にエンコードする。
 * @param {{mode:'2end'|'1end', hammerSide:0|1, endScores:number[]}} result
 * @returns {string}
 */
export function encodeShareUrl(result) {
    const modeChar = MODE_TO_CHAR[result.mode];
    if (!modeChar) throw new Error(`unknown mode: ${result.mode}`);
    const scores = (result.endScores ?? []).map((n) => Math.max(0, Math.floor(n))).join('-');
    const raw = `${VERSION}.${modeChar}.${result.hammerSide}.${scores}`;
    return btoa(raw).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * encodeShareUrl の逆変換。形式不一致や復号エラーは null を返す。
 * @param {string} encoded
 * @returns {{mode:'2end'|'1end', hammerSide:0|1, endScores:number[]} | null}
 */
export function decodeShareUrl(encoded) {
    if (typeof encoded !== 'string' || encoded.length === 0) return null;
    let raw;
    try {
        const restored = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padded = restored + '='.repeat((4 - (restored.length % 4)) % 4);
        raw = atob(padded);
    } catch {
        return null;
    }
    const parts = raw.split('.');
    if (parts.length !== 4) return null;
    const [version, modeChar, hammerStr, scoresStr] = parts;
    if (version !== VERSION) return null;
    const mode = CHAR_TO_MODE[modeChar];
    if (!mode) return null;
    const hammerSide = Number(hammerStr);
    if (hammerSide !== 0 && hammerSide !== 1) return null;
    const endScores = scoresStr === '' ? [] : scoresStr.split('-').map((s) => {
        const n = Number(s);
        return Number.isFinite(n) && n >= 0 ? Math.floor(n) : NaN;
    });
    if (endScores.some((n) => Number.isNaN(n))) return null;
    return { mode, hammerSide, endScores };
}
