import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '../legal-page';

export const metadata: Metadata = {
  title: 'Terms of Use | Factory Maker: Factory Floor',
  description: 'Terms governing use of the Factory Maker: Factory Floor WebMCP hackathon prototype.',
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="LEGAL · TERMS"
      title="Terms of Use"
      summary="These terms keep the evaluation boundary clear: this is a free WebMCP hackathon prototype, its outputs are not professional advice, and final decisions remain with the human user."
    >
      <section>
        <h2>1. Scope and acceptance</h2>
        <p>
          These Terms of Use (“Terms”) govern access to and use of Factory Maker: Factory
          Floor (the “Site”), operated by AllNew LLC (“AllNew,” “we,” or “us”). By using
          the Site, you agree to these Terms. If you do not agree, do not use the Site.
        </p>
        <p>
          The Site is a public prototype submitted to the OpenAI WebMCP Challenge. It is
          provided for evaluation, demonstration, research, and educational use. It is not
          a production software-development service or a promise to deliver a deployable
          product.
        </p>
      </section>

      <section>
        <h2>2. What the Site does</h2>
        <p>
          The Site demonstrates a browser-native workflow in which a compatible agent may
          read shared state, stage a brief, stage bounded concepts, prepare a build contract,
          generate an allowlisted preview, and run evidence checks through WebMCP tools.
          Human-only controls accept the brief, select a concept, freeze the contract, and
          approve a pilot.
        </p>
        <p>
          The generated Decision Board applies a fixed scoring formula to values supplied by
          the user or agent. A score, lane, concept, preview, or other output is an aid for
          evaluation only and is not legal, financial, medical, security, employment, or
          other professional advice.
        </p>
      </section>

      <section>
        <h2>3. Permitted use</h2>
        <p>
          You may use the Site through its visible interface or its registered WebMCP tools
          for reasonable evaluation and testing. During the Hackathon judging period,
          Sponsor, Administrator, and Judges may access and test the Site free of charge as
          contemplated by the Hackathon Official Rules.
        </p>
        <p>
          You are responsible for your device, browser, network, agent instructions, and any
          decisions made using Site output. Keep a human reviewer involved before relying on
          or acting on any recommendation.
        </p>
      </section>

      <section>
        <h2>4. Your content and data</h2>
        <p>
          You retain any rights you hold in text or values you enter. You represent that you
          have the right to use that content and that it does not violate law or another
          person’s rights. Do not enter personal, confidential, health, payment-card, trade
          secret, or other sensitive information.
        </p>
        <p>
          Workflow state is stored in your browser’s local storage. If you direct a compatible
          browser agent to use the Site, that agent and its provider may process information
          made available to it under their own terms and privacy policy. See our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>5. Prohibited conduct</h2>
        <p>You must not:</p>
        <ul>
          <li>use the Site for unlawful, fraudulent, deceptive, abusive, or harmful activity;</li>
          <li>attempt to bypass human-only controls, access restrictions, or security measures;</li>
          <li>introduce malware or instructions intended to compromise a browser, agent, or third party;</li>
          <li>send automated requests that unreasonably burden or disrupt the Site; or</li>
          <li>infringe intellectual-property, privacy, publicity, or other rights.</li>
        </ul>
      </section>

      <section>
        <h2>6. Intellectual property and open source</h2>
        <p>
          The Site’s source code is available under the MIT License in the public
          <a href="https://github.com/mueno/factory-maker-factory-floor" target="_blank" rel="noreferrer"> project repository</a>.
          The MIT License governs use of that source code. Product names, visual identity,
          copy, and other material not included in the licensed source remain owned by
          AllNew or their respective rights holders.
        </p>
      </section>

      <section>
        <h2>7. Third-party services and no endorsement</h2>
        <p>
          The Site is hosted on ChatGPT Sites and may be used through third-party browsers
          or agent services. Those services are governed by their own terms. Participation
          in the OpenAI WebMCP Challenge and hosting on ChatGPT Sites do not mean that OpenAI,
          Devpost, Google, Microsoft, or any Judge has endorsed or certified this Site.
          Third-party names and marks belong to their respective owners.
        </p>
      </section>

      <section>
        <h2>8. Availability and changes</h2>
        <p>
          We may correct, update, suspend, or discontinue the Site. We intend to keep the
          submitted version available without charge or access restriction through the end
          of the Hackathon judging period stated in the Official Rules. We do not promise
          permanent availability after that period.
        </p>
      </section>

      <section>
        <h2>9. Disclaimer and limitation of liability</h2>
        <p>
          The Site is provided “as is” and “as available.” We do not warrant that it will be
          uninterrupted, error-free, complete, or fit for a particular purpose. To the
          extent permitted by applicable law, AllNew is not liable for indirect, incidental,
          special, or consequential loss arising from use of the Site or reliance on its output.
        </p>
        <p>
          Nothing in these Terms excludes or limits liability for willful misconduct or gross
          negligence, or any right or remedy that cannot lawfully be excluded or limited under
          applicable consumer-protection law.
        </p>
      </section>

      <section>
        <h2>10. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of Japan. To the extent permitted by applicable
          law, the Tokyo District Court has exclusive jurisdiction as the court of first
          instance. Mandatory rights available to you under the law of your residence remain unaffected.
        </p>
      </section>

      <section>
        <h2>11. Changes and contact</h2>
        <p>
          We may update these Terms when reasonably necessary. The effective date above will
          identify the current version. Questions may be sent to
          <a href="mailto:info@allnew.work"> info@allnew.work</a>.
        </p>
      </section>

      <aside className="legal-source-note">
        <strong>Hackathon reference</strong>
        <p>
          The <a href="https://webmcp.devpost.com/rules" target="_blank" rel="noreferrer">Official Rules</a>
          govern the competition and prevail over any summary on this Site.
        </p>
      </aside>
    </LegalPage>
  );
}
