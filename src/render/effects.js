// 描画エフェクトマネージャ。時刻ベースで波紋 / スコアポップアップ / シェイクのライフサイクルを管理。
// 純粋ロジック (DOM/Canvas 非依存) — Node の自動テストで実行可能。

/**
 * @typedef {{ x:number, y:number, startMs:number, durationMs:number }} Ripple
 * @typedef {{ x:number, y:number, text:string, startMs:number, durationMs:number }} Popup
 * @typedef {{ startMs:number, durationMs:number, magnitudePx:number, seed:number }} Shake
 */

// スコアポップアップの上昇量 (px、progress=1 で +Y へ this 値だけ移動)
const POPUP_RISE_PX = 20;

/**
 * 時刻 now がエントリの活動期間内 [start, start+duration) かを判定。
 * @param {{startMs:number, durationMs:number}} e
 * @param {number} now
 */
function isAlive(e, now) {
    return now >= e.startMs && now < e.startMs + e.durationMs;
}

/**
 * progress (0..1) を計算。範囲外は端でクランプ。
 * @param {{startMs:number, durationMs:number}} e
 * @param {number} now
 */
function progressOf(e, now) {
    if (e.durationMs <= 0) return 1;
    const p = (now - e.startMs) / e.durationMs;
    return Math.max(0, Math.min(1, p));
}

/**
 * エフェクトマネージャを生成する。状態はクロージャに閉じ込める。
 * @returns {object}
 */
export function createEffectManager() {
    /** @type {Ripple[]} */
    const ripples = [];
    /** @type {Popup[]} */
    const popups = [];
    /** @type {Shake|null} */
    let shake = null;

    return {
        /**
         * 衝突波紋を登録する。
         * @param {{x:number, y:number, startMs:number, durationMs?:number}} opts
         */
        spawnRipple({ x, y, startMs, durationMs = 200 }) {
            ripples.push({ x, y, startMs, durationMs });
        },
        /**
         * スコアポップアップを登録する。
         * @param {{x:number, y:number, text:string, startMs:number, durationMs?:number}} opts
         */
        spawnScorePopup({ x, y, text, startMs, durationMs = 600 }) {
            popups.push({ x, y, text, startMs, durationMs });
        },
        /**
         * 画面シェイクを発動する (常に最新で上書き)。
         * @param {{startMs:number, durationMs?:number, magnitudePx?:number}} opts
         */
        triggerShake({ startMs, durationMs = 50, magnitudePx = 2 }) {
            // seed は擬似乱数の起点 (描画時に正弦波で揺らす)。
            shake = { startMs, durationMs, magnitudePx, seed: startMs };
        },
        /**
         * 期限切れエフェクトを除去する。
         * @param {number} nowMs
         */
        tick(nowMs) {
            for (let i = ripples.length - 1; i >= 0; i--) {
                if (nowMs >= ripples[i].startMs + ripples[i].durationMs) ripples.splice(i, 1);
            }
            for (let i = popups.length - 1; i >= 0; i--) {
                if (nowMs >= popups[i].startMs + popups[i].durationMs) popups.splice(i, 1);
            }
            if (shake && nowMs >= shake.startMs + shake.durationMs) shake = null;
        },
        /**
         * アクティブな波紋を {x, y, progress, opacity} の配列で返す。
         * @param {number} nowMs
         */
        getActiveRipples(nowMs) {
            const out = [];
            for (const r of ripples) {
                if (!isAlive(r, nowMs)) continue;
                const progress = progressOf(r, nowMs);
                out.push({ x: r.x, y: r.y, progress, opacity: 1 - progress });
            }
            return out;
        },
        /**
         * アクティブなポップアップを {x, y, text, progress, opacity, dy} の配列で返す。
         * dy: 上昇量 (px)、progress に比例して 0 → POPUP_RISE_PX。
         * @param {number} nowMs
         */
        getActivePopups(nowMs) {
            const out = [];
            for (const p of popups) {
                if (!isAlive(p, nowMs)) continue;
                const progress = progressOf(p, nowMs);
                out.push({
                    x: p.x,
                    y: p.y,
                    text: p.text,
                    progress,
                    opacity: 1 - progress,
                    dy: progress * POPUP_RISE_PX,
                });
            }
            return out;
        },
        /**
         * 現在の画面シェイクオフセットを返す。非アクティブ時は {0, 0}。
         * 終了時刻 (start + duration) 以降は確実に {0, 0} を返す。
         * @param {number} nowMs
         */
        getShakeOffset(nowMs) {
            if (!shake) return { dx: 0, dy: 0 };
            if (nowMs < shake.startMs || nowMs >= shake.startMs + shake.durationMs) {
                return { dx: 0, dy: 0 };
            }
            // 振幅は終端に向けて減衰 (1 - progress)。位相は seed と now で擬似乱数化。
            // 極座標で扱うことで sqrt(dx^2+dy^2) <= magnitudePx を保証する。
            const progress = progressOf(shake, nowMs);
            const decay = 1 - progress;
            const angle = (shake.seed + nowMs) * 0.123;
            const radius = shake.magnitudePx * decay;
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            return { dx, dy };
        },
    };
}
