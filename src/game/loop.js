// ゲームループ純粋ヘルパ群 (v2 / M1v2.4-B)。DOM 非依存。
// v2 では state.currentSide ベースで currentSide 所有のストーンを 1 球追加する
// 順次投擲モデルを採用。simulateShot で物理シミュレート + FGZ 違反処理 + 場外除去を行う。

import { detectFgzViolation, isOutOfLane } from './fgz.js';
import { step, allAtRest } from '../physics/engine.js';

/**
 * @typedef {{x:number, y:number, vx:number, vy:number, r:number, m:number, owner:0|1}} Ball
 * @typedef {object} GameState
 */

const LAUNCH_Y = 1.45;
const BALL_RADIUS = 0.020;
const BALL_MASS = 1;

// state.world を shallow + balls を deep clone して新しい world を返す。
function cloneWorld(world) {
    return {
        balls: world.balls.map((b) => ({ ...b })),
        bounds: { ...world.bounds },
        params: { ...world.params },
    };
}

// owner で残数を集計 (v1 互換用)
function countByOwner(balls) {
    let p0 = 0, p1 = 0;
    for (const b of balls) {
        if (b.owner === 0) p0++;
        else if (b.owner === 1) p1++;
    }
    return [p0, p1];
}

/**
 * 場外球を world.balls から除去した新 world / 新 state を返す。純粋関数。
 * v2 では state.scores が無いため、scores 再計算は state.scores が定義されている
 * 場合のみ実施 (v1 互換ガード)。
 * @param {GameState} state
 * @param {(ball:Ball, bounds:{x:number,y:number,w:number,h:number}) => boolean} isOutOfBoundsFn
 * @returns {{ newState: GameState, removedBalls: Ball[] }}
 */
export function purgeOutOfBoundsBalls(state, isOutOfBoundsFn) {
    const newWorld = cloneWorld(state.world);
    const survivors = [];
    const removed = [];
    for (const b of newWorld.balls) {
        if (isOutOfBoundsFn(b, newWorld.bounds)) {
            removed.push(b);
        } else {
            survivors.push(b);
        }
    }
    newWorld.balls = survivors;
    const newState = { ...state, world: newWorld };
    if (state.scores !== undefined) {
        newState.scores = countByOwner(survivors);
    }
    return { newState, removedBalls: removed };
}

/**
 * shotInput を受けて、currentSide が投擲する v2 ストーン 1 球を world に追加した新 state を返す。
 * 純粋関数 (元 state は破壊しない)。物理シミュレーションは simulateShot で行う。
 * @param {GameState} state
 * @param {{ launchX:number, vx:number, vy:number }} shotInput
 * @returns {GameState}
 */
export function applyShot(state, shotInput) {
    const newWorld = cloneWorld(state.world);
    newWorld.balls.push({
        x: shotInput.launchX,
        y: LAUNCH_Y,
        vx: shotInput.vx,
        vy: shotInput.vy,
        r: BALL_RADIUS,
        m: BALL_MASS,
        owner: state.currentSide,
    });
    return { ...state, world: newWorld };
}

/**
 * applyShot 後の世界を静止まで物理シミュレーションし、FGZ 違反検出 + 場外球除去まで
 * 行った最終 state を返す (純粋: cloneWorld 経由)。
 * @param {GameState} state - applyShot 直後の state (currentSide 所有のストーンが追加済)
 * @param {{ stepDt?:number, maxSteps?:number }} [options]
 * @returns {{ newState: GameState, removedBalls: Ball[], fgzViolated: boolean }}
 */
export function simulateShot(state, options = {}) {
    const stepDt = options.stepDt ?? 1 / 60;
    const maxSteps = options.maxSteps ?? 600;

    // 投擲前のスナップショット (FGZ 違反判定用 / applyShot 直後 = 投擲球込み)
    const before = state.world.balls.map((b) => ({ ...b }));

    const simWorld = cloneWorld(state.world);
    for (let i = 0; i < maxSteps; i++) {
        step(simWorld, stepDt);
        if (allAtRest(simWorld.balls)) break;
    }

    // 場外球除去
    const survivors = [];
    const removed = [];
    for (const b of simWorld.balls) {
        if (isOutOfLane(b, simWorld.bounds)) {
            removed.push(b);
        } else {
            survivors.push(b);
        }
    }
    simWorld.balls = survivors;

    // FGZ 違反検出 (1-rock rule): 相手球のみで判定
    const violation = detectFgzViolation({
        before: before.filter((b) => b.owner !== state.currentSide),
        after: survivors.filter((b) => b.owner !== state.currentSide),
        stoneIndex: state.stoneIndex,
        currentSide: state.currentSide,
    });

    if (violation.violated) {
        // 相手ガード球を復元
        for (const g of violation.restoreList) {
            simWorld.balls.push({ ...g, vx: 0, vy: 0 });
        }
        // 違反した自分の最新投擲球を除去 (before に無い currentSide 球が今回投擲分)
        const beforeOwn = before.filter((b) => b.owner === state.currentSide);
        const myAfter = simWorld.balls.filter((b) => b.owner === state.currentSide);
        const candidatesToRemove = myAfter.filter((a) => !beforeOwn.some((bo) =>
            Math.hypot(a.x - bo.x, a.y - bo.y) < 0.001));
        for (const c of candidatesToRemove) {
            const idx = simWorld.balls.indexOf(c);
            if (idx !== -1) simWorld.balls.splice(idx, 1);
        }
    }

    return {
        newState: { ...state, world: simWorld },
        removedBalls: removed,
        fgzViolated: violation.violated,
    };
}
