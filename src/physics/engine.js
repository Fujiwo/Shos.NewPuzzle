// 物理エンジン: 摩擦減衰と静止判定。step / runUntilRest は M1.1.G で追加予定。

/**
 * 速度静止判定の閾値。|v| < REST_EPS で 0 とみなす。
 */
export const REST_EPS = 1e-4;

/**
 * 速度ベクトルに摩擦減衰を適用 (in-place)。
 * 比率モデル: v *= max(0, 1 - mu * dt)。減衰後ノルムが REST_EPS 未満なら 0 に丸める。
 * @param {{vx:number, vy:number}} ball
 * @param {number} mu - 摩擦係数 [0, ∞)
 * @param {number} dt - 経過秒
 */
export function applyFriction(ball, mu, dt) {
    const ratio = Math.max(0, 1 - mu * dt);
    ball.vx *= ratio;
    ball.vy *= ratio;
    if (Math.hypot(ball.vx, ball.vy) < REST_EPS) {
        ball.vx = 0;
        ball.vy = 0;
    }
}

/**
 * 全球が静止状態 (|v| < REST_EPS) かどうか。
 * @param {Array<{vx:number, vy:number}>} balls
 * @returns {boolean}
 */
export function allAtRest(balls) {
    for (const b of balls) {
        if (Math.hypot(b.vx, b.vy) >= REST_EPS) return false;
    }
    return true;
}
