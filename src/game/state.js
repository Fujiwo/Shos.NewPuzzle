// ゲーム状態管理 (v2 カーリング型 / 順次投擲モデル)。
// 設計方針: 全公開関数は純粋 (入力 state を破壊せず新しい state を返す)。

import { createRng } from '../physics/rng.js';
import { scoreEnd } from './rules.js';

// ボード境界 (v2 カーリング型: 縦長レーン 0.5m x 1.5m)
const BOUNDS = Object.freeze({ x: 0, y: 0, w: 0.5, h: 1.5 });
// 物理パラメータ (v2: 反発と摩擦のみ / 引力廃止)
const PARAMS = Object.freeze({ e: 0.85, mu: 0.3 });
// ストーン半径 / 質量 (M1v2.5 で投擲時に使用予定 — 公開しておく)
export const BALL_RADIUS = 0.020;
export const BALL_MASS = 1;

const STONES_PER_END_PER_PLAYER = 4;
const ENDS_PER_MATCH = Object.freeze({ '2end': 2, '1end': 1 });

function cloneBall(b) {
    return { x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, m: b.m, owner: b.owner };
}

function cloneWorld(world) {
    return {
        balls: world.balls.map(cloneBall),
        bounds: { ...world.bounds },
        params: { ...world.params },
    };
}

export function cloneState(state) {
    return {
        ...state,
        world: cloneWorld(state.world),
        endScores: state.endScores.slice(),
    };
}

export function createInitialState({ mode = '2end', seed = 1, thinkDeadlineMs = 6000 } = {}) {
    if (!ENDS_PER_MATCH[mode]) {
        throw new Error(`Unknown mode: ${mode}`);
    }
    const rng = createRng(seed);
    const hammerSide = rng() < 0.5 ? 0 : 1;
    const ends = ENDS_PER_MATCH[mode];
    return {
        status: 'in-progress',
        mode,
        seed,
        thinkDeadlineMs,
        endIndex: 0,
        stoneIndex: 0,
        totalStones: ends * STONES_PER_END_PER_PLAYER * 2,
        hammerSide,
        currentSide: hammerSide === 0 ? 1 : 0,
        endScores: [],
        extraEndsUsed: 0,
        world: {
            balls: [],
            bounds: { ...BOUNDS },
            params: { ...PARAMS },
        },
    };
}

// TODO(M1v2.3-B): closeEnd ベースの実装に置換予定。現状は state を deep clone のみ。
export function advanceTurn(state) {
    return cloneState(state);
}

export function setThinkDeadline(state, nowMs, durationMs = 10000) {
    return {
        ...cloneState(state),
        thinkDeadlineMs: nowMs + durationMs,
    };
}

export function isThinkTimeout(state, nowMs) {
    return state.thinkDeadlineMs > 0 && nowMs > state.thinkDeadlineMs;
}

// TODO(M1v2.3-B): closeEnd ベースの実装に置換予定。現状は advanceTurn と同等。
export function forceSkipShot(state) {
    return advanceTurn(state);
}

/**
 * エンド終了処理。盤面から得点を計算し、次エンドへ遷移する。
 * - scoreEnd で得点側と点数を確定 → endScores に push
 * - 得点側がハンマー権を相手に譲る (ブランクエンド = side=null は保持)
 * - endIndex / stoneIndex をリセット、balls をクリア
 * - 全エンド消化 + 同点 + extraEndsUsed=0 ならエキストラエンド 1 回追加
 * - 全エンド消化 + (同点でない or extraEndsUsed>=1) なら status='ended'
 * @param {object} state
 * @returns {object} 新しい state (純粋: 元 state は破壊しない)
 */
export function closeEnd(state) {
    const next = cloneState(state);
    const result = scoreEnd(next.world.balls);
    next.endScores.push(result);

    // ハンマー権遷移: 得点側があれば非得点側へ / ブランクは保持
    if (result.side !== null) {
        next.hammerSide = 1 - result.side;
    }

    // 次エンドへ
    next.endIndex++;
    next.stoneIndex = 0;
    next.world.balls = [];
    next.currentSide = next.hammerSide === 0 ? 1 : 0;

    // 終了判定
    const totalEnds = ENDS_PER_MATCH[next.mode] + next.extraEndsUsed;
    if (next.endIndex >= totalEnds) {
        const totals = [0, 0];
        for (const es of next.endScores) {
            if (es.side !== null) totals[es.side] += es.points;
        }
        if (totals[0] === totals[1] && next.extraEndsUsed < 1) {
            next.extraEndsUsed++;
        } else {
            next.status = 'ended';
        }
    }
    return next;
}