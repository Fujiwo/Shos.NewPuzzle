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

// ---------- K1: 物理粗化 (dt=1/30 / N_MAX=1000) ----------

test('preview: K1 mu=0.3 |v|=0.5 がデフォルト N_MAX 内に停止する (途中切れでない)', () => {
    // デフォルト dt/nMax を渡さず、K1 後の DEFAULT_DT=1/30 / DEFAULT_N_MAX=1000 で停止保証されること
    const path = computeTrajectory({ x: 0.25, y: 1.45 }, { vx: 0, vy: -0.5 }, { mu: 0.3 });
    if (path.length <= 1) throw new Error('進行していない');
    if (path.length >= 1000) throw new Error(`停止せず N_MAX(1000) 到達: length=${path.length}`);
    // 最終 2 点が極めて近い ⇒ ほぼ静止して停止打切された証拠
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    const lastStep = Math.hypot(last.x - prev.x, last.y - prev.y);
    // dt=1/30 / |v|=REST_EPS=1e-4 → 1 ステップ ≈ 1e-4/30 ≈ 3.3e-6 オーダー、4e-6 を上限に
    if (lastStep > 4e-6) throw new Error(`最終ステップが大きい (停止前打切?): step=${lastStep}`);
});

test('preview: K1 粗化 dt=1/30 と本番 dt=1/120 の停止位置ズレが ±5% 以内', () => {
    const start = { x: 0.25, y: 1.45 };
    const vel = { vx: 0, vy: -0.5 };
    const params = { mu: 0.3 };
    const pathCoarse = computeTrajectory(start, vel, params, undefined, { dt: 1 / 30, nMax: 1000 });
    const pathFine = computeTrajectory(start, vel, params, undefined, { dt: 1 / 120, nMax: 5000 });
    const lastC = pathCoarse[pathCoarse.length - 1];
    const lastF = pathFine[pathFine.length - 1];
    const totalDispF = Math.hypot(lastF.x - start.x, lastF.y - start.y);
    const diff = Math.hypot(lastC.x - lastF.x, lastC.y - lastF.y);
    const ratio = diff / totalDispF;
    if (ratio > 0.05) throw new Error(`停止位置ズレが 5% 超過: ratio=${ratio.toFixed(4)} (diff=${diff.toFixed(4)} / total=${totalDispF.toFixed(4)})`);
});

test('preview: K1 既存 bounds 外打切は新デフォルトでも動作する', () => {
    const bounds = { x: 0, y: 0, w: 0.5, h: 1.5 };
    // 外側 (左) に向かって強く投擲 → x<0 で打切 (新 dt=1/30 でも 1〜数ステップで脱出)
    const path = computeTrajectory({ x: 0.05, y: 1.45 }, { vx: -2.0, vy: 0 }, { mu: 0.3 }, bounds);
    const last = path[path.length - 1];
    if (last.x >= 0) throw new Error(`bounds 内で停止: last.x=${last.x}`);
    // 早期に bounds 打切できている (デフォルト N_MAX 1000 を消費していない)
    if (path.length >= 50) throw new Error(`bounds 打切が遅い: length=${path.length}`);
});
