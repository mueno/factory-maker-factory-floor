# Factory Maker UX刷新 — 仕様・安全性・WebMCP実装評価

## 評価の前提

本評価は、Sarah Drasner氏が公開しているsecure tools・tool design・evalsへの関心、Justin Rushing氏が公開しているreal-browser execution・permission boundaryへの関心、Alex Nahas氏が公開しているpage stateに応じたdynamic toolsへの関心を統合した近似評価である。実在する本人の内面、選好、実際の採点結果を示すものではない。

`research-and-directions.md`の配点を変更せず、各boardで見えているUIだけを採点した。画像は実装証拠ではないため、tool registration、state mutation、権限検査が実際に動くとはみなしていない。

## 結論

- **首位: E. Agent Glass — 82点**
- **次点: C. Evidence Trail — 80点**
- 実装の基礎はEとし、Cの工程線とDの初期入力画面を接続する案を推奨する。

## 採点

| 順位 | 案 | WebMCPが画面体験を良くする 25 | 3分で共同作業を理解 25 | 初見で開始 20 | 権限・履歴・失敗回復 20 | 独自性・記憶性 10 | 合計 |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | E. Agent Glass | 24 | 20 | 11 | 18 | 9 | **82** |
| 2 | C. Evidence Trail | 17 | 25 | 14 | 16 | 8 | **80** |
| 3 | A. Shared Canvas | 14 | 21 | 18 | 12 | 8 | **73** |
| 4 | B. Command Studio | 10 | 22 | 17 | 9 | 8 | **66** |
| 5 | D. Calm Launchpad | 6 | 19 | 20 | 7 | 6 | **58** |

## A. Shared Canvas — 73点

- **強み:** 成果物を最大面積で表示し、`HUMAN`と`AGENT`の履歴を近接配置している。依頼欄が一つで、mobileでも成果物から履歴へ自然に読める。
- **致命的リスク:** tool名、READ/WRITE、revision、失敗、undoが見えず、通常の共同編集canvasとの違いを審査環境で説明できない。`HUMAN`欄の変更に`Approve`が付くため、誰の変更を誰が承認するのかも曖昧である。
- **実装に残す要素:** 中央のshared artifact、human/agent別の短い履歴、上部の単一依頼欄、mobileでの縦方向再配置。

## B. Command Studio — 66点

- **強み:** 依頼、生成状況、live preview、`Approve direction`が一画面に収まり、3分のdemoでは進行方向を説明しやすい。
- **致命的リスク:** chat風の往復とpreviewが中心で、dynamic tools、READ/WRITE、revision、差分、undo、失敗回復が示されない。UIと機械向けtool contractを分離できず、一般的なAI app builderに見える。
- **実装に残す要素:** 大きなpreview、短いstage progress、画面下端に固定したhuman-only approval。ただし会話欄は主役にしない。

## C. Evidence Trail — 80点

- **強み:** `REQUEST → CONCEPT → BUILD → VERIFIED`をhuman/agentの担当、revision、build evidence、human reviewと結び付けている。開始から検証までの物語は5案で最も明快で、審査員が3分で把握しやすい。
- **致命的リスク:** `TOOLS USED`が名称のないiconにとどまり、現在登録されているtool、READ/WRITE、input、結果、次の許可操作を確認できない。undo、retry、blocked stateもなく、evidenceが実検査ではなく自己申告に見える恐れがある。
- **実装に残す要素:** 工程を貫くevidence trail、revision一覧、human/agentの名義分離、検証項目を一件ずつ確認するreview panel。

## D. Calm Launchpad — 58点

- **強み:** 初回入力と次のhuman actionが明確で、progressive disclosureとmobile配置は5案で最も分かりやすい。
- **致命的リスク:** agent proposalの生成経路、tool利用、READ/WRITE、変更履歴、revision、undo、失敗状態が見えない。WebMCPを外しても同じ画面が成立するため、審査上の因果関係を示せない。
- **実装に残す要素:** 最初の10秒に使う単一依頼画面、段階的に開くsection、mobile-firstの縦構造。Eへ入る前のlaunchpadとして使う。

## E. Agent Glass — 82点

- **強み:** shared artifactを中央に置き、agent側にtool名、READ/WRITE、revision、実行結果、人側に`Approve`と`Undo`を分離している。UI上の成果物と機械向け操作、human authorityの境界が一目で分かり、WebMCP固有の説明力が最も高い。
- **致命的リスク:** 初回依頼と工程全体が見えず、非技術者は`openapi.yaml`から始まる画面で迷う。さらに`Generate SDK`が成果物を保存する操作なら`READ`表記は誤りであり、確認を回避する権限分類になる。phaseごとにtoolが登録・解除されることも、この画面だけでは確認できない。
- **実装に残す要素:** artifact／agent tools／human authorityの三領域、READ/WRITE badge、revisionと実行結果、独立したApprove・Undo。実装時は副作用に基づいてtool分類を確定し、現在phaseで利用可能なtoolだけを表示する。

## 推奨する統合方向

Eを実装骨格に採用し、次の三点を加える。

1. 最初はDの単一依頼画面を表示し、依頼確定後にcockpitを開く。
2. 上部にCの工程線を置き、phase変更時にagent tool一覧を登録・解除する。READとWRITEをbadgeだけでなくtool contractでも固定する。
3. WRITE実行前は対象revisionと差分を表示し、人の確認が必要な操作はagentから確定できないようにする。実行後は同じrevision、tool result、画面状態を再読込みし、失敗時にはRetry・Undo・人への引継ぎを並べる。
