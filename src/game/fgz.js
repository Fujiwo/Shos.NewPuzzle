// FGZ (フリーガードゾーン) 判定 + 1-rock rule。
// FGZ 帯: ティーライン (y=HOUSE.cy=0.20) より下、ホッグライン (y=0.40) より上で、
// かつハウス外。

import { HOUSE, isInHouse } from './house.js';

export const HOG_LINE_Y = 0.40;
export const TEE_LINE_Y = HOUSE.cy; // 0.20

/**
 * ボールが FGZ 内にあるか。
 * @param {{x:number, y:number}} ball
 * @returns {boolean}
 */
export function isInFgz(ball) {
    if (ball.y <= TEE_LINE_Y) return false;
    if (ball.y >= HOG_LINE_Y) return false;
    return !isInHouse(ball);
}

/**
 * ボールがレーン bounds 矩形の外側にあるか。
 * @param {{x:number, y:number}} ball
 * @param {{x:number, y:number, w:number, h:number}} bounds
 * @returns {boolean}
 */
export function isOutOfLane(ball, bounds) {
    return ball.x < bounds.x || ball.x > bounds.x + bounds.w
        || ball.y < bounds.y || ball.y > bounds.y + bounds.h;
}

/**
 * 1-rock rule 違反を検出する。
 * 規則: stoneIndex===0 (各エンド最初の 1 投目) のとき、相手の FGZ 内ストーンが
 *       投擲後に消失していたら違反 → 元位置への復元リストを返す。
 * @param {{ before: Array, after: Array, stoneIndex: number, currentSide: 0|1 }} args
 * @returns {{ violated: boolean, restoreList: Array }}
 */
export function detectFgzViolation({ before, after, stoneIndex, currentSide }) {
    if (stoneIndex !== 0) return { violated: false, restoreList: [] };
    const opponent = 1 - currentSide;
    const beforeOpponentGuards = before.filter(b => b.owner === opponent && isInFgz(b));
    const restoreList = [];
    for (const g of beforeOpponentGuards) {
        const stillThere = after.some(a => a.owner === opponent
            && Math.hypot(a.x - g.x, a.y - g.y) < 0.005);
        if (!stillThere) restoreList.push(g);
    }
    return { violated: restoreList.length > 0, restoreList };
}
