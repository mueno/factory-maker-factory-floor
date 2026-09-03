'use client';

import { LegalPage } from '../legal-page';
import { useLocale } from '../i18n';

export default function AiSafetyPage() {
  const { locale } = useLocale();

  if (locale === 'ja') {
    return (
      <LegalPage
        eyebrow="透明性・AIと安全性"
        title="AIと安全性に関する表示"
        summary="Factory Makerでは、ブラウザ内のAIが下書きできる範囲と、人だけが決定できる範囲を分けています。本サイトのテンプレート、採点および検証は固定式で動作し、生成AI APIを直接呼び出しません。"
      >
        <section>
          <h2>1. AIの提供元</h2>
          <p>Factory Makerは、<code>document.modelContext</code>を通じて型付きのJavaScriptツールを公開します。WebMCP対応ブラウザまたはアプリ内ブラウザは、それらをブラウザ内のAIから利用できるようにします。AIはブラウザまたはAIサービスの提供者が提供します。本サイト自体はモデルを内蔵・選択せず、生成AI APIへ自動的にプロンプトを送りません。</p>
        </section>
        <section>
          <h2>2. 固定式で動く処理</h2>
          <p>方向案と構築テンプレートは、アプリケーション内の許可済みリストから選びます。生成される意思決定ボードは、<code>効果 × 確信度 × 4 − 工数 × 3</code>の固定式を使用します。検証は、画面上の版番号、固定仕様、出力ハッシュ、WebMCP対応状況、古い書き込みの拒否、人の操作記録を用います。これらは、非表示のモデル判断に依存しません。</p>
        </section>
        <section>
          <h2>3. AIができること</h2>
          <p>公開するツールは、表示中の画面と工程に応じて変わります。AIは、現在の状態の読取、範囲を限定した下書き、許可済み画面の生成、検証、直前の取り消し可能なAI操作の打消し、および候補の採点を行えます。変更系ツールは型付き入力を使用し、作業状態の変更には現在の版番号が必要です。古い版を前提にした操作は拒否します。</p>
        </section>
        <section>
          <h2>4. 人だけが決めること</h2>
          <p>企画要旨の承認、方向案の選択、構築仕様の固定、試行の承認、例外への対応、および成果物を外部で利用・公開するかの決定は、人が行います。登録済みのWebMCPツールから、AIがこれらの操作を実行することはできません。</p>
        </section>
        <section>
          <h2>5. 確認されている制約</h2>
          <ul>
            <li>WebMCPの利用可否はブラウザに依存し、通常のブラウザでは利用できない場合があります。</li>
            <li>本サイトが生成できるのは許可済みの小さな範囲であり、汎用アプリ生成サービスではありません。</li>
            <li>作業状態は端末内に保存され、別のブラウザや端末とは同期しません。</li>
            <li>外部のブラウザ内AIは、指示を誤解したり、不正確な説明を返したりする可能性があります。</li>
            <li>検証への合格は、表示された項目を確認したことを示すもので、本番運用の準備完了や法令適合を保証しません。</li>
          </ul>
        </section>
        <section>
          <h2>6. 安全な利用</h2>
          <p>架空または機密性のない評価データを使用してください。健康、安全、雇用、信用、法的権利、生活に不可欠なサービスへのアクセスなど、人への影響が大きい判断には使用しないでください。推奨結果は必ず人が確認し、人の確認工程を残してください。自動操作や悪意のある指示で安全境界を回避しないでください。</p>
        </section>
        <section>
          <h2>7. 言語、お問い合わせおよび報告</h2>
          <p>本表示は日本語と英語で提供します。両者に相違がある場合は、法令で認められる範囲で日本語版を優先します。安全性、プライバシーまたはセキュリティ上の懸念は、<a href="mailto:info@allnew.work">info@allnew.work</a>へお知らせください。報告には秘密情報や機微な個人情報を含めないでください。</p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage eyebrow="TRANSPARENCY · AI & SAFETY" title="AI & Safety Notice" summary="Factory Maker separates what a browser agent may stage from what only a person may decide. The application itself uses deterministic templates and scoring; it does not call a generative-AI API.">
      <section><h2>1. Where the agent comes from</h2><p>Factory Maker exposes typed JavaScript tools through <code>document.modelContext</code>. A WebMCP-capable browser or in-app browser may make those tools available to its agent. The agent is supplied by the browser or agent service. This application does not embed a model, choose the model, or send a prompt to a generative-AI API on its own.</p></section>
      <section><h2>2. What is deterministic</h2><p>The prototype’s concept set and build template are allowlisted in the application. The generated Decision Board uses the formula <code>impact × confidence × 4 − effort × 3</code>. Evidence checks use the visible revision, frozen contract, output hash, WebMCP support, stale-write rejection, and recorded human actions. These operations do not depend on a hidden model judgment.</p></section>
      <section><h2>3. What the agent may do</h2><p>The available tool set changes with the page and workflow phase. The agent may read current state, stage bounded material, generate the allowlisted preview, run checks, undo its latest reversible stage, and score a project candidate. Write tools use typed inputs; workflow mutations require the current revision so stale requests can be rejected.</p></section>
      <section><h2>4. What remains human-only</h2><p>A person must accept the structured brief, select a concept, freeze the build contract, approve a pilot, handle exceptions, and decide whether anything should be released or used outside the prototype. The agent cannot invoke these controls through the registered tool surface.</p></section>
      <section><h2>5. Known limits</h2><ul><li>WebMCP support depends on the browser and may be unavailable in an ordinary browser.</li><li>The prototype builds from a small allowlist; it is not a general-purpose app generator.</li><li>Workflow data is device-local and does not synchronize between browsers or devices.</li><li>An external browser agent may misunderstand instructions or return inaccurate text.</li><li>A passing evidence gate demonstrates the listed checks, not production readiness or legal compliance.</li></ul></section>
      <section><h2>6. Responsible use</h2><p>Use fictional or non-sensitive evaluation data. Do not use the Site to make high-impact decisions about health, safety, employment, credit, legal rights, or access to essential services. Review every recommendation, preserve the human checkpoints, and do not attempt to bypass them through browser automation or adversarial instructions.</p></section>
      <section><h2>7. Language, questions, and reports</h2><p>This notice is available in English and Japanese. If the versions conflict, the Japanese version controls to the extent permitted by law. Report a safety, privacy, or security concern to <a href="mailto:info@allnew.work">info@allnew.work</a>. Please do not include secrets or sensitive personal information.</p></section>
    </LegalPage>
  );
}
