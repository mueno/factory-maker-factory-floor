# 引き継ぎ書 — MAESTRO実装（Codex向け）

- 作成: 2026-09-04 / Claude（前任セッション）
- **締切: 本日 2026-09-04 — OpenAI WebMCP Challenge 提出**（OSS公開 + 3分動画 + ライブサイト。結果発表 9/23）
- ミッション: `docs/MAESTRO-PLAN.md` の企画を本リポジトリ上に実装し、提出可能な状態にする
- 本書だけで着手できるように書いてある。企画意図は MAESTRO-PLAN.md、Adlib設計思想は `docs/DESIGN.md` を参照

---

## 0. TL;DR（最短の道）

1. ブランチ `claude/adlib-pivot` の続きで作業（world layer実装済み・動作検証済み）
2. `app/adlib/world.ts` に**粒子系**を追加（§3が仕様。**速度は「シムテクセル/フレーム」単位** — §5の罠1を必ず読む）
3. `app/adlib/tools.ts` を**8つの楽器ツール**（`stage_*`）に置き換え、`app/page.tsx` をMAESTROステージ（世界全画面+楽器バー+演目ボタン）に組み替え
4. 検証は**Playwright**（ブラウザペインのスクショは信用しない — §5罠5）。`window.__adlibWorld` デバッグフック活用
5. `npm run lint && npx tsc --noEmit` クリーン → commit → push（push-early）

---

## 1. リポジトリ現状

- 場所: `/Volumes/SSD 2TB/webmcp-factory`（独立repo。remote `github` = mueno/factory-maker-factory-floor）
- ブランチ: `claude/adlib-pivot`（push済み）。主要コミット:
  - `962742b` Adlibピボット（即興UIランタイム）
  - `a80773b` 世界レイヤー = **Solarisパターン B**（WebGPU流体、検証済み）
  - `c39b8ef` MAESTRO企画書
- devサーバー: `npm run dev`（vinext, :3000）。すでに起動中の場合あり（`lsof -nP -iTCP:3000`）
- 品質ゲート: `npm run lint` / `npx tsc --noEmit`（両方クリーンを維持。CI無し）

### ファイルマップ（再利用資産）

| ファイル | 内容 | MAESTROでの扱い |
|---|---|---|
| `app/adlib/world.ts` | WebGPU流体（速度/染料/渦度/圧力射影、320×180、Jacobi18）+ `WorldHandle{pointer,pulse,setBusy,frames,destroy}` | **拡張**（粒子系を追加） |
| `app/adlib/world-layer.tsx` | canvas所有・window pointermove・`__adlibWorld` デバッグフック | ほぼそのまま |
| `app/adlib/tools.ts` | WebMCPツール登録（`buildAdlibTools`+`getModelContext`。`document.modelContext ?? navigator.modelContext`） | **楽器8ツールに置換**（登録パターンは踏襲） |
| `app/adlib/brain.ts` | ProxyBrain / ScriptedBrain / probeProxy | ScriptedBrainを「演目シーケンス」に転用可 |
| `app/adlib/stage.tsx` | sandboxed iframe即興UIステージ | MAESTROでは**不使用**（コード残置可、ページから外す） |
| `app/adlib/sanitize.ts` `store.ts` `protocol.ts` `copy.ts` | HTML即興用 | 楽器はenum引数のみなので大半不要。copyは書き換え |
| `app/api/improv/route.ts` | Direct API用エッジプロキシ | 触らない（MAESTRO必須ではない。Codex Sitesで動かなくても劣化許容） |
| `app/cinematic.css` | スキン + `.adlib-world-canvas` (z:-1) + world-on透過 | 楽器バー等を追記 |
| `docs/MAESTRO-PLAN.md` | 企画書（ツール仕様・絵コンテ・時間割・縮退プラン） | 正本 |

- localStorageキー: アプリ `adlib-app-v1` / 世界トグル `adlib-world-v1`
- URLパラメータ: `?lang=ja|en` (SSRロケール) / `?brain=script`（決定論デモ）

## 2. スコープ（今日やること / やらないこと）

**やる**: 粒子系、楽器8ツール（時間切れなら weather/conjure_text/palette/pulse/scatter の5個に縮退可）、人間用楽器バー、台本演目（動画撮影用の自動シーケンス）、MAESTROブランドの最小UI（JA/EN）、README整備。

**やらない**: 割り勘/即興HTML UIの露出（隠す。削除不要）、法務ページ変更、pixelスキン復活、新規サーバー依存の追加、`.env`読み取り・シークレット出力（rules/10）。**リポジトリのpublic化はユーザー判断 — 勝手にやらない**（提出要件なのでユーザーに確認を促すこと）。

## 3. 粒子系 実装仕様（world.ts拡張）

企画書§3の技術設計の詳細化。既存流体はそのまま「風と光」として使う。

- **バッファ**: `particles: storage buffer` — N × vec4f（xy=pos[uv空間0..1], zw=vel[**テクセル/フレーム**]）。N: 200k基準、`frames()`実測で60fps割れなら 100k/50kへ自動段階（初期化時のadapter limitsとdevicePixelRatioで初期値決定でよい）
- **targets**: storage buffer N × vec4f（xy=目標uv, z=有効フラグ, w=遊び）。CPU側で書き込み
- **particleUpdate kernel**（毎フレーム、workgroup 64）:
  `fluid = textureSampleLevel(velTex, samp, pos, 0).xy`（rgba16floatはfilterable）
  `vel = vel*damping(0.94) + fluid*0.35 + spring + gravity`
  spring = target有効時 `(target-pos)/texel * k(0.06〜0.12)` をテクセル/フレームに換算しクランプ(±20)
  `pos += vel * texel; ラップ or 端で減衰`
- **render**: present後の第2レンダーパス。1粒子=6頂点クワッド（インスタンス描画）、サイズ1.5〜2.5px×速度、**additive blend (one, one)**、パレット色（既存TONES + violet/mono追加）
- **文字/図形→ターゲット**（CPU側）: OffscreenCanvas 2Dに太字で描画（`900 120px "Zen Old Mincho", sans-serif` 等）→ `getImageData` → alpha>128 の画素を間引きサンプリング（最大N点）→ 中央寄せでuv矩形（幅0.7×高0.35程度）へ写像 → particlesへシャッフル割当。余った粒子は target無効=自由流
- **状態機械（JS側）**: `free → converge(hold_sec) → release(散布インパルス+scatter)`。天候プリセットは {curl, dissipation, ambient splat率, gravity, palette} のパラメータ束（storm: curl↑・ambient多、aurora: 横流+緑青、sakura: 下方緩重力+コーラルピンク、ember: 上昇気流+gold）
- `WorldHandle` に追加: `conjureText(text, holdSec)`, `conjureShape(name)`, `setWeather(preset)`, `setPalette(tone)`, `setGravity(dir)`, `scatter()`（既存 pointer/pulse/setBusy/frames は不変のまま）

## 4. 楽器ツール（WebMCP）仕様

`tools.ts` の `buildAdlibTools` を `buildStageTools(world: WorldHandle, …)` に置換。登録は既存 `page.tsx` のuseEffectパターン（AbortController + registerTool Promise.all）を踏襲。全ツール `annotations: { readOnlyHint, untrustedContentHint }` を適切に。

| name | inputSchema（enum/短文のみ・additionalProperties:false） | readOnly |
|---|---|---|
| `stage_read` | {} | ✅（untrusted: 人間シグナル含む） |
| `stage_weather` | preset: enum[calm,storm,aurora,sakura,ember] | — |
| `stage_conjure_text` | text: string maxLength 12（英数かなカナ漢字。**制御文字除去はcleanText再利用**）, hold_sec: 2..12 | — |
| `stage_conjure_shape` | shape: enum[heart,star,spiral,ring,wave] | — |
| `stage_palette` | tone: enum[cyan,gold,coral,violet,mono] | — |
| `stage_pulse` | x,y: 0..1, power: 0.2..1.6 | — |
| `stage_gravity` | direction: enum[up,down,center,none] | — |
| `stage_scatter` | {} | — |

- description は英語で具体的に（「Blackjack Agents」式のdescription駆動が審査映えする）。例: *"Make hundreds of thousands of particles converge into the given text. The word appears written in light, holds for hold_sec seconds, then dissolves."*
- 返り値は `{ok, state: stage_readと同形の要約}` で読み戻し可能に
- 人間用楽器バー: 同じ関数を呼ぶボタン列（weatherセレクタ+テキスト入力+図形/パレット/重力/散布）。**エージェント無しで全機能が実演できること**（審査員対策）
- 演目モード: `?perform=1` または「演目▶」ボタンで、タイムライン配列 `[{at_ms, call}]` を順次実行（動画撮影・デモ用）。ScriptedBrainの位置づけを置換するイメージ

## 5. 前任が踏んだ罠（必読 — 同じ穴に落ちないこと）

1. **速度の単位はシムテクセル/フレーム**。移流は `back = uv - vel * dt * texel`。ここに大きすぎる速度（>数十）を入れると、**染料/粒子が「1テクセルの点」にしか見えなくなる**（同一フレームの移流で吹き飛ぶ）。現行の健全値: pointer `dx*160`(dx≤0.08)、pulse `vy=-8*strength`、ambient 3.5、渦度クランプ±40。粒子も同スケールで設計せよ
2. **WebGPU usage-scope**: 同一パス内で同じテクスチャを sampled と storage に同時バインドすると検証エラー。world.tsの `group(vi,vo,di,doo,sa,sb,so)` はダミーバインド規約で回避している — **advect/splat/render系は (0,0,1)、curl (0,0,2)、vorticity (2,0,1)、divergence (0,0,2)、jacobi/gradient (pRead,2,1-pRead)**。新パス追加時もこの規約を守る
3. **ストレージテクスチャ**: rgba16floatは**write専用**（read_writeはr32系のみ）。ピンポン必須。uniform配列はstride16の倍数
4. **Params/Splatsのuniformレイアウトは検証済みで正しい**（[texel.xy, aspect, dt, dissV, dissD, curl, time] 32B / vec4u count + 32B×16 items）。「値がおかしい」と感じたらレイアウトを疑う前に§5-1の単位を疑う
5. **視覚検証はPlaywright一択**。Claude Codeブラウザペインのスクショはスクロール後に合成ズレする既知問題。さらに**WebGPUキャンバスのdrawImage/toDataURL読み戻しは真っ黒になる**ので数値検証に使えない。デバッグは「シェーダプローブのはしご」: ①fragmentでuniform値を色として描画 → ②対象バッファのvisibilityに一時FRAGMENTを足しstruct直読み → ③係数ハードコード → ④単位/スケールを疑う
6. **診断フック常設済み**: `window.__adlibWorld`（pulse等を直接叩ける）、`handle.frames()`（rAF実行数）、`device uncapturederror` + `getCompilationInfo` のconsole.errorログ（`[adlib-world]` プレフィックス）
7. **PlaywrightのSSR罠**: goto直後のfillはhydrationで消える。**goto後 ~1.2s待ってから操作**
8. **CSS**: `.app-shell` に overflow:hidden/clip を付けるな（stickyヘッダー破壊/合成ズレ）。世界canvasは `z-index:-1` で、**world-on時は html/body/main 全て透過必須**（bodyの背景は負zより上に描かれる）— `html:has(main.world-on)` 規則が既にある
9. **lint**: 変数名 `module` 禁止（@next/next/no-assign-module-variable → `shaderModule`）。effect内setStateは `// eslint-disable-next-line react-hooks/set-state-in-effect` の既存パターンに合わせる
10. **tsconfig** に `@webgpu/types` 追加済み。`*?raw` import宣言は `app/vite-env.d.ts`

## 6. 検証プロトコル（Definition of Done）

```bash
npm run lint && npx tsc --noEmit   # 両方クリーン
```

Playwright（プラグインMCP or ローカル）で:
1. `goto('http://localhost:3000/?lang=ja')` → 1.2s待ち → `window.__adlibWorld` 存在 & `frames()` が1秒で+50以上
2. `conjureText('WebMCP', 6)` 相当のツール呼び出し（楽器バー経由）→ 2s後スクショ → **文字が読めること**（最重要の受け入れ基準）
3. weather 5種を順に → 各1sスクショ → 見た目が明確に変わること
4. `?perform=1` の演目が最後まで走る（動画素材になる）
5. WebGPU無効相当（`?world=off` かreduced-motion）でページが壊れないこと
6. Chrome 149+ 実機で Model Context Tool Inspector によるツール登録確認（可能なら）

## 7. 提出チェックリスト（ユーザーと共同）

- [ ] README.md 刷新（英語主体: 一文ピッチ / スクショorGIF / 楽器契約表 / パターンB説明 / ローカル実行手順）
- [ ] **ユーザー確認事項①**: リポジトリのpublic化（OSS要件。エージェント側で勝手に実行しない）
- [ ] **ユーザー確認事項②**: Codex Siteへのデプロイとライブ URL
- [ ] 3分動画: 絵コンテはMAESTRO-PLAN.md §3。演目モード(`?perform=1`)が撮影素材。録画・編集はユーザー
- [ ] 提出テキスト: 企画書の一文+法則対応表から要約（英語）

## 8. 運用ルール

- コミットは小さく、**同一セッション内でpush**（push-early。workspace規約 22 準拠）
- ブランチは `claude/adlib-pivot` の続きでよい（force push禁止）
- 縮退判断（楽器8→5、粒子数段階）はCodexの裁量。**「文字が読める」だけは死守** — これがサムネイルでありプロダクトの証明
- 不明点はまず `docs/MAESTRO-PLAN.md` → `docs/DESIGN.md` → git log の順で当たる
