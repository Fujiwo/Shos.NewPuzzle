// HUD (残数 / ターン / モード / 残り思考時間) と チュートリアル文言を Canvas に描画。
// 純粋ヘルパ (formatRemainingSeconds / formatScoreboard / TUTORIAL_TEXT) は export してテスト可能。

import { COLORS } from './canvas.js';
import { scoreEnd } from '../game/rules.js';

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

// --- v2 (カーリング型) 用ヘルパ ---

/**
 * v2 用チュートリアル文言 (1 行、100 文字以内 = G2 制約)。
 */
export const TUTORIAL_TEXT_V2 = '指で引いて離す。線を読んで的に近づけて勝つ。';

/**
 * パワーゲージ表示用の比率 [0, 1]。pullDist / maxPullDist をクランプ。
 * @param {number} pullDist - 現在のドラッグ距離 (世界座標単位)
 * @param {number} maxPullDist - クランプ上限
 * @returns {number} 0..1
 */
export function computePowerLevel(pullDist, maxPullDist) {
    if (maxPullDist <= 0) return 0;
    return Math.max(0, Math.min(1, pullDist / maxPullDist));
}

/**
 * 現在の盤面で「いまエンドが終わったら誰が何点取るか」を返す。
 * scoreEnd の薄いラッパ (UI からの直接呼出をテスト可能にする)。
 * @param {Array<{x:number,y:number,owner:0|1}>} balls
 * @returns {{side:0|1|null, points:number}}
 */
export function computeScorePreview(balls) {
    return scoreEnd(balls);
}

/**
 * ハンマー (後攻優位) を持つ side のラベル文字列を返す。
 * @param {0|1|null} side
 * @returns {string} 'P0' | 'P1' | ''
 */
export function formatHammerLabel(side) {
    if (side === 0) return 'P0';
    if (side === 1) return 'P1';
    return '';
}

/**
 * 設定パネル (チェックボックス) を container に DOM 構築する。
 * 既に panel が存在する場合は中身を再構築する (容易な再描画)。
 *
 * 副作用: container の子要素を全削除してから panel を追加。
 * @param {HTMLElement} container
 * @param {{aimPreview:boolean}} settings
 * @param {(patch:{aimPreview?:boolean}) => void} onChange
 * @returns {HTMLElement|null} 構築した panel ルート要素 (container null なら null)
 */
export function renderSettingsPanel(container, settings, onChange) {
    if (!container) return null;
    while (container.firstChild) container.removeChild(container.firstChild);

    const doc = container.ownerDocument;
    const panel = doc.createElement('div');
    panel.className = 'settings-panel';

    const label = doc.createElement('label');
    label.className = 'settings-row';

    const checkbox = doc.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!settings.aimPreview;
    checkbox.addEventListener('change', () => {
        onChange({ aimPreview: checkbox.checked });
    });

    const span = doc.createElement('span');
    span.textContent = '軌道予測線を表示 (T)';

    label.appendChild(checkbox);
    label.appendChild(span);
    panel.appendChild(label);
    container.appendChild(panel);
    return panel;
}

/**
 * 結果共有 UI (M2v2.1) を container に DOM 構築する。
 * - shareUrl が指定されたら「結果共有」ブロック (ボタン + 短縮 URL 表示) を描画
 * - importedResult が指定されたら「読み込んだ結果」ブロック (P0/P1 totals) を描画
 * - 両方 null の場合は container を空にする
 *
 * 副作用: container の子要素を全削除してから DOM を追加。
 * @param {HTMLElement|null} container
 * @param {{
 *   shareUrl: string|null,
 *   onCopy?: (url:string) => void,
 *   importedResult: {mode:'2end'|'1end', hammerSide:0|1, endScores:number[]}|null,
 * }} opts
 * @returns {HTMLElement|null}
 */
export function renderShareControls(container, opts) {
    if (!container) return null;
    while (container.firstChild) container.removeChild(container.firstChild);
    const { shareUrl, onCopy, importedResult } = opts ?? {};
    if (!shareUrl && !importedResult) return null;

    const doc = container.ownerDocument;
    const panel = doc.createElement('div');
    panel.className = 'share-panel';

    if (importedResult) {
        const banner = doc.createElement('div');
        banner.className = 'share-imported';
        const totals = importedResult.endScores;
        const p0 = totals[0] ?? 0;
        const p1 = totals[1] ?? 0;
        const ham = importedResult.hammerSide === 0 ? 'P0' : 'P1';
        banner.textContent = `共有された結果: P0 ${p0} - ${p1} P1 (${importedResult.mode} / ハンマー ${ham})`;
        panel.appendChild(banner);
    }

    if (shareUrl) {
        const row = doc.createElement('div');
        row.className = 'share-row';

        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'share-copy';
        button.textContent = '結果共有 URL コピー';
        button.addEventListener('click', () => {
            if (typeof onCopy === 'function') onCopy(shareUrl);
        });
        row.appendChild(button);

        const urlSpan = doc.createElement('span');
        urlSpan.className = 'share-url';
        urlSpan.textContent = shareUrl;
        row.appendChild(urlSpan);

        panel.appendChild(row);
    }
    container.appendChild(panel);
    return panel;
}

/**
 * v2 スコアボード文字列。例:
 *   in-progress: 'エンド 1/2  P0:0 P1:1  ハンマー: P0  投目 3/8'
 *   ended:       '試合終了  P0:2 P1:3'
 * @param {object} state - createInitialState 由来 v2 state
 * @returns {string}
 */
export function formatScoreboardV2(state) {
    const totals = [0, 0];
    for (const es of state.endScores ?? []) {
        if (es.side !== null) totals[es.side] += es.points;
    }
    if (state.status === 'ended') {
        return `試合終了  P0:${totals[0]} P1:${totals[1]}`;
    }
    const totalEnds = (state.mode === '1end' ? 1 : 2) + (state.extraEndsUsed ?? 0);
    const endNo = Math.min(totalEnds, (state.endIndex ?? 0) + 1);
    const stoneNo = (state.stoneIndex ?? 0) + 1;
    const ham = formatHammerLabel(state.hammerSide ?? null);
    return `エンド ${endNo}/${totalEnds}  P0:${totals[0]} P1:${totals[1]}  ハンマー: ${ham}  投目 ${Math.min(8, stoneNo)}/8`;
}

/**
 * v2 HUD を Canvas に描画。
 * - 上端中央: formatScoreboardV2
 * - 上端左:   現 side ラベル `▼ P0/P1 の番` (色分け)
 * - 上端右:   computeScorePreview による現在ハウス得点
 * - 下端中央: TUTORIAL_TEXT_V2
 * - status==='ended' で勝者オーバーレイ
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state
 * @param {{width:number, height:number, scale:number}} viewport
 * @param {number} _nowMs
 */
export function renderHudV2(ctx, state, viewport, _nowMs) {
    const { width, height } = viewport;
    ctx.save();

    // 上端中央: スコアボード
    ctx.fillStyle = COLORS.p0;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formatScoreboardV2(state), width / 2, 6);

    // 上端左: 現 side
    if (state.status !== 'ended') {
        const cs = state.currentSide ?? 0;
        ctx.fillStyle = cs === 0 ? COLORS.p0 : COLORS.p1;
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`▼ P${cs} の番`, 8, 6);
    }

    // 上端右: 現在のハウス得点プレビュー
    const balls = state.world?.balls ?? [];
    const sp = computeScorePreview(balls);
    if (sp.side !== null && sp.points > 0) {
        ctx.fillStyle = sp.side === 0 ? COLORS.p0 : COLORS.p1;
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`現状: P${sp.side} +${sp.points}`, width - 8, 6);
    }

    // 下端中央: チュートリアル
    ctx.fillStyle = COLORS.p0;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(TUTORIAL_TEXT_V2, width / 2, height - 6);

    // 終了オーバーレイ
    if (state.status === 'ended') {
        const totals = [0, 0];
        for (const es of state.endScores ?? []) {
            if (es.side !== null) totals[es.side] += es.points;
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, height / 2 - 40, width, 80);
        ctx.fillStyle = COLORS.p0;
        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const msg = totals[0] === totals[1]
            ? '引き分け'
            : `勝者: P${totals[0] > totals[1] ? 0 : 1}`;
        ctx.fillText(msg, width / 2, height / 2);
    }

    ctx.restore();
}
