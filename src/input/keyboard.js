// 入力系: キーボード操作によるアクセシビリティ用 FSM と DOM アダプタ。
// pointer.js (M1.3) と同じ二層構成: 純粋 FSM (createKeyboardController) は DOM 非依存で
// Node テストから直接駆動し、attachKeyboardInput が薄い DOM 配線を担う。
//
// 状態遷移:
//   placing            -- ArrowLeft/Right     → placing            (placementIndex 増減、端で頭打ち)
//   placing            -- Enter               → aiming-direction   (onPlace, directionIndex=0)
//   aiming-direction   -- ArrowLeft/Right     → aiming-direction   (directionIndex 環状)
//   aiming-direction   -- Enter / Space       → aiming-power       (powerLevel=0、Space は即 1)
//   aiming-direction   -- Escape              → placing            (onCancel, placementIndex 保持)
//   aiming-power       -- Space               → aiming-power       (powerLevel 環状 1..powerLevels)
//   aiming-power       -- ArrowUp/Down        → aiming-power       (powerLevel 線形 端で頭打ち)
//   aiming-power       -- Enter (level≥1)    → placing            (onShoot, direction/power リセット)
//   aiming-power       -- Escape              → aiming-direction   (onCancel, powerLevel リセット)

/**
 * @typedef {{x:number, y:number}} Point
 * @typedef {{vx:number, vy:number}} Velocity
 * @typedef {{x0:number, y0:number, x1:number, y1:number}} Rect
 *
 * @typedef {Object} KeyboardControllerOptions
 * @property {Rect} ownSideRect - 自陣矩形。placement Y は (y0+y1)/2、X は x0..x1 を等分。
 * @property {number} [placementSteps=10] - 配置候補の離散ステップ数。
 * @property {number} [directionCount=24] - 方位の離散数 (24 = 15° 刻み)。
 * @property {number} [powerLevels=10] - パワーレベル段数 (環状 1..powerLevels)。
 * @property {number} [maxPowerVelocity=1.2] - 最大パワー時の速度大きさ (m/sec)。
 * @property {number} [initialDirectionRadians=-π/2] - directionIndex=0 が指す方位 (規定: 上向き)。
 * @property {(p:{x:number,y:number,index:number}) => void} [onPlace]
 * @property {(info:{origin:Point, directionIndex:number, directionRadians:number, powerLevel:number, velocity:Velocity}) => void} [onAimAdjust]
 * @property {(info:{origin:Point, velocity:Velocity}) => void} [onShoot]
 * @property {() => void} [onCancel]
 */

const DEFAULT_PLACEMENT_STEPS = 10;
const DEFAULT_DIRECTION_COUNT = 24;
const DEFAULT_POWER_LEVELS = 10;
const DEFAULT_MAX_POWER_VELOCITY = 1.2;
const DEFAULT_INITIAL_DIRECTION_RADIANS = -Math.PI / 2;

// プレイスメント X (steps==1 のときは矩形中央)
function computePlacementPoint(index, ownSideRect, placementSteps) {
    const { x0, y0, x1, y1 } = ownSideRect;
    const t = placementSteps > 1 ? index / (placementSteps - 1) : 0.5;
    return { x: x0 + t * (x1 - x0), y: (y0 + y1) / 2 };
}

// directionIndex → ラジアン
function indexToRadians(directionIndex, directionCount, initialDirectionRadians) {
    return initialDirectionRadians + (directionIndex * 2 * Math.PI) / directionCount;
}

/**
 * キーボード操作 FSM を生成する。DOM 非依存。
 * 詳細な状態遷移は本ファイル冒頭コメントを参照。
 * @param {KeyboardControllerOptions} options
 */
export function createKeyboardController(options) {
    const ownSideRect = options.ownSideRect;
    const placementSteps = options.placementSteps ?? DEFAULT_PLACEMENT_STEPS;
    const directionCount = options.directionCount ?? DEFAULT_DIRECTION_COUNT;
    const powerLevels = options.powerLevels ?? DEFAULT_POWER_LEVELS;
    const maxPowerVelocity = options.maxPowerVelocity ?? DEFAULT_MAX_POWER_VELOCITY;
    const initialDirectionRadians = options.initialDirectionRadians ?? DEFAULT_INITIAL_DIRECTION_RADIANS;
    const onPlace = options.onPlace;
    const onAimAdjust = options.onAimAdjust;
    const onShoot = options.onShoot;
    const onCancel = options.onCancel;

    let state = 'placing';
    let placementIndex = 0;
    let directionIndex = 0;
    let powerLevel = 0;
    let placedOrigin = null; // Enter で確定した発射点

    // パワー → velocity (極座標)
    function computeVelocity() {
        const magnitude = (maxPowerVelocity * powerLevel) / powerLevels;
        const radians = indexToRadians(directionIndex, directionCount, initialDirectionRadians);
        return { vx: magnitude * Math.cos(radians), vy: magnitude * Math.sin(radians) };
    }

    function notifyAimAdjust() {
        if (!onAimAdjust || placedOrigin === null) return;
        const radians = indexToRadians(directionIndex, directionCount, initialDirectionRadians);
        onAimAdjust({
            origin: { x: placedOrigin.x, y: placedOrigin.y },
            directionIndex,
            directionRadians: radians,
            powerLevel,
            velocity: computeVelocity(),
        });
    }

    // placing 状態のキー処理
    function handleKeyInPlacing(key) {
        switch (key) {
            case 'ArrowLeft':
                if (placementIndex > 0) placementIndex--;
                return;
            case 'ArrowRight':
                if (placementIndex < placementSteps - 1) placementIndex++;
                return;
            case 'Enter': {
                const p = computePlacementPoint(placementIndex, ownSideRect, placementSteps);
                placedOrigin = p;
                directionIndex = 0;
                powerLevel = 0;
                state = 'aiming-direction';
                if (onPlace) onPlace({ x: p.x, y: p.y, index: placementIndex });
                return;
            }
            default:
                return;
        }
    }

    // aiming-direction 状態のキー処理
    function handleKeyInAimingDirection(key) {
        switch (key) {
            case 'ArrowLeft':
                directionIndex = (directionIndex - 1 + directionCount) % directionCount;
                notifyAimAdjust();
                return;
            case 'ArrowRight':
                directionIndex = (directionIndex + 1) % directionCount;
                notifyAimAdjust();
                return;
            case 'Enter':
                powerLevel = 0;
                state = 'aiming-power';
                notifyAimAdjust();
                return;
            case ' ':
                // アクセシビリティ: Space でも次状態へ。即 powerLevel=1。
                powerLevel = 1;
                state = 'aiming-power';
                notifyAimAdjust();
                return;
            case 'Escape':
                // placementIndex 保持、direction/power リセット
                directionIndex = 0;
                powerLevel = 0;
                placedOrigin = null;
                state = 'placing';
                if (onCancel) onCancel();
                return;
            default:
                return;
        }
    }

    // aiming-power 状態のキー処理
    function handleKeyInAimingPower(key) {
        switch (key) {
            case ' ':
                powerLevel = (powerLevel % powerLevels) + 1;
                notifyAimAdjust();
                return;
            case 'ArrowUp':
                powerLevel = Math.min(powerLevels, powerLevel + 1);
                notifyAimAdjust();
                return;
            case 'ArrowDown':
                powerLevel = Math.max(1, powerLevel - 1);
                notifyAimAdjust();
                return;
            case 'Enter': {
                if (powerLevel < 1) return; // パワー未確定では発射しない
                const velocity = computeVelocity();
                const shotOrigin = { x: placedOrigin.x, y: placedOrigin.y };
                // shoot 後: placing に復帰、placementIndex 保持、direction/power リセット
                directionIndex = 0;
                powerLevel = 0;
                placedOrigin = null;
                state = 'placing';
                if (onShoot) onShoot({ origin: shotOrigin, velocity });
                return;
            }
            case 'Escape':
                // aiming-direction に戻す。direction 保持、powerLevel リセット。
                powerLevel = 0;
                state = 'aiming-direction';
                if (onCancel) onCancel();
                return;
            default:
                return;
        }
    }

    /**
     * キー文字列 (event.key 互換) を 1 件処理する。
     * @param {string} key
     */
    function handleKey(key) {
        switch (state) {
            case 'placing': handleKeyInPlacing(key); return;
            case 'aiming-direction': handleKeyInAimingDirection(key); return;
            case 'aiming-power': handleKeyInAimingPower(key); return;
            default: return;
        }
    }

    function getState() {
        return state;
    }

    function getSnapshot() {
        return { state, placementIndex, directionIndex, powerLevel };
    }

    return { handleKey, getState, getSnapshot };
}

// preventDefault 対象キー (ブラウザ既定動作 = スクロール等を抑止)
const PREVENT_DEFAULT_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Enter', ' ', 'Escape',
]);

/**
 * 薄い DOM アダプタ。target.addEventListener('keydown', ...) を bind し、
 * event.key を controller.handleKey に流す。FSM が扱う対象キーのみ preventDefault する。
 * @param {EventTarget} target - addEventListener / removeEventListener を持つオブジェクト (window / document 等)。
 * @param {KeyboardControllerOptions} controllerOptions
 * @returns {{detach: () => void, controller: ReturnType<typeof createKeyboardController>}}
 */
export function attachKeyboardInput(target, controllerOptions) {
    const controller = createKeyboardController(controllerOptions);
    const onKeyDown = (ev) => {
        if (PREVENT_DEFAULT_KEYS.has(ev.key) && typeof ev.preventDefault === 'function') {
            ev.preventDefault();
        }
        controller.handleKey(ev.key);
    };
    target.addEventListener('keydown', onKeyDown);
    return {
        controller,
        detach() {
            target.removeEventListener('keydown', onKeyDown);
        },
    };
}
