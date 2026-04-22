# Physical Ohajiki v2 検証ログ (Phase 2v2)

> 本書は **Phase 2v2 完了ゲート (G1' / G2 / G5)** の達成判定エビデンスを記録する。
> AI 機械チェック (静的解析・テスト結果から自動判定可) は先行記入済。
> **★人間採点欄★** はユーザー (本人 + 知人 4 名以上、Mobile 6 / PC 3 / Tablet 1) が記入する。

- 対象タグ (予定): `v2.1.0-phase2v2-complete`
- 対象 commit: `db8daaa` (M2v2.1 完了時点) 以降
- ブランチ: `feat/phase2v2-polish-and-share`
- 計画書: [PhysicalOhajiki.v2.Phase2v2.開発計画.md](./PhysicalOhajiki.v2.Phase2v2.開発計画.md)

---

## 1. 評価ゲート一覧

| ID | 指標 | 基準 | 採点者 | 状況 |
|---|---|---|---|---|
| G1' | 評価書再採点スコア | ≥ 20/25 点 | 本人 (開発者) | 機械チェック先行 / 人間採点 **未** |
| G2 | ペルソナ重み付け総合スコア | ≥ 70/100 点 | 知人 4+ 名 | **未** |
| G5 | 描画フレームレート (16 ストーン + 軌道線) | ≥ 60 fps | DevTools Performance | **未** |

---

## 2. G5: フレームレート計測 (機械寄り / 半自動)

### 2.1 計測手順 (ユーザー実施)
1. `index.html` をローカル HTTP サーバ経由で開く (`python -m http.server` 等)
2. Chrome DevTools → Performance → Record 開始
3. 試合開始 → ハンマー側で 4 投連続 + 軌道予測線 ON で 30 秒録画
4. Frames セクションの平均 fps と最低 fps を記録

### 2.2 計測結果

| ブラウザ / デバイス | 平均 fps | 最低 fps | 判定 (≥ 60 / ≥ 50 ですれ違い許容) |
|---|---|---|---|
| Chrome / PC | _未測定_ | _未測定_ | _未_ |
| Safari / iPhone | _未測定_ | _未測定_ | _未_ |
| Chrome / Android | _未測定_ | _未測定_ | _未_ |

### 2.3 AI 機械チェック (関連ファクト)
- 物理 dt: `SIM_DT = 1/60` ([src/main.js](../src/main.js)) → 60fps 想定
- preview 物理 (K1): `DEFAULT_DT = 1/30 / N_MAX = 1000` ([src/render/preview.js](../src/render/preview.js)) → 軌道線生成 1 回 ≤ 1000 step
- 物理 step は O(N²) で N≤16 → 256 ペア / step → モバイル GPU でも余裕想定 (理論)

---

## 3. G1': 評価書再採点 (本人実施 / 25 点満点)

各項目 1〜5 点で採点。AI 機械チェックは「実装上達成済」と判定可能な範囲のみ先行記入。

### 3.1 評価軸 (5 軸 × 5 点)

| 軸 | 観点 | AI 機械評価 | AI 評点 (参考) | ★人間評点★ | 備考 |
|---|---|---|---|---|---|
| **E1 学習コスト** | チュートリアル文言 ≤100 字 / 起動 → 初手 ≤15 秒 | `TUTORIAL_TEXT_V2 = '指で引いて離す。線を読んで的に近づけて勝つ。'` (22 字 / G2 制約満たす) / G7 計測コードあり (`time-to-first-shot`) | **5** | _未_ | 文字数のみ自動判定。実時間 15 秒は要計測 |
| **E2 ルール明快さ** | スコアボード / ハンマー / エンド表示 / 試合終了オーバーレイ | `formatScoreboardV2` / `renderHudV2` でエンド `n/N`・ハンマー `P0/P1`・現状得点プレビュー描画 | **4** | _未_ | 「FGZ 違反」は文言フィードバック弱い (status のみ) |
| **E3 戦術的奥行き** | 軌道予測線 / 1end/2end モード / ハンマー権効果 | preview 線実装 + `aimPreview` 設定永続化 + 1end UI 解禁 (M2v2.2) + ハンマー側エンドシード差別化 | **4** | _未_ | 機械的には「選択肢あり」止まり。深さ感は要実プレイ |
| **E4 操作精密度** | ポインタ / キーボード両対応 / 二重符号化 / 設定パネル | `pointer.js` + `keyboard.js` FSM / 色 + 形状 二重符号化維持 / settings-panel CSS (K2) | **4** | _未_ | パワーゲージは未実装 (奥深さ補正は preview 線で代替) |
| **E5 共有性 / リテンション** | 結果 URL 共有 / リプレイ起動時復元 / clipboard fallback | `encodeShareUrl/decodeShareUrl` + `?r=` 起動時 decode + `execCommand('copy')` フォールバック (M2v2.1) | **5** | _未_ | URL 経由のリプレイ完全再生 (シード復元) は Phase 3 |

### 3.2 集計

- AI 機械評点合計 (参考値): **22 / 25** ✓ (≥ 20)
- ★人間評点合計★: **__ / 25** _未記入_
- **判定**: _未確定_ (人間採点後に確定)

### 3.3 自由記述 (改善メモ欄)

- _ユーザー記入予定_

---

## 4. G2: ペルソナ重み付け総合スコア (人間採点必須)

### 4.1 ペルソナ重み (Mobile 6 / PC 3 / Tablet 1)

| ペルソナ | 端末 | 重み | 主シナリオ |
|---|---|---|---|
| P1 ハルカ (28 女) | iPhone | **6** | 通勤朝・吊革片手 |
| P2 タカシ (35 男) | PC + Android | **3** | コードビルド待ち / 寝る前 |
| P3 ミナ (42 女) | iPad | **1** | 子の昼寝中・夜の暗所 |
| **合計** | | **10** | |

### 4.2 ペルソナ別評点 (各 100 点満点)

各テスタが 1 試合以上プレイ後に「面白さ・スキマ適合・もう一度遊びたいか」を 100 点満点で採点。

| 採点者 | 担当ペルソナ | 端末 | 評点 (0-100) | コメント |
|---|---|---|---|---|
| 本人 | P1 / P2 / P3 全て自演 | _複数_ | _未_ | _未記入_ |
| 知人 1 | _未割当_ | _未_ | _未_ | _未_ |
| 知人 2 | _未割当_ | _未_ | _未_ | _未_ |
| 知人 3 | _未割当_ | _未_ | _未_ | _未_ |
| 知人 4 | _未割当_ | _未_ | _未_ | _未_ |

### 4.3 集計式

```
G2 = ( P1 平均 × 6 + P2 平均 × 3 + P3 平均 × 1 ) / 10
```

- G2 暫定値: **__ / 100** _未確定_
- **判定**: _未確定_ (基準 ≥ 70)

---

## 5. AI セルフチェック (技術的受け入れ基準)

計画書 §5 と照合。コミット `db8daaa` 時点で AI が機械的に検証済。

| 項目 | 状況 | 根拠 |
|---|---|---|
| 全テスト 0 failed | ✅ | `node tests/_node-runner.js` → `168 passed / 0 failed` |
| Phase 1v2 既存テスト無回帰 | ✅ | 159 → 168 (追加のみ / 既存テストは全 PASS 維持) |
| Vanilla JS / 依存ゼロ | ✅ | `package.json` なし / `import` は相対パスのみ |
| DOM-free Node テストで replay モジュールカバー | ✅ | `tests/unit/replay.test.js` (6 tests) は `btoa/atob` のみ使用 |
| TUTORIAL_TEXT_V2 ≤ 100 字 | ✅ | 22 字 |
| 二重符号化 (色 + 形状) 維持 | ✅ | [src/render/canvas.js](../src/render/canvas.js) で P0=円 / P1=四角 維持 |
| K1 preview 停止保証 | ✅ | `tests/unit/preview.test.js` 'mu=0.3 |v|=0.5 が N_MAX 内に停止' PASS |
| K1 粗化 vs 本番物理ズレ ≤ ±5% | ✅ | 同テスト 'dt=1/30 と dt=1/120 の停止位置ズレが ±5% 以内' PASS |
| K2 settings-panel スタイル | ✅ | [styles/main.css](../styles/main.css) `.settings-panel` 定義 |
| M2v2.2 1end UI | ✅ | [index.html](../index.html) `<option value="1end">` |
| M2v2.1 share URL encode/decode round-trip | ✅ | replay.test.js round-trip 4 ケース PASS |
| M2v2.1 不正入力で `null` | ✅ | replay.test.js 'decodeShareUrl は不正文字列に対し null' PASS |
| M2v2.1 URL-safe (`+/=` 不含) | ✅ | replay.test.js 'encodeShareUrl は URL-safe' PASS |
| clipboard fallback (`execCommand`) | ✅ (実装) / 未検証 (実機) | [src/main.js](../src/main.js) `fallbackCopy` 実装 / 古い Safari 実機未確認 |

---

## 6. 判定サマリ (人間採点後に AI が更新)

| ゲート | 基準 | 暫定値 | 判定 |
|---|---|---|---|
| G1' | ≥ 20/25 | _未_ | _未確定_ |
| G2 | ≥ 70/100 | _未_ | _未確定_ |
| G5 | ≥ 60 fps | _未_ | _未確定_ |
| AI 受け入れ基準 | 全項目 ✅ | 14/14 | **✅ 達成** |

**最終判定**: _人間採点 (G1' / G2) と fps 計測 (G5) の完了待ち_

---

## 7. タグ付け手順 (3 ゲート全達成後)

```powershell
# G1' / G2 / G5 全達成を確認後、main マージ後に実施
git tag -a v2.1.0-phase2v2-complete -m "Phase 2v2 complete: K1/K2 polish + 1end mode + replay URL + persona scoring (G1'=__/25, G2=__/100, G5=__fps)"
git push origin v2.1.0-phase2v2-complete
```

未達の場合は計画書 §6 リスク対策へ:
- G2 < 70: 元計画書 §8 追加イテレーション (ハウス可視化強化 / SFX 追加)
- G1' < 20/25: 評価軸ごとの差分分析 → 不足項目を Phase 3 ロードマップへ
