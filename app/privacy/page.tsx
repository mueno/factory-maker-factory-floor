'use client';

import { LegalPage } from '../legal-page';
import { useLocale } from '../i18n';

export default function PrivacyPage() {
  const { locale } = useLocale();
  if (locale === 'ja') return (
    <LegalPage eyebrow="法務・プライバシー" title="プライバシーポリシー" summary="TERRAは、アカウント、アプリケーション用データベース、広告トラッカー、独自のアクセス解析を設けていません。音声機能は、利用者が開始した場合だけブラウザ機能を使用します。">
      <section><h2>1. 適用範囲と運営者</h2><p>本ポリシーは、AllNew合同会社（以下「当社」）が提供する対話型地球シミュレーション「TERRA」（以下「本サイト」）に適用されます。本ポリシーは、<a href="https://www.allnew.work/privacy" target="_blank" rel="noreferrer">当社プライバシーポリシー</a>を、本サイト固有の処理について補足します。</p></section>
      <section><h2>2. 本サイトが取り扱う情報</h2><p>表示言語は、利用者のブラウザ内に保存されます。入力した探究文、選択した地域、年代、シナリオおよびレイヤーは、ページを表示している間だけブラウザのメモリで処理し、当社のデータベースへ保存しません。</p><p>ホスティング提供者は、配信、安全確保および障害対応に必要なIPアドレス、端末・ブラウザ情報、要求日時、URL、安全管理ログ等を、それぞれの方針に従って処理する場合があります。</p></section>
      <section><h2>3. 音声、音響および3D描画</h2><p>マイクは、利用者が「話す」を選び、ブラウザで許可した場合だけ起動します。音声認識の処理場所や保存方針は、利用するブラウザ、OSまたは音声サービスにより異なります。本サイトは音声データを当社のサーバーへ送信・保存しません。</p><p>読み上げにはブラウザまたはOSの音声合成機能を、空間音響にはWeb Audioを使用します。Three.jsによる3D描画とWebGPU背景処理は端末上で行います。</p></section>
      <section><h2>4. WebMCPとブラウザ内AI</h2><p>対応ブラウザでは、本サイトが型付きWebMCPツールを登録します。利用者がAIに操作を依頼すると、ブラウザ内AIとその提供者が、表示内容およびツール結果を各社の規約・プライバシーポリシーに従って処理する場合があります。本サイト自体は生成AI APIを呼び出しません。</p></section>
      <section><h2>5. Cookie、保存期間および削除</h2><p>本サイトは広告Cookie、サイト横断トラッキング、独自の解析SDKを使用しません。表示言語の設定は、ブラウザのサイトデータを削除するまで残る場合があります。ホスティングおよび安全管理ログの保存期間は、提供者の条件に従います。</p></section>
      <section><h2>6. 安全な利用とお問い合わせ</h2><p>個人情報、機密情報、健康情報、決済情報、正確な位置情報その他の慎重な取扱いを要する情報は入力しないでください。当社が保有する情報に関する請求またはお問い合わせは、<a href="mailto:info@allnew.work">info@allnew.work</a>へお寄せください。</p></section>
      <aside className="legal-source-note"><strong>施行日</strong><p>2026年9月4日</p></aside>
    </LegalPage>
  );
  return (
    <LegalPage eyebrow="LEGAL · PRIVACY" title="Privacy Policy" summary="TERRA has no account system, application database, advertising tracker, or first-party analytics. Voice features use browser capabilities only after the user starts them.">
      <section><h2>1. Scope and operator</h2><p>This policy applies to TERRA, an interactive Earth simulation operated by AllNew LLC. It supplements the <a href="https://www.allnew.work/en/privacy" target="_blank" rel="noreferrer">AllNew Privacy Policy</a> for this Site.</p></section>
      <section><h2>2. Information handled</h2><p>Your language choice is stored in your browser. A question, region, year, scenario, and layer are processed in browser memory while the page is open and are not stored in an AllNew application database. Hosting providers may process ordinary request and security information under their own terms.</p></section>
      <section><h2>3. Voice, audio, and graphics</h2><p>The microphone starts only after you select the voice control and grant browser permission. Recognition may be processed by your browser, operating system, or its speech provider. The Site does not send or store audio on an AllNew server. Speech synthesis, Web Audio, Three.js, and the WebGPU world layer run through browser or device capabilities.</p></section>
      <section><h2>4. WebMCP and browser agents</h2><p>A compatible browser agent may process page content and typed tool results when you ask it to act. That processing is governed by the agent provider. The Site itself does not call a generative-AI API.</p></section>
      <section><h2>5. Storage and deletion</h2><p>The Site uses no advertising cookies, cross-site tracking, or first-party analytics SDK. Clear this Site’s browser data to remove the language preference. Provider logs follow the applicable hosting and security terms.</p></section>
      <section><h2>6. Responsible use and contact</h2><p>Do not enter personal, confidential, health, payment, precise-location, or other sensitive information. Contact <a href="mailto:info@allnew.work">info@allnew.work</a> with questions or requests about information held by AllNew.</p></section>
      <aside className="legal-source-note"><strong>Effective date</strong><p>September 4, 2026</p></aside>
    </LegalPage>
  );
}
