'use client';

import Link from 'next/link';
import { LegalPage } from '../legal-page';
import { useLocale } from '../i18n';

export default function TermsPage() {
  const { locale } = useLocale();

  if (locale === 'ja') {
    return (
      <LegalPage
        eyebrow="法務・利用規約"
        title="利用規約"
        summary="Factory Makerは、WebMCP Challengeの審査・実演・研究・学習を目的とした無償の試作サービスです。出力は専門的助言ではなく、最終判断は利用者が行います。"
      >
        <section>
          <h2>1. 適用範囲と同意</h2>
          <p>本利用規約（以下「本規約」）は、AllNew合同会社（以下「当社」）が運営するFactory Maker（以下「本サイト」）の利用に適用されます。本サイトを利用した時点で、本規約に同意したものとみなします。同意できない場合は利用しないでください。</p>
          <p>本サイトはOpenAI WebMCP Challengeへの応募作品であり、審査、実演、研究および学習のために公開しています。本番用のソフトウェア開発サービスではなく、実運用可能な製品の完成を約束するものでもありません。</p>
        </section>
        <section>
          <h2>2. 本サイトでできること</h2>
          <p>対応するブラウザ内のAIは、共有状態の読取、企画要旨や方向案の下書き、構築仕様案の作成、許可済みテンプレートからの画面生成、検証の実行を、WebMCPツールを通じて行えます。企画要旨の承認、方向案の選択、仕様の固定、試行の承認は、人が画面上で行います。</p>
          <p>生成される意思決定ボードは、入力値に固定式を適用します。点数、推奨する進め方、企画案、画面その他の出力は、評価を補助するためのものであり、法律、金融、医療、セキュリティ、雇用その他の専門的助言ではありません。</p>
        </section>
        <section>
          <h2>3. 利用条件</h2>
          <p>本サイトは、表示される画面または登録済みのWebMCPツールを通じて、合理的な範囲で評価・検証に利用できます。ハッカソンの審査期間中は、公式規則に従い、主催者、運営者および審査員が無償でアクセスし、検証できます。</p>
          <p>端末、ブラウザ、通信環境、AIへの指示、および出力を利用して行う判断は、利用者の責任で管理してください。推奨結果を利用する前に、人による確認を行ってください。</p>
        </section>
        <section>
          <h2>4. 入力内容とデータ</h2>
          <p>利用者が入力する文章や数値について、利用者が保有する権利は利用者に残ります。利用者は、その内容を使用する権限を持ち、法令または第三者の権利を侵害しないことを保証します。個人情報、機密情報、健康情報、カード情報、営業秘密その他の慎重な取扱いを要する情報は入力しないでください。</p>
          <p>作業状態はブラウザのローカルストレージに保存されます。対応するブラウザ内のAIに操作を依頼した場合、そのAIおよび提供者が、各社の規約・プライバシーポリシーに従って情報を処理することがあります。詳しくは<Link href="/privacy">プライバシーポリシー</Link>をご確認ください。</p>
        </section>
        <section>
          <h2>5. 禁止事項</h2>
          <p>次の行為を禁止します。</p>
          <ul>
            <li>違法、詐欺的、欺瞞的、虐待的または有害な目的での利用</li>
            <li>人だけが操作できる機能、アクセス制限または安全対策の回避</li>
            <li>ブラウザ、AIまたは第三者を侵害するマルウェアや指示の投入</li>
            <li>本サイトに不合理な負荷を与え、運営を妨げる自動操作</li>
            <li>知的財産権、プライバシー、肖像その他の権利の侵害</li>
          </ul>
        </section>
        <section>
          <h2>6. 知的財産とオープンソース</h2>
          <p>本サイトのソースコードは、公開<a href="https://github.com/mueno/factory-maker-factory-floor" target="_blank" rel="noreferrer">リポジトリ</a>でMIT Licenseにより提供しています。ソースコードの利用には同ライセンスが適用されます。ライセンス対象に含まれない名称、視覚表現、文章その他の素材は、当社または各権利者に帰属します。</p>
        </section>
        <section>
          <h2>7. 外部サービス</h2>
          <p>本サイトはChatGPT Sitesでホストされ、第三者のブラウザまたはAIサービスを通じて利用されることがあります。各サービスには、その提供者の規約が適用されます。ハッカソンへの参加や本サイトのホスティングは、OpenAI、Devpost、Google、Microsoftまたは審査員による推奨・認証を意味しません。第三者の名称および商標は各権利者に帰属します。</p>
        </section>
        <section>
          <h2>8. 提供期間と変更</h2>
          <p>当社は、本サイトの修正、更新、一時停止または終了を行うことがあります。公式規則に定める審査期間の終了までは、応募版を無償かつアクセス制限のない状態で提供するよう努めます。審査期間後の恒久的な提供は保証しません。</p>
        </section>
        <section>
          <h2>9. 免責と責任の制限</h2>
          <p>本サイトは、現状有姿かつ提供可能な範囲で提供します。中断や不具合がないこと、情報が完全であること、または特定の目的に適合することを保証しません。適用法令で認められる範囲で、本サイトの利用または出力への依拠から生じた間接損害、付随的損害、特別損害または結果的損害について、当社は責任を負いません。</p>
          <p>当社の故意または重過失による責任、および消費者保護法その他の法令上、免除または制限できない利用者の権利・救済を排除するものではありません。</p>
        </section>
        <section>
          <h2>10. 準拠法と裁判管轄</h2>
          <p>本規約は日本法に準拠します。適用法令で認められる範囲で、東京地方裁判所を第一審の専属的合意管轄裁判所とします。利用者の居住地の法令により強制的に認められる権利には影響しません。</p>
        </section>
        <section>
          <h2>11. 言語、変更およびお問い合わせ</h2>
          <p>本規約は日本語と英語で提供します。両者に相違がある場合は、法令で認められる範囲で日本語版を優先します。当社は、合理的に必要な場合に本規約を更新し、ページ上の施行日を変更します。お問い合わせは<a href="mailto:info@allnew.work">info@allnew.work</a>までお寄せください。</p>
        </section>
        <aside className="legal-source-note"><strong>ハッカソンの規則</strong><p>応募条件は<a href="https://webmcp.devpost.com/rules" target="_blank" rel="noreferrer">公式規則</a>に従います。本サイトの説明と相違する場合は、公式規則が優先します。</p></aside>
      </LegalPage>
    );
  }

  return (
    <LegalPage eyebrow="LEGAL · TERMS" title="Terms of Use" summary="These terms keep the evaluation boundary clear: Factory Maker is a free WebMCP hackathon prototype, its outputs are not professional advice, and final decisions remain with the human user.">
      <section><h2>1. Scope and acceptance</h2><p>These Terms of Use (“Terms”) govern access to and use of Factory Maker (the “Site”), operated by AllNew LLC (“AllNew,” “we,” or “us”). By using the Site, you agree to these Terms. If you do not agree, do not use the Site.</p><p>The Site is a public prototype submitted to the OpenAI WebMCP Challenge. It is provided for evaluation, demonstration, research, and educational use. It is not a production software-development service or a promise to deliver a deployable product.</p></section>
      <section><h2>2. What the Site does</h2><p>The Site demonstrates a browser-native workflow in which a compatible agent may read shared state, stage a brief, stage bounded concepts, prepare a build contract, generate an allowlisted preview, and run evidence checks through WebMCP tools. Human-only controls accept the brief, select a concept, freeze the contract, and approve a pilot.</p><p>The generated Decision Board applies a fixed scoring formula to values supplied by the user or agent. A score, lane, concept, preview, or other output is an evaluation aid only and is not legal, financial, medical, security, employment, or other professional advice.</p></section>
      <section><h2>3. Permitted use</h2><p>You may use the Site through its visible interface or registered WebMCP tools for reasonable evaluation and testing. During the Hackathon judging period, Sponsor, Administrator, and Judges may access and test the Site free of charge as contemplated by the Official Rules.</p><p>You are responsible for your device, browser, network, agent instructions, and decisions made using Site output. Keep a human reviewer involved before acting on a recommendation.</p></section>
      <section><h2>4. Your content and data</h2><p>You retain any rights you hold in text or values you enter. You represent that you have the right to use that content and that it does not violate law or another person’s rights. Do not enter personal, confidential, health, payment-card, trade-secret, or other sensitive information.</p><p>Workflow state is stored in your browser’s local storage. If you direct a compatible browser agent to use the Site, that agent and its provider may process information under their own terms and privacy policy. See our <Link href="/privacy">Privacy Policy</Link>.</p></section>
      <section><h2>5. Prohibited conduct</h2><p>You must not:</p><ul><li>use the Site for unlawful, fraudulent, deceptive, abusive, or harmful activity;</li><li>attempt to bypass human-only controls, access restrictions, or security measures;</li><li>introduce malware or instructions intended to compromise a browser, agent, or third party;</li><li>send automated requests that unreasonably burden or disrupt the Site; or</li><li>infringe intellectual-property, privacy, publicity, or other rights.</li></ul></section>
      <section><h2>6. Intellectual property and open source</h2><p>The Site’s source code is available under the MIT License in the public <a href="https://github.com/mueno/factory-maker-factory-floor" target="_blank" rel="noreferrer">project repository</a>. The MIT License governs use of that source code. Product names, visual identity, copy, and material not included in the licensed source remain owned by AllNew or their respective rights holders.</p></section>
      <section><h2>7. Third-party services and no endorsement</h2><p>The Site is hosted on ChatGPT Sites and may be used through third-party browsers or agent services. Those services are governed by their own terms. Participation in the OpenAI WebMCP Challenge and hosting on ChatGPT Sites do not mean that OpenAI, Devpost, Google, Microsoft, or any Judge has endorsed or certified this Site. Third-party names and marks belong to their respective owners.</p></section>
      <section><h2>8. Availability and changes</h2><p>We may correct, update, suspend, or discontinue the Site. We intend to keep the submitted version available without charge or access restriction through the end of the Hackathon judging period stated in the Official Rules. We do not promise permanent availability after that period.</p></section>
      <section><h2>9. Disclaimer and limitation of liability</h2><p>The Site is provided “as is” and “as available.” We do not warrant that it will be uninterrupted, error-free, complete, or fit for a particular purpose. To the extent permitted by applicable law, AllNew is not liable for indirect, incidental, special, or consequential loss arising from use of the Site or reliance on its output.</p><p>Nothing in these Terms excludes or limits liability for willful misconduct or gross negligence, or any right or remedy that cannot lawfully be excluded or limited under applicable consumer-protection law.</p></section>
      <section><h2>10. Governing law and disputes</h2><p>These Terms are governed by the laws of Japan. To the extent permitted by applicable law, the Tokyo District Court has exclusive jurisdiction as the court of first instance. Mandatory rights available under the law of your residence remain unaffected.</p></section>
      <section><h2>11. Language, changes, and contact</h2><p>These Terms are available in English and Japanese. If the versions conflict, the Japanese version controls to the extent permitted by law. We may update these Terms when reasonably necessary; the effective date identifies the current version. Questions may be sent to <a href="mailto:info@allnew.work">info@allnew.work</a>.</p></section>
      <aside className="legal-source-note"><strong>Hackathon reference</strong><p>The <a href="https://webmcp.devpost.com/rules" target="_blank" rel="noreferrer">Official Rules</a> govern the competition and prevail over any summary on this Site.</p></aside>
    </LegalPage>
  );
}
