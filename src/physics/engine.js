// 物理エンジン: 摩擦減衰・静止判定・シミュレーションループ。

import { resolveCircleCircle, resolveCircleWall } from './collision.js';

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

/**
 * @typedef {{ x:number, y:number, vx:number, vy:number, r:number, m:number }} Ball
 * @typedef {{ x:number, y:number, w:number, h:number }} Rect
 * @typedef {{ balls: Ball[], bounds: Rect, params: { e:number, mu:number } }} World
 */

/**
 * 1 frame シミュレーションを進める (in-place)。
 * 内部適用順: 位置更新 (semi-implicit Euler) → 円-円衝突 → 壁衝突 → 摩擦。
 * 同時 3 球衝突の反復解決は MVP スコープ外 (1 パス、残重なりは次 step で解消)。
 * @param {World} world
 * @param {number} dt
 * @param {{ onCollision?: (a:Ball, b:Ball) => void, onWallHit?: (b:Ball) => void }} [options]
 *   - onCollision: 円-円衝突解決成功時に (balls[i], balls[j]) で呼出 (effects/sfx 連携用)。
 *   - onWallHit: 壁衝突解決成功時に当該 ball で呼出。
 * @returns {World} 同じ world 参照
 */
export function step(world, dt, options = {}) {
    const { balls, bounds, params } = world;
    const onCollision = options.onCollision;
    const onWallHit = options.onWallHit;
    // 1) 位置更新 (更新後の速度を使う = semi-implicit Euler)
    for (const b of balls) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    }
    // 2) 円-円衝突 (1 パス)
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            const hit = resolveCircleCircle(balls[i], balls[j], params.e);
            if (hit && onCollision) onCollision(balls[i], balls[j]);
        }
    }
    // 3) 壁衝突 (押し戻し + 法線速度反転)
    for (const b of balls) {
        const hit = resolveCircleWall(b, bounds, params.e);
        if (hit && onWallHit) onWallHit(b);
    }
    // 4) 摩擦 (REST_EPS 丸めも含む)
    for (const b of balls) {
        applyFriction(b, params.mu, dt);
    }
    return world;
}

/**
 * 全球静止または timeoutMs 超過まで step を反復 (in-place)。
 * 無限ループ防止のため while 条件で elapsedMs < timeoutMs を先に評価する。
 * @param {World} world
 * @param {number} timeoutMs
 * @param {number} dt - 1 step あたりの秒
 * @param {{ onCollision?: (a:Ball, b:Ball) => void, onWallHit?: (b:Ball) => void }} [options]
 * @returns {World} 同じ world 参照
 */
export function runUntilRest(world, timeoutMs, dt, options) {
    const dtMs = dt * 1000;
    let elapsedMs = 0;
    while (elapsedMs < timeoutMs && !allAtRest(world.balls)) {
        step(world, dt, options);
        elapsedMs += dtMs;
    }
    return world;
}
