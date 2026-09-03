'use client';

import { LegalPage } from '../legal-page';
import { useLocale } from '../i18n';

export default function TermsPage() {
  const { locale } = useLocale();
  if (locale === 'ja') return (
    <LegalPage eyebrow="法務・利用規約" title="利用規約" summary="TERRAは、WebMCP Challengeの審査・実演・研究・学習を目的とした無償の科学可視化プロトタイプです。予報や専門的助言を提供するものではありません。">
      <section><h2>1. 適用と同意</h2><p>本規約は、AllNew合同会社が提供するTERRA（以下「本サイト」）の利用に適用されます。本サイトを利用した場合、本規約に同意したものとみなします。</p></section>
      <section><h2>2. 本サイトの内容</h2><p>本サイトは、ブラウザ内AIと人が同じ3D地球、カメラ、科学レイヤー、IPCCシナリオおよび年代を操作するWebMCP実演です。表示値には一次資料に基づく評価範囲と、説明用の簡略補間が含まれます。</p></section>
      <section><h2>3. 科学的な限界</h2><p>本サイトは全球気候モデル、天気予報、災害予測、地域別浸水図ではありません。教育・探究用の表示であり、生命、安全、避難、投資、政策その他の重要な判断に単独で使用しないでください。出典と不確実性を確認し、必要に応じて専門機関の最新情報を利用してください。</p></section>
      <section><h2>4. 禁止事項</h2><ul><li>違法、欺瞞的、有害な目的での利用</li><li>科学的表示を確定的予測として転載・表示する行為</li><li>アクセス制限または安全対策の回避</li><li>本サイトまたは第三者へ不合理な負荷や損害を与える行為</li><li>知的財産権、プライバシーその他の権利を侵害する行為</li></ul></section>
      <section><h2>5. オープンソースと第三者資料</h2><p>ソースコードは<a href="https://github.com/mueno/factory-maker-factory-floor" target="_blank" rel="noreferrer">公開リポジトリ</a>でMIT Licenseにより提供します。IPCC、NSIDC、NOAA等の名称、データ、資料には、それぞれの権利・利用条件が適用されます。各機関は本サイトを推奨・認証していません。</p></section>
      <section><h2>6. 免責、提供期間および準拠法</h2><p>本サイトは現状有姿で提供し、完全性、正確性、継続利用、特定目的への適合を保証しません。法令で認められる範囲で、本サイトの利用または表示への依拠から生じる間接損害等について、当社は責任を負いません。日本法を準拠法とし、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p></section>
      <section><h2>7. お問い合わせ</h2><p>お問い合わせは<a href="mailto:info@allnew.work">info@allnew.work</a>へお寄せください。</p></section>
      <aside className="legal-source-note"><strong>施行日</strong><p>2026年9月4日。ハッカソンについては<a href="https://webmcp.devpost.com/rules" target="_blank" rel="noreferrer">公式規則</a>が優先します。</p></aside>
    </LegalPage>
  );
  return (
    <LegalPage eyebrow="LEGAL · TERMS" title="Terms of Use" summary="TERRA is a free scientific-visualization prototype for WebMCP Challenge evaluation, demonstration, research, and learning. It is not a forecast or professional advice.">
      <section><h2>1. Scope</h2><p>These terms govern TERRA, provided by AllNew LLC. By using the Site, you agree to them.</p></section>
      <section><h2>2. What the Site does</h2><p>TERRA demonstrates a person and browser agent operating the same 3D Earth, camera, evidence layers, IPCC scenario, and year through WebMCP. Displayed values include assessed ranges from primary sources and clearly labelled reduced-order interpolation.</p></section>
      <section><h2>3. Scientific limits</h2><p>The Site is not a global climate model, weather forecast, disaster prediction, or local inundation map. Do not rely on it alone for safety, evacuation, investment, policy, or another consequential decision. Check the cited sources and current specialist guidance.</p></section>
      <section><h2>4. Prohibited use</h2><ul><li>unlawful, deceptive, abusive, or harmful activity;</li><li>presenting an exploratory display as a certain prediction;</li><li>bypassing access or safety controls;</li><li>unreasonably burdening or damaging the Site or a third party; or</li><li>infringing intellectual-property, privacy, or other rights.</li></ul></section>
      <section><h2>5. Open source and third-party material</h2><p>Source code is available under the MIT License in the <a href="https://github.com/mueno/factory-maker-factory-floor" target="_blank" rel="noreferrer">public repository</a>. IPCC, NSIDC, NOAA, and other third-party material remains subject to its own rights and terms. Those organizations do not endorse this Site.</p></section>
      <section><h2>6. Disclaimer and law</h2><p>The Site is provided “as is” without a warranty of completeness, accuracy, availability, or fitness for a particular purpose. Japanese law governs these terms and the Tokyo District Court has agreed jurisdiction to the extent permitted by law.</p></section>
      <section><h2>7. Contact</h2><p>Contact <a href="mailto:info@allnew.work">info@allnew.work</a>.</p></section>
      <aside className="legal-source-note"><strong>Effective date</strong><p>September 4, 2026. The <a href="https://webmcp.devpost.com/rules" target="_blank" rel="noreferrer">Official Rules</a> govern the competition.</p></aside>
    </LegalPage>
  );
}
