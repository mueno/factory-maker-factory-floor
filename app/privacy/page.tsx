'use client';

import { LegalPage } from '../legal-page';
import { useLocale } from '../i18n';

export default function PrivacyPage() {
  const { locale } = useLocale();

  if (locale === 'ja') {
    return (
      <LegalPage
        eyebrow="法務・プライバシー"
        title="プライバシーポリシー"
        summary="企画内容と作業状態は、利用中のブラウザ内に保存されます。本サイトには、アカウント機能、アプリケーション用データベース、広告トラッカーおよびアクセス解析機能はありません。"
      >
        <section>
          <h2>1. 適用範囲と運営者</h2>
          <p>本ポリシーは、Factory Maker（以下「本サイト」）における情報の取扱いを説明します。本サイトは、東京都に所在するAllNew合同会社（以下「当社」）が運営します。当社が本サイトを通じて個人データを取り扱う場合、当社が管理者となります。</p>
          <p>本ポリシーは、<a href="https://www.allnew.work/privacy" target="_blank" rel="noreferrer">AllNew合同会社プライバシーポリシー</a>を、本サイト固有の処理について補足するものです。両者に相違がある場合は、本サイトにおけるアプリケーションレベルの処理について本ポリシーを適用します。</p>
        </section>
        <section>
          <h2>2. 本サイトが取り扱う情報</h2>
          <h3>利用者が入力・作成する情報</h3>
          <p>企画内容、要約、想定利用者、実現したい結果、選択した方向案、構築仕様、候補名、評価値、承認および操作履歴を取り扱うことがあります。これらの作業状態は、利用者の端末にあるブラウザのローカルストレージへ保存します。</p>
          <h3>技術情報</h3>
          <p>OpenAIおよび同社のインフラ提供者は、本サイトの配信、安全確保、保守および障害対応に必要な標準的な情報を処理することがあります。これには、IPアドレス、端末・ブラウザ情報、アクセス日時、要求URL、安全管理ログなどが含まれます。当社は、本サイト専用のアプリケーションデータベースまたはアクセス解析サービスを運用していません。</p>
        </section>
        <section>
          <h2>3. 利用目的</h2>
          <ul><li>ページを閉じた後も、同じ端末で作業状態を復元するため</li><li>人とブラウザ内のAIに、同じ版、判断、評価結果および根拠を表示するため</li><li>利用者が依頼したWebMCP操作を、対応するAIから実行するため</li><li>公開サイトを配信し、安全に維持し、障害に対応するため</li></ul>
          <p>GDPRまたは英国GDPRが適用される場合、主な法的根拠は、利用者が求める機能の提供、および公開実演を運営・保護する正当な利益です。AIによる処理は、利用者が対応するAIに操作を依頼した場合に行われます。</p>
        </section>
        <section>
          <h2>4. ローカルストレージ、Cookie、クリップボード</h2>
          <p>本サイトは、作業状態を保持する<code>factory-floor-state-v1</code>と表示言語を保持する<code>factory-floor-locale-v1</code>を、ブラウザのローカルストレージで使用します。広告Cookie、サイト横断トラッキングおよびアプリ内アクセス解析は使用しません。OpenAIまたは利用中のブラウザは、ホスティング、安全確保またはサービス提供のため、それぞれの方針に従ってCookie等を利用することがあります。</p>
          <p>「共有状態をコピー」を選ぶと、表示中の作業状態をクリップボードへ書き込みます。本サイトがクリップボードの内容を読み取ることはありません。</p>
        </section>
        <section>
          <h2>5. WebMCPとブラウザ内のAI</h2>
          <p>対応ブラウザでは、本サイトが型付きのWebMCPツールをページ上に登録します。利用者が操作を依頼すると、ブラウザ内のAIが画面の内容とツールを通じて提供される情報を処理することがあります。この処理はブラウザまたはAIサービスが提供するものであり、本サイトが生成AI APIを直接呼び出すものではありません。各提供者の規約とプライバシーポリシーが適用されます。</p>
        </section>
        <section>
          <h2>6. 提供先と国外処理</h2>
          <p>本サイトのアプリケーションコードは、作業内容を当社のデータベース、広告事業者またはアクセス解析事業者へ送信しません。OpenAIは、ChatGPT Sitesのホスティングに必要な情報を処理します。利用者がブラウザまたはAIサービスを使用する場合は、その提供者も情報を処理することがあります。法令上必要な場合、または詐欺、不正利用、安全上の脅威から本サイトや利用者等を守るために必要な場合は、情報を開示することがあります。</p>
          <p>ChatGPT Sitesは、特定のデータ保管国を保証していません。ホスティングに関する情報は、適用される契約と保護措置に従い、OpenAIまたは提供者が事業を行う国で処理されることがあります。</p>
        </section>
        <section>
          <h2>7. 保存期間と削除</h2>
          <p>作業状態は、本サイトでデモを初期化する、ブラウザのサイトデータを削除する、またはブラウザが削除するまで端末内に残ります。「デモを初期化」を選び確認すると、作業状態の記録を削除します。表示言語の設定は、ブラウザのサイトデータを削除するまで残ることがあります。当社はアプリケーションを通じて端末内の作業状態を受信しないため、遠隔から取得・削除できません。</p>
          <p>ホスティングおよび安全管理ログは、ChatGPT Sitesに適用される条件と保存方針に従ってOpenAIおよび提供者が保持します。当社が独自に管理できない保存期間を断定しません。</p>
        </section>
        <section>
          <h2>8. 機微な情報と子どもの利用</h2>
          <p>個人情報、機密情報、要配慮個人情報、健康情報、カード情報、営業秘密その他の慎重な取扱いを要する情報は入力しないでください。本サイトは13歳未満、または適用されるデジタル同意年齢に満たない子どもを対象としておらず、その個人データを意図的に収集しません。</p>
        </section>
        <section>
          <h2>9. 利用者の選択と権利</h2>
          <p>アプリケーションレベルの作業状態は、前項の方法で利用者自身が削除できます。適用法令に応じて、管理者が保有する個人データへのアクセス、訂正、削除、処理制限、異議申立て、データの受領、および監督機関への申立てを行える場合があります。</p>
          <p>当社が保有する情報については<a href="mailto:info@allnew.work">info@allnew.work</a>へご連絡ください。OpenAIその他のブラウザ・AI提供者が直接管理する情報については、各提供者の窓口へお申し出ください。</p>
        </section>
        <section>
          <h2>10. 安全管理</h2>
          <p>端末内保存を採用し、専用データベース、ログイン、広告トラッカー、アクセス解析SDKを設けないことで、アプリケーションレベルの情報収集を抑えています。ただし、インターネット上のサービスに絶対的な安全はありません。端末とブラウザプロファイルを保護し、共用端末での検証後はデモを初期化してください。</p>
        </section>
        <section>
          <h2>11. 言語、改定およびお問い合わせ</h2>
          <p>本ポリシーは日本語と英語で提供します。両者に相違がある場合は、法令で認められる範囲で日本語版を優先します。情報の取扱いが変わる場合は、変更前または変更時に本ページを更新します。お問い合わせやプライバシーに関する請求は<a href="mailto:info@allnew.work">info@allnew.work</a>へお寄せください。</p>
        </section>
        <aside className="legal-source-note"><strong>ホスティングに関する資料</strong><p>提供者による処理については、<a href="https://openai.com/policies/chatgpt-sites-terms/" target="_blank" rel="noreferrer">ChatGPT Sites Terms</a>、<a href="https://openai.com/policies/chatgpt-sites-data-processing-addendum/" target="_blank" rel="noreferrer">Sites Data Processing Addendum</a>および<a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noreferrer">OpenAI Privacy Policy</a>をご確認ください。</p></aside>
      </LegalPage>
    );
  }

  return (
    <LegalPage eyebrow="LEGAL · PRIVACY" title="Privacy Policy" summary="The working brief and factory state stay in your browser. This prototype has no account system, application database, advertising tracker, or application analytics.">
      <section><h2>1. Scope and controller</h2><p>This Privacy Policy explains how Factory Maker (the “Site”) handles information. AllNew LLC, located in Tokyo, Japan, operates the Site and is the data controller for personal data processed through it where applicable.</p><p>This app-specific policy supplements the <a href="https://www.allnew.work/en/privacy" target="_blank" rel="noreferrer">AllNew LLC Privacy Policy</a>. This policy controls for the Site’s application-level processing if the two differ.</p></section>
      <section><h2>2. Information handled by the Site</h2><h3>Information you enter or create</h3><p>The Site may handle a brief, structured summary, intended audience, desired outcome, selected concept, build contract, candidate name, scores, approvals, and activity history. The application stores this workflow state in local storage on your device.</p><h3>Technical information</h3><p>OpenAI and its infrastructure providers may process standard request and operational information needed to host, secure, maintain, and troubleshoot the Site, such as IP address, device or browser information, request time, requested URL, and security logs. AllNew does not operate a separate application database or analytics service for this Site.</p></section>
      <section><h2>3. How information is used</h2><ul><li>to preserve workflow state on the device between visits;</li><li>to display the same revision, decision, score, and evidence to the person and browser agent;</li><li>to perform a WebMCP action you request through a compatible agent; and</li><li>to host, secure, maintain, and troubleshoot the public Site.</li></ul><p>Where the GDPR or UK GDPR applies, the relevant bases are performance of the service you request and legitimate interests in operating and securing a public demonstration. Agent use occurs when you choose to invoke or instruct a compatible agent.</p></section>
      <section><h2>4. Local storage, cookies, and clipboard</h2><p>The application uses <code>factory-floor-state-v1</code> to retain workflow state and <code>factory-floor-locale-v1</code> to retain your display-language choice in browser local storage. It does not set advertising cookies, use cross-site tracking, or install application analytics. OpenAI or your browser may use cookies or similar technologies for hosting, security, or service delivery under their own policies.</p><p>The “Copy shared state” control writes displayed factory state to your clipboard only after you select it. The Site does not read your clipboard.</p></section>
      <section><h2>5. WebMCP and browser agents</h2><p>In a supported browser, the Site registers typed WebMCP tools on the page. A compatible browser agent may process visible content and information made available through those tools when you ask it to act. That processing is provided by the browser or agent service, not by an AI model called directly by this application, and is subject to the provider’s terms and privacy policy.</p></section>
      <section><h2>6. Sharing and external processing</h2><p>The application code does not transmit workflow input to an AllNew database, advertising network, or analytics provider. OpenAI processes information necessary to provide ChatGPT Sites hosting. Information may also be processed by a browser or agent provider when you choose to use its service. We may disclose information if required by law or to protect the Site, users, or others from fraud, abuse, or security threats.</p><p>ChatGPT Sites does not guarantee a particular data-residency location. Hosting information may be processed where OpenAI or its service providers operate, subject to applicable agreements and safeguards.</p></section>
      <section><h2>7. Retention and deletion</h2><p>Local workflow state remains on your device until you reset the demo, clear storage for this Site, or the browser removes it. Selecting “Reset demo” and confirming removes the workflow-state record. The language setting may remain until you clear the Site’s browser data. Because AllNew does not receive this local workflow state through the application, we cannot retrieve or delete it remotely.</p><p>Hosting and security logs are retained by OpenAI and its providers under the terms and practices applicable to ChatGPT Sites. We do not state a fixed period that we cannot independently control.</p></section>
      <section><h2>8. Sensitive information and children</h2><p>Do not enter personal, confidential, protected health, payment-card, trade-secret, or other sensitive information. The Site is not directed to children under 13 or under the applicable age of digital consent, and we do not knowingly solicit their personal data.</p></section>
      <section><h2>9. Your choices and rights</h2><p>You control application-level workflow state through your browser and can erase it as described above. Depending on applicable law, you may have rights to access, correct, delete, restrict, object to, or receive a copy of personal data held by a controller, and to complain to a supervisory authority.</p><p>For information held by AllNew, contact <a href="mailto:info@allnew.work">info@allnew.work</a>. For information controlled directly by OpenAI or another browser or agent provider, submit your request to that provider through its privacy channels.</p></section>
      <section><h2>10. Security</h2><p>The Site minimizes application-level data collection by using device-local storage and no application database, login, advertising tracker, or analytics SDK. No internet service is completely secure. Protect access to your device and browser profile, and reset the demo after testing on a shared device.</p></section>
      <section><h2>11. Language, updates, and contact</h2><p>This policy is available in English and Japanese. If the versions conflict, the Japanese version controls to the extent permitted by law. We may update this policy if data handling changes. Questions or privacy requests may be sent to <a href="mailto:info@allnew.work">info@allnew.work</a>.</p></section>
      <aside className="legal-source-note"><strong>Hosting references</strong><p>Review the <a href="https://openai.com/policies/chatgpt-sites-terms/" target="_blank" rel="noreferrer">ChatGPT Sites Terms</a>, <a href="https://openai.com/policies/chatgpt-sites-data-processing-addendum/" target="_blank" rel="noreferrer">Sites Data Processing Addendum</a>, and <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noreferrer">OpenAI Privacy Policy</a> for provider-level processing.</p></aside>
    </LegalPage>
  );
}
