// 勝敗・場外判定ルール。state.js には依存しない (片方向: rules→state は型コメントのみ)。
//
// 仕様 (Plans §4.1):
// - isOutOfBounds: 球の中心が bounds 矩形の縁を越えた瞬間に true。半径は考慮しない。
// - evaluateWinner:
//     status !== 'ended'              → { winner: null, reason: 'in-progress' }
//     scores 大小決着                 → { winner: 0|1, reason: 'remaining-count' }
//     同数 → タイブレーク (中心距離) → { winner: 0|1, reason: 'tiebreak-center-distance' }
//     完全一致 (極小確率)             → { winner: null, reason: 'draw' }

/**
 * 球の中心が bounds の縁を越えたかどうかを返す。
 * @param {{x:number, y:number}} ball
 * @param {{x:number, y:number, w:number, h:number}} bounds
 * @returns {boolean}
 */
export function isOutOfBounds(ball, bounds) {
    return ball.x < bounds.x
        || ball.x > bounds.x + bounds.w
        || ball.y < bounds.y
        || ball.y > bounds.y + bounds.h;
}

/**
 * player の生存球の中心 (0.5, 0.5) からの距離合計を計算する。
 * bounds の中心を center として汎用化。
 * @param {Array<{x:number, y:number, owner:0|1}>} balls
 * @param {0|1} player
 * @param {{x:number, y:number, w:number, h:number}} bounds
 * @returns {number}
 */
function totalCenterDistance(balls, player, bounds) {
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    let sum = 0;
    for (const b of balls) {
        if (b.owner !== player) continue;
        sum += Math.hypot(b.x - cx, b.y - cy);
    }
    return sum;
}

/**
 * 勝者を判定する。
 * @param {object} state - GameState
 * @returns {{winner: 0|1|null, reason: string}}
 */
export function evaluateWinner(state) {
    if (state.status !== 'ended') {
        return { winner: null, reason: 'in-progress' };
    }
    const [s0, s1] = state.scores;
    if (s0 > s1) return { winner: 0, reason: 'remaining-count' };
    if (s1 > s0) return { winner: 1, reason: 'remaining-count' };
    // 同数 → タイブレーク (場の中心からの距離合計が小さい側を勝ち)
    const d0 = totalCenterDistance(state.world.balls, 0, state.world.bounds);
    const d1 = totalCenterDistance(state.world.balls, 1, state.world.bounds);
    if (d0 < d1) return { winner: 0, reason: 'tiebreak-center-distance' };
    if (d1 < d0) return { winner: 1, reason: 'tiebreak-center-distance' };
    return { winner: null, reason: 'draw' };
}
