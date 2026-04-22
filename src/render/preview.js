// 軌道予測線: 摩擦のみの自由飛行軌道を engine.js と同じ比率モデルで先読み。
// 他球との衝突 / 壁反射は無視 (MVP)。bounds 外に出た時点で打切。

import { REST_EPS } from '../physics/engine.js';

const DEFAULT_DT = 1 / 120;
const DEFAULT_N_MAX = 240; // 2 秒分

/**
 * 摩擦のみの自由飛行軌道を返す。engine.js と同じ比率モデル + REST_EPS 丸め。
 * @param {{x:number,y:number}} pos - 初期位置 (世界座標)
 * @param {{vx:number,vy:number}} vel - 初速
 * @param {{mu:number}} params - 物理パラメータ (mu のみ参照)
 * @param {{x:number,y:number,w:number,h:number}} [bounds] - レーン外で打切る境界 (省略可)
 * @param {{dt?:number, nMax?:number}} [options]
 * @returns {Array<{x:number, y:number}>} 始点を含む軌跡 (停止 or 打切まで)
 */
export function computeTrajectory(pos, vel, params, bounds, options = {}) {
    const dt = options.dt ?? DEFAULT_DT;
    const nMax = options.nMax ?? DEFAULT_N_MAX;
    const mu = params.mu;
    const ratio = Math.max(0, 1 - mu * dt);

    const path = [{ x: pos.x, y: pos.y }];
    let x = pos.x, y = pos.y;
    let vx = vel.vx, vy = vel.vy;

    // 初速ゼロなら 1 点だけ返す (engine.js の REST_EPS と整合)
    if (Math.hypot(vx, vy) < REST_EPS) return path;

    for (let i = 0; i < nMax; i++) {
        // 位置更新 (semi-implicit Euler 相当: 摩擦適用前の v で進める = engine.js と同順)
        x += vx * dt;
        y += vy * dt;
        // 摩擦
        vx *= ratio;
        vy *= ratio;
        if (Math.hypot(vx, vy) < REST_EPS) {
            vx = 0; vy = 0;
            path.push({ x, y });
            break;
        }
        // bounds 打切
        if (bounds && (x < bounds.x || x > bounds.x + bounds.w
            || y < bounds.y || y > bounds.y + bounds.h)) {
            path.push({ x, y });
            break;
        }
        path.push({ x, y });
    }
    return path;
}

/**
 * Path2D に軌跡を破線で描画 (描画側ヘルパ)。
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x:number,y:number}>} path
 * @param {(p:{x:number,y:number}) => {x:number, y:number}} toPx - 世界→画面座標変換
 */
export function drawTrajectory(ctx, path, toPx) {
    if (path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const p0 = toPx(path[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < path.length; i++) {
        const p = toPx(path[i]);
        ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
}
