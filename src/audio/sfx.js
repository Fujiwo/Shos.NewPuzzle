// 効果音 (sfx) — 純粋イベントキュー層 + WebAudio adapter。
// 純粋層は AudioContext / DOM に触れず、Node でテスト可能。
// 「100ms カチッ音」等は OscillatorNode + GainNode で都度合成し、バイナリアセットを持たない (依存ゼロ志向)。

// ---- 音響パラメータ表 (内部定数) ---------------------------------------------
// 各イベントの音色定義。100ms 以内で減衰する短い envelope を前提。
const SOUND_PARAMS = Object.freeze({
    // 球-球衝突: 高めの三角波で「カチッ」
    click: Object.freeze({ freq: 1200, durationSec: 0.05, type: 'triangle', gain: 0.15 }),
    // 場外弾き出し: 低めの矩形波で「ポンッ」
    pop: Object.freeze({ freq: 600, durationSec: 0.12, type: 'square', gain: 0.20 }),
    // ターン切替: 中音域サイン波で「ピッ」
    turn: Object.freeze({ freq: 440, durationSec: 0.15, type: 'sine', gain: 0.12 }),
});

/**
 * 既知イベント名から音響パラメータを返す。未知名は throw。
 * @param {string} eventName
 * @returns {{freq:number, durationSec:number, type:'sine'|'triangle'|'square', gain:number}}
 */
export function getSoundParams(eventName) {
    const params = SOUND_PARAMS[eventName];
    if (!params) throw new Error(`Unknown sfx event: ${eventName}`);
    return params;
}

// ---- 純粋層: createSfxController -------------------------------------------

/**
 * sfx イベントの純粋キュー + ミュート状態を管理するコントローラ。
 * AudioContext には触れない。enqueue/drain だけで再生意図を表現する。
 *
 * @param {{initialMuted?: boolean}} [options]
 * @returns {{
 *   enqueue: (eventName: string, nowMs: number) => void,
 *   drain: () => Array<{event:string, atMs:number}>,
 *   setMuted: (muted: boolean) => void,
 *   isMuted: () => boolean,
 *   getQueueLength: () => number,
 * }}
 */
export function createSfxController(options = {}) {
    /** @type {Array<{event:string, atMs:number}>} */
    const queue = [];
    let muted = Boolean(options.initialMuted);

    return {
        // ミュート時は破棄。副作用予測性のため queue にも積まない。
        enqueue(eventName, nowMs) {
            if (muted) return;
            queue.push({ event: eventName, atMs: nowMs });
        },
        // 直前 enqueue されたイベントを返し、内部バッファを空にする。
        drain() {
            const out = queue.slice();
            queue.length = 0;
            return out;
        },
        setMuted(value) {
            muted = Boolean(value);
        },
        isMuted() {
            return muted;
        },
        getQueueLength() {
            return queue.length;
        },
    };
}

// ---- Browser adapter: createWebAudioSfx ------------------------------------

/**
 * 単発の oscillator 再生。attack=0、decay=durationSec の簡易 envelope。
 * @param {AudioContext} audioCtx
 * @param {{freq:number, durationSec:number, type:'sine'|'triangle'|'square', gain:number}} params
 */
export function playOne(audioCtx, params) {
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = params.type;
    osc.frequency.setValueAtTime(params.freq, t0);
    // attack=0 → t0 で gain ピーク、線形に 0 へ減衰
    gainNode.gain.setValueAtTime(params.gain, t0);
    gainNode.gain.linearRampToValueAtTime(0, t0 + params.durationSec);
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + params.durationSec);
}

/**
 * WebAudio adapter。controller のキューを定期的に flush して再生する。
 * AudioContext は autoplay policy 回避のため prime() 呼出時に遅延生成する。
 *
 * @param {ReturnType<typeof createSfxController>} controller
 * @param {() => AudioContext|null} [ctxFactory]
 */
export function createWebAudioSfx(controller, ctxFactory) {
    const factory = ctxFactory || (() => {
        const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
        return AudioContextCtor ? new AudioContextCtor() : null;
    });
    /** @type {AudioContext|null} */
    let audioCtx = null;

    return {
        // 必ずユーザー操作 (click 等) のハンドラ内で 1 回呼ぶこと。
        prime() {
            if (audioCtx) return;
            const ctx = factory();
            if (!ctx) return;
            audioCtx = ctx;
            // 一部ブラウザは初期 state='suspended' のため明示 resume。
            if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
                audioCtx.resume();
            }
        },
        isPrimed() {
            return audioCtx !== null;
        },
        // controller.drain() を呼んで取り出した全イベントを再生する。
        // prime() 前は静かに何もしない (autoplay policy 違反回避)。
        flush(_nowMs) {
            if (!audioCtx) {
                // prime されていない間も queue を成長させない (古いイベントが溜まり続けないように)。
                controller.drain();
                return;
            }
            const events = controller.drain();
            for (const ev of events) {
                let params;
                try {
                    params = getSoundParams(ev.event);
                } catch (_e) {
                    // 未知イベントはサイレントスキップ (純粋層は将来追加耐性で受理する)
                    continue;
                }
                playOne(audioCtx, params);
            }
        },
        destroy() {
            if (audioCtx && typeof audioCtx.close === 'function') {
                audioCtx.close();
            }
            audioCtx = null;
        },
    };
}
