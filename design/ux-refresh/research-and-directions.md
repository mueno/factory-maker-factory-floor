# Factory Maker UX/UI refresh

調査期間: 2026年6月3日〜9月3日
対象: WebMCP公式情報、直近の実装事例、WebMCP Challenge公開情報

## 調査から確認できた変化

- WebMCPの価値は、エージェントが画面を推測操作することではなく、サイトが用途の明確なツールを公開し、ページの状態を直接更新できることにある。Chromeは、ツール実行後に画面も更新し、人とエージェントが完了を確認できる設計を推奨している。
- ChatGPTのサイトツールでは、利用者とエージェントが同じページとログイン状態を使い、読み取り・変更の区別、直近のツール利用、機微な操作の確認を利用者が把握できる。
- ShopifyのWebMCPツールは、カタログ検索やカート更新を閲覧中のタブで実行し、エージェントの変更を利用者が同じ画面で確認できる。
- OpenAIの公開例は、共有文書、旅程、3Dモデル、買い物かごなど、会話自体より「共同編集する対象」を画面の中心に置いている。Margin Editorでは、エージェントが本人になりすまさず、自分の名義でコメントを残す。
- Cloudflareは、利用者が意識するのは実装方式ではなく、目的を少ない往復で安全に達成できるかどうかだと説明している。

## いまの利用者が求めるUX

1. **最初の10秒で始められる**
   入口は一つの依頼欄と一つの主要ボタンに絞る。工程やツール一覧は、必要になるまで前面に出さない。

2. **成果物を中心に共同作業できる**
   会話ログではなく、企画書、画面案、仕様、検証結果など、いま編集している成果物を最大の面積で表示する。

3. **AIが何を変えたか分かる**
   エージェントの作業中、変更点、利用ツール、完了結果を短い履歴として成果物の近くに表示する。人の操作とAIの操作は名義を分ける。

4. **重要な判断は人が持つ**
   AIは下書きと候補提示まで進める。企画の採用、仕様の固定、公開は、画面上の明確な人専用操作にする。

5. **失敗しても戻れる**
   差し戻し、取り消し、未確認、再試行を正常な経路として設ける。エラーには次に取れる行動を添える。

6. **画面状態に合うツールだけを見せる**
   WebMCPツールは工程に応じて入れ替える。重複したツールを並べず、読み取りと書き込みを明示する。

7. **スマートフォンでも同じ物語を追える**
   デスクトップの三列を縮小するのではなく、依頼、AIの提案、人の確認、成果物という縦の流れへ組み替える。

8. **言語を替えても操作構造を変えない**
   人向けUIは英語と日本語を切り替え、選択を端末内に保存する。WebMCPのツール名と構造化データは英語の安定した契約として維持する。

## 5つの画面方向

### A. Shared Canvas

大きな成果物キャンバスを中央に置き、右側に人とエージェントの短い変更履歴を添える。穏やかな紙面調で、共同編集と信頼を最優先する。

### B. Command Studio

左に短い依頼、中央にライブプレビュー、下部に人の承認ゲートを置く。制作ツールらしい暗色UIで、入力から生成までの速さを演出する。

### C. Evidence Trail

依頼から公開までを一本の証拠線として見せる。各節点に担当者、根拠、差分、承認状態が付き、WebMCPの観測可能性を最も強く表す。

### D. Calm Launchpad

最初は依頼欄だけを見せ、作業が進むたびに次のカードを開く。余白が多く、モバイルでも迷いにくい。専門知識のない利用者に向く。

### E. Agent Glass

成果物、ツール、イベント、権限境界を一画面で把握できる透明なコックピット。技術審査には強いが、情報量を誤ると一般利用者には重くなる。

## 評価基準

- WebMCPが画面体験を本質的に良くしているか: 25点
- 3分で一連の共同作業を理解できるか: 25点
- 初見の利用者が迷わず始められるか: 20点
- 人の権限、変更履歴、失敗回復が見えるか: 20点
- 独自性と視覚的な記憶性があるか: 10点

## 一次情報

- [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)
- [Chrome WebMCP](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome: Build your user's agentic workflows](https://developer.chrome.com/docs/ai/webmcp/build-tools)
- [Chrome: WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [OpenAI: Using site tools](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app)
- [Shopify WebMCP tools](https://shopify.dev/docs/api/web-mcp)
- [Cloudflare: Building an open Agentic Internet](https://blog.cloudflare.com/the-agentic-internet/)
- [OpenAI WebMCP showcase](https://developers.openai.com/showcase?view=webmcp-apps)
