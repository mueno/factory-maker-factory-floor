import type { Metadata } from 'next';
import { LegalPage } from '../legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | Factory Maker: Factory Floor',
  description: 'How Factory Maker: Factory Floor handles local workflow data and hosting information.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="LEGAL · PRIVACY"
      title="Privacy Policy"
      summary="The working brief and factory state stay in your browser. This prototype has no account system, application database, advertising tracker, or application analytics."
    >
      <section>
        <h2>1. Scope and controller</h2>
        <p>
          This Privacy Policy explains how Factory Maker: Factory Floor (the “Site”) handles
          information. AllNew LLC, located in Tokyo, Japan, operates the Site and is the data
          controller for personal data processed through the Site where applicable.
        </p>
        <p>
          This app-specific policy supplements the
          <a href="https://www.allnew.work/en/privacy" target="_blank" rel="noreferrer"> AllNew LLC Privacy Policy</a>.
          This policy controls for the Site’s application-level processing if the two differ.
        </p>
      </section>

      <section>
        <h2>2. Information handled by the Site</h2>
        <h3>Information you enter or create</h3>
        <p>
          The Site may handle a brief, structured summary, intended audience, desired outcome,
          selected concept, build contract, candidate name, scores, approvals, and an activity
          history. The application stores this workflow state in local storage on your device.
        </p>
        <h3>Technical information</h3>
        <p>
          OpenAI and its infrastructure providers may process standard request and operational
          information needed to host, secure, maintain, and troubleshoot the Site, such as IP
          address, device or browser information, request time, requested URL, and security logs.
          AllNew does not operate a separate application database or analytics service for this Site.
        </p>
      </section>

      <section>
        <h2>3. How information is used</h2>
        <ul>
          <li>to preserve the workflow state on the device between page visits;</li>
          <li>to display the same revision, decision, score, and evidence to the person and browser agent;</li>
          <li>to perform a WebMCP action that you request through a compatible agent; and</li>
          <li>to host, secure, maintain, and troubleshoot the public Site.</li>
        </ul>
        <p>
          Where the GDPR or UK GDPR applies, the relevant bases are performance of the service
          you request and legitimate interests in operating and securing a public demonstration.
          Agent use occurs only when you choose to invoke or instruct a compatible agent.
        </p>
      </section>

      <section>
        <h2>4. Local storage, cookies, and clipboard</h2>
        <p>
          The application uses one local-storage record, <code>factory-floor-state-v1</code>,
          to retain the current workflow on your device. It does not set advertising cookies,
          use cross-site tracking, or install application analytics. OpenAI or your browser may
          use cookies or similar technologies for hosting, security, or service delivery under
          their own policies.
        </p>
        <p>
          The “Copy state” control writes the displayed factory state to your clipboard only
          after you select it. The Site does not read your clipboard.
        </p>
      </section>

      <section>
        <h2>5. WebMCP and browser agents</h2>
        <p>
          In a supported browser, the Site registers typed WebMCP tools on the page. A compatible
          browser agent may process visible content and information made available through those
          tools when you ask it to act. That processing is provided by the browser or agent service,
          not by an AI model called directly by this application, and is subject to the provider’s
          own terms and privacy policy.
        </p>
      </section>

      <section>
        <h2>6. Sharing and external processing</h2>
        <p>
          The application code does not transmit workflow input to AllNew, an advertising network,
          or an analytics provider. OpenAI processes information necessary to provide ChatGPT Sites
          hosting on our behalf. Information may also be processed by a browser or agent provider
          when you choose to use its service. We may disclose information if required by law or to
          protect the Site, users, or others from fraud, abuse, or security threats.
        </p>
        <p>
          ChatGPT Sites does not guarantee a particular data-residency location. Hosting information
          may be processed in countries where OpenAI or its service providers operate, subject to the
          agreement and safeguards applicable to the relevant service.
        </p>
      </section>

      <section>
        <h2>7. Retention and deletion</h2>
        <p>
          Local workflow state remains on your device until you reset the demo, clear storage for
          this Site in your browser, or the browser removes it. Selecting the Factory Maker logo in
          the application resets the workflow and removes the local-storage record. Because AllNew
          does not receive this local workflow state through the application, we cannot retrieve or
          delete it remotely.
        </p>
        <p>
          Hosting and security logs are retained by OpenAI and its providers under the terms and
          retention practices applicable to ChatGPT Sites. We do not state a fixed period that we
          cannot independently control.
        </p>
      </section>

      <section>
        <h2>8. Sensitive information and children</h2>
        <p>
          Do not enter personal, confidential, protected health, payment-card, trade-secret, or
          other sensitive information. The Site is not directed to children under 13 or under the
          applicable age of digital consent, and we do not knowingly solicit their personal data.
        </p>
      </section>

      <section>
        <h2>9. Your choices and rights</h2>
        <p>
          You control the application-level workflow state through your browser and can erase it as
          described above. Depending on applicable law, you may have rights to access, correct,
          delete, restrict, object to, or receive a copy of personal data held by a controller, and
          to complain to a supervisory authority.
        </p>
        <p>
          For information held by AllNew, contact <a href="mailto:info@allnew.work">info@allnew.work</a>.
          For information controlled directly by OpenAI or another browser or agent provider, submit
          your request to that provider through its privacy channels.
        </p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>
          The Site minimizes application-level data collection by using device-local storage and no
          application database, login, advertising tracker, or analytics SDK. No internet service is
          completely secure. Protect access to your device and browser profile, and reset the demo
          after testing on a shared device.
        </p>
      </section>

      <section>
        <h2>11. Updates and contact</h2>
        <p>
          We may update this policy if the Site’s data handling changes. Material changes will be
          reflected on this page before or when they take effect. Questions or privacy requests may
          be sent to <a href="mailto:info@allnew.work">info@allnew.work</a>.
        </p>
      </section>

      <aside className="legal-source-note">
        <strong>Hosting references</strong>
        <p>
          Review the <a href="https://openai.com/policies/chatgpt-sites-terms/" target="_blank" rel="noreferrer">ChatGPT Sites Terms</a>,
          the <a href="https://openai.com/policies/chatgpt-sites-data-processing-addendum/" target="_blank" rel="noreferrer"> Sites Data Processing Addendum</a>,
          and the <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noreferrer"> OpenAI Privacy Policy</a> for provider-level processing.
        </p>
      </aside>
    </LegalPage>
  );
}
