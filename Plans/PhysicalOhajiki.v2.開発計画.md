# 物理おはじき (Physical Ohajiki) v2 カーリング型ピボット 開発計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (推奨) または `superpowers:executing-plans` を用いてタスク単位で実装すること。各ステップはチェックボックス (`- [ ]`) 形式。

**Goal:** 反発・摩擦のみで動くストーンを、縦長レーン (0.5m × 1.5m) 上で順次投擲し、中央のハウス (4 同心円) への近接度で勝敗を決めるカーリング型カジュアルパズルを MVP-α / MVP-β の 2 段階で構築する。

**Architecture:** 既存 v1 の二層 (純粋 FSM + DOM アダプタ) / 決定論的物理 core (semi-implicit Euler / mulberry32 RNG) の枠組みを保持。重力モジュールを完全削除し、ハウス得点 / エンド制 / FGZ / ハンマー権 / 軌道予測線 を新規追加する。

**Tech Stack:** HTML / CSS / Vanilla JavaScript (ES2022+) / Canvas 2D API / ES Modules / ビルドレス / WebAudio (合成音) / `localStorage` (設定保存) / 実行時依存ゼロ

> **入力資料**: [Plans/PhysicalOhajiki.v2.カーリング型提案.md](PhysicalOhajiki.v2.%E3%82%AB%E3%83%BC%E3%83%AA%E3%83%B3%E3%82%B0%E5%9E%8B%E6%8F%90%E6%A1%88.md) / [.github/prompts/Physical Ohajiki — 仕様大幅変更.prompt.md](../.github/prompts/Physical%20Ohajiki%20%E2%80%94%20%E4%BB%95%E6%A7%98%E5%A4%A7%E5%B9%85%E5%A4%89%E6%9B%B4.prompt.md) / [.github/copilot-instructions.md](../.github/copilot-instructions.md)
>
> **基準コミット**: `5182fd3` (Phase 1 / MVP-α / 126 PASS)
> **承認済み事前合意**: A (案A 軌道予測線スリングショット) / B (5.1+5.2+5.3+5.4 を MVP-α) / C (テスト 126→141 / Phase 1v2 = 9〜10 営業日)

---

## 1. ゴールと成功基準

### 1.1 数値目標 (v2 改訂)

| # | 指標 | 目標値 | 測定タイミング | 根拠 |
|---|---|---|---|---|
| G1' | 評価書再採点スコア | **≥ 20/25 点** | Phase 2v2 完了時 | 提案書 §8.1 |
| G2 | ペルソナ重み付け総合スコア | **≥ 70 点** | Phase 2v2 完了時 | 提案書 §8.1 |
| G3' | 1 試合時間 (2 エンド × 4 投 = 16 投) 中央値 | **≤ 3 分** | Phase 1v2 完了時 | 提案書 §2 |
| G4' | 1 試合時間 (1 エンドモード = 4 投) 中央値 | **≤ 1.5 分** | Phase 2v2 完了時 | 提案書 §2 |
| G5 | 描画フレームレート (16 ストーン + 軌道線時) | **≥ 60 fps** | Phase 1v2 / Phase 2v2 完了時 | リポジトリ方針 / R3 |
| G6 | チュートリアル文字数 | **≤ 100 文字** | 仕様凍結時 | リポジトリ方針 |
| G7 | 起動 → 最初の有効操作 | **≤ 15 秒** | Phase 1v2 完了時 | リポジトリ方針 |
| G8 | タッチ誤操作率 | **≤ 30%** | Phase 0v2 完了時 | 提案書 §7 R3 |
| G10 | テスト件数 | **約 141 PASS** (126 + 15) | Phase 1v2 完了時 | 提案書 §6 |

### 1.2 Phase 0v2 合否ゲート (テスタ検証)

- テスタ ≥ 5 名で「v1 (Phase 1 / 5182fd3) より面白い」≥ 60% 支持を獲得すること。
- 不合格 → §8 撤退判断 (v3 ピボット or プロジェクト凍結) に移行。

---

## 2. フェーズ分割概要

```
[Phase 0v2] カーリング型ペーパープロト + テスタ検証 (R1 検証)
      │ ★合否ゲート★ (テスタ ≥5 名 / 「v1 より面白い」≥60%)
      ▼
[Phase 1v2] MVP-α 実装 (M1v2.1〜M1v2.8 / 約 9〜10 営業日)
      │ ★完了検証★ verification-before-completion / 約 141 PASS
      ▼
[Phase 2v2] MVP-β 拡張 (M2v2.1〜M2v2.3 / 約 3〜4 営業日)
        ★最終検証★ G1' (≥20/25) / G2 (≥70 点)
```

---

## 3. ファイル構成と責務

### 3.1 既存ファイル (改修・削除対象)

| ファイル | 区分 | 主責務 (v2) |
|---|---|---|
| `src/main.js` | 改修 (大) | レーン寸法 / 投擲位置 / エンド進行 / `localStorage` 設定ロード / `T` キー軌道線トグル |
| `src/audio/sfx.js` | 維持 | 既存 click/pop/turn を流用 |
| `src/game/state.js` | 改修 (大) | `houseConfig` / `endIndex` / `hammerSide` / 投擲スロット / `mode` 再定義 (`'2end' | '1end'`) |
| `src/game/rules.js` | 完全置換 | カーリング得点計算 / FGZ 判定 / 1-rock rule / エキストラエンド |
| `src/game/loop.js` | 改修 (中) | `applyShot` のストーン生成位置を投擲ラインに固定 |
| `src/input/pointer.js` | 改修 (中) | `placing` を x スライダー (ドラッグで連続調整) に変更 |
| `src/input/keyboard.js` | 改修 (中) | `placing` 段の操作を「x スライダー左右移動」に変更 / `T` トグル |
| `src/physics/engine.js` | 改修 (小) | `applyGravity` 呼出削除 (コールバック維持) |
| `src/physics/collision.js` | 維持 | 円-円 / 円-壁 (寸法は params 経由) |
| `src/physics/gravity.js` | **完全削除** | — |
| `src/physics/rng.js` | 維持 | mulberry32 流用 |
| `src/render/canvas.js` | 改修 (中) | 縦長レーン / ハウス 4 同心円 / FGZ ハッチ / ホッグライン / 軌道予測線描画 |
| `src/render/effects.js` | 維持 | ripple / popup / shake は流用 |
| `src/render/ui.js` | 改修 (大) | HUD 再設計 (エンド / ハンマー / 得点プレビュー / パワーゲージ / 設定パネル) / `TUTORIAL_TEXT` 更新 |

### 3.2 新規ファイル

| ファイル | 責務 |
|---|---|
| `src/game/house.js` | ハウス幾何 / ボタン距離計算 / リング判定 |
| `src/game/fgz.js` | FGZ 帯判定 / 1-rock rule 違反検出 / 元位置復元 |
| `src/game/settings.js` | `localStorage` ロード/保存 / 既定値 / `aimPreview` トグル |
| `src/render/preview.js` | 軌道予測線の数値積分 + Path2D 描画 (摩擦のみの自由飛行軌道) |
| `tests/unit/house.test.js` | 5 件想定 |
| `tests/unit/fgz.test.js` | 4 件想定 |
| `tests/unit/settings.test.js` | 3 件想定 |
| `tests/unit/hud.test.js` | 3 件想定 (パワーゲージ / 距離リング / ハンマー HUD ロジック) |

### 3.3 削除ファイル

| ファイル | 削除理由 |
|---|---|
| `src/physics/gravity.js` | 万有引力廃止 |
| `tests/unit/gravity.test.js` | 同上 |

---

## 4. 物理パラメータ定数 (本計画で参照する値)

提案書 §3 で確定済の値を本計画でも一貫使用する:

```javascript
// レーン寸法
const BOUNDS = Object.freeze({ x: 0, y: 0, w: 0.5, h: 1.5 });
// 物理パラメータ (G 削除)
const PARAMS = Object.freeze({ e: 0.85, mu: 0.3 });
// ストーン半径 / 質量
const STONE_RADIUS = 0.020;
const STONE_MASS = 1;
// ハウス (4 同心円 / 上端中央)
const HOUSE = Object.freeze({
    cx: 0.25,
    cy: 0.20,
    radii: [0.020, 0.040, 0.070, 0.100], // ボタン / 4ft / 8ft / 12ft 相当
});
// ホッグライン (FGZ 下端) / バックライン (FGZ 上端 = ハウス基準のティー線)
const HOG_LINE_Y = 0.40;
const TEE_LINE_Y = 0.20; // = HOUSE.cy
// 投擲ライン (ストーン初期位置の y) / x スライダー範囲
const LAUNCH_Y = 1.45;
const LAUNCH_X_MIN = 0.05;
const LAUNCH_X_MAX = 0.45;
// エンド構造
const STONES_PER_END_PER_PLAYER = 4; // 各エンド各プレイヤー 4 投
const ENDS_PER_MATCH = 2;            // 通常 2 エンド (引き分け時 +1 エキストラ)
const MAX_EXTRA_ENDS = 1;
```

---

## 5. Phase 0v2: ペーパープロト + テスタ検証

> **コード変更なし。** ペーパー or 簡易 HTML プロトでルール検証のみ実施。

### Task 0-1: ペーパープロトでルール検証 (オフライン作業)

- [ ] **Step 1**: A4 用紙にレーン (0.5 × 1.5 比) と 4 同心円ハウス (radii 比 1:2:3.5:5) を縮尺描画
- [ ] **Step 2**: コインや碁石をストーンに見立てて、2 人で 2 エンド × 4 投 = 16 投を 1 試合プレイ
- [ ] **Step 3**: 「最近接の自陣ストーン > 相手最近接ストーン」より中心側にある自陣ストーン数 = 得点 を手計算
- [ ] **Step 4**: 1 試合所要時間を測定し、目標 G3' (3 分以内) と整合するか記録
- [ ] **Step 5**: 結果を `Plans/PhysicalOhajiki.検証ログ.md` に「Phase 0v2 / ペーパープロト」節として追記

### Task 0-2: テスタ ≥5 名検証

- [ ] **Step 1**: テスタ募集 (Mobile ≥3 名 / PC ≥1 名 / Tablet ≥1 名)
- [ ] **Step 2**: v1 (commit `5182fd3`) を 1 試合プレイ → ペーパープロト v2 を 1 試合プレイ
- [ ] **Step 3**: 「v2 のほうが面白い」/「v1 のほうが面白い」/「同じ」を 1 名ずつ回答
- [ ] **Step 4**: 「v2 のほうが面白い」≥ 60% (5 名中 3 名以上) で合格
- [ ] **Step 5**: 結果を `Plans/PhysicalOhajiki.検証ログ.md` に追記し、合否判定を明記
- [ ] **Step 6 (合格時)**: Phase 1v2 へ進む / **不合格時**: 提案書 §8 撤退判断 へ移行

---

## 6. Phase 1v2: MVP-α 実装

### M1v2.1: 物理パラメータ変更 / gravity 削除

**目的**: レーン寸法を 1.0 × 1.0 → 0.5 × 1.5 に変更し、`gravity.js` および関連参照を削除する。

**Files:**
- Modify: `src/game/state.js` (BOUNDS / PARAMS / BALL_RADIUS 定数)
- Modify: `src/physics/engine.js` (`applyGravity` 呼出削除)
- Delete: `src/physics/gravity.js`
- Delete: `tests/unit/gravity.test.js`
- Modify: `tests/unit/engine.test.js` (gravity 関連 3 件除去)

#### Task M1v2.1-A: gravity.js 削除と engine.js 改修

- [ ] **Step 1: 失敗するテストを書く** (`tests/unit/engine.test.js` の末尾に追加)

```javascript
// G 削除後、step は applyGravity を呼ばないことを検証
test('engine.step does not apply gravity acceleration', () => {
    const world = {
        balls: [{ x: 0.25, y: 0.5, vx: 0, vy: 0, r: 0.020, m: 1 }],
        bounds: { x: 0, y: 0, w: 0.5, h: 1.5 },
        params: { e: 0.85, mu: 0.3 }, // G を含まない
    };
    const next = step(world, 1.0);
    // 静止球は摩擦のみで動かないこと
    assert.strictEqual(next.balls[0].vx, 0);
    assert.strictEqual(next.balls[0].vy, 0);
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

```powershell
node tests/_node-runner.js tests/unit/engine.test.js
```

期待: FAIL — 既存 `engine.step` が `applyGravity` を呼び、`params.G` が undefined でエラー or NaN を返す。

- [ ] **Step 3: `src/physics/engine.js` から applyGravity を除去**

`src/physics/engine.js` の `step` 関数内 `import { applyGravity } from './gravity.js';` 行と `applyGravity(world)` 呼出行を削除する。

- [ ] **Step 4: `src/physics/gravity.js` を削除**

```powershell
Remove-Item src/physics/gravity.js
```

- [ ] **Step 5: `tests/unit/gravity.test.js` を削除**

```powershell
Remove-Item tests/unit/gravity.test.js
```

- [ ] **Step 6: `tests/unit/engine.test.js` の gravity 関連テスト 3 件を削除**

`engine.test.js` 内で `gravity` / `G` / `引力` を含む test ブロックを 3 件 (見つかった順に) 削除する。

- [ ] **Step 7: テストを実行して通過を確認**

```powershell
node tests/_node-runner.js
```

期待: 既存 126 から -9 されて 117 PASS (gravity.test.js 6 件 + engine.test.js 3 件 = 9 件削減)。

- [ ] **Step 8: コミット**

```powershell
git add -A
git commit -m "refactor(physics): remove gravity module and related tests (v2 M1v2.1-A)"
```

#### Task M1v2.1-B: state.js のパラメータ定数を v2 値に変更

- [ ] **Step 1: 失敗するテストを書く** (`tests/unit/state.test.js` の末尾に追加)

```javascript
test('createInitialState uses v2 lane dimensions and no gravity', () => {
    const s = createInitialState({ mode: '2end', seed: 1 });
    assert.deepStrictEqual(s.world.bounds, { x: 0, y: 0, w: 0.5, h: 1.5 });
    assert.strictEqual(s.world.params.e, 0.85);
    assert.strictEqual(s.world.params.mu, 0.3);
    assert.strictEqual(s.world.params.G, undefined);
});
```

- [ ] **Step 2: テスト実行 → FAIL を確認**

```powershell
node tests/_node-runner.js tests/unit/state.test.js
```

期待: FAIL (既存は w=1, h=1, G=1e-3)。

- [ ] **Step 3: `src/game/state.js` の定数を v2 値に変更**

```javascript
// 変更前 → 変更後
const BOUNDS = Object.freeze({ x: 0, y: 0, w: 0.5, h: 1.5 });
const PARAMS = Object.freeze({ e: 0.85, mu: 0.3 });
const BALL_RADIUS = 0.020;
```

- [ ] **Step 4: テスト実行 → PASS 確認**

```powershell
node tests/_node-runner.js tests/unit/state.test.js
```

- [ ] **Step 5: 全テスト実行で副作用確認**

```powershell
node tests/_node-runner.js
```

期待: 117 → 117 (新規追加 1 / 既存修正 0)。`determinism.test.js` のスナップショットが ズレた場合は M1v2.1-C で再生成。

- [ ] **Step 6: コミット**

```powershell
git add -A
git commit -m "refactor(state): switch to v2 lane dimensions 0.5x1.5 (M1v2.1-B)"
```

#### Task M1v2.1-C: determinism スナップショット再生成

- [ ] **Step 1**: `tests/unit/determinism.test.js` 内の固定スナップショット値を実機実行値に更新 (期待値を一旦 `null` にして実行 → ログから値をコピー)
- [ ] **Step 2**: 再実行で PASS 確認
- [ ] **Step 3**: コミット

```powershell
git commit -am "test(determinism): regenerate snapshots after gravity removal (M1v2.1-C)"
```

---

### M1v2.2: ハウス + 得点ロジック (rules.js 全置換)

**目的**: カーリング得点ルール (最近接相手ストーンより内側の自陣ストーン数) を実装する。

**Files:**
- Create: `src/game/house.js`
- Create: `tests/unit/house.test.js`
- Modify: `src/game/rules.js` (`evaluateWinner` を完全置換)
- Modify: `tests/unit/rules.test.js` (既存 9 件削除 / 新規 6 件追加)

#### Task M1v2.2-A: house.js (幾何ユーティリティ)

- [ ] **Step 1: テストを書く** (`tests/unit/house.test.js` 新規作成)

```javascript
import { test, assert, run } from '../assert.js';
import { distanceToButton, ringIndexAt, isInHouse, HOUSE } from '../../src/game/house.js';

test('HOUSE constants match spec', () => {
    assert.strictEqual(HOUSE.cx, 0.25);
    assert.strictEqual(HOUSE.cy, 0.20);
    assert.deepStrictEqual(HOUSE.radii, [0.020, 0.040, 0.070, 0.100]);
});

test('distanceToButton returns Euclidean distance from (cx,cy)', () => {
    assert.approxEqual(distanceToButton({ x: 0.25, y: 0.20 }), 0, 1e-9);
    assert.approxEqual(distanceToButton({ x: 0.30, y: 0.20 }), 0.05, 1e-9);
});

test('ringIndexAt returns 0 for ball at button (innermost)', () => {
    assert.strictEqual(ringIndexAt({ x: 0.25, y: 0.20 }), 0);
});

test('ringIndexAt returns 3 for ball at outermost ring (12ft)', () => {
    assert.strictEqual(ringIndexAt({ x: 0.25 + 0.090, y: 0.20 }), 3);
});

test('isInHouse returns false for ball outside outermost ring', () => {
    assert.strictEqual(isInHouse({ x: 0.25 + 0.150, y: 0.20 }), false);
});

run();
```

- [ ] **Step 2: テスト実行 → FAIL** (`house.js` 未実装)

```powershell
node tests/_node-runner.js tests/unit/house.test.js
```

- [ ] **Step 3: `src/game/house.js` を実装**

```javascript
// ハウス (4 同心円) の幾何ユーティリティ。
// HOUSE は冷凍定数として外部からも参照される。

export const HOUSE = Object.freeze({
    cx: 0.25,
    cy: 0.20,
    radii: Object.freeze([0.020, 0.040, 0.070, 0.100]),
});

/**
 * ボタン (中心 cx,cy) からの直線距離を返す。
 * @param {{x:number, y:number}} ball
 * @returns {number}
 */
export function distanceToButton(ball) {
    return Math.hypot(ball.x - HOUSE.cx, ball.y - HOUSE.cy);
}

/**
 * ボールが含まれる最小のリング index を返す (0 = ボタン / 3 = 12ft)。
 * ハウス外なら -1。
 * @param {{x:number, y:number}} ball
 * @returns {number} 0..3 or -1
 */
export function ringIndexAt(ball) {
    const d = distanceToButton(ball);
    for (let i = 0; i < HOUSE.radii.length; i++) {
        if (d <= HOUSE.radii[i]) return i;
    }
    return -1;
}

/**
 * ボールがハウス内 (最外リング以内) にあるか。
 * @param {{x:number, y:number}} ball
 * @returns {boolean}
 */
export function isInHouse(ball) {
    return ringIndexAt(ball) !== -1;
}
```

- [ ] **Step 4: テスト実行 → PASS**

```powershell
node tests/_node-runner.js tests/unit/house.test.js
```

期待: 5 PASS。

- [ ] **Step 5: コミット**

```powershell
git add src/game/house.js tests/unit/house.test.js
git commit -m "feat(house): add house geometry utilities (M1v2.2-A)"
```

#### Task M1v2.2-B: rules.js のカーリング得点ロジック全置換

- [ ] **Step 1: 既存 `tests/unit/rules.test.js` を全削除し、新規テストを書く**

```javascript
// tests/unit/rules.test.js (全置換)
import { test, assert, run } from '../assert.js';
import { scoreEnd, evaluateWinner } from '../../src/game/rules.js';

test('scoreEnd returns 0 for both sides when no stones in house', () => {
    const balls = [{ x: 0.40, y: 0.50, owner: 0 }];
    assert.deepStrictEqual(scoreEnd(balls), { side: null, points: 0 });
});

test('scoreEnd returns 1 for the side with sole stone in house', () => {
    const balls = [{ x: 0.25, y: 0.21, owner: 0 }];
    assert.deepStrictEqual(scoreEnd(balls), { side: 0, points: 1 });
});

test('scoreEnd returns N for stones inside opponent closest', () => {
    const balls = [
        { x: 0.25, y: 0.20, owner: 0 }, // 距離 0
        { x: 0.27, y: 0.20, owner: 0 }, // 距離 0.02
        { x: 0.30, y: 0.20, owner: 1 }, // 距離 0.05 (相手最近接)
        { x: 0.35, y: 0.20, owner: 0 }, // 距離 0.10 (相手より遠い → カウントせず)
    ];
    assert.deepStrictEqual(scoreEnd(balls), { side: 0, points: 2 });
});

test('scoreEnd ignores stones outside house', () => {
    const balls = [
        { x: 0.25, y: 0.20, owner: 0 },
        { x: 0.45, y: 0.20, owner: 1 }, // 半径 0.20 → ハウス外
    ];
    assert.deepStrictEqual(scoreEnd(balls), { side: 0, points: 1 });
});

test('evaluateWinner returns total score winner across ends', () => {
    const state = { status: 'ended', endScores: [{ side: 0, points: 2 }, { side: 1, points: 1 }] };
    assert.deepStrictEqual(evaluateWinner(state), { winner: 0, totals: [2, 1], reason: 'higher-score' });
});

test('evaluateWinner returns draw when totals equal and no extra end remains', () => {
    const state = { status: 'ended', endScores: [{ side: 0, points: 1 }, { side: 1, points: 1 }], extraEndsUsed: 1 };
    assert.deepStrictEqual(evaluateWinner(state), { winner: null, totals: [1, 1], reason: 'draw' });
});

run();
```

- [ ] **Step 2: テスト実行 → FAIL** (旧 API)

- [ ] **Step 3: `src/game/rules.js` を全置換**

```javascript
// カーリング型の得点ロジック。
// scoreEnd: エンド終了時の盤面を評価し、得点側と得点を返す。
// evaluateWinner: 全エンドの得点合計から勝者を決定する。

import { distanceToButton, isInHouse } from './house.js';

/**
 * 1 エンド分のスコアを計算する。
 * 規則:
 *   1. ハウス内のストーンのみ評価対象
 *   2. 双方ハウス内 0 個 → 0 点 (side=null)
 *   3. 双方ハウス内あり → 「相手側の最近接ストーンより内側にある自陣ストーン数」=得点
 * @param {Array<{x:number, y:number, owner:0|1}>} balls
 * @returns {{ side: 0|1|null, points: number }}
 */
export function scoreEnd(balls) {
    const inHouse = balls.filter(isInHouse);
    if (inHouse.length === 0) return { side: null, points: 0 };

    const closestByOwner = [Infinity, Infinity];
    for (const b of inHouse) {
        const d = distanceToButton(b);
        if (d < closestByOwner[b.owner]) closestByOwner[b.owner] = d;
    }
    if (!isFinite(closestByOwner[0]) && !isFinite(closestByOwner[1])) {
        return { side: null, points: 0 };
    }
    const winnerSide = closestByOwner[0] < closestByOwner[1] ? 0 : 1;
    const opponentClosest = closestByOwner[1 - winnerSide];
    let points = 0;
    for (const b of inHouse) {
        if (b.owner !== winnerSide) continue;
        if (distanceToButton(b) < opponentClosest) points++;
    }
    return { side: winnerSide, points };
}

/**
 * 試合勝者を判定する。
 * @param {object} state - { status, endScores: Array<{side,points}>, extraEndsUsed }
 * @returns {{ winner: 0|1|null, totals: [number, number], reason: string }}
 */
export function evaluateWinner(state) {
    if (state.status !== 'ended') {
        return { winner: null, totals: [0, 0], reason: 'in-progress' };
    }
    const totals = [0, 0];
    for (const es of state.endScores) {
        if (es.side !== null) totals[es.side] += es.points;
    }
    if (totals[0] > totals[1]) return { winner: 0, totals, reason: 'higher-score' };
    if (totals[1] > totals[0]) return { winner: 1, totals, reason: 'higher-score' };
    return { winner: null, totals, reason: 'draw' };
}
```

> **注**: `isOutOfBounds` は別ファイルへ移すか、後段 M1v2.4 で `fgz.js` 側に集約する。本ステップでは一旦 `rules.js` から削除し、参照側を改修する。

- [ ] **Step 4: `loop.js` の `isOutOfBounds` 参照を一時的に inline 実装に置き換え** (M1v2.4 で fgz.js に統合)

```javascript
// src/game/loop.js (該当箇所)
function isOutOfBoundsLocal(ball, bounds) {
    return ball.x < bounds.x || ball.x > bounds.x + bounds.w
        || ball.y < bounds.y || ball.y > bounds.y + bounds.h;
}
```

- [ ] **Step 5: テスト実行 → PASS**

```powershell
node tests/_node-runner.js tests/unit/rules.test.js
```

期待: 6 PASS。

- [ ] **Step 6: 全テスト実行**

```powershell
node tests/_node-runner.js
```

期待: 117 - 9 (旧 rules.test.js) + 5 (house) + 6 (新 rules) = 119 PASS。

- [ ] **Step 7: コミット**

```powershell
git add -A
git commit -m "feat(rules): replace with curling-style scoring (M1v2.2-B)"
```

---

### M1v2.3: エンド進行 + ハンマー権 (state.js 改修)

**目的**: `endIndex` / `hammerSide` / 投擲スロット概念を導入し、各エンド終了時に `scoreEnd` を呼んで `endScores` を蓄積する。

**Files:**
- Modify: `src/game/state.js` (新フィールド追加 / `mode` 再定義 / 自陣リジェクションサンプリング除去)
- Modify: `tests/unit/state.test.js` (既存 15 件改修 + 3 件追加)

#### Task M1v2.3-A: state.js の新フィールド追加

- [ ] **Step 1: 失敗するテストを書く** (`tests/unit/state.test.js` の末尾に追加)

```javascript
test('createInitialState (v2) starts with empty balls and end 0', () => {
    const s = createInitialState({ mode: '2end', seed: 1 });
    assert.strictEqual(s.world.balls.length, 0); // 順次投擲 → 初期 0 球
    assert.strictEqual(s.endIndex, 0);
    assert.strictEqual(s.stoneIndex, 0);
    assert.deepStrictEqual(s.endScores, []);
    assert.strictEqual(s.extraEndsUsed, 0);
});

test('createInitialState assigns hammer by seed (deterministic)', () => {
    const s1 = createInitialState({ mode: '2end', seed: 1 });
    const s2 = createInitialState({ mode: '2end', seed: 1 });
    assert.strictEqual(s1.hammerSide, s2.hammerSide); // 同一シード → 同一値
    assert.ok(s1.hammerSide === 0 || s1.hammerSide === 1);
});

test('mode 2end has totalStones = 16; mode 1end has 8', () => {
    const s2 = createInitialState({ mode: '2end', seed: 1 });
    const s1 = createInitialState({ mode: '1end', seed: 1 });
    assert.strictEqual(s2.totalStones, 16);
    assert.strictEqual(s1.totalStones, 8);
});
```

- [ ] **Step 2: テスト実行 → FAIL**

- [ ] **Step 3: `src/game/state.js` の `createInitialState` を改修**

```javascript
const STONES_PER_END_PER_PLAYER = 4;
const ENDS_PER_MATCH = { '2end': 2, '1end': 1 };

export function createInitialState({ mode = '2end', seed = 1, thinkDeadlineMs = 6000 } = {}) {
    if (!ENDS_PER_MATCH[mode]) throw new Error(`Unknown mode: ${mode}`);
    const rng = createRng(seed);
    const hammerSide = rng() < 0.5 ? 0 : 1; // 試合開始時のハンマー (シード乱数)
    const ends = ENDS_PER_MATCH[mode];
    return {
        status: 'in-progress',
        mode,
        seed,
        thinkDeadlineMs,
        endIndex: 0,
        stoneIndex: 0, // 現エンド内の何投目か (0..7)
        totalStones: ends * STONES_PER_END_PER_PLAYER * 2,
        hammerSide,
        currentSide: hammerSide === 0 ? 1 : 0, // 後攻=ハンマー → 先攻が最初に投擲
        endScores: [],
        extraEndsUsed: 0,
        world: {
            balls: [], // 順次投擲モデル: 初期 0 球
            bounds: { ...BOUNDS },
            params: { ...PARAMS },
        },
    };
}
```

- [ ] **Step 4: 既存の `placeBall` / `MAX_PLACEMENT_TRIES` / `BALLS_PER_PLAYER` 関連コード (自陣リジェクションサンプリング) を削除**

- [ ] **Step 5: テスト実行 → PASS**

- [ ] **Step 6: コミット**

```powershell
git add -A
git commit -m "feat(state): add end/hammer/stone-index for v2 model (M1v2.3-A)"
```

#### Task M1v2.3-B: エンド進行ロジック (advanceTurn / closeEnd)

- [ ] **Step 1: 失敗するテストを書く**

```javascript
test('closeEnd appends scoreEnd result and resets stoneIndex', () => {
    const s = createInitialState({ mode: '2end', seed: 1 });
    s.world.balls = [{ x: 0.25, y: 0.20, vx: 0, vy: 0, r: 0.020, m: 1, owner: 0 }];
    const next = closeEnd(s);
    assert.strictEqual(next.endIndex, 1);
    assert.strictEqual(next.stoneIndex, 0);
    assert.strictEqual(next.world.balls.length, 0); // 次エンド開始時にレーンクリア
    assert.strictEqual(next.endScores.length, 1);
    assert.strictEqual(next.endScores[0].side, 0);
    assert.strictEqual(next.endScores[0].points, 1);
});

test('closeEnd transfers hammer to non-scoring side (ブランクエンドは保持)', () => {
    const s = createInitialState({ mode: '2end', seed: 1 });
    const initialHammer = s.hammerSide;
    s.world.balls = [{ x: 0.25, y: 0.20, vx: 0, vy: 0, r: 0.020, m: 1, owner: initialHammer }];
    const next = closeEnd(s);
    // 得点側 = ハンマー → 次エンドのハンマーは非得点側へ
    assert.strictEqual(next.hammerSide, 1 - initialHammer);
});

test('closeEnd with all match ends played sets status to ended', () => {
    let s = createInitialState({ mode: '1end', seed: 1 });
    s.world.balls = [{ x: 0.25, y: 0.20, vx: 0, vy: 0, r: 0.020, m: 1, owner: 0 }];
    s = closeEnd(s);
    assert.strictEqual(s.status, 'ended'); // 1end モードは 1 エンドで終了
});
```

- [ ] **Step 2: FAIL 確認**

- [ ] **Step 3: `src/game/state.js` に `closeEnd` を追加**

```javascript
import { scoreEnd } from './rules.js';

export function closeEnd(state) {
    const next = cloneState(state);
    const result = scoreEnd(next.world.balls);
    next.endScores.push(result);

    // ハンマー権の遷移: 得点側 → 次エンドは非得点側がハンマー / ブランクエンドは保持
    if (result.side !== null) {
        next.hammerSide = 1 - result.side;
    }

    // 次エンドへ
    next.endIndex++;
    next.stoneIndex = 0;
    next.world.balls = [];
    next.currentSide = next.hammerSide === 0 ? 1 : 0;

    const totalEnds = ENDS_PER_MATCH[next.mode] + next.extraEndsUsed;
    if (next.endIndex >= totalEnds) {
        // 同点判定 → エキストラエンド or 終了
        const totals = [0, 0];
        for (const es of next.endScores) {
            if (es.side !== null) totals[es.side] += es.points;
        }
        if (totals[0] === totals[1] && next.extraEndsUsed < 1) {
            next.extraEndsUsed++; // エキストラエンド 1 回
        } else {
            next.status = 'ended';
        }
    }
    return next;
}

function cloneState(s) {
    return {
        ...s,
        endScores: s.endScores.slice(),
        world: {
            balls: s.world.balls.slice(),
            bounds: { ...s.world.bounds },
            params: { ...s.world.params },
        },
    };
}
```

- [ ] **Step 4: テスト実行 → PASS**

- [ ] **Step 5: コミット**

```powershell
git add -A
git commit -m "feat(state): add closeEnd with hammer transfer and extra-end logic (M1v2.3-B)"
```

#### Task M1v2.3-C: 既存 state.test.js の旧 API テストを修正

- [ ] **Step 1**: `state.test.js` 内で `BALLS_PER_PLAYER` / 自陣配置 / `placeBall` を参照しているテストを削除または改修
- [ ] **Step 2**: `node tests/_node-runner.js tests/unit/state.test.js` で全 PASS 確認 (想定 18 件)
- [ ] **Step 3**: 全テスト実行で 117 → 119 → 約 124 PASS を確認
- [ ] **Step 4**: コミット

```powershell
git commit -am "test(state): adapt existing tests to v2 sequential-throw model (M1v2.3-C)"
```

---

### M1v2.4: FGZ + 1-rock rule 実装

**目的**: フリーガードゾーン (ホッグライン〜ティーラインのハウス外帯) を定義し、1-rock rule (最初の 1 投で相手のガード球を除去禁止) を実装する。

**Files:**
- Create: `src/game/fgz.js`
- Create: `tests/unit/fgz.test.js`
- Modify: `src/game/loop.js` (`applyShot` 後に FGZ 違反チェックを呼ぶ)

#### Task M1v2.4-A: fgz.js 実装

- [ ] **Step 1: テストを書く** (`tests/unit/fgz.test.js` 新規)

```javascript
import { test, assert, run } from '../assert.js';
import { isInFgz, isOutOfLane, detectFgzViolation } from '../../src/game/fgz.js';

test('isInFgz: y between TEE_LINE and HOG_LINE, outside house', () => {
    assert.strictEqual(isInFgz({ x: 0.25, y: 0.30 }), true); // FGZ 内
    assert.strictEqual(isInFgz({ x: 0.25, y: 0.20 }), false); // ハウス内
    assert.strictEqual(isInFgz({ x: 0.25, y: 0.50 }), false); // FGZ 外
});

test('isOutOfLane: outside lane bounds OR before hog line', () => {
    const bounds = { x: 0, y: 0, w: 0.5, h: 1.5 };
    assert.strictEqual(isOutOfLane({ x: -0.01, y: 0.50 }, bounds), true); // 左サイド外
    assert.strictEqual(isOutOfLane({ x: 0.25, y: 0.50 }, bounds), false); // 有効
});

test('detectFgzViolation: stoneIndex 0 (1 投目) のテイクアウトは違反', () => {
    const before = [
        { x: 0.25, y: 0.30, owner: 1 }, // 相手ガード球 (FGZ 内)
    ];
    const after = []; // テイクアウトされて消失
    const result = detectFgzViolation({ before, after, stoneIndex: 0, currentSide: 0 });
    assert.strictEqual(result.violated, true);
});

test('detectFgzViolation: stoneIndex 1 以降は違反でない', () => {
    const before = [{ x: 0.25, y: 0.30, owner: 1 }];
    const after = [];
    const result = detectFgzViolation({ before, after, stoneIndex: 1, currentSide: 0 });
    assert.strictEqual(result.violated, false);
});

run();
```

- [ ] **Step 2: テスト実行 → FAIL**

- [ ] **Step 3: `src/game/fgz.js` を実装**

```javascript
// FGZ (フリーガードゾーン) 判定 + 1-rock rule。
// FGZ 帯: ティーライン (y=HOUSE.cy) より下、ホッグライン (y=HOG_LINE_Y) より上の領域
// で、かつハウス外。

import { HOUSE, isInHouse } from './house.js';

export const HOG_LINE_Y = 0.40;
export const TEE_LINE_Y = HOUSE.cy; // 0.20

export function isInFgz(ball) {
    if (ball.y <= TEE_LINE_Y) return false;
    if (ball.y >= HOG_LINE_Y) return false;
    return !isInHouse(ball);
}

export function isOutOfLane(ball, bounds) {
    return ball.x < bounds.x || ball.x > bounds.x + bounds.w
        || ball.y < bounds.y || ball.y > bounds.y + bounds.h;
}

/**
 * 1-rock rule 違反検出。
 * 規則: stoneIndex === 0 (各エンド最初の 1 投) で、相手の FGZ 内ストーンが
 *       投擲後に消失していたら違反 → 元位置復元する必要があると返す。
 * @param {{before: Array, after: Array, stoneIndex: number, currentSide: 0|1}} args
 * @returns {{ violated: boolean, restoreList: Array }}
 */
export function detectFgzViolation({ before, after, stoneIndex, currentSide }) {
    if (stoneIndex !== 0) return { violated: false, restoreList: [] };
    const opponent = 1 - currentSide;
    const beforeOpponentGuards = before.filter(b => b.owner === opponent && isInFgz(b));
    const restoreList = [];
    for (const g of beforeOpponentGuards) {
        const stillThere = after.some(a => a.owner === opponent
            && Math.hypot(a.x - g.x, a.y - g.y) < 0.005);
        if (!stillThere) restoreList.push(g);
    }
    return { violated: restoreList.length > 0, restoreList };
}
```

- [ ] **Step 4: テスト実行 → PASS** (4 件)

- [ ] **Step 5: コミット**

```powershell
git add src/game/fgz.js tests/unit/fgz.test.js
git commit -m "feat(fgz): add free guard zone and 1-rock rule (M1v2.4-A)"
```

#### Task M1v2.4-B: loop.js への統合

- [ ] **Step 1: `src/game/loop.js` の `applyShot` 後に FGZ 違反チェックを追加**

```javascript
import { detectFgzViolation } from './fgz.js';

// applyShot 内、物理シミュレーション完了後:
const after = next.world.balls;
const v = detectFgzViolation({ before, after, stoneIndex: state.stoneIndex, currentSide: state.currentSide });
if (v.violated) {
    // 元位置復元
    for (const g of v.restoreList) {
        next.world.balls.push({ ...g, vx: 0, vy: 0 });
    }
    // 投擲ストーン自身も無効化 (場外送り)
    // 仕様: 違反した自分のストーンは除去
    const myStoneIdx = next.world.balls.findIndex(b => b.owner === state.currentSide
        && Math.abs(b.y - 1.45) > 0.5); // 動いた自分のストーン (簡易判定)
    if (myStoneIdx !== -1) next.world.balls.splice(myStoneIdx, 1);
}
```

- [ ] **Step 2: 既存 `loop.test.js` に FGZ 違反検証テストを 1 件追加**

- [ ] **Step 3: 全テスト実行 → PASS 確認** (想定 約 128 PASS)
- [ ] **Step 4: コミット**

```powershell
git commit -am "feat(loop): integrate FGZ violation handling (M1v2.4-B)"
```

---

### M1v2.5: 入力 UI 改修 (案 A / pointer.js + keyboard.js)

**目的**: `placing` 段を「x スライダーをドラッグで連続調整」に変更し、`aiming` 段は既存スリングショットを継承する。

**Files:**
- Modify: `src/input/pointer.js`
- Modify: `src/input/keyboard.js`
- Modify: `tests/unit/pointer.test.js`
- Modify: `tests/unit/keyboard.test.js`

#### Task M1v2.5-A: pointer.js の placing FSM 改修

- [ ] **Step 1: 失敗するテストを書く** (`tests/unit/pointer.test.js` に追加)

```javascript
test('placing: drag updates launchX continuously', () => {
    const events = [];
    const fsm = createPointerFsm({
        onPlace: (x) => events.push({ type: 'place', x }),
        onShoot: () => {},
        bounds: { x: 0, y: 0, w: 0.5, h: 1.5 },
    });
    fsm.dispatch({ type: 'pointerdown', x: 0.10, y: 1.45 });
    fsm.dispatch({ type: 'pointermove', x: 0.30, y: 1.45 });
    fsm.dispatch({ type: 'pointermove', x: 0.40, y: 1.45 });
    fsm.dispatch({ type: 'pointerup', x: 0.40, y: 1.45 });
    // ドラッグ中は launchX が 0.10 → 0.30 → 0.40 と連続更新される
    assert.deepStrictEqual(events.map(e => e.x), [0.10, 0.30, 0.40]);
});

test('placing: launchX is clamped to [0.05, 0.45]', () => {
    const events = [];
    const fsm = createPointerFsm({
        onPlace: (x) => events.push(x),
        onShoot: () => {},
        bounds: { x: 0, y: 0, w: 0.5, h: 1.5 },
    });
    fsm.dispatch({ type: 'pointerdown', x: -0.10, y: 1.45 });
    fsm.dispatch({ type: 'pointermove', x: 0.60, y: 1.45 });
    assert.strictEqual(events[0], 0.05); // 下限クランプ
    assert.strictEqual(events[1], 0.45); // 上限クランプ
});
```

- [ ] **Step 2: FAIL 確認**

- [ ] **Step 3: `src/input/pointer.js` の placing 段を改修**

既存 4 状態 FSM (`placing → aiming → aiming-power → idle`) は維持。`placing` 段の挙動だけ以下に置換:

```javascript
const LAUNCH_X_MIN = 0.05;
const LAUNCH_X_MAX = 0.45;
const LAUNCH_Y = 1.45;

function clampLaunchX(x) {
    return Math.max(LAUNCH_X_MIN, Math.min(LAUNCH_X_MAX, x));
}

// placing 段ハンドラ (置換)
function handlePlacing(state, ev) {
    if (ev.type === 'pointerdown') {
        const x = clampLaunchX(ev.x);
        state.launchX = x;
        state.config.onPlace(x);
        return { ...state, mode: 'placing-drag' };
    }
}

function handlePlacingDrag(state, ev) {
    if (ev.type === 'pointermove') {
        const x = clampLaunchX(ev.x);
        state.launchX = x;
        state.config.onPlace(x);
        return state;
    }
    if (ev.type === 'pointerup') {
        return { ...state, mode: 'aiming' }; // aiming 段へ遷移
    }
}
```

- [ ] **Step 4: テスト実行 → PASS**
- [ ] **Step 5: 既存 pointer.test.js の旧 placing 段テストを修正 (自陣領域タップ → x スライダー)**
- [ ] **Step 6: コミット**

```powershell
git commit -am "feat(input/pointer): change placing to draggable x-slider (M1v2.5-A)"
```

#### Task M1v2.5-B: keyboard.js の placing 段改修

- [ ] **Step 1: 失敗するテストを書く** (`tests/unit/keyboard.test.js` に追加)

```javascript
test('placing: ArrowLeft/Right adjusts launchX by ±0.01', () => {
    const events = [];
    const fsm = createKeyboardFsm({
        onPlace: (x) => events.push(x),
        initialLaunchX: 0.25,
    });
    fsm.dispatch({ type: 'keydown', key: 'ArrowRight' });
    fsm.dispatch({ type: 'keydown', key: 'ArrowLeft' });
    assert.approxEqual(events[0], 0.26, 1e-9);
    assert.approxEqual(events[1], 0.25, 1e-9);
});

test('placing: Shift+Arrow adjusts by ±0.05', () => {
    const events = [];
    const fsm = createKeyboardFsm({
        onPlace: (x) => events.push(x),
        initialLaunchX: 0.25,
    });
    fsm.dispatch({ type: 'keydown', key: 'ArrowRight', shiftKey: true });
    assert.approxEqual(events[0], 0.30, 1e-9);
});

test('T key toggles aimPreview setting', () => {
    let toggled = 0;
    const fsm = createKeyboardFsm({ onPlace: () => {}, onTogglePreview: () => toggled++ });
    fsm.dispatch({ type: 'keydown', key: 't' });
    fsm.dispatch({ type: 'keydown', key: 'T' });
    assert.strictEqual(toggled, 2);
});
```

- [ ] **Step 2: FAIL 確認**
- [ ] **Step 3: `src/input/keyboard.js` の placing 段を「x スライダー左右移動」に置換し、グローバル `T` キーハンドラを追加**
- [ ] **Step 4: テスト実行 → PASS**
- [ ] **Step 5: 既存 keyboard.test.js の旧 placing 段テスト 14 件を改修 (自陣 24 方位 → x スライダー操作)**
- [ ] **Step 6: コミット**

```powershell
git commit -am "feat(input/keyboard): replace placing with x-slider + T toggle (M1v2.5-B)"
```

---

### M1v2.6: 軌道予測線描画 (5.1 MVP)

**目的**: 摩擦のみ・他球無視の自由飛行軌道を `Path2D` で描画する。aiming 段の引きベクトルから初速を計算し、停止までを N ステップ先読み。

**Files:**
- Create: `src/render/preview.js`
- Modify: `src/render/canvas.js` (描画ループから preview を呼ぶ)
- Modify: `src/main.js` (aim 中フラグを preview に渡す)

#### Task M1v2.6-A: preview.js の数値積分

- [ ] **Step 1: テストを書く** (`tests/unit/preview.test.js` 新規)

```javascript
import { test, assert, run } from '../assert.js';
import { computeTrajectory } from '../../src/render/preview.js';

test('computeTrajectory: zero velocity returns single-point path', () => {
    const path = computeTrajectory({ x: 0.25, y: 1.45 }, { vx: 0, vy: 0 }, { mu: 0.3 });
    assert.strictEqual(path.length, 1);
});

test('computeTrajectory: friction stops the stone within N steps', () => {
    const path = computeTrajectory({ x: 0.25, y: 1.45 }, { vx: 0, vy: -0.5 }, { mu: 0.3 });
    assert.ok(path.length > 1);
    assert.ok(path.length < 500); // 200 ステップ程度で停止する想定
    // 最終点は初期点より上方 (y が小さく) にある
    assert.ok(path[path.length - 1].y < 1.45);
});

run();
```

- [ ] **Step 2: FAIL 確認**
- [ ] **Step 3: `src/render/preview.js` を実装**

```javascript
// 軌道予測線: 摩擦のみの自由飛行軌道を semi-implicit Euler で先読み。
// 他球との衝突は無視 (MVP)。

const DT = 1 / 120;
const N_MAX = 240; // 2 秒分
const V_EPS = 0.001;

export function computeTrajectory(pos, vel, params, bounds) {
    const path = [{ x: pos.x, y: pos.y }];
    let { x, y } = pos;
    let { vx, vy } = vel;
    const mu = params.mu;
    for (let i = 0; i < N_MAX; i++) {
        const v = Math.hypot(vx, vy);
        if (v < V_EPS) break;
        // 摩擦による減速 (反対方向の加速度)
        const ax = -mu * vx;
        const ay = -mu * vy;
        vx += ax * DT;
        vy += ay * DT;
        x += vx * DT;
        y += vy * DT;
        if (bounds && (x < bounds.x || x > bounds.x + bounds.w
            || y < bounds.y || y > bounds.y + bounds.h)) break;
        path.push({ x, y });
    }
    return path;
}

/**
 * Path2D に軌道線をストロークする (描画側ヘルパ)。
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x,y}>} path
 * @param {(p:{x,y}) => {x:number, y:number}} toPx
 */
export function drawTrajectory(ctx, path, toPx) {
    if (path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const p0 = toPx(path[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < path.length; i++) {
        const p = toPx(path[i]);
        ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
}
```

- [ ] **Step 4: テスト実行 → PASS** (2 件)
- [ ] **Step 5: コミット**

```powershell
git add src/render/preview.js tests/unit/preview.test.js
git commit -m "feat(render/preview): add trajectory preview (friction-only) (M1v2.6-A)"
```

#### Task M1v2.6-B: canvas.js から preview を呼ぶ

- [ ] **Step 1: `src/render/canvas.js` の描画ループに preview 呼出を追加**

```javascript
import { computeTrajectory, drawTrajectory } from './preview.js';

export function render(ctx, state, ui) {
    // ... 既存描画 ...
    if (ui.aiming && ui.aimPreviewEnabled) {
        const startPos = { x: state.launchX, y: 1.45 };
        const vel = { vx: ui.aimVx, vy: ui.aimVy };
        const path = computeTrajectory(startPos, vel, state.world.params, state.world.bounds);
        drawTrajectory(ctx, path, ui.toPx);
    }
}
```

- [ ] **Step 2: 描画スモークテスト追加** (`tests/unit/_smoke.test.js` に 1 件)
- [ ] **Step 3: 全テスト実行 → PASS 確認**
- [ ] **Step 4: コミット**

```powershell
git commit -am "feat(render/canvas): wire trajectory preview during aiming (M1v2.6-B)"
```

---

### M1v2.7: HUD 再設計 + 設定パネル

**目的**: エンド表示 / ハンマー / 得点プレビュー / パワーゲージ / 設定パネル (`T` トグル GUI) を追加し、`TUTORIAL_TEXT` を v2 仕様に更新する。

**Files:**
- Create: `src/game/settings.js`
- Create: `tests/unit/settings.test.js`
- Create: `tests/unit/hud.test.js`
- Modify: `src/render/ui.js`
- Modify: `src/main.js` (起動時 settings ロード)

#### Task M1v2.7-A: settings.js (`localStorage` 永続化)

- [ ] **Step 1: テストを書く** (`tests/unit/settings.test.js` 新規)

```javascript
import { test, assert, run } from '../assert.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../../src/game/settings.js';

// localStorage モック
const mockStorage = (() => {
    let data = {};
    return {
        getItem: (k) => data[k] ?? null,
        setItem: (k, v) => { data[k] = v; },
        clear: () => { data = {}; },
    };
})();

test('loadSettings returns DEFAULT when no stored value', () => {
    mockStorage.clear();
    const s = loadSettings(mockStorage);
    assert.deepStrictEqual(s, DEFAULT_SETTINGS);
});

test('saveSettings persists to localStorage', () => {
    mockStorage.clear();
    saveSettings({ aimPreview: false }, mockStorage);
    const s = loadSettings(mockStorage);
    assert.strictEqual(s.aimPreview, false);
});

test('loadSettings tolerates corrupt JSON and returns DEFAULT', () => {
    mockStorage.clear();
    mockStorage.setItem('physicalOhajiki.v2.settings', '{invalid json');
    const s = loadSettings(mockStorage);
    assert.deepStrictEqual(s, DEFAULT_SETTINGS);
});

run();
```

- [ ] **Step 2: FAIL 確認**
- [ ] **Step 3: `src/game/settings.js` を実装**

```javascript
const KEY = 'physicalOhajiki.v2.settings';

export const DEFAULT_SETTINGS = Object.freeze({
    aimPreview: true,
});

export function loadSettings(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return { ...DEFAULT_SETTINGS };
    try {
        const raw = storage.getItem(KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(settings, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return;
    try {
        storage.setItem(KEY, JSON.stringify(settings));
    } catch {
        // 容量超過などは無視
    }
}
```

- [ ] **Step 4: テスト実行 → PASS** (3 件)
- [ ] **Step 5: コミット**

```powershell
git add src/game/settings.js tests/unit/settings.test.js
git commit -m "feat(settings): add localStorage-backed settings (M1v2.7-A)"
```

#### Task M1v2.7-B: hud.js / ui.js 再設計

- [ ] **Step 1: テストを書く** (`tests/unit/hud.test.js` 新規)

```javascript
import { test, assert, run } from '../assert.js';
import { computePowerLevel, computeScorePreview, formatHammerLabel } from '../../src/render/ui.js';

test('computePowerLevel: ratio of pull distance to max', () => {
    assert.approxEqual(computePowerLevel(0.10, 0.20), 0.5, 1e-9);
    assert.approxEqual(computePowerLevel(0.30, 0.20), 1.0, 1e-9); // クランプ
});

test('computeScorePreview: live scoring during end', () => {
    const balls = [
        { x: 0.25, y: 0.20, owner: 0 },
        { x: 0.30, y: 0.20, owner: 1 },
    ];
    const p = computeScorePreview(balls);
    assert.deepStrictEqual(p, { side: 0, points: 1 });
});

test('formatHammerLabel: returns side label string', () => {
    assert.strictEqual(formatHammerLabel(0), 'P0');
    assert.strictEqual(formatHammerLabel(1), 'P1');
});

run();
```

- [ ] **Step 2: FAIL 確認**
- [ ] **Step 3: `src/render/ui.js` に以下を追加**
  - `computePowerLevel(pullDist, maxPullDist)` (5.2 パワーゲージ)
  - `computeScorePreview(balls)` (5.3 距離リング / `scoreEnd` を内部呼出)
  - `formatHammerLabel(side)` (5.4 ハンマー HUD)
  - 設定パネル (歯車アイコン + チェックボックス) の DOM 生成関数 `renderSettingsPanel(container, settings, onChange)`
  - `TUTORIAL_TEXT` を `'指で引いて離す。線を読んで的に近づけて勝つ。'` (28 文字) に更新
- [ ] **Step 4: テスト実行 → PASS** (3 件)
- [ ] **Step 5: 全テスト実行 → 約 138 PASS**
- [ ] **Step 6: コミット**

```powershell
git commit -am "feat(ui): add power gauge / score preview / hammer HUD / settings panel (M1v2.7-B)"
```

#### Task M1v2.7-C: main.js への統合

- [ ] **Step 1: `src/main.js` 起動シーケンスに以下を追加**

```javascript
import { loadSettings, saveSettings } from './game/settings.js';
import { renderSettingsPanel } from './render/ui.js';

// 起動時
const settings = loadSettings();
renderSettingsPanel(document.getElementById('settings-root'), settings, (next) => {
    Object.assign(settings, next);
    saveSettings(settings);
});

// `T` キーハンドラ (keyboard.js から呼ばれる)
function onTogglePreview() {
    settings.aimPreview = !settings.aimPreview;
    saveSettings(settings);
}
```

- [ ] **Step 2: ブラウザでスモーク確認** (`tests/runner.html` で起動)
- [ ] **Step 3: コミット**

```powershell
git commit -am "feat(main): wire settings load/save and T toggle (M1v2.7-C)"
```

---

### M1v2.8: テスト全リファクタ + 完了検証

**目的**: 全テストの v2 整合性を確認し、約 141 PASS を達成する。

#### Task M1v2.8-A: テスト件数の最終確認

- [ ] **Step 1: 全テスト実行**

```powershell
node tests/_node-runner.js
```

期待: 約 **141 PASS** (内訳: _smoke 4 / rng 4 / collision 10 / engine 12 / determinism 3 / pointer 12 / keyboard 17 / state 18 / rules 6 / effects 18 / sfx 12 / loop 8 / house 5 / fgz 4 / settings 3 / hud 3 / preview 2)

- [ ] **Step 2: ブラウザランナー (`tests/runner.html`) でも全 PASS 確認**
- [ ] **Step 3: ペルソナ手動プレイテスト** (1 試合 ≤ 3 分 / G3' / G7 / G8 確認)
- [ ] **Step 4: ブラウザ DevTools パフォーマンスタブで 60fps 計測** (G5)
- [ ] **Step 5: 結果を `Plans/PhysicalOhajiki.検証ログ.md` に追記**

#### Task M1v2.8-B: verification-before-completion スキル適用

- [ ] **Step 1**: `.github/skills/verification-before-completion/SKILL.md` を読み込み
- [ ] **Step 2**: 同スキルのチェックリストを順に実行
- [ ] **Step 3**: 全項目 PASS なら Phase 1v2 完了マーク
- [ ] **Step 4: タグ付けコミット**

```powershell
git tag v2.0.0-phase1v2-complete
git commit --allow-empty -m "milestone: Phase 1v2 (MVP-α) complete"
```

---

## 7. Phase 2v2: MVP-β 拡張

### M2v2.1: リプレイ URL 共有 (5.5 MVP)

**Files:** `src/game/replay.js` (新規) / `tests/unit/replay.test.js` (新規)

- [ ] **Step 1**: URL シードに mode + hammerSide + endScores を short string でエンコードする `encodeShareUrl(state)` を実装
- [ ] **Step 2**: `decodeShareUrl(string)` で復元する逆変換を実装
- [ ] **Step 3**: round-trip テスト 5 件追加
- [ ] **Step 4**: HUD に「結果共有 URL コピー」ボタン追加
- [ ] **Step 5: コミット**

### M2v2.2: 1end モード追加

- [ ] **Step 1**: `state.js` の `mode` で `'1end'` を既に M1v2.3-A で実装済 → UI からモード選択を有効化
- [ ] **Step 2**: モード切替テスト追加
- [ ] **Step 3**: 1 試合時間 G4' (≤ 1.5 分) を計測
- [ ] **Step 4: コミット**

### M2v2.3: ペルソナスコア再計測 (G2 検証)

- [ ] **Step 1**: §1.2 と同等のペルソナスコアプロトコルを再実施
- [ ] **Step 2**: `Plans/PhysicalOhajiki.検証ログ.md` に追記
- [ ] **Step 3**: G2 ≥ 70 点 / G1' ≥ 20/25 達成を確認
- [ ] **Step 4: タグ付けコミット**

```powershell
git tag v2.1.0-phase2v2-complete
```

---

## 8. リスクと撤退判断

提案書 §7.1 R1〜R7 を継承。各 Phase 末で再評価し、不合格時は以下:

| 不合格地点 | 対応 |
|---|---|
| Phase 0v2 不合格 | v3 ピボット検討 (例: ストーン回転 / スウィーピング採用) or 凍結 |
| Phase 1v2 / G5 失敗 | 軌道予測線の N_MAX 削減 / requestIdleCallback 化 |
| Phase 1v2 / G3' 失敗 | エンド数を 2 → 1 に縮約 (デフォルトモード変更) |
| Phase 2v2 / G2 失敗 | 追加イテレーション (ハウス可視化強化 / SFX 追加) |

---

## 9. v1 からの差分サマリ (引継ぎ用)

| 項目 | v1 | v2 |
|---|---|---|
| フィールド | 1.0 × 1.0 m 正方形 | 0.5 × 1.5 m 縦長レーン |
| 物理 | 反発 + 摩擦 + 弱引力 (G=1e-3) | 反発 + 摩擦 (G 削除) |
| 球の供給 | 自陣に 5 球 (10ball) / 3 球 (6ball) を初期配置 | 順次投擲 (各エンド各 P 4 投) |
| 勝敗 | 残数 / タイブレーク=中心距離合計 | カーリング得点 (最近接相手より内側の自陣球数) |
| エンド | 概念なし | 2 エンド + エキストラ 1 |
| ハンマー | なし | あり (シード乱数で初期決定 / 得点側→非得点側へ移譲) |
| FGZ | なし | ホッグライン〜ティー間ハウス外 / 1-rock rule |
| 軌道予測線 | なし | あり (`T` キー / 設定 ON/OFF) |
| 設定保存 | なし | `localStorage` (`physicalOhajiki.v2.settings`) |
| テスト件数 | 126 | 約 141 |

---

## 10. 自己レビュー (writing-plans §Self-Review)

| 観点 | 結果 |
|---|---|
| **Spec coverage** | 提案書 §1〜§9 の全項目に対応タスクあり (§5 の MVP-β 5.5 は M2v2.1 / §A-1/A-2/A-3 は M1v2.5/M1v2.6/M1v2.7) |
| **Placeholder scan** | 全コード片を実コードで記載済 / TBD なし |
| **Type consistency** | `scoreEnd` 戻り値 `{side, points}` / `evaluateWinner` 戻り値 `{winner, totals, reason}` / `closeEnd` 入出力一貫 / `computeTrajectory` 引数 `(pos, vel, params, bounds)` 一貫 |
| **Test count math** | 117 (M1v2.1 後) → 119 (M1v2.2) → 124 (M1v2.3) → 128 (M1v2.4) → 130 (M1v2.5) → 132 (M1v2.6) → 138 (M1v2.7) → 141 (M1v2.8 整理後) — 提案書 §6 の 141 と整合 |

---

## 11. 実行ハンドオフ

> **Plan complete.** 実装は **別セッション** で以下のいずれかで進めてください:
>
> **(1) Subagent-Driven (推奨)**: タスクごとに独立サブエージェントを派遣 / 各タスク後にレビュー
> → REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
>
> **(2) Inline Execution**: 本セッション内でチェックポイント付き一括実行
> → REQUIRED SUB-SKILL: `superpowers:executing-plans`
>
> いずれの場合も、**Phase 0v2 (テスタ検証) を先行実施し、合格後に Phase 1v2 に着手** してください。
