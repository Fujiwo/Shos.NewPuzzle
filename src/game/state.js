// ゲーム状態管理: ターン制御 / 残数判定 / 試合長モード / 思考時間上限。
// 設計方針: 全公開関数は純粋 (入力 state を破壊せず新しい state を返す)。
// rules.js には依存しない (場外球の除去は呼び出し側責務)。

import { createRng } from '../physics/rng.js';

// ボード境界 (v2 カーリング型: 縦長レーン 0.5m x 1.5m)
const BOUNDS = Object.freeze({ x: 0, y: 0, w: 0.5, h: 1.5 });
// 物理パラメータ (v2: 反発と摩擦のみ / 引力廃止)
const PARAMS = Object.freeze({ e: 0.85, mu: 0.3 });
// ストーン半径 (v2: 0.020 m)
const BALL_RADIUS = 0.020;
const BALL_MASS = 1;
// 配置時のリジェクションサンプリング上限
const MAX_PLACEMENT_TRIES = 100;
// モード別の各 player 球数
const BALLS_PER_PLAYER = Object.freeze({ '10ball': 5, '6ball': 3 });

/**
 * 1 つの ball を deep copy する。
 * @param {object} b
 * @returns {object}
 */
function cloneBall(b) {
    return { x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, m: b.m, owner: b.owner };
}

/**
 * world を deep clone する (balls は新しい配列、各 ball もコピー)。
 * bounds / params は freeze 済みの共有参照なので shallow でよい。
 * @param {object} world
 * @returns {object}
 */
function cloneWorld(world) {
    return {
        balls: world.balls.map(cloneBall),
        bounds: { ...world.bounds },
        params: { ...world.params },
    };
}

/**
 * owner の自陣内 (P0: y < 0.5, P1: y >= 0.5) に重ならないよう球を 1 つ配置する。
 * リジェクションサンプリング失敗時は静的グリッド fallback で配置する。
 * @param {Array<object>} placed - 既に配置済みの球
 * @param {0|1} owner
 * @param {() => number} rng
 * @returns {{x:number, y:number}}
 */
function placeBall(placed, owner, rng) {
    const margin = BALL_RADIUS * 1.5;
    // 自陣の y 範囲 (P0 は [margin, 0.5 - margin), P1 は [0.5 + margin, 1 - margin))
    const yMin = owner === 0 ? margin : 0.5 + margin;
    const yMax = owner === 0 ? 0.5 - margin : 1 - margin;
    const xMin = margin;
    const xMax = 1 - margin;
    for (let t = 0; t < MAX_PLACEMENT_TRIES; t++) {
        const x = xMin + (xMax - xMin) * rng();
        const y = yMin + (yMax - yMin) * rng();
        let ok = true;
        for (const p of placed) {
            const dx = x - p.x;
            const dy = y - p.y;
            if (Math.hypot(dx, dy) < (BALL_RADIUS + p.r) + 1e-6) { ok = false; break; }
        }
        if (ok) return { x, y };
    }
    // fallback: 静的グリッド (列 6 / 行 自陣高さ÷2r) でまだ空いている格子点を探す
    const cols = 6;
    const cellW = (xMax - xMin) / cols;
    const cellH = 2 * BALL_RADIUS * 1.1;
    for (let row = 0; ; row++) {
        const y = yMin + cellH * (row + 0.5);
        if (y > yMax) break;
        for (let col = 0; col < cols; col++) {
            const x = xMin + cellW * (col + 0.5);
            let ok = true;
            for (const p of placed) {
                const dx = x - p.x;
                const dy = y - p.y;
                if (Math.hypot(dx, dy) < (BALL_RADIUS + p.r) + 1e-6) { ok = false; break; }
            }
            if (ok) return { x, y };
        }
    }
    // ここに来るのは極端な過密ケースのみ
    throw new Error('placeBall: no free position');
}

/**
 * mode と seed から初期ゲーム状態を生成する。
 * - 10ball: 各 player 5 球、合計 10 球
 * - 6ball:  各 player 3 球、合計 6 球
 * - 球は createRng(seed) で自陣内に重なりなく配置 (rejection sampling, 失敗時 grid fallback)
 * - turn=1, currentPlayer=0, status='placing', thinkDeadlineMs=0
 * @param {'10ball'|'6ball'} mode
 * @param {number} seed
 * @returns {object} GameState
 */
export function createInitialState(mode, seed) {
    const perPlayer = BALLS_PER_PLAYER[mode];
    if (perPlayer === undefined) {
        throw new Error(`createInitialState: unknown mode "${mode}"`);
    }
    const rng = createRng(seed);
    const balls = [];
    // P0 → P1 の順で交互ではなく、P0 全配置 → P1 全配置とすることで決定論性を簡素化
    for (let i = 0; i < perPlayer; i++) {
        const { x, y } = placeBall(balls, 0, rng);
        balls.push({ x, y, vx: 0, vy: 0, r: BALL_RADIUS, m: BALL_MASS, owner: 0 });
    }
    for (let i = 0; i < perPlayer; i++) {
        const { x, y } = placeBall(balls, 1, rng);
        balls.push({ x, y, vx: 0, vy: 0, r: BALL_RADIUS, m: BALL_MASS, owner: 1 });
    }
    return {
        world: { balls, bounds: { ...BOUNDS }, params: { ...PARAMS } },
        turn: 1,
        currentPlayer: 0,
        scores: [perPlayer, perPlayer],
        mode,
        thinkDeadlineMs: 0,
        status: 'placing',
    };
}

/**
 * world.balls を owner で集計し [P0 残数, P1 残数] を返す。
 * @param {Array<object>} balls
 * @returns {[number, number]}
 */
function countByOwner(balls) {
    let p0 = 0, p1 = 0;
    for (const b of balls) {
        if (b.owner === 0) p0++;
        else if (b.owner === 1) p1++;
    }
    return [p0, p1];
}

/**
 * 純粋関数: 次の手番に進める。
 * - turn を +1、currentPlayer を切替、status='placing'、thinkDeadlineMs=0
 * - scores は world.balls から再カウント (場外球の除去は呼び出し側責務)
 * - いずれかの scores が 0 なら status='ended' とし、turn / currentPlayer は変更しない
 *   (= 直前の手番が決定打を意味する)
 * @param {object} state
 * @returns {object} 新しい state
 */
export function advanceTurn(state) {
    const newWorld = cloneWorld(state.world);
    const scores = countByOwner(newWorld.balls);
    if (scores[0] === 0 || scores[1] === 0) {
        // 試合終了: turn / currentPlayer は維持
        return {
            world: newWorld,
            turn: state.turn,
            currentPlayer: state.currentPlayer,
            scores,
            mode: state.mode,
            thinkDeadlineMs: 0,
            status: 'ended',
        };
    }
    return {
        world: newWorld,
        turn: state.turn + 1,
        currentPlayer: /** @type {0|1} */ (1 - state.currentPlayer),
        scores,
        mode: state.mode,
        thinkDeadlineMs: 0,
        status: 'placing',
    };
}

/**
 * 思考時間デッドライン (絶対時刻 ms) を設定した新しい state を返す (純粋)。
 * 絶対時刻で持つ理由: performance.now() は経過時間ベースで単調増加なので、
 * 比較は now > deadline の単純な大小比較で済み、フレーム間の相対計算が不要。
 * @param {object} state
 * @param {number} nowMs - 現在時刻 (performance.now() 値)
 * @param {number} [durationMs=10000] - 思考許容時間 (デフォルト 10 秒)
 * @returns {object} 新しい state
 */
export function setThinkDeadline(state, nowMs, durationMs = 10000) {
    return {
        ...state,
        world: cloneWorld(state.world),
        scores: [state.scores[0], state.scores[1]],
        thinkDeadlineMs: nowMs + durationMs,
    };
}

/**
 * 現在時刻が思考デッドラインを越えたかを返す。
 * thinkDeadlineMs === 0 (未設定) の場合は常に false を返す。
 * @param {object} state
 * @param {number} nowMs
 * @returns {boolean}
 */
export function isThinkTimeout(state, nowMs) {
    return state.thinkDeadlineMs > 0 && nowMs > state.thinkDeadlineMs;
}

/**
 * タイムアウト時の強制スキップ: 初速 0 でショット扱い (世界変化なし) のため、
 * 物理シムを実行する必要がない。状態遷移のみを行う = advanceTurn と同等。
 * @param {object} state
 * @returns {object} 新しい state
 */
export function forceSkipShot(state) {
    return advanceTurn(state);
}
