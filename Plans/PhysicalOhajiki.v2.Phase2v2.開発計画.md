# 物理おはじき (Physical Ohajiki) v2 Phase 2v2 開発計画

> **For agentic workers:** 本計画は `superpowers:subagent-driven-development` 推奨。各タスクは TDD (RED→GREEN→REFACTOR) で実装。テスト API は `assertEqual` / `assertClose` のみ使用。

**Goal:** Phase 1v2 (155 → Copilot レビュー反映後 159 PASS / `v2.0.0-phase1v2-complete`) で完成したカーリング型 MVP-α を、UX 仕上げ + 機能拡張 + ペルソナ採点で MVP-β に到達させる。最終ゴールは G1' ≥ 20/25 / G2 ≥ 70 点。

**Architecture:** 既存 v2 アーキテクチャ (Vanilla JS / ES Modules / 純粋ロジック + DOM アダプタ / 決定論的物理) を維持。新規モジュールは DOM-free Node テスト可能性を優先。

**Tech Stack:** HTML / CSS / Vanilla JavaScript (ES2022+) / Canvas 2D / ES Modules / ビルドレス / 依存ゼロ。`btoa` / `atob` / `navigator.clipboard` のみブラウザ API 追加。

> **基準コミット**: `a694d1f` (origin/main = PR #1 マージ後)
> **基準テスト**: 159 PASS / 0 failed
> **入力資料**: [Plans/PhysicalOhajiki.v2.開発計画.md](PhysicalOhajiki.v2.%E9%96%8B%E7%99%BA%E8%A8%88%E7%94%BB.md) §7 (元 Phase 2v2 計画) / [.github/copilot-instructions.md](../.github/copilot-instructions.md)

---

## 1. ゴールと成功基準

### 1.1 数値目標 (Phase 1v2 計画書から継承)

| # | 指標 | 目標値 | 測定タイミング |
|---|---|---|---|
| G1' | 評価書再採点スコア | **≥ 20/25 点** | M2v2.3 完了時 |
| G2 | ペルソナ重み付け総合スコア | **≥ 70 点** | M2v2.3 完了時 |
| G4' | 1 試合時間 (1 エンドモード = 4 投) 中央値 | **≤ 1.5 分** | M2v2.2 完了時 |
| G5 | 描画フレームレート (16 ストーン + 軌道線時) | **≥ 60 fps** | M2v2.3 完了時 |
| G10' | テスト件数 | **約 169 PASS** (159 + 10) | M2v2.1 完了時 |

### 1.2 完了ゲート

- 全 5 タスク完了 + テスト 0 failed
- M2v2.3 で G1' / G2 達成 → タグ `v2.1.0-phase2v2-complete` 付与

---

## 2. スコープと実行順 (確定)

```
[K1] preview 物理粗化     → [K2] settings CSS    → [M2v2.2] 1end mode 活性化
   (0.5 日)                   (0.25 日)              (0.5 日)
                                                       │
                                                       ▼
[M2v2.3] ペルソナ再計測  ← [M2v2.1] replay URL 共有
   (1.5 日)                   (1.5 日)
```

**順序根拠**: K1/K2 は polish で副作用が小さい → M2v2.2 で 1end モード解禁 → M2v2.1 でリプレイ URL (設定パネルへ統合可能) → M2v2.3 で総合採点。

---

## 3. ファイル構成

### 3.1 改修ファイル

| ファイル | タスク | 主責務 |
|---|---|---|
| `src/render/preview.js` | K1 | 内部 `dt=1/30` 化 + `N_MAX=300` 縮小 + 停止保証ヘルパ |
| `styles/main.css` | K2 | `.settings-panel/.settings-row/.settings-checkbox` 追加 (~25 行) |
| `index.html` | M2v2.2 | `<option value="1end">` の確認、デフォルト選択肢の最適化 |
| `src/main.js` | M2v2.1 | `?r=...` 起動時 decode、リプレイボタン onClick |
| `src/render/ui.js` | M2v2.1 | 試合終了画面に「結果共有 URL コピー」ボタン追加 |

### 3.2 新規ファイル

| ファイル | タスク | 責務 |
|---|---|---|
| `src/game/replay.js` | M2v2.1 | `encodeShareUrl(state)` / `decodeShareUrl(string)` 純粋関数 |
| `tests/unit/replay.test.js` | M2v2.1 | round-trip 5 ケース |

---

## 4. タスク詳細

### M2v2.0 (= K1): preview.js 物理粗化

**Files:** `src/render/preview.js` / `tests/unit/preview.test.js`

**問題**: 現状 `DEFAULT_N_MAX=240` (2 秒@dt=1/120) で `mu=0.3, |v|=0.5` のとき停止に ~3400 ステップ必要 → 予測線が途切れる。

**設計**:
- 内部物理 dt を `DEFAULT_DT = 1/30` に粗化 (本番物理 dt=1/120 と独立)
- `DEFAULT_N_MAX = 300` (= 10 秒分@dt=1/30、停止保証)
- 受け入れ: `mu=0.3, |v|=0.5` で停止判定到達 (path 末尾 vel ≈ 0)
- 既存 bounds 打切 / REST_EPS 丸めロジック維持

**ステップ**:
- [ ] **Step 1 (RED)**: `tests/unit/preview.test.js` に追加
  - test('preview: mu=0.3 |v|=0.5 で停止保証 (N_MAX 内に終端到達)') → path 末尾の vel ≈ 0 (path に vel を含めるか、途中切れでないことを path.length < nMax で確認)
  - test('preview: 粗化 dt と本番 dt のズレが ±5% 以内 (停止位置)')
  - test('preview: 既存 bounds 外打切が壊れていない')
- [ ] **Step 2 (GREEN)**: `preview.js` の `DEFAULT_DT` / `DEFAULT_N_MAX` を更新、必要なら停止保証ヘルパを抽出
- [ ] **Step 3 (REFACTOR)**: ドキュメンテーション更新
- [ ] **Step 4: コミット** `feat(preview): coarse-grain dt and guarantee stop within N_MAX (K1)`

### M2v2.0b (= K2): settings パネルスタイル

**Files:** `styles/main.css` (改修)

**設計**:
- 配色: `#1A2E1A` 半透明背景 / `#F5E663` 文字 (既存 `COLORS` と整合)
- `.settings-panel`: `position: absolute; top: 8px; right: 8px; padding: 8px 12px; border-radius: 6px;`
- `.settings-row`: `display: flex; align-items: center; gap: 8px; min-height: 24px;`
- `.settings-checkbox`: `width: 18px; height: 18px;` (touch target ≥ 24px は親 row で確保)

**ステップ**:
- [ ] **Step 1**: `styles/main.css` に上記 3 セレクタ追加
- [ ] **Step 2**: ローカル http サーバで目視確認 (Chromium / モバイル DevTools)
- [ ] **Step 3: コミット** `style(settings): add settings panel styles (K2)`

> CSS のみのため自動テスト不要。手動目視で完了判定。

### M2v2.2: 1end モード活性化

**Files:** `index.html` / `src/main.js` / `tests/unit/state.test.js`

**設計**:
- `index.html` の mode `<select>` に `<option value="1end">1 エンド (約 1.5 分)</option>` を追加 / 既存ならデフォルト位置を最適化
- 既存 `state.js` のロジックは Phase 1v2 で実装済 → 動作確認のみ
- `main.js` の bootstrap で `select.value` を `createInitialState({mode})` に渡す経路を再確認

**ステップ**:
- [ ] **Step 1 (RED)**: `tests/unit/state.test.js` に追加
  - test('state: mode=1end で createInitialState は totalStones=8') (既存があれば skip)
  - test('state: mode=1end で 1 回 closeEnd → status=ended (ハンマー側引継ぎなし)') (既存があれば skip)
- [ ] **Step 2**: `index.html` 確認・修正
- [ ] **Step 3 (manual)**: ローカル起動で 1end / 2end の切替動作確認
- [ ] **Step 4: コミット** `feat(mode): activate 1end mode in UI selector (M2v2.2)`

### M2v2.1: リプレイ URL 共有

**Files:** `src/game/replay.js` (新規) / `tests/unit/replay.test.js` (新規) / `src/render/ui.js` (改修) / `src/main.js` (改修)

**設計**:
- `replay.js` は **DOM-free 純粋関数モジュール**
  - `encodeShareUrl({mode, hammerSide, endScores})` → base64url 短文字列
  - `decodeShareUrl(string)` → 同形オブジェクト (失敗時 `null`)
- フォーマット: `v1.{modeChar}.{hammerSide}.{endScores joined by '-'}` を `btoa` → URL-safe 変換 (`+/=` を `-_` に)
  - `modeChar`: `'2end'` → `'2'` / `'1end'` → `'1'`
  - 例: `{mode:'2end', hammerSide:0, endScores:[3,1]}` → `'v1.2.0.3-1'` → `btoa(...)` → `'djEuMi4wLjMtMQ=='` → URL-safe `'djEuMi4wLjMtMQ'`
- 試合終了時 (`state.status === 'ended'`) のみ HUD に「結果共有 URL コピー」ボタン表示 → `navigator.clipboard.writeText(location.origin + location.pathname + '?r=' + encoded)`
- 起動時 `?r=...` があれば `decodeShareUrl` → 試合終了画面の overlay として `endScores` を表示 (再現プレイは Phase 3 以降)

**ステップ**:
- [ ] **Step 1 (RED)**: `tests/unit/replay.test.js` に round-trip 5 ケース
  - 2end / hammer P0 / endScores=[3,1]
  - 1end / hammer P1 / endScores=[2]
  - 2end / hammer P0 / endScores=[0,0] (両ブランク)
  - 2end / hammer P1 / endScores=[8,0] (最大スコア)
  - decode("不正文字列") → null
- [ ] **Step 2 (GREEN)**: `src/game/replay.js` 実装
- [ ] **Step 3**: `src/render/ui.js` に試合終了 overlay へボタン描画ヘルパ追加 (DOM ボタンを `settings-root` 配下に追加するか、Canvas オーバーレイに描画)
- [ ] **Step 4**: `src/main.js` で起動時 `?r=` 解釈 + ボタン onClick → clipboard コピー
- [ ] **Step 5 (manual)**: 試合終了 → ボタンクリック → URL コピー → 別タブで開いて結果再表示確認
- [ ] **Step 6: コミット** `feat(replay): add share URL encode/decode and result share button (M2v2.1)`

### M2v2.3: ペルソナスコア再計測 (G2 検証)

**Files:** `Plans/PhysicalOhajiki.検証ログ.md` (追記)

**ステップ**:
- [ ] **Step 1**: §1.1 と同等のペルソナスコアプロトコルを再実施 (自分 + 知人 4 名以上、Mobile 6 / PC 3 / Tablet 1)
- [ ] **Step 2**: G1' (評価書再採点 ≥ 20/25) を再実施
- [ ] **Step 3**: `Plans/PhysicalOhajiki.検証ログ.md` に追記 (なければ新規作成)
- [ ] **Step 4**: G1' / G2 達成判定。未達なら §6 リスク対策へ
- [ ] **Step 5: タグ付けコミット**
  ```powershell
  git tag -a v2.1.0-phase2v2-complete -m "Phase 2v2 complete: K1/K2 polish + 1end mode + replay URL + persona scoring."
  git push origin v2.1.0-phase2v2-complete
  ```

---

## 5. 受け入れ基準 (タスク横断)

- ✅ 全テスト 0 failed (`node tests/_node-runner.js`)
- ✅ 既存 Phase 1v2 テスト (159) は無回帰
- ✅ Vanilla JS / 依存ゼロ (新規ライブラリ追加なし)
- ✅ DOM-free Node テストで replay モジュールがカバーされる
- ✅ TUTORIAL_TEXT_V2 ≤ 100 文字 (変更なし)
- ✅ 二重符号化 (色 + 形状) 維持

---

## 6. リスクと撤退判断

| リスク | 確率 | 対応 |
|---|---|---|
| K1 で停止位置がプレイ実物理とズレ過ぎる | 中 | dt=1/30 と 1/120 の同 vel でズレ計測テストを追加、許容 ±5%。超えたら dt=1/60 に細分化 |
| replay URL がペルソナ採点を撹乱 (試合中シェア誘惑) | 低 | 試合終了後のみボタン表示で抑制 |
| `navigator.clipboard` 未対応ブラウザ (HTTP / 古い iOS Safari) | 中 | textarea + `document.execCommand('copy')` フォールバック |
| M2v2.3 で G2 < 70 | 中 | 元計画書 §8 の追加イテレーション (ハウス可視化強化 / SFX 追加) で 1〜2 日延長 |
| M2v2.3 で G1' < 20/25 | 中 | 評価軸ごとの差分分析 → 不足項目を Phase 3 ロードマップへ |

---

## 7. ブランチ・コミット規約

- ブランチ: `feat/phase2v2-polish-and-share` (from `main` @ `a694d1f`)
- コミットメッセージ: Conventional Commits + 末尾にタスク ID
  - `feat(preview): coarse-grain dt and guarantee stop within N_MAX (K1)`
  - `style(settings): add settings panel styles (K2)`
  - `feat(mode): activate 1end mode in UI selector (M2v2.2)`
  - `feat(replay): add share URL encode/decode and result share button (M2v2.1)`
  - `docs(plans): record persona scoring results (M2v2.3)`
- 完了タグ: `v2.1.0-phase2v2-complete`

---

## 8. Phase 1v2 からの差分サマリ (引継ぎ用)

| 観点 | Phase 1v2 (`v2.0.0-...`) | Phase 2v2 (`v2.1.0-...`) |
|---|---|---|
| preview 物理 | dt=1/120 / N_MAX=240 (途切れあり) | dt=1/30 / N_MAX=300 (停止保証) |
| settings UI | 裸のチェックボックス | スタイル付きパネル |
| 1end モード | state.js 実装済、UI 未活性 | UI セレクタから選択可能 |
| replay 共有 | なし | URL コピー (試合終了後) |
| ペルソナ採点 | Phase 1v2 完了時点で未実施 | G2 / G1' 達成判定 |

---
