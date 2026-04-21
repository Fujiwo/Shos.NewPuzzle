// 最小限の assert API とテストハーネス。DOM 非依存に保ち Node でも実行可能。

export class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}

// 等価性チェック (===)
export function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        const detail = `expected ${String(expected)}, got ${String(actual)}`;
        throw new AssertionError(msg ? `${msg}: ${detail}` : detail);
    }
}

// 浮動小数点近似比較
export function assertClose(actual, expected, tol, msg) {
    const diff = Math.abs(actual - expected);
    if (!(diff <= tol)) {
        const detail = `|${actual} - ${expected}| = ${diff} > ${tol}`;
        throw new AssertionError(msg ? `${msg}: ${detail}` : detail);
    }
}

// fn が throw することを確認
export function assertThrows(fn, msg) {
    let threw = false;
    try {
        fn();
    } catch (_e) {
        threw = true;
    }
    if (!threw) {
        const detail = 'expected function to throw';
        throw new AssertionError(msg ? `${msg}: ${detail}` : detail);
    }
}

// テスト登録/実行ハーネス
const queue = [];

export function test(name, fn) {
    queue.push({ name, fn });
}

export async function runAll() {
    const results = [];
    // キューを破壊的に消費し、繰り返し呼び出しでも前回分が混ざらないようにする
    const items = queue.splice(0, queue.length);
    for (const { name, fn } of items) {
        try {
            await fn();
            results.push({ name, ok: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            results.push({ name, ok: false, error: message });
        }
    }
    return results;
}
