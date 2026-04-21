// スナップショット再生成スクリプト (Node 実行)。
//
// 使い方:
//   node tests/tools/regen-snapshot.js
//
// 出力先: tests/snapshots/seed-42-20turn.js (上書き)
//
// 冪等性: 物理 core / fixtures が変わらなければ何度実行しても同じ出力になる。
// 出力後は必ず tests/unit/determinism.test.js を実行して PASS することを確認すること。
//
// INPUTS の再生成 (rng アルゴリズム変更時のみ):
//   const r = createRng(123);
//   for (let i = 0; i < 20; i++) {
//       const vx = (r() - 0.5) * 2;
//       const vy = (r() - 0.5) * 2;
//       inputs.push({ ballIndex: i % 6, vx, vy });
//   }
// 結果を tests/fixtures/scenario-seed-42.js の INPUTS にコピペする。

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
    buildInitialWorld,
    INPUTS,
    runOneTurn,
    SEED,
    PARAMS,
    BOUNDS,
} from '../fixtures/scenario-seed-42.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../snapshots/seed-42-20turn.js');

function generate() {
    const world = buildInitialWorld(SEED);
    for (const input of INPUTS) {
        runOneTurn(world, input);
    }
    return world.balls.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy }));
}

function formatBall(b) {
    // Number.prototype.toString のフル精度をそのまま利用 (浮動小数点の round-trip 保証)。
    return `        { x: ${b.x}, y: ${b.y}, vx: ${b.vx}, vy: ${b.vy} },`;
}

function buildSource(finalBalls) {
    const body = finalBalls.map(formatBall).join('\n');
    return `// 自動生成: tests/tools/regen-snapshot.js から再生成可能
// 手動編集禁止
export const SNAPSHOT = {
    seed: ${SEED},
    turns: ${INPUTS.length},
    params: { G: ${PARAMS.G}, e: ${PARAMS.e}, mu: ${PARAMS.mu} },
    bounds: { x: ${BOUNDS.x}, y: ${BOUNDS.y}, w: ${BOUNDS.w}, h: ${BOUNDS.h} },
    finalBalls: [
${body}
    ],
};
`;
}

const finalBalls = generate();
const source = buildSource(finalBalls);
writeFileSync(OUTPUT_PATH, source, 'utf8');
console.log(`Snapshot written: ${OUTPUT_PATH}`);
console.log(`finalBalls.length = ${finalBalls.length}`);
