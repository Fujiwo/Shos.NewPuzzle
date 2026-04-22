// preview.js (computeTrajectory) のユニットテスト。
// engine.js と同じ比率モデルで停止点が一致することを確認する。

import { test, assertEqual, assertClose } from '../assert.js';
import { computeTrajectory } from '../../src/render/preview.js';

const TOL = 1e-9;

test('preview: vel=0 は始点 1 点のみ返す', () => {
    const path = computeTrajectory({ x: 0.25, y: 1.45 }, { vx: 0, vy: 0 }, { mu: 0.3 });
    assertEqual(path.length, 1, '長さ 1');
    assertClose(path[0].x, 0.25, TOL, 'x');
    assertClose(path[0].y, 1.45, TOL, 'y');
});

test('preview: 摩擦により N ステップ以内に停止する', () => {
    // engine.js 比率モデル (mu=0.3, dt=1/120) では |v|=0.5 が REST_EPS=1e-4 に達するまで
    // ~3400 ステップ要する (物理的整合)。停止打切ロジック検証のため nMax を十分大きく取る。
    const nMax = 5000;
    const path = computeTrajectory({ x: 0.25, y: 1.45 }, { vx: 0, vy: -0.5 }, { mu: 0.3 }, undefined, { nMax });
    if (path.length <= 1) throw new Error('進行していない');
    if (path.length >= nMax) throw new Error('停止せず nMax 到達');
    // 最終点は始点より上方 (y が小さい)
    const last = path[path.length - 1];
    if (last.y >= 1.45) throw new Error(`進行していない: last.y=${last.y}`);
});

test('preview: bounds 外に出たら打切', () => {
    const bounds = { x: 0, y: 0, w: 0.5, h: 1.5 };
    // 外側 (左) に向かって投擲 → x<0 で打切
    const path = computeTrajectory({ x: 0.05, y: 1.45 }, { vx: -2.0, vy: 0 }, { mu: 0.3 }, bounds);
    const last = path[path.length - 1];
    if (last.x >= 0) throw new Error(`bounds 内で停止: last.x=${last.x}`);
    // bounds 打切は nMax より早い
    if (path.length >= 240) throw new Error('bounds 打切が機能していない');
});

test('preview: 始点を含む (パス[0] === pos)', () => {
    const pos = { x: 0.20, y: 1.40 };
    const path = computeTrajectory(pos, { vx: 0.1, vy: -0.1 }, { mu: 0.3 });
    assertClose(path[0].x, 0.20, TOL, 'path[0].x === pos.x');
    assertClose(path[0].y, 1.40, TOL, 'path[0].y === pos.y');
});
