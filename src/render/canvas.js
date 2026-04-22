// Canvas 2D レンダラ: world / state / effects → ピクセル描画。
// 副作用関数 render() はテスト不能だが、純粋ヘルパは export してテスト可能にする。

// 確定配色 (M0.4 / Ideas §5.2)
export const COLORS = Object.freeze({
    table: '#1A2E1A',     // 背景 (ダークグリーン)
    bounds: '#2D1B0E',    // 枠線 (ダークウッド)
    p0: '#F5E663',        // P0 = ライトイエロー (無地)
    p1: '#F58FA0',        // P1 = ライトピンク (中央リング = 二重符号化)
    ripple: '#F5E663',    // 波紋色
    popup: '#F5E663',     // スコア +N 文字色
});

/**
 * 世界座標 (0..1) を画面ピクセル座標に変換する純粋関数。
 * scale は world 1.0 単位を pixel に換算する係数。viewport 内中央寄せ。
 * @param {{x:number, y:number}} point
 * @param {{width:number, height:number, scale:number}} viewport
 * @returns {{x:number, y:number}}
 */
export function worldToScreen(point, viewport) {
    const offsetX = (viewport.width - viewport.scale) / 2;
    const offsetY = (viewport.height - viewport.scale) / 2;
    return {
        x: point.x * viewport.scale + offsetX,
        y: point.y * viewport.scale + offsetY,
    };
}

/**
 * ボールの owner から描画スタイル (色 + リング有無) を返す純粋関数。
 * 二重符号化: owner=0 は無地、owner=1 はリングありで色覚多様性に配慮。
 * @param {{owner:0|1}} ball
 * @returns {{fillColor:string, hasRing:boolean}}
 */
export function getBallStyle(ball) {
    if (ball.owner === 0) return { fillColor: COLORS.p0, hasRing: false };
    return { fillColor: COLORS.p1, hasRing: true };
}

/**
 * viewport から world スケールを推定するヘルパ。
 * @param {{width:number, height:number}} v
 */
export function fitViewport(v) {
    return { width: v.width, height: v.height, scale: Math.min(v.width, v.height) };
}

/**
 * world / state / effects を Canvas 2D へ描画する。
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} gameState - { world, ... }
 * @param {object} effects - createEffectManager() の戻り値
 * @param {{width:number, height:number, scale:number}} viewport
 * @param {number} nowMs
 */
export function render(ctx, gameState, effects, viewport, nowMs) {
    const { width, height, scale } = viewport;
    const offsetX = (width - scale) / 2;
    const offsetY = (height - scale) / 2;
    const shake = effects.getShakeOffset(nowMs);

    // 背景クリア
    ctx.save();
    ctx.fillStyle = COLORS.table;
    ctx.fillRect(0, 0, width, height);

    // シェイクは盤面 + 球のみに適用 (HUD は固定)
    ctx.translate(shake.dx, shake.dy);

    // 枠線 (bounds 1.0×1.0 を viewport にフィット)
    ctx.strokeStyle = COLORS.bounds;
    ctx.lineWidth = 4;
    ctx.strokeRect(offsetX, offsetY, scale, scale);

    // 球
    const balls = gameState.world?.balls ?? [];
    for (const b of balls) {
        const p = worldToScreen({ x: b.x, y: b.y }, viewport);
        const r = b.r * scale;
        const style = getBallStyle(b);
        ctx.fillStyle = style.fillColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (style.hasRing) {
            // 中央リング (二重符号化): 内側に細い輪を描く
            ctx.strokeStyle = COLORS.bounds;
            ctx.lineWidth = Math.max(1.5, r * 0.18);
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // 波紋 (リング状フェード)
    for (const rp of effects.getActiveRipples(nowMs)) {
        const p = worldToScreen({ x: rp.x, y: rp.y }, viewport);
        const baseR = 0.025 * scale; // BALL_RADIUS と同じ基準
        const radius = baseR * (1 + rp.progress * 2.5);
        ctx.strokeStyle = COLORS.ripple;
        ctx.globalAlpha = rp.opacity;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // スコアポップアップ (+N が上昇しながらフェード)
    for (const pop of effects.getActivePopups(nowMs)) {
        const p = worldToScreen({ x: pop.x, y: pop.y }, viewport);
        ctx.fillStyle = COLORS.popup;
        ctx.globalAlpha = pop.opacity;
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pop.text, p.x, p.y - pop.dy);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
}
