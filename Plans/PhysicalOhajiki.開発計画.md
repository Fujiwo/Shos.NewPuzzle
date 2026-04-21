# 物理おはじき (Physical Ohajiki) 開発計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 反発・摩擦・弱引力で動くおはじきを 2 人で交互に弾き、残数で勝敗を決めるブラウザ完結型カジュアルパズルを MVP-α / MVP-β の 2 段階で構築する。

**Architecture:** Vanilla JS (ES2022+, ES Modules) + Canvas 2D の単一ページ構成。決定論的な物理シミュレーション core を分離し、入力 / 描画 / 状態管理を疎結合に保つ。URL シードによる非同期対戦とリプレイを後段で追加。

**Tech Stack:** HTML / CSS / Vanilla JavaScript (ES2022+) / Canvas 2D API / ES Modules / ビルドレス (`<script type="module">` 直接ロード) / ローカル静的サーバ (任意 / ES Modules CORS 制約回避用のみ) / 実行時依存ゼロ

> **入力資料**: [Ideas/PhysicalOhajiki.アイディア.md](../Ideas/PhysicalOhajiki.アイディア.md) / [Ideas/PhysicalOhajiki.ゲーム性評価.md](../Ideas/PhysicalOhajiki.ゲーム性評価.md) / [.github/copilot-instructions.md](../.github/copilot-instructions.md)

---

## 1. ゴールと成功基準

### 1.1 数値目標

| # | 指標 | 目標値 | 測定タイミング | 根拠 |
|---|---|---|---|---|
| G1 | 評価書再採点スコア | **≥ 20/25 点** (現状 18/25) | Phase 2 完了時 | 評価書 §1 |
| G2 | ペルソナ重み付け総合スコア | **≥ 70 点** (現状 56.5 点) | Phase 2 完了時 | アイディア §1.1 |
| G3 | 1 プレイ時間 (10 球モード中央値) | **≤ 3 分** | Phase 1 完了時 | リポジトリ方針 |
| G4 | 1 プレイ時間 (6 球モード中央値) | **≤ 1.5 分** | Phase 1 完了時 | アイディア §2.4.1 |
| G5 | 描画フレームレート (20 球時) | **≥ 60 fps (1 frame ≤ 16ms)** | Phase 1 / Phase 2 完了時 | リポジトリ方針 / R10 |
| G6 | チュートリアル文字数 | ≤ 100 文字 | 仕様凍結時 | リポジトリ方針 |
| G7 | 起動 → 最初の有効操作 | ≤ 15 秒 | Phase 1 完了時 | リポジトリ方針 |
| G8 | タッチ誤操作率 | ≤ 30% | Phase 0 完了時 | アイディア §9 R3 |
| G9 | 引力モード支持率 | ≥ 60% (テスタ ≥5 名 / Mobile ≥3 名) | Phase 0 完了時 | プロンプト Phase 0 合格基準 |

### 1.2 ペルソナスコア測定プロトコル (Phase 2 完了時 / 必須)

**目的**: G2 (ペルソナ重み付け ≥70 点) の達成を客観評価する。

**実施手順:**

1. **テスタ募集**: P1 ハルカ相当 (Mobile / 通勤利用) ≥1 名 / P2 タカシ相当 (PC / 戦略派) ≥1 名 / P3 ミナ相当 (Tablet / リラックス層) ≥1 名 を確保する。
2. **プレイセッション**: 各テスタに 10 球モード × 1 戦 + 6 球モード × 1 戦を実施 (所要 5〜10 分)。
3. **アンケート**: 付録 A の 10 問テンプレに沿って 100 点満点で採点。
4. **集計**: テスタごとの平均点を P1/P2/P3 スコアとし、§1.1 の重み付け式に代入。
   - `総合 = (P1 × 6 + P2 × 3 + P3 × 1) / 10`
5. **記録**: 結果を `Plans/PhysicalOhajiki.検証ログ.md` の「Phase 2 / G2 達成判定」節に追記。
6. **判定**: ≥70 点 → G2 合格 / <70 点 → 改善案検討 (§10 撤退判断 ではなく追加イテレーション)。

---

## 2. フェーズ分割概要

```
[Phase 0] 検証プロト (W1 早期検証)
      │ ★合否ゲート★ (§10 撤退判断と接続)
      ▼
[Phase 1] MVP-α 実装 (アイディア §10 #1〜#6, #11 + #5)
      │ ★完了検証★ (verification-before-completion)
      ▼
[Phase 2] MVP-β 拡張 (アイディア §10 #7, #8, #12, #13)
        ★最終検証★ (G1 / G2 達成判定)
```

---

## 3. ディレクトリ / ファイル構成

リポジトリ方針 (`copilot-instructions.md`) に準拠。`/server/` は MVP 範囲外のため除外。

```
/                       … index.html (ゲーム本体エントリ)
/src/
  ├ main.js             … エントリポイント (DOM ↔ game ループ接続)
  ├ physics/
  │  ├ engine.js        … 物理 core (純粋関数 / 決定論的)
  │  ├ collision.js     … 円-円 / 円-壁 衝突解決
  │  ├ gravity.js       … 万有引力計算 (G モード切替)
  │  └ rng.js           … シード可能 RNG (mulberry32)
  ├ game/
  │  ├ state.js         … ゲーム状態モデル (ターン / スコア)
  │  ├ rules.js         … 場外判定 / 勝敗判定 / 試合長モード
  │  └ replay.js        … URL シード エンコード/デコード (Phase 2)
  ├ input/
  │  ├ pointer.js       … タッチ / マウス スリングショット
  │  └ keyboard.js      … キーボード操作 (アクセシビリティ)
  ├ render/
  │  ├ canvas.js        … Canvas 2D 描画ループ
  │  ├ effects.js       … 衝突波紋 / 弾き出しエフェクト
  │  └ ui.js            … HUD / モード選択 / チュートリアル
  └ audio/
     └ sfx.js           … 効果音 (Phase 1 後半)
/styles/
  └ main.css            … レイアウト / カラーテーマ
/assets/
  ├ sounds/             … 効果音ファイル
  └ patterns/           … 駒の表面パターン (二重符号化)
/prototypes/
  └ ohajiki/            … Phase 0 物理プロト (G/e/μ スライダ UI)
     └ index.html       … 単一 HTML で完結
/tests/
  ├ runner.html         … ブラウザ実行テストランナー
  └ unit/
     ├ engine.test.js
     ├ collision.test.js
     ├ gravity.test.js
     ├ rng.test.js
     ├ rules.test.js
     ├ replay.test.js
     └ determinism.test.js  … 決定論性スナップショット
/Plans/
  ├ PhysicalOhajiki.開発計画.md    … 本ファイル
  └ PhysicalOhajiki.検証ログ.md    … 各 Phase 完了時のエビデンス追記先
```

> **`/server/` 除外理由**: アイディア §6.2 の「バックエンド採用条件 (リアルタイム同期 or グローバルランキング)」を MVP では満たさないため。

---

## 4. 技術選定の確認

| 項目 | 選定 | 根拠 |
|---|---|---|
| 言語 | Vanilla JavaScript (ES2022+) | リポジトリ方針 |
| モジュール | ES Modules (`import`/`export`) | リポジトリ方針 |
| 描画 | Canvas 2D API | アイディア §6.2 / 60fps 達成性 |
| ビルド | **不要** (ビルドレス / `<script type="module">` 直接ロード) | リポジトリ方針 |
| フレームワーク | **不採用** (React/Vue/Angular/jQuery) | リポジトリ方針 |
| バックエンド | **不採用** (MVP) | アイディア §6.2 採用条件未達 |
| テストランナー | **ブラウザネイティブ** (`/tests/runner.html` + 自作 minimal assert) | 依存ゼロ志向 |
| パッケージマネージャ | **不使用** (実行時依存ゼロ) | 依存ゼロ志向 |
| 開発時ツール | ローカル静的サーバ (`python -m http.server` 等任意) | ES Modules CORS 制約のみ対処 |

> **依存ゼロ判断**: テストランナーも外部ライブラリ (Jest / Vitest) を使わず自作する。理由は「20 個程度の単体テストに数 MB のビルドチェーンを持ち込むトレードオフが釣り合わない」+「ブラウザ単体で実行できることが本案の価値を体現する」ため。

### 4.1 モジュール公開 API 仕様 (Type consistency 担保)

後段タスクで参照する型 / シグネチャを先に確定する。各 Sub-task の実装は本仕様に合わせる。

**`src/physics/rng.js`** (M1.1.B で実装):
```js
// シードから 0..1 の擬似乱数生成器を返す。同シード → 同系列を保証。
export function createRng(seed: number): () => number;
```

**`src/physics/collision.js`** (M1.1.C / M1.1.D で実装):
```js
// 円-円弾性衝突: a, b の位置・速度を破壊的に更新 (in-place)。重なり時のみ作用。
export function resolveCircleCircle(a: Ball, b: Ball, e: number): boolean;
// 円-壁反射: bounds の各辺に対し位置・速度を補正。
export function resolveCircleWall(ball: Ball, bounds: Rect, e: number): boolean;
```

**`src/physics/gravity.js`** (M1.1.F で実装):
```js
// 全球ペアに引力加速度を加算。G=0 で no-op。距離下限 d ≥ 2r でクランプ。
export function applyGravity(balls: Ball[], G: number, dt: number): void;
```

**`src/physics/engine.js`** (M1.1.G で実装):
```js
// 1 frame シミュレーションを進める純粋関数 (内部で gravity/collision/friction を順に適用)。
export function step(world: World, dt: number): World;
// 全球静止または timeoutMs 超過まで step を反復 (turn 完了)。
export function runUntilRest(world: World, timeoutMs: number, dt: number): World;

// 共通型
export type Ball = { x: number, y: number, vx: number, vy: number, r: number, m: number, owner: 0 | 1 };
export type Rect = { x: number, y: number, w: number, h: number };
export type World = { balls: Ball[], bounds: Rect, params: { G: number, e: number, mu: number } };
```

**`src/game/state.js`** (M1.5 で実装):
```js
export type GameState = {
  world: World,
  turn: number,            // 1 始まり
  currentPlayer: 0 | 1,
  scores: [number, number],
  mode: '10ball' | '6ball',
  thinkDeadlineMs: number, // performance.now() 基準
  status: 'placing' | 'aiming' | 'simulating' | 'ended'
};
export function createInitialState(mode: '10ball' | '6ball', seed: number): GameState;
export function advanceTurn(state: GameState): GameState;
```

**`src/game/rules.js`** (M1.5 で実装):
```js
export function isOutOfBounds(ball: Ball, bounds: Rect): boolean;
export function evaluateWinner(state: GameState): { winner: 0 | 1 | null, reason: string };
```

**`src/input/pointer.js`** (M1.3 で実装):
```js
export function attachPointerInput(canvas: HTMLCanvasElement, callbacks: {
  onAimPreview: (origin: Vec2, drag: Vec2) => void,
  onShoot: (origin: Vec2, velocity: Vec2) => void,
  onCancel: () => void
}): () => void; // detach 関数を返す
```

**`src/game/replay.js`** (M2.1 で実装):
```js
export function encodeReplay(seed: number, inputs: ShotInput[]): string; // Base64URL
export function decodeReplay(encoded: string): { seed: number, inputs: ShotInput[] };
export type ShotInput = { ballIndex: number, vx: number, vy: number };
```

> **JSDoc/TS 表記注記**: 本プロジェクトは TypeScript 不採用。上記は仕様記述のための擬似シグネチャ。実装時は JSDoc コメント (`@param` / `@returns`) で同等情報を付与する。

---

## 5. テスト戦略

### 5.1 TDD サイクル (writing-plans スキル準拠)

各実装タスクは以下の 5 ステップを 1 単位とする:

1. **失敗するテストを書く**
2. **テストを実行して失敗を確認**
3. **テストを通す最小実装を書く**
4. **テストを実行して合格を確認**
5. **コミット**

### 5.2 単体テスト方針

| 対象モジュール | テスト観点 |
|---|---|
| `physics/engine.js` | dt 進行 / 速度減衰 / 静止判定 |
| `physics/collision.js` | 円-円弾性衝突 (運動量保存) / 円-壁反射 / 同時衝突解決順序 |
| `physics/gravity.js` | G=0 / G=1e-3 / G=5e-3 各モードでの加速度計算 / 距離 0 時の発散防止 |
| `physics/rng.js` | 同シード → 同系列 / 周期性 |
| `game/rules.js` | 場外判定 (中心が縁を越えた瞬間) / 残数勝敗 / 同数時タイブレーク |
| `game/replay.js` | エンコード ↔ デコード往復一致 / URL 長 ≤ 150 文字 |

### 5.3 決定論性テスト (必須)

**目的**: §7 リプレイ機能 / §7.1 URL シード非同期対戦の前提を保証する。

**方式**: 同一シード + 同一入力列で N=20 ターン実行後、全球の `(x, y, vx, vy)` をスナップショット (JSON) と**ビット一致**で比較。

**実装場所**: `/tests/unit/determinism.test.js`

**合格基準**: 100 回連続実行で差分ゼロ。

### 5.4 性能テスト

| 指標 | 計測方法 | 合格基準 |
|---|---|---|
| 1 frame 計算時間 (20 球 / G=1e-3) | `performance.now()` で 60 frame 平均 | ≤ 16ms (G5) |
| メモリリーク | 100 戦連続実行後の `performance.memory.usedJSHeapSize` 差分 | < 5 MB 増加 |

> **クロスブラウザ注記**: `performance.memory` は Chromium 系限定の非標準 API で、Firefox / Safari では未実装。メモリリーク計測は Chrome / Edge で実施し、その他ブラウザでは 1 frame 計算時間のみを検証対象とする。`performance.now()` は全主要ブラウザで利用可。

---

## 6. Phase 0: 検証プロト WBS

> **目的**: W1 (引力依存リスク) を最優先で早期検証し、MVP 着手可否を判断する。
> **完了条件**: Phase 0 合格判定 (M0.3) を通過すること。

### Task M0.1: 物理パラメータ感度確認プロト (サイズ: L)

**Files:**
- Create: `prototypes/ohajiki/index.html`
- Create: `prototypes/ohajiki/proto.js`
- Create: `prototypes/ohajiki/proto.css`

**目的**: `G` / `e` / `μ` をスライダで調整しながら 2〜10 球を弾けるミニプロト。

- [ ] **Step 1: HTML 骨格作成** — Canvas (600×600) + スライダ 3 つ (G: 0〜5e-3 / e: 0.5〜1.0 / μ: 0.0〜0.5) + 「リセット」「球追加」ボタン
- [ ] **Step 2: 円-円弾性衝突の最小実装テスト記述** — `prototypes/ohajiki/proto.test.html` で 2 球正面衝突の速度交換を assert
- [ ] **Step 3: 衝突実装** — 法線方向の運動量交換 + 反発係数 e 適用
- [ ] **Step 4: 円-壁反射実装** — 壁法線方向のみ反転 + e 適用
- [ ] **Step 5: 摩擦実装** — 速度ベクトルを `μ * dt` 減衰 / 静止判定 (`|v| < 1e-4`)
- [ ] **Step 6: 万有引力実装** — `F = G * m_A * m_B / d²` (距離下限 `d ≥ 2r` でクランプし発散防止)
- [ ] **Step 7: スリングショット入力 (マウスのみ)** — 引いて離す → 初速ベクトル付与
- [ ] **Step 8: スライダ UI バインディング** — リアルタイムでパラメータ反映
- [ ] **Step 9: 破綻挙動検出ロガー追加** — 「静止後 1 秒以内に再運動」イベントをコンソール出力
- [ ] **Step 10: コミット** — `git commit -m "feat(proto): physics parameter sensitivity prototype"`

### Task M0.2: ペーパープロト (サイズ: S)

**目的**: 引力なし状態で「弾き出し戦略」が成立するかを最低限確認 (補助検証)。

- [ ] **Step 1: 用具準備** — 方眼紙 (1m スケール想定) / コイン 20 枚 (色分け 2 色)
- [ ] **Step 2: ルール書き起こし** — アイディア §2.1 を A4 1 枚に要約
- [ ] **Step 3: 自己プレイ 3 戦実施** — 「弾き出し」が成立するか観察
- [ ] **Step 4: 観察記録** — `Plans/PhysicalOhajiki.検証ログ.md` に追記 (面白さ / 違和感 / 改善案)

### Task M0.3: Phase 0 合否判定 ★ゲート★ (サイズ: M)

**目的**: テスタ ≥5 名 (Mobile ≥3 名) で引力モード支持率を測定し、MVP 着手可否を判断する。

- [ ] **Step 1: テスタ募集** — Mobile ユーザ 3 名 + その他 2 名以上を確保
- [ ] **Step 2: プロト配布** — M0.1 のプロトをローカル or 一時 URL で配布
- [ ] **Step 3: 比較プレイセッション設計** — 各テスタに `G=0` (クラシック) と `G=1e-3` (弱引力) を盲検で 5 分ずつプレイさせる
- [ ] **Step 4: 設問** — 「どちらが面白かったか / 理由」「破綻挙動はあったか」「タッチ精度は許容できたか (Mobile のみ)」
- [ ] **Step 5: 集計** — 「弱引力 (G=1e-3) が面白い」回答率を算出
- [ ] **Step 6: 判定**
  - **合格**: ≥60% かつ破綻挙動報告なし → **Phase 1 着手**
  - **不合格**: §10 撤退判断 (Pivot/Drop) へ
- [ ] **Step 7: 記録** — `Plans/PhysicalOhajiki.検証ログ.md` に集計表 + 判定 + 次アクションを追記
- [ ] **Step 8: コミット** — `chore(plan): record Phase 0 gate result`

### Task M0.4: 配色 WCAG AA 検証 (サイズ: S)

**Files:**
- Modify: `Ideas/PhysicalOhajiki.アイディア.md` (§5.2 配色注記の解消)

- [ ] **Step 1: 検証ツール選定** — オンライン WCAG コントラストチェッカー (例: webaim.org/resources/contrastchecker/)
- [ ] **Step 2: 4 組み合わせを検証** — `#1A2E1A × #F5E663` / `#1A2E1A × #F58FA0` / `#2D1B0E × #F5E663` / `#2D1B0E × #F58FA0`
- [ ] **Step 3: 不適合があれば代替色提案** — AA (4.5:1) 未達の組合せに対し近似代替色を選定
- [ ] **Step 4: アイディアシート更新** — §5.2 注記を「検証済み (○○ × ○○ を確定)」に書き換え
- [ ] **Step 5: コミット** — `docs(idea): finalize WCAG AA color combinations`

### Task M0.5: タッチ誤操作率検証 (サイズ: M)

**依存:** M0.1 完了 (Step 9 の破綻挨動ロガーを拡張する形で実装)

**目的**: G8 (誤操作率 ≤30%) 達成性を Phase 1 着手前に確認。

- [ ] **Step 1: 計測仕様策定** — 「誤操作」定義 = 「意図と逆方向 ±45° 以上 or 強さ意図と 50% 以上乖離」
- [ ] **Step 2: 計測ロガー追加** — M0.1 プロトにスリングショット解放時の `(intent, actual)` を JSON ログ出力
- [ ] **Step 3: テスタ 10 名 (Mobile 6 重み考慮で Mobile 6 名 + その他 4 名)** で各 30 操作実施
- [ ] **Step 4: 集計** — 誤操作率算出
- [ ] **Step 5: 判定** — ≤30% なら G8 合格 / 超過なら入力 UX 改善案を Phase 1 リスクに登録
- [ ] **Step 6: 記録** — `Plans/PhysicalOhajiki.検証ログ.md` 追記

### Phase 0 完了検証 (verification-before-completion 適用)

- [ ] M0.1 プロトの動作確認エビデンス (スクリーンショット / 動画) 添付
- [ ] M0.2 ペーパープロト観察記録 (`Plans/PhysicalOhajiki.検証ログ.md` 追記) 確認
- [ ] M0.3 合否判定の集計表添付
- [ ] M0.4 / M0.5 の結果添付
- [ ] Phase 1 着手宣言 or §10 撤退分岐宣言

---

## 7. Phase 1: MVP-α WBS

> **対象**: アイディア §10 表の MVP-α 列で `✅` の機能 (#1〜#6, #11 + アクセシビリティ #4)
> **完了条件**: G3, G4, G5, G7 を達成 + Phase 1 完了検証通過

### Task M1.1: 物理エンジン core (TDD / サイズ: L)

**Files:**
- Create: `src/physics/rng.js`, `src/physics/engine.js`, `src/physics/collision.js`, `src/physics/gravity.js`
- Create: `tests/runner.html`, `tests/unit/rng.test.js`, `tests/unit/engine.test.js`, `tests/unit/collision.test.js`, `tests/unit/gravity.test.js`

#### Sub-task 1.1.A: テストランナー基盤

- [ ] **Step 1: `tests/runner.html` 作成** — `<script type="module">` で各 test.js を import / 結果を DOM に出力
- [ ] **Step 2: minimal assert API** — `tests/assert.js` に `assertEqual` / `assertClose(a, b, tol)` / `assertThrows` を実装
- [ ] **Step 3: 動作確認** — ダミーテスト 1 件で Pass/Fail 表示確認
- [ ] **Step 4: コミット** — `test: minimal browser test runner`

#### Sub-task 1.1.B: シード可能 RNG

- [ ] **Step 1: 失敗テスト記述** — `rng.test.js` で「同シード → 100 回呼出し系列が一致」「異シード → 系列が異なる」を assert
- [ ] **Step 2: テスト実行 → 失敗確認** — `tests/runner.html` を開き `rng.test.js` が FAIL することを確認
- [ ] **Step 3: mulberry32 実装** — `src/physics/rng.js` に以下を記述:
  ```js
  export function createRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  ```
- [ ] **Step 4: テスト実行 → 合格確認** — `rng.test.js` が PASS することを確認
- [ ] **Step 5: コミット** — `feat(physics): seedable RNG (mulberry32)`

#### Sub-task 1.1.C: 円-円衝突

- [ ] **Step 1: 失敗テスト記述** — 「等質量正面衝突 → 速度交換」「e=0.5 で残存運動エネルギー 25% (= 損失 75%)」「直交衝突」3 ケース
- [ ] **Step 2: テスト実行 → 失敗確認** — `collision.test.js` が FAIL することを確認
- [ ] **Step 3: 実装** — `src/physics/collision.js` に法線方向の弾性衝突公式で `resolveCircleCircle` を実装:
  ```js
  export function resolveCircleCircle(a, b, e) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0 || dist >= a.r + b.r) return false;
    const nx = dx / dist, ny = dy / dist;
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return false; // 離れていく
    const j = -(1 + e) * velAlongNormal / (1 / a.m + 1 / b.m);
    const ix = j * nx, iy = j * ny;
    a.vx -= ix / a.m; a.vy -= iy / a.m;
    b.vx += ix / b.m; b.vy += iy / b.m;
    // 重なり解消
    const overlap = (a.r + b.r - dist) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;
    return true;
  }
  ```
- [ ] **Step 4: テスト実行 → 合格確認** — `collision.test.js` が PASS することを確認
- [ ] **Step 5: コミット** — `feat(physics): circle-circle elastic collision`

#### Sub-task 1.1.D: 円-壁衝突

- [ ] **Step 1: 失敗テスト記述** — 4 辺それぞれの法線反射 + 反発係数 e 適用
- [ ] **Step 2: テスト実行 → 失敗確認** — `collision.test.js` 追加ケースが FAIL することを確認
- [ ] **Step 3: 実装** — `src/physics/collision.js` に `resolveCircleWall(ball, bounds, e)` を追加 (各辺の法線方向のみ速度を反転 × e、ball を bounds 内側へ押し戻す)
- [ ] **Step 4: テスト実行 → 合格確認** — 該当テストが PASS することを確認
- [ ] **Step 5: コミット** — `feat(physics): circle-wall reflection`

#### Sub-task 1.1.E: 摩擦と静止判定

- [ ] **Step 1: 失敗テスト記述** — 「初速 0.1 / μ=0.3 / dt=1/60 → N フレーム後速度予測一致」「`|v| < eps` で静止」
- [ ] **Step 2: テスト実行 → 失敗確認** — `engine.test.js` の friction ケースが FAIL することを確認
- [ ] **Step 3: 実装** — `src/physics/engine.js` 内に減衰関数を追加 (`v *= max(0, 1 - μ * dt)` / `|v| < 1e-4` で 0 に丸める)
- [ ] **Step 4: テスト実行 → 合格確認** — 該当テストが PASS することを確認
- [ ] **Step 5: コミット** — `feat(physics): friction and rest detection`

#### Sub-task 1.1.F: 万有引力 (G モード切替)

- [ ] **Step 1: 失敗テスト記述** — `G=0` で力 0 / `G=1e-3` で正の引力 / 距離下限クランプ (`d ≥ 2r`)
- [ ] **Step 2: テスト実行 → 失敗確認** — `gravity.test.js` が FAIL することを確認
- [ ] **Step 3: 実装** — `src/physics/gravity.js` に `applyGravity(balls, G, dt)` を実装:
  ```js
  export function applyGravity(balls, G, dt) {
    if (G === 0) return;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dMin = a.r + b.r;
        const d = Math.max(Math.hypot(dx, dy), dMin); // 発散防止クランプ
        const f = G * a.m * b.m / (d * d);
        const ux = dx / d, uy = dy / d;
        a.vx += (f / a.m) * ux * dt; a.vy += (f / a.m) * uy * dt;
        b.vx -= (f / b.m) * ux * dt; b.vy -= (f / b.m) * uy * dt;
      }
    }
  }
  ```
- [ ] **Step 4: テスト実行 → 合格確認** — `gravity.test.js` が PASS することを確認
- [ ] **Step 5: コミット** — `feat(physics): gravity with G-mode switching`

#### Sub-task 1.1.G: シミュレーションループ

- [ ] **Step 1: 失敗テスト記述** — 「全球静止後はループが進まない」「1 ターン最大 4 秒で強制停止」
- [ ] **Step 2: テスト実行 → 失敗確認** — `engine.test.js` の `runUntilRest` ケースが FAIL することを確認
- [ ] **Step 3: 実装** — `src/physics/engine.js` に `step` / `runUntilRest` を実装 (内部で gravity → collision → wall → friction の順で適用 / `elapsedMs > timeoutMs` または全球静止で終了)
- [ ] **Step 4: テスト実行 → 合格確認** — 該当テストが PASS することを確認
- [ ] **Step 5: コミット** — `feat(physics): simulation loop with turn timeout`

### Task M1.2: 決定論性テスト (TDD / サイズ: M)

**Files:**
- Create: `tests/unit/determinism.test.js`
- Create: `tests/snapshots/seed-42-20turn.json`

- [ ] **Step 1: 失敗テスト記述** — シード 42 で 20 ターン固定入力 (ハードコード) を実行 → 全球状態をスナップショットと比較。スナップショット形式:
  ```json
  {
    "seed": 42,
    "turns": 20,
    "finalBalls": [
      { "x": 0.1234567, "y": 0.2345678, "vx": 0, "vy": 0 }
    ]
  }
  ```
  比較は `JSON.stringify` 後の文字列ビット一致で実施。
- [ ] **Step 2: 初回スナップショット生成スクリプト** — `tests/tools/regen-snapshot.html` を別途用意 (手動実行)。物理 core を実行し `tests/snapshots/seed-42-20turn.json` を出力。
- [ ] **Step 3: 100 回連続実行で差分ゼロを確認** — `determinism.test.js` 内で `for (let i = 0; i < 100; i++)` ループし、毎回スナップショットと比較
- [ ] **Step 4: コミット** — `test: determinism snapshot for seed=42`

### Task M1.3: 入力系 / スリングショット (TDD / サイズ: M)

**Files:**
- Create: `src/input/pointer.js`
- Create: `tests/unit/pointer.test.js`

- [ ] **Step 1: 失敗テスト記述** — 「pointerdown → pointermove → pointerup でベクトル取得」「引きベクトル逆向き × 強さ係数で初速」
- [ ] **Step 2: テスト実行 → 失敗確認** — `pointer.test.js` が FAIL することを確認
- [ ] **Step 3: 実装** — `src/input/pointer.js` に `attachPointerInput(canvas, callbacks)` を実装 (PointerEvent を listen し、down → move で `onAimPreview`、up で `onShoot(origin, -drag * k)` を発火 / `k` は強さ係数)
- [ ] **Step 4: テスト実行 → 合格確認** — `pointer.test.js` が PASS することを確認
- [ ] **Step 5: 配置ステップ追加** — 自陣辺 1 タップで発射位置決定
- [ ] **Step 6: プレビュー軌跡 callback** — 引いている間に推定軌跡を render 層へ通知 (DOM 非依存)
- [ ] **Step 7: コミット** — `feat(input): pointer slingshot with placement step`

### Task M1.4: キーボード操作 (アクセシビリティ / TDD / サイズ: M)

**Files:**
- Create: `src/input/keyboard.js`
- Create: `tests/unit/keyboard.test.js`

- [ ] **Step 1: 失敗テスト記述** — `←→` 配置移動 (10 段階) / `Enter` 確定 / `↑↓←→` 24 方位選択 / `Space` 強さ蓄積 / `Esc` キャンセル
- [ ] **Step 2: テスト実行 → 失敗確認** — `keyboard.test.js` が FAIL することを確認
- [ ] **Step 3: 実装** — `src/input/keyboard.js` に `attachKeyboardInput(callbacks)` を実装 (state machine: `placing` → `aiming-direction` → `aiming-power` → `shoot`、各状態でキー入力を解釈)
- [ ] **Step 4: テスト実行 → 合格確認** — `keyboard.test.js` が PASS することを確認
- [ ] **Step 5: コミット** — `feat(input): keyboard accessibility`

### Task M1.5: ターン制御 + 残数判定 + 試合長モード (TDD / サイズ: M)

**Files:**
- Create: `src/game/state.js`, `src/game/rules.js`
- Create: `tests/unit/state.test.js`, `tests/unit/rules.test.js`

#### Sub-task 1.5.A: ターン制御 (state)

- [ ] **Step 1: 失敗テスト記述 (state)** — ターン交代 / 球数カウント / 試合終了判定 (10 球 / 6 球モード)
- [ ] **Step 2: テスト実行 → 失敗確認** — `state.test.js` が FAIL することを確認
- [ ] **Step 3: 実装** — `src/game/state.js` に `createInitialState` / `advanceTurn` を実装 (4.1 仕様準拠)
- [ ] **Step 4: テスト実行 → 合格確認** — `state.test.js` が PASS することを確認
- [ ] **Step 5: コミット** — `feat(game): turn state with mode-aware termination`

#### Sub-task 1.5.B: 勝敗判定 (rules)

- [ ] **Step 1: 失敗テスト記述 (rules)** — 場外判定 (中心が縁を越えた瞬間) / 残数勝敗 / タイブレーク (中心距離)
- [ ] **Step 2: テスト実行 → 失敗確認** — `rules.test.js` が FAIL することを確認
- [ ] **Step 3: 実装** — `src/game/rules.js` に `isOutOfBounds` / `evaluateWinner` を実装 (タイブレーク = 場の中心からの距離合計が小さい側を勝ち)
- [ ] **Step 4: テスト実行 → 合格確認** — `rules.test.js` が PASS することを確認
- [ ] **Step 5: コミット** — `feat(game): out-of-bounds and winner evaluation`

#### Sub-task 1.5.C: 思考時間上限

- [ ] **Step 1: 失敗テスト記述** — `thinkDeadlineMs` 超過時に手番をスキップ (ダミー入力として初速 0 でショット扱い)
- [ ] **Step 2: テスト実行 → 失敗確認**
- [ ] **Step 3: 実装** — `src/game/state.js` にデッドライン監視を追加 (10 秒 / `performance.now()` 基準)
- [ ] **Step 4: テスト実行 → 合格確認**
- [ ] **Step 5: コミット** — `feat(game): 10s think-time deadline`

### Task M1.6: 視覚 (Canvas + 二重符号化 + エフェクト) (サイズ: M)

**依存:** M0.4 完了 (Step 2 で M0.4 で確定した WCAG AA 適合色を使用)

**Files:**
- Create: `src/render/canvas.js`, `src/render/effects.js`, `src/render/ui.js`
- Create: `styles/main.css`

- [ ] **Step 1: Canvas 描画ループ** — `requestAnimationFrame` で state → canvas 反映 (60fps 目標)
- [ ] **Step 2: 駒描画 (色 + 表面パターン)** — P1 = 無地ライトイエロー / P2 = 中央リング ライトピンク (M0.4 で確定した色を使用)
- [ ] **Step 3: 衝突波紋エフェクト** — 200ms フェードのリング描画
- [ ] **Step 4: 弾き出しエフェクト** — スコア加算ポップアップ + 画面シェイク (50ms × 2px)
- [ ] **Step 5: HUD** — 残数表示 / ターンインジケータ / モード選択 (引力モード / 試合長モード)
- [ ] **Step 6: チュートリアル文言表示** — 「指で引いて離す。10 個弾いて多く残った方が勝ち。」 (24 文字)
- [ ] **Step 7: 性能計測** — 20 球時の 1 frame 時間を計測し G5 (≤16ms) 達成確認
- [ ] **Step 8: コミット** — `feat(render): canvas rendering with dual-coding and effects`

### Task M1.7: 効果音 (サイズ: S)

**Files:**
- Create: `src/audio/sfx.js`
- Create: `assets/sounds/click.wav` (100ms 程度の「カチッ」音)

- [ ] **Step 1: WebAudio API でロード/再生実装**
- [ ] **Step 2: 弾き出し時に再生フック追加**
- [ ] **Step 3: ミュート切替 UI 追加**
- [ ] **Step 4: コミット** — `feat(audio): collision and knock-out sfx`

### Task M1.8: エントリ統合 + 起動時間検証 (サイズ: S)

**Files:**
- Create: `index.html`, `src/main.js`

- [ ] **Step 1: index.html 作成** — `<script type="module" src="src/main.js">` 1 行で起動
- [ ] **Step 2: main.js で各モジュールを wiring**
- [ ] **Step 3: G7 計測** — 起動 → 最初の有効操作までの時間を `performance.mark` で計測 → ≤15 秒確認
- [ ] **Step 4: G3 / G4 計測** — 10 球 / 6 球モードで 5 戦実施し中央値が ≤3 分 / ≤1.5 分を確認
- [ ] **Step 5: コミット** — `feat: integrate MVP-α entry point`

### Phase 1 完了検証 (verification-before-completion 適用)

- [ ] 全テスト合格エビデンス (`tests/runner.html` のスクリーンショット)
- [ ] 決定論性テスト 100 回連続合格ログ
- [ ] G3, G4, G5, G7 計測結果を `Plans/PhysicalOhajiki.検証ログ.md` に追記
- [ ] Phase 2 着手宣言

---

## 8. Phase 2: MVP-β WBS

> **対象**: アイディア §10 表の MVP-β 列で `✅` または `△` の機能 (#7, #8, #12, #13)
> **完了条件**: G1, G2 を達成 + 最終検証通過

### Task M2.1: URL シード (エンコード / デコード / リプレイ) (TDD / サイズ: L)

**Files:**
- Create: `src/game/replay.js`
- Create: `tests/unit/replay.test.js`

- [ ] **Step 1: 失敗テスト記述 (エンコード往復)** — 20 ターン分の入力をエンコード → デコード → 一致
- [ ] **Step 2: 失敗テスト記述 (URL 長制約)** — 20 ターン分で Base64URL ≤ 150 文字
- [ ] **Step 3: テスト実行 → 失敗確認** — `replay.test.js` が FAIL することを確認
- [ ] **Step 4: 実装** — `src/game/replay.js` に `encodeReplay` / `decodeReplay` を実装 (1 shot = ballIndex 4bit + vx/vy 各 12bit signed = 28bit packing → Base64URL)
- [ ] **Step 5: テスト実行 → 合格確認** — `replay.test.js` が PASS することを確認
- [ ] **Step 6: リプレイ実行ロジック** — URL から状態を再構築 → 物理エンジンで再生
- [ ] **Step 7: シェア UI 追加** — 試合終了時に「URL コピー」ボタン
- [ ] **Step 8: コミット** — `feat(game): URL seed encoding and replay`

### Task M2.2: 1 人ソロ (タイムアタック) (サイズ: M)

**Files:**
- Create: `src/game/solo.js`
- Modify: `src/render/ui.js` (モード選択追加)

- [ ] **Step 1: ソロモード仕様確定** — 「配置済み 10 球を最少手数で全弾出す」 / クリアタイム計測
- [ ] **Step 2: 失敗テスト記述** — 全球場外で勝利判定 / 手数カウント
- [ ] **Step 3: テスト実行 → 失敗確認** — `solo.test.js` が FAIL することを確認
- [ ] **Step 4: 実装** — `src/game/solo.js` に `createSoloState(seed)` / `applyShot(state, shot)` / `isCleared(state)` を実装
- [ ] **Step 5: テスト実行 → 合格確認** — `solo.test.js` が PASS することを確認
- [ ] **Step 6: 自己ベスト記録 (localStorage)** 実装
- [ ] **Step 7: コミット** — `feat(game): solo time-attack mode`

### Task M2.3: 強引力モード (G=5e-3) 評価 (サイズ: S)

- [ ] **Step 1: モード選択 UI に「強引力」追加**
- [ ] **Step 2: 5 名規模プレイテスト** — 破綻挙動 / 戦略性を観察
- [ ] **Step 3: 採用判断** — 採用 (`✅`) / 制限付き採用 (`△` の維持) / 削除 を §10 表で決定
- [ ] **Step 4: 結果記録** — `Plans/PhysicalOhajiki.検証ログ.md`
- [ ] **Step 5: コミット** — `feat(game): strong gravity mode evaluation`

### Task M2.4: やり込み軸 (週替わりお題 / 自己ベスト) (サイズ: M)

**Files:**
- Create: `src/game/challenges.js`
- Modify: `src/render/ui.js`

- [ ] **Step 1: お題スキーマ設計** — 「週ごと固定シード + ソロモード」/ 自己ベスト保存
- [ ] **Step 2: 週次シード算出** — 日付 → シード値の決定論的マッピング
- [ ] **Step 3: ランキング (ローカルのみ)** — localStorage に直近 10 件の自己記録
- [ ] **Step 4: コミット** — `feat(game): weekly challenges and personal best`

### Task M2.5: ペルソナ測定アンケート実施 (サイズ: M)

- [ ] **Step 1: アンケートフォーム準備** — 付録 A の 10 問を Google Forms / 紙で準備
- [ ] **Step 2: テスタ 3 名 (P1/P2/P3 各 1 名以上) 確保**
- [ ] **Step 3: プレイセッション + 採点実施**
- [ ] **Step 4: 重み付け集計** — `(P1 × 6 + P2 × 3 + P3 × 1) / 10`
- [ ] **Step 5: G2 (≥70 点) 達成判定**
- [ ] **Step 6: 結果記録** — `Plans/PhysicalOhajiki.検証ログ.md`

### Task M2.6: 評価書再採点 (サイズ: S)

- [ ] **Step 1: 評価書 §1 の 5 軸を再採点** — Phase 2 完了状態を踏まえ
- [ ] **Step 2: G1 (≥20/25) 達成判定**
- [ ] **Step 3: 評価書ファイル更新** — `Ideas/PhysicalOhajiki.ゲーム性評価.md` の総合評価を改訂
- [ ] **Step 4: コミット** — `docs(eval): re-score after MVP-β completion`

### Phase 2 完了検証 (verification-before-completion 適用 / 最終)

- [ ] G1, G2, G5 (Phase 2 時点) の達成エビデンス添付
- [ ] 全テスト合格 (Phase 1 + Phase 2 追加分) ログ
- [ ] URL シード往復一致 100 ケース合格ログ
- [ ] **finishing-a-development-branch スキル適用** — マージ / PR / クリーンアップ判断

---

## 9. リスク管理 (リスク × Phase マトリクス)

| # | リスク | Phase 0 | Phase 1 | Phase 2 |
|---|---|---|---|---|
| **R1** | 引力定数 G の調整難度 | M0.1 プロトでスライダ調整 + M0.3 で支持率測定 | M1.1.F に G モード単体テスト / 破綻ロガー組込 | M2.3 強引力評価で再検証 |
| **R2** | 物理収束時間が長引く | M0.1 で実測 (1 ターン最大時間ログ) | M1.1.G で「1 ターン 4 秒強制停止」実装 + テスト | 20 球連戦で実測 |
| **R3** | タッチ誤操作率 | M0.5 で 10 名計測 (基準 ≤30%) | M1.3 で計測ロガー恒常実装 | プレイテスト時に追測定 |
| **R4** | 既存ジャンルとの差別化 | M0.3 支持率で「引力ありの面白さ」検証 = 差別化軸の妥当性確認 | — (M0 結果に基づき継続) | M2.5 アンケートで「他ジャンルとの違い」設問 |
| **R5** | 1 プレイ 3 分超過 | — | M1.5 で 6 球モード実装 / M1.8 で実測 (G3, G4) | 連戦時の中央値再計測 |
| **R6** | URL 長制限 | — | — | M2.1.Step 2 で ≤150 文字を単体テスト |
| **R7** | 色覚多様性 | M0.4 WCAG AA 検証 | M1.6.Step 2 で表面パターン実装 | 色覚多様性テスタ確保時に追検証 |
| **R8** | P1 (Mobile 通勤) 訴求 | M0.5 で Mobile 6 名計測 | M1.5 で 6 球モード / 思考時間上限実装 | M2.2 ソロモード + M2.5 で P1 スコア再測定 |
| **R9** | 最終 1 球での連鎖逆転 | — | M1.5 ターン進行ログ取得 | プレイテストで「勝負交代率」計測 → セーフゾーン or BO3 検討 |
| **R10** | 物理計算負荷 (60fps 限界) | M0.1 で 10 球時のフレーム時間ログ | M1.6.Step 7 で 20 球時 G5 計測 | 拡張機能追加時に再計測 / 超過時 OffscreenCanvas 検討 |

---

## 10. 撤退判断基準 (Pivot / Drop)

**判断タイミング**: Phase 0 / Task M0.3 (合否ゲート) で**不合格**となった場合のみ。

| 分岐 | 条件 | アクション |
|---|---|---|
| **(a) G 値再調整で再検証** | 引力支持率 40〜59% かつ破綻挙動なし | `G` を 5e-4 / 2e-3 / 3e-3 等で M0.1 プロト再構築 → M0.3 再実施 (**最大 2 回まで**) |
| **(b) `G=0` クラシック主軸へ Pivot** | 引力支持率 <40% または再調整 2 回後も <60% | アイディアシートを「クラシックおはじき + URL 非同期対戦 + ソロモード」に再焦点化。差別化軸を「URL 対戦の即時性 + ソロやり込み」へシフト。再ブレストを実施。 |
| **(c) プロジェクト Drop** | クラシック化しても評価書スコアが大きく下がる見込み (例: 推定 ≤14/25) または競合と差別化不能 | プロジェクト中止判断。学びを `Plans/PhysicalOhajiki.撤退記録.md` に残す |

> **判断者**: 開発者 (兼プロダクトオーナー)。判断理由は必ず `Plans/PhysicalOhajiki.検証ログ.md` に記録。

---

## 11. 完了の定義 (DoD) と検証方法

### 11.1 DoD (各 Phase 共通)

各 Phase は以下すべてを満たして完了とする:

1. ✅ 当該 Phase の WBS 全タスクの全ステップにチェック
2. ✅ 当該 Phase の数値目標 (G1〜G9 の該当項目) を実測値で達成
3. ✅ 当該 Phase の単体テストが全件合格 (テストランナーのスクリーンショット)
4. ✅ 決定論性テスト (Phase 1 以降) が 100 回連続合格
5. ✅ Phase 0 / 2 はプレイテスト集計表 + 判定が `Plans/PhysicalOhajiki.検証ログ.md` に追記済み
6. ✅ `verification-before-completion` スキルを適用し、エビデンスを宣言文に同梱

### 11.2 verification-before-completion 適用ルール

| Phase | エビデンス追記先 | 追記内容 |
|---|---|---|
| Phase 0 完了時 | `Plans/PhysicalOhajiki.検証ログ.md` の `## Phase 0 完了` 節 | M0.1〜M0.5 の結果 + Phase 1 着手判定 |
| Phase 1 完了時 | 同 `## Phase 1 完了` 節 | テスト合格スクリーンショット + G3/G4/G5/G7 実測値 |
| Phase 2 完了時 | 同 `## Phase 2 完了` 節 | G1/G2 達成判定 + ペルソナアンケート集計 + 評価書再採点結果 |

### 11.3 最終完了 (Step 5 本採用相当)

- ✅ G1 (評価書スコア ≥20/25) 達成
- ✅ G2 (ペルソナ重み付け ≥70 点) 達成
- ✅ Phase 2 完了検証通過
- → `finishing-a-development-branch` スキルで統合判断 (マージ / PR / クリーンアップ)

---

## 付録 A: ペルソナ測定アンケート (10 問テンプレ)

> **使用タイミング**: Phase 2 完了時 (Task M2.5)
> **採点方式**: 各問 10 点満点 / 合計 100 点満点
> **対象**: P1 (Mobile / 通勤) ≥1 名 / P2 (PC / 戦略) ≥1 名 / P3 (Tablet / リラックス) ≥1 名

| # | 設問 | 観点 |
|---|---|---|
| Q1 | 起動から最初の 1 球を弾くまでスムーズだったか? | 学習コスト |
| Q2 | チュートリアル文言だけでルールを理解できたか? | 学習コスト |
| Q3 | 「引いて離す」操作は自分の意図通りに動いたか? | 操作精度 (R3) |
| Q4 | 1 戦の長さは適切だったか? (短い 1 ↔ 長い 10) | 1 プレイ時間 |
| Q5 | 引力ありモードは「面白さ」に貢献したか? | コア面白さ (W1) |
| Q6 | 戦略性 (配置 × 角度 × 強さの読み) を感じたか? | 意思決定の深さ |
| Q7 | 「もう一戦やりたい」と感じたか? | リプレイ性 |
| Q8 | 場外に弾き出した瞬間、爽快感を感じたか? | フィードバック (M7) |
| Q9 | (P1/P3 のみ) スキマ時間に遊べる手軽さがあったか? | 通勤/就寝前適合 |
| Q10 | 友人にこのゲームの URL を共有したいと思ったか? | 普及性 / URL 対戦 |

> **集計**: 各テスタの合計点 (0〜100 点) をペルソナスコアとし、§1.1 重み付け式に代入。>
> **P2 の Q9 集計規則**: P2 (PC / 戦略派) は Q9 をスキップするため、90 点満点となる。P1/P3 との比較上同一スケールに揃えるため、P2 スコアは `(Q1〜Q8 + Q10 合計) × 100 / 90` で 100 点換算した上で重み付け式に代入する。
---

## 付録 B: 用語集

| 用語 | 定義 |
|---|---|
| **Phase** | 開発工程の大区分 (Phase 0 / 1 / 2) |
| **Task** | Phase 内の作業単位。`writing-plans` スキルでの「Task N」相当。サイズ S/M/L で表現。 |
| **Step** | Task 内の実作業単位 (チェックボックス 1 つ)。2〜5 分粒度。 |
| **Sub-task** | Task が大きい場合の中間階層 (例: M1.1.A〜G) |
| **サイズ S** | 半日相当の作業量 (集中作業数時間で完了見込み) |
| **サイズ M** | 1 日相当の作業量 |
| **サイズ L** | 2 日相当の作業量 |
| **G** | 万有引力定数。`G=0` (クラシック) / `G=1e-3` (弱引力 / 既定) / `G=5e-3` (強引力) の 3 モード |
| **MVP-α** | 最小実装スコープの第 1 段階 (アイディア §10 / §7) |
| **MVP-β** | 最小実装スコープの第 2 段階 (URL 対戦 / ソロモード等を追加) |
| **G1〜G9** | 本計画 §1.1 の数値目標識別子 |
| **R1〜R10** | アイディア §9 のリスク識別子 |
| **W1〜W5** | 評価書 §3 の弱点識別子 |

---

## 実行方針

**推奨**: `superpowers:subagent-driven-development` (Task ごとに新しいサブエージェントへ dispatch / Task 間でレビュー)

**代替**: `superpowers:executing-plans` (本セッション内で順次実行 + チェックポイント)

実行開始時にどちらの方針で進めるか宣言してください。
