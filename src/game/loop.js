// M1.8 ゲームループ純粋ヘルパ群。DOM 非依存。main.js から使用される。
// 状態は破壊しない (deep clone) ことを保証する。

/**
 * @typedef {{x:number, y:number, vx:number, vy:number, r:number, m:number, owner:0|1}} Ball
 * @typedef {object} GameState
 */

// state.world を shallow + balls を deep clone して新しい world を返す。
function cloneWorld(world) {
    return {
        balls: world.balls.map((b) => ({ ...b })),
        bounds: { ...world.bounds },
        params: { ...world.params },
    };
}

// owner で残数を集計
function countByOwner(balls) {
    let p0 = 0, p1 = 0;
    for (const b of balls) {
        if (b.owner === 0) p0++;
        else if (b.owner === 1) p1++;
    }
    return [p0, p1];
}

/**
 * 場外球を world.balls から除去し、scores を再計算した新 world / 新 state を返す。
 * 純粋関数 (元 state は破壊しない)。
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
    const scores = countByOwner(survivors);
    return {
        newState: {
            ...state,
            world: newWorld,
            scores,
        },
        removedBalls: removed,
    };
}

/**
 * shotInput を受けて、origin に最も近い currentPlayer 所有球に velocity を付与した
 * 新 world / state を返す (status を 'placing' → 'simulating' に遷移)。
 * 純粋関数 (元 state は破壊しない)。
 *
 * 自陣球が皆無の場合 (ありえないが防御的): state をそのまま返し、status も変更しない。
 * 上位レイヤ (main / advanceTurn) が 'ended' を判定する想定。
 *
 * @param {GameState} state
 * @param {{ origin:{x:number,y:number}, velocity:{vx:number,vy:number} }} shotInput
 * @returns {GameState}
 */
export function applyShot(state, shotInput) {
    const ownBalls = state.world.balls.filter((b) => b.owner === state.currentPlayer);
    if (ownBalls.length === 0) return state; // エッジケース防御
    const newWorld = cloneWorld(state.world);
    // origin に最も近い currentPlayer 球を新 world から探す
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < newWorld.balls.length; i++) {
        const b = newWorld.balls[i];
        if (b.owner !== state.currentPlayer) continue;
        const d = Math.hypot(b.x - shotInput.origin.x, b.y - shotInput.origin.y);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    // bestIdx は 1 つ以上あることを上で保証
    newWorld.balls[bestIdx].vx = shotInput.velocity.vx;
    newWorld.balls[bestIdx].vy = shotInput.velocity.vy;
    return {
        ...state,
        world: newWorld,
        status: 'simulating',
    };
}
