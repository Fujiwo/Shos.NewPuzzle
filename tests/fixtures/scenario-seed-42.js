// 決定論性テスト用の共通シナリオ。
// determinism.test.js / regen-snapshot.js の双方から import される。
//
// - buildInitialWorld(): seed=42 で 6 球の初期配置を生成
// - INPUTS: 20 ターン分の入力 (rng(123) で事前生成した固定数値リテラル)
//   テスト本体は rng 実装に依存させない (rng 仕様変更で snapshot が壊れないため)。
// - runOneTurn(world, input): 1 球に速度を与えて静止まで進める

import { createRng } from '../../src/physics/rng.js';
import { runUntilRest } from '../../src/physics/engine.js';

export const SEED = 42;
export const BALL_COUNT = 6;
export const BALL_RADIUS = 0.012;
export const BALL_MASS = 1;
export const BOUNDS = { x: 0, y: 0, w: 1.0, h: 1.0 };
export const PARAMS = { G: 1e-3, e: 0.85, mu: 0.3 };

/**
 * seed から 6 球の初期 World を構築する。
 * 位置は createRng(seed) で生成: x = 0.1 + 0.8 * rng(), y = 0.1 + 0.8 * rng()
 * @param {number} [seed=SEED]
 * @returns {{ balls: Array, bounds: object, params: object }}
 */
export function buildInitialWorld(seed = SEED) {
    const rng = createRng(seed);
    const balls = [];
    for (let i = 0; i < BALL_COUNT; i++) {
        const x = 0.1 + 0.8 * rng();
        const y = 0.1 + 0.8 * rng();
        balls.push({
            x, y,
            vx: 0, vy: 0,
            r: BALL_RADIUS,
            m: BALL_MASS,
            owner: i % 2,
        });
    }
    return {
        balls,
        bounds: { ...BOUNDS },
        params: { ...PARAMS },
    };
}

/**
 * 1 ターン: 指定球に速度を与えて静止まで進める。
 * @param {object} world
 * @param {{ ballIndex:number, vx:number, vy:number }} input
 * @param {number} [dt=1/60]
 * @param {number} [timeoutMs=4000]
 */
export function runOneTurn(world, input, dt = 1 / 60, timeoutMs = 4000) {
    const ball = world.balls[input.ballIndex];
    ball.vx = input.vx;
    ball.vy = input.vy;
    runUntilRest(world, timeoutMs, dt);
}

// 20 ターン分の入力。createRng(123) で事前生成した数値を埋め込み済み。
// 再生成は scripts/regen-inputs を作るか、tests/tools/regen-snapshot.js のコメント参照。
export const INPUTS = [
    { ballIndex: 0, vx: 0.5745032466948032, vy: -0.6429128688760102 },
    { ballIndex: 1, vx: -0.009368971921503544, vy: -0.5372760747559369 },
    { ballIndex: 2, vx: -0.24841679586097598, vy: 0.666707688011229 },
    { ballIndex: 3, vx: 0.7273611049167812, vy: 0.8581872517243028 },
    { ballIndex: 4, vx: 0.5685845748521388, vy: -0.18181324051693082 },
    { ballIndex: 5, vx: 0.22884281305596232, vy: 0.9814904681406915 },
    { ballIndex: 0, vx: -0.6231280108913779, vy: -0.9785515158437192 },
    { ballIndex: 1, vx: 0.18161877058446407, vy: -0.2891496359370649 },
    { ballIndex: 2, vx: 0.04216398624703288, vy: 0.17950177798047662 },
    { ballIndex: 3, vx: -0.5784947592765093, vy: 0.016391384415328503 },
    { ballIndex: 4, vx: 0.3618882745504379, vy: -0.6942540341988206 },
    { ballIndex: 5, vx: -0.9183493368327618, vy: -0.774916710332036 },
    { ballIndex: 0, vx: 0.059971120208501816, vy: 0.6395712988451123 },
    { ballIndex: 1, vx: -0.4761072061955929, vy: 0.13493454596027732 },
    { ballIndex: 2, vx: 0.8559332564473152, vy: 0.4165959469974041 },
    { ballIndex: 3, vx: 0.9062819392420352, vy: -0.8415724756196141 },
    { ballIndex: 4, vx: 0.20131185743957758, vy: -0.17459496716037393 },
    { ballIndex: 5, vx: 0.630551646463573, vy: -0.06385748879984021 },
    { ballIndex: 0, vx: 0.0746268448419869, vy: -0.6050891019403934 },
    { ballIndex: 1, vx: 0.8569551464170218, vy: 0.17212070943787694 },
];
