// 円-円弾性衝突 (法線方向の運動量交換) の実装。DOM 非依存。

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, r: number, m: number, owner?: any }} Ball
 */

/**
 * 円-円弾性衝突 (法線方向の運動量交換)。a, b を in-place で更新。
 * @param {Ball} a
 * @param {Ball} b
 * @param {number} e - 反発係数 [0, 1]
 * @returns {boolean} 衝突解決を行った場合 true / 重なり無し or 離反中なら false
 */
export function resolveCircleCircle(a, b, e) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0 || dist >= a.r + b.r) return false;
    const nx = dx / dist, ny = dy / dist;
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return false; // 離反中
    const j = -(1 + e) * velAlongNormal / (1 / a.m + 1 / b.m);
    const ix = j * nx, iy = j * ny;
    a.vx -= ix / a.m; a.vy -= iy / a.m;
    b.vx += ix / b.m; b.vy += iy / b.m;
    // 重なり解消 (両球を半分ずつ押し戻す)
    const overlap = (a.r + b.r - dist) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;
    return true;
}

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} Rect
 */

/**
 * 円-壁反射: bounds の各辺に対し位置・速度を補正 (in-place)。
 * 法線方向のみ速度反転 × e、ball を bounds 内側へ押し戻す。
 * @param {Ball} ball
 * @param {Rect} bounds - 左上原点 / x..x+w, y..y+h が内側
 * @param {number} e - 反発係数 [0, 1]
 * @returns {boolean} 補正を行った場合 true
 */
export function resolveCircleWall(ball, bounds, e) {
    const left = bounds.x + ball.r;
    const right = bounds.x + bounds.w - ball.r;
    const top = bounds.y + ball.r;
    const bottom = bounds.y + bounds.h - ball.r;
    let hit = false;
    if (ball.x < left) {
        ball.x = left;
        if (ball.vx < 0) ball.vx = -ball.vx * e;
        hit = true;
    } else if (ball.x > right) {
        ball.x = right;
        if (ball.vx > 0) ball.vx = -ball.vx * e;
        hit = true;
    }
    if (ball.y < top) {
        ball.y = top;
        if (ball.vy < 0) ball.vy = -ball.vy * e;
        hit = true;
    } else if (ball.y > bottom) {
        ball.y = bottom;
        if (ball.vy > 0) ball.vy = -ball.vy * e;
        hit = true;
    }
    return hit;
}
