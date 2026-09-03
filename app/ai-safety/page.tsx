'use client';

import { LegalPage } from '../legal-page';
import { useLocale } from '../i18n';

export default function AiSafetyPage() {
  const { locale } = useLocale();
  if (locale === 'ja') return (
    <LegalPage eyebrow="透明性・科学・AI" title="AIと科学的安全性" summary="TERRAは、AIが画面を推測操作するのではなく、出典と版番号を持つ6つのWebMCPツールで地球ステージを操作します。表示の種類と科学的な確度を分けて示します。">
      <section><h2>1. AIの役割</h2><p>ブラウザ内AIは、現在の状態と出典を読み、地域、科学レイヤー、IPCCシナリオ、年代、見せ方およびガイド物語を操作できます。ツールは型付きで、変更には現在の版番号が必要です。古い状態を前提にした変更は拒否します。</p></section>
      <section><h2>2. 観測、評価、簡略モデルの区別</h2><ul><li><strong>観測：</strong>NSIDCの公開観測値など、取得元と対象年を示します。</li><li><strong>評価レンジ：</strong>IPCC等が公表した幅を、中央値だけでなく範囲として示します。</li><li><strong>簡略表示：</strong>評価期間の間を結ぶ補間や説明用形状は、その旨を表示します。</li></ul><p>表現スタイルを変えても元の値は変わりません。映画的表示は理解を助ける演出であり、確度を高めるものではありません。</p></section>
      <section><h2>3. 音声と人の制御</h2><p>マイクと空間音響は、利用者の操作後にだけ開始します。音声認識が利用できない場合も、文字入力と画面操作で同じ体験を続けられます。ガイド物語はいつでも別操作で中断できます。</p></section>
      <section><h2>4. 既知の限界</h2><ul><li>全球気候モデルやリアルタイム気象解析を実行していません。</li><li>海面の年次値と将来海氷形状は説明用の簡略表示です。</li><li>都市・地域の浸水、個別災害、避難経路を予測しません。</li><li>WebMCP、音声認識、WebGPUの対応状況はブラウザと端末に依存します。</li><li>ブラウザ内AIの回答には誤りが含まれる可能性があります。</li></ul></section>
      <section><h2>5. 責任ある利用</h2><p>表示を重要判断の唯一の根拠にせず、画面から一次資料を確認してください。緊急時は、気象庁、自治体その他の公的機関が発表する最新情報に従ってください。懸念の報告は<a href="mailto:info@allnew.work">info@allnew.work</a>へお寄せください。</p></section>
    </LegalPage>
  );
  return (
    <LegalPage eyebrow="TRANSPARENCY · SCIENCE · AI" title="AI & Scientific Safety" summary="TERRA exposes six typed, sourced, revision-guarded WebMCP tools. It distinguishes observations, assessed ranges, and reduced-order displays.">
      <section><h2>1. Agent role</h2><p>A browser agent may read state and sources, then change a named region, evidence layer, IPCC scenario, year, presentation style, or guided story. Every write requires the current revision; a stale write is rejected.</p></section>
      <section><h2>2. Evidence classes</h2><ul><li><strong>Observed:</strong>the source and observation year are identified.</li><li><strong>Assessed range:</strong>published uncertainty is shown rather than hidden behind a midpoint.</li><li><strong>Reduced-order display:</strong>interpolation and illustrative geometry are labelled as such.</li></ul><p>Changing the visual style never changes the underlying values.</p></section>
      <section><h2>3. Voice and human control</h2><p>Microphone and spatial audio begin only after a user action. Text and visible controls remain available when speech recognition or WebGPU is unavailable. A guided sequence can be interrupted by another action.</p></section>
      <section><h2>4. Known limits</h2><ul><li>No global climate model or real-time weather analysis runs in the Site.</li><li>Annual sea-level values and future sea-ice geometry are explanatory reduced-order displays.</li><li>The Site does not predict local flooding, individual hazards, or evacuation routes.</li><li>WebMCP, speech recognition, and WebGPU support vary by browser and device.</li><li>A browser agent may provide inaccurate language.</li></ul></section>
      <section><h2>5. Responsible use</h2><p>Do not make consequential decisions from this display alone. Open the primary sources linked by the Site, and follow current public-authority guidance during an emergency. Report concerns to <a href="mailto:info@allnew.work">info@allnew.work</a>.</p></section>
    </LegalPage>
  );
}
