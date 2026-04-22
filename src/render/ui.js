// HUD (残数 / ターン / モード / 残り思考時間) と チュートリアル文言を Canvas に描画。
// 純粋ヘルパ (formatRemainingSeconds / formatScoreboard / TUTORIAL_TEXT) は export してテスト可能。

import { COLORS } from './canvas.js';

/**
 * 起動時に表示するチュートリアル文言 (1 行、100 文字以内 = G2 制約)。
 */
export const TUTORIAL_TEXT = '指で引いて離す。10個弾いて多く残った方が勝ち。';

// 残時間 (秒) 危険色しきい値
const DANGER_REMAINING_SEC = 3.0;

/**
 * 思考時間デッドラインまでの残時間を「{n.n}秒」形式で返す。
 * - thinkDeadlineMs === 0 (未設定) → ''
 * - 残 ≤ 0 → '0.0秒' (負はクランプ)
 * @param {number} thinkDeadlineMs
 * @param {number} nowMs
 * @returns {string}
 */
export function formatRemainingSeconds(thinkDeadlineMs, nowMs) {
    if (thinkDeadlineMs === 0) return '';
    const remainingMs = Math.max(0, thinkDeadlineMs - nowMs);
    return `${(remainingMs / 1000).toFixed(1)}秒`;
}

/**
 * スコアボード文字列を返す。例: 'ターン 3  P0:5 P1:4 (10球)'
 * @param {{turn:number, scores:[number,number], currentPlayer:0|1, mode:'10ball'|'6ball'}} state
 * @returns {string}
 */
export function formatScoreboard(state) {
    const modeLabel = state.mode === '6ball' ? '6球' : '10球';
    return `ターン ${state.turn}  P0:${state.scores[0]} P1:${state.scores[1]} (${modeLabel})`;
}

/**
 * HUD を Canvas 上端 / 下端に描画する。シェイクは適用しない (固定 UI)。
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} gameState
 * @param {{width:number, height:number, scale:number}} viewport
 * @param {number} nowMs
 */
export function renderHud(ctx, gameState, viewport, nowMs) {
    const { width, height } = viewport;
    ctx.save();

    // スコアボード (上端中央)
    ctx.fillStyle = COLORS.p0;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formatScoreboard(gameState), width / 2, 6);

    // 現在プレイヤー表示
    const turnLabel = `▼ P${gameState.currentPlayer} の番`;
    ctx.fillStyle = gameState.currentPlayer === 0 ? COLORS.p0 : COLORS.p1;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(turnLabel, width / 2, 28);

    // 残り思考時間 (右上、3 秒以下で危険色)
    const remainingText = formatRemainingSeconds(gameState.thinkDeadlineMs ?? 0, nowMs);
    if (remainingText) {
        const remainingSec = Math.max(0, (gameState.thinkDeadlineMs - nowMs) / 1000);
        ctx.fillStyle = remainingSec <= DANGER_REMAINING_SEC ? '#FF6B6B' : COLORS.p0;
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`残り ${remainingText}`, width - 8, 6);
    }

    // チュートリアル文言 (下端中央)
    ctx.fillStyle = COLORS.p0;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(TUTORIAL_TEXT, width / 2, height - 6);

    // 試合終了オーバーレイ
    if (gameState.status === 'ended') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, height / 2 - 40, width, 80);
        ctx.fillStyle = COLORS.p0;
        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const [s0, s1] = gameState.scores;
        const msg = s0 === s1 ? '引き分け' : `勝者: P${s0 > s1 ? 0 : 1}`;
        ctx.fillText(msg, width / 2, height / 2);
    }

    ctx.restore();
}

/**
 * ミュートボタンのラベル文字列を返す。
 * UI 部品 (HTML <button> 等) 側で表示更新に用いる純粋ヘルパ。
 * @param {boolean} muted
 * @returns {string}
 */
export function getMuteButtonLabel(muted) {
    return muted ? '🔇 音 OFF' : '🔊 音 ON';
}
