// ハウス (4 同心円) の幾何ユーティリティ。
// HOUSE は冷凍定数として外部からも参照される。

export const HOUSE = Object.freeze({
    cx: 0.25,
    cy: 0.20,
    radii: Object.freeze([0.020, 0.040, 0.070, 0.100]),
});

/**
 * ボタン (中心 cx,cy) からの直線距離を返す。
 * @param {{x:number, y:number}} ball
 * @returns {number}
 */
export function distanceToButton(ball) {
    return Math.hypot(ball.x - HOUSE.cx, ball.y - HOUSE.cy);
}

/**
 * ボールが含まれる最小のリング index を返す (0 = ボタン / 3 = 12ft)。
 * ハウス外なら -1。
 * @param {{x:number, y:number}} ball
 * @returns {number} 0..3 or -1
 */
export function ringIndexAt(ball) {
    const d = distanceToButton(ball);
    for (let i = 0; i < HOUSE.radii.length; i++) {
        if (d <= HOUSE.radii[i]) return i;
    }
    return -1;
}

/**
 * ボールがハウス内 (最外リング以内) にあるか。
 * @param {{x:number, y:number}} ball
 * @returns {boolean}
 */
export function isInHouse(ball) {
    return ringIndexAt(ball) !== -1;
}
