// テストランナー基盤の動作確認用スモークテスト。

import { test, assertEqual, assertClose } from '../assert.js';
import { render, fitViewport } from '../../src/render/canvas.js';
import { createEffectManager } from '../../src/render/effects.js';
import { screenToWorldPoint } from '../../src/main.js';

test('smoke: assertEqual passes for 1+1===2', () => {
    assertEqual(1 + 1, 2);
});

test('smoke: assertEqual passes for string equality', () => {
    assertEqual('ohajiki', 'ohajiki');
});

test('smoke: assertClose tolerates float error', () => {
    assertClose(0.1 + 0.2, 0.3, 1e-9);
});

// 最小 Canvas mock (描画 API 呼出をカウントするだけ)
function createCtxMock() {
    const calls = [];
    const handler = {
        get(target, prop) {
            if (prop in target) return target[prop];
            // 任意のメソッドを noop として返す + 呼出記録
            return (...args) => { calls.push({ method: prop, args }); };
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
    };
    const target = { _calls: calls };
    return new Proxy(target, handler);
}

function createMinimalState() {
    return {
        world: {
            balls: [],
            bounds: { x: 0, y: 0, w: 0.5, h: 1.5 },
            params: { e: 0.85, mu: 0.3 },
        },
    };
}

test('smoke: render は aim 引数なしで例外を投げない (後方互換)', () => {
    const ctx = createCtxMock();
    const state = createMinimalState();
    const effects = createEffectManager();
    const vp = fitViewport({ width: 400, height: 600 });
    render(ctx, state, effects, vp, 0); // aim なし
    if (ctx._calls.length === 0) throw new Error('描画 API が呼ばれていない');
});

test('smoke: render は aim.enabled=true で軌道線描画を試みる (例外なし)', () => {
    const ctx = createCtxMock();
    const state = createMinimalState();
    const effects = createEffectManager();
    const vp = fitViewport({ width: 400, height: 600 });
    const aim = { enabled: true, launchX: 0.25, vx: 0, vy: -0.5 };
    render(ctx, state, effects, vp, 0, aim);
    const calledSetLineDash = ctx._calls.some((c) => c.method === 'setLineDash');
    if (!calledSetLineDash) throw new Error('drawTrajectory が呼ばれていない (setLineDash 不在)');
});

test('smoke: render は aim.enabled=false で軌道線を描画しない', () => {
    const ctx = createCtxMock();
    const state = createMinimalState();
    const effects = createEffectManager();
    const vp = fitViewport({ width: 400, height: 600 });
    const aim = { enabled: false, launchX: 0.25, vx: 0, vy: -0.5 };
    render(ctx, state, effects, vp, 0, aim);
    const calledSetLineDash = ctx._calls.some((c) => c.method === 'setLineDash');
    if (calledSetLineDash) throw new Error('aim.enabled=false なのに drawTrajectory が呼ばれた');
});

test('smoke: render の枠線は world.bounds の縦横比 (0.5x1.5) に一致する', () => {
    const ctx = createCtxMock();
    const state = createMinimalState();
    const effects = createEffectManager();
    const vp = fitViewport({ width: 400, height: 600 });
    render(ctx, state, effects, vp, 0);
    const strokeRectCall = ctx._calls.find((c) => c.method === 'strokeRect');
    if (!strokeRectCall) throw new Error('strokeRect が呼ばれていない');
    assertClose(strokeRectCall.args[0], 100, 1e-9);
    assertClose(strokeRectCall.args[1], 0, 1e-9);
    assertClose(strokeRectCall.args[2], 200, 1e-9);
    assertClose(strokeRectCall.args[3], 600, 1e-9);
});

test('smoke: screenToWorldPoint は bounds を反映して逆変換する', () => {
    const p = screenToWorldPoint(
        200,
        580,
        { width: 400, height: 600 },
        { x: 0, y: 0, w: 0.5, h: 1.5 }
    );
    assertClose(p.x, 0.25, 1e-9);
    assertClose(p.y, 1.45, 1e-9);
});
