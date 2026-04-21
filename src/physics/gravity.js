/**
 * 全球ペアに万有引力による加速度を加算 (in-place)。
 * G=0 で即座に return (no-op)。
 * 距離下限 d ≥ a.r + b.r でクランプし発散を防止。
 * @param {Array<{x:number,y:number,vx:number,vy:number,r:number,m:number}>} balls
 * @param {number} G - 引力定数
 * @param {number} dt - 経過秒
 */
export function applyGravity(balls, G, dt) {
    if (G === 0) return;
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], b = balls[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dMin = a.r + b.r;
            const d = Math.max(Math.hypot(dx, dy), dMin); // 発散防止クランプ
            const f = G * a.m * b.m / (d * d);
            const ux = dx / d, uy = dy / d;
            a.vx += (f / a.m) * ux * dt; a.vy += (f / a.m) * uy * dt;
            b.vx -= (f / b.m) * ux * dt; b.vy -= (f / b.m) * uy * dt;
        }
    }
}
