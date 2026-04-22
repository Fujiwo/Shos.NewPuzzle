// 入力系: スリングショット (引いて離す) 操作の状態機械と DOM アダプタ。
// 物理エンジンと同じ世界座標系 [0,1]^2 を前提とし、純粋ロジック層 (createPointerController)
// は DOM 非依存で Node テストから直接駆動できる。

/**
 * @typedef {{x:number, y:number}} Point
 * @typedef {{vx:number, vy:number}} Velocity
 * @typedef {{x0:number, y0:number, x1:number, y1:number}} Rect
 *
 * @typedef {Object} ControllerOptions
 * @property {Rect} ownSideRect - プレイヤー自陣矩形。pointerdown がこの矩形外なら無視。
 * @property {number} [strengthCoef=4.0] - ドラッグ長 → 初速 (m/sec) の換算係数。
 * @property {number} [maxDragDistance=0.3] - ドラッグ長の上限 (世界単位)。超えるとクランプ。
 * @property {(p: Point) => void} [onPlace] - 自陣内 pointerdown 時に発射点確定通知。
 * @property {(info: {origin:Point, current:Point, velocity:Velocity}) => void} [onAimAdjust]
 *   - aiming 中の pointermove 通知。velocity はクランプ済み。
 * @property {(info: {origin:Point, velocity:Velocity}) => void} [onShoot]
 *   - pointerup で発射確定通知。velocity はクランプ済み。
 * @property {() => void} [onCancel] - キャンセル (pointercancel / multi-touch / 明示) 通知。
 */

const DEFAULT_STRENGTH_COEF = 4.0;
const DEFAULT_MAX_DRAG = 0.3;

// v2 placing FSM 用: 自陣 lane 内の launch 位置 X 範囲 (世界座標)。
const LAUNCH_X_MIN = 0.05;
const LAUNCH_X_MAX = 0.45;
const LAUNCH_Y = 1.45;

// 矩形内判定 (境界含む)
function isInsideRect(p, r) {
    return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
}

function clampLaunchX(x) {
    return Math.max(LAUNCH_X_MIN, Math.min(LAUNCH_X_MAX, x));
}

// drag = origin - current → velocity = drag * strengthCoef、|drag| <= maxDragDistance にクランプ。
// 引いた方向と逆向きに飛ばす (= スリングショット)。
function computeVelocity(origin, current, strengthCoef, maxDragDistance) {
    let dx = origin.x - current.x;
    let dy = origin.y - current.y;
    const len = Math.hypot(dx, dy);
    if (len > maxDragDistance && len > 0) {
        const scale = maxDragDistance / len;
        dx *= scale;
        dy *= scale;
    }
    return { vx: dx * strengthCoef, vy: dy * strengthCoef };
}

/**
 * スリングショット FSM を生成する。DOM 非依存。
 * 状態遷移:
 *   idle -- handleDown(自陣内) → aiming   (onPlace)
 *   idle -- handleDown(自陣外) → idle     (no-op)
 *   aiming -- handleMove        → aiming  (onAimAdjust)
 *   aiming -- handleUp          → idle    (onShoot)
 *   aiming -- handleCancel      → idle    (onCancel)
 *   aiming -- handleDown        → idle    (multi-touch protection: onCancel)
 *   idle   -- handleMove/Up     → idle    (no-op)
 * @param {ControllerOptions} options
 */
export function createPointerController(options) {
    const ownSideRect = options.ownSideRect;
    const strengthCoef = options.strengthCoef ?? DEFAULT_STRENGTH_COEF;
    const maxDragDistance = options.maxDragDistance ?? DEFAULT_MAX_DRAG;
    const onPlace = options.onPlace;
    const onAimAdjust = options.onAimAdjust;
    const onShoot = options.onShoot;
    const onCancel = options.onCancel;

    let state = 'idle';
    let origin = null;

    function handleDown(point) {
        // multi-touch / 二重 down: aiming 中なら一度キャンセル
        if (state === 'aiming') {
            state = 'idle';
            origin = null;
            if (onCancel) onCancel();
            return;
        }
        // idle: 自陣矩形外は無視
        if (!isInsideRect(point, ownSideRect)) return;
        origin = { x: point.x, y: point.y };
        state = 'aiming';
        if (onPlace) onPlace({ x: point.x, y: point.y });
    }

    function handleMove(point) {
        if (state !== 'aiming' || origin === null) return;
        const velocity = computeVelocity(origin, point, strengthCoef, maxDragDistance);
        if (onAimAdjust) {
            onAimAdjust({
                origin: { x: origin.x, y: origin.y },
                current: { x: point.x, y: point.y },
                velocity,
            });
        }
    }

    function handleUp(point) {
        if (state !== 'aiming' || origin === null) return;
        const velocity = computeVelocity(origin, point, strengthCoef, maxDragDistance);
        const shotOrigin = { x: origin.x, y: origin.y };
        state = 'idle';
        origin = null;
        if (onShoot) onShoot({ origin: shotOrigin, velocity });
    }

    function handleCancel() {
        if (state !== 'aiming') return;
        state = 'idle';
        origin = null;
        if (onCancel) onCancel();
    }

    function getState() {
        return state;
    }

    return { handleDown, handleMove, handleUp, handleCancel, getState };
}

/**
 * 薄い DOM アダプタ。Canvas 等の EventTarget に PointerEvent リスナを bind し、
 * getLocalPoint() でスクリーン座標 → 世界座標 [0,1]^2 へ変換した結果を controller に流す。
 * @param {EventTarget} target - addEventListener / removeEventListener を持つ任意のオブジェクト。
 * @param {(ev: any) => Point} getLocalPoint - PointerEvent → 世界座標への純関数。
 * @param {ControllerOptions} controllerOptions - createPointerController に渡すオプション。
 * @returns {{detach: () => void}}
 */
export function attachPointerInput(target, getLocalPoint, controllerOptions) {
    const ctrl = createPointerController(controllerOptions);
    const onDown = (ev) => ctrl.handleDown(getLocalPoint(ev));
    const onMove = (ev) => ctrl.handleMove(getLocalPoint(ev));
    const onUp = (ev) => ctrl.handleUp(getLocalPoint(ev));
    const onCancel = () => ctrl.handleCancel();

    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);

    return {
        detach() {
            target.removeEventListener('pointerdown', onDown);
            target.removeEventListener('pointermove', onMove);
            target.removeEventListener('pointerup', onUp);
            target.removeEventListener('pointercancel', onCancel);
        },
    };
}

/**
 * v2 placing+aiming 統合 FSM (dispatch スタイル)。
 * 1 投擲のライフサイクル全体を 1 つの FSM で管理する。
 *
 * 状態遷移:
 *   placing       -- pointerdown      → placing-drag    (launchX=clamp(x), onPlace)
 *   placing-drag  -- pointermove      → placing-drag    (launchX=clamp(x), onPlace)
 *   placing-drag  -- pointerup        → aiming
 *   placing-drag  -- pointercancel    → placing
 *   aiming        -- pointerdown      → aiming-power    (origin 記録)
 *   aiming-power  -- pointermove      → aiming-power    (onAim)
 *   aiming-power  -- pointerup        → done            (onShoot)
 *   aiming-power  -- pointercancel    → aiming          (origin リセット)
 *
 * @param {Object} options
 * @param {{x:number,y:number,w:number,h:number}} [options.bounds] - レーン bounds (将来拡張用)
 * @param {(launchX:number) => void} [options.onPlace]
 * @param {(velocity:{vx:number,vy:number}) => void} [options.onAim]
 * @param {(shot:{launchX:number, vx:number, vy:number}) => void} [options.onShoot]
 * @param {number} [options.strengthCoef=4.0]
 * @param {number} [options.maxDragDistance=0.3]
 * @returns {{ dispatch:(ev:any)=>void, getMode:()=>string, getLaunchX:()=>number }}
 */
export function createPointerFsm(options) {
    const onPlace = options.onPlace;
    const onAim = options.onAim;
    const onShoot = options.onShoot;
    const strengthCoef = options.strengthCoef ?? DEFAULT_STRENGTH_COEF;
    const maxDragDistance = options.maxDragDistance ?? DEFAULT_MAX_DRAG;

    let mode = 'placing';
    let launchX = (LAUNCH_X_MIN + LAUNCH_X_MAX) / 2;
    let aimOrigin = null;

    function dispatch(ev) {
        if (mode === 'placing') {
            if (ev.type === 'pointerdown') {
                launchX = clampLaunchX(ev.x);
                if (onPlace) onPlace(launchX);
                mode = 'placing-drag';
            }
        } else if (mode === 'placing-drag') {
            if (ev.type === 'pointermove') {
                launchX = clampLaunchX(ev.x);
                if (onPlace) onPlace(launchX);
            } else if (ev.type === 'pointerup') {
                mode = 'aiming';
            } else if (ev.type === 'pointercancel') {
                mode = 'placing';
            }
        } else if (mode === 'aiming') {
            if (ev.type === 'pointerdown') {
                aimOrigin = { x: ev.x, y: ev.y };
                mode = 'aiming-power';
            }
        } else if (mode === 'aiming-power') {
            if (ev.type === 'pointermove') {
                const v = computeVelocity(aimOrigin, ev, strengthCoef, maxDragDistance);
                if (onAim) onAim(v);
            } else if (ev.type === 'pointerup') {
                const v = computeVelocity(aimOrigin, ev, strengthCoef, maxDragDistance);
                if (onShoot) onShoot({ launchX, vx: v.vx, vy: v.vy });
                aimOrigin = null;
                mode = 'done';
            } else if (ev.type === 'pointercancel') {
                aimOrigin = null;
                mode = 'aiming';
            }
        }
        // mode === 'done' は no-op
    }

    return {
        dispatch,
        getMode: () => mode,
        getLaunchX: () => launchX,
    };
}
