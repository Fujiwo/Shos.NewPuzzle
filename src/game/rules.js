// カーリング型の得点ロジック。
// scoreEnd: エンド終了時の盤面を評価し、得点側と得点を返す。
// evaluateWinner: 全エンドの得点合計から勝者を決定する。

import { distanceToButton, isInHouse } from './house.js';

/**
 * 1 エンド分のスコアを計算する。
 * 規則:
 *   1. ハウス内のストーンのみ評価対象
 *   2. 双方ハウス内 0 個 → 0 点 (side=null)
 *   3. 双方ハウス内あり → 「相手側の最近接ストーンより内側にある自陣ストーン数」=得点
 * @param {Array<{x:number, y:number, owner:0|1}>} balls
 * @returns {{ side: 0|1|null, points: number }}
 */
export function scoreEnd(balls) {
    const inHouse = balls.filter(isInHouse);
    if (inHouse.length === 0) return { side: null, points: 0 };

    const closestByOwner = [Infinity, Infinity];
    for (const b of inHouse) {
        const d = distanceToButton(b);
        if (d < closestByOwner[b.owner]) closestByOwner[b.owner] = d;
    }
    if (!isFinite(closestByOwner[0]) && !isFinite(closestByOwner[1])) {
        return { side: null, points: 0 };
    }
    const winnerSide = closestByOwner[0] < closestByOwner[1] ? 0 : 1;
    const opponentClosest = closestByOwner[1 - winnerSide];
    let points = 0;
    for (const b of inHouse) {
        if (b.owner !== winnerSide) continue;
        if (distanceToButton(b) < opponentClosest) points++;
    }
    return { side: winnerSide, points };
}

/**
 * 試合勝者を判定する。
 * @param {object} state - { status, endScores: Array<{side,points}>, extraEndsUsed }
 * @returns {{ winner: 0|1|null, totals: [number, number], reason: string }}
 */
export function evaluateWinner(state) {
    if (state.status !== 'ended') {
        return { winner: null, totals: [0, 0], reason: 'in-progress' };
    }
    const totals = [0, 0];
    for (const es of state.endScores) {
        if (es.side !== null) totals[es.side] += es.points;
    }
    if (totals[0] > totals[1]) return { winner: 0, totals, reason: 'higher-score' };
    if (totals[1] > totals[0]) return { winner: 1, totals, reason: 'higher-score' };
    return { winner: null, totals, reason: 'draw' };
}
