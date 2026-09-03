import type { Metadata } from 'next';
import { LegalPage } from '../legal-page';

export const metadata: Metadata = {
  title: 'AI & Safety Notice | Factory Maker: Factory Floor',
  description: 'A plain-language explanation of Factory Floor’s WebMCP, human-control, and data boundaries.',
};

export default function AiSafetyPage() {
  return (
    <LegalPage
      eyebrow="TRANSPARENCY · AI & SAFETY"
      title="AI & Safety Notice"
      summary="Factory Floor separates what the browser agent may stage from what only a person may decide. The application itself uses deterministic templates and scoring; it does not call a generative-AI API."
    >
      <section>
        <h2>1. Where the agent comes from</h2>
        <p>
          Factory Floor exposes typed JavaScript tools through <code>document.modelContext</code>.
          A WebMCP-capable browser or in-app browser may make those tools available to its agent.
          The agent is supplied by the browser or agent service. This application does not embed a
          model, choose the model, or send a prompt to a generative-AI API on its own.
        </p>
      </section>

      <section>
        <h2>2. What is deterministic</h2>
        <p>
          The prototype’s concept set and build template are allowlisted in the application. The
          generated Decision Board uses the formula <code>impact × confidence × 4 − effort × 3</code>.
          Evidence checks use the visible revision, frozen contract, output hash, WebMCP support,
          stale-write rejection, and recorded human actions. These operations do not depend on a
          hidden model judgment.
        </p>
      </section>

      <section>
        <h2>3. What the agent may do</h2>
        <p>
          The available tool set changes with the page and workflow phase. The agent may read the
          current state, stage bounded material, generate the allowlisted preview, run checks, undo
          its latest reversible stage, and score a project candidate. Write tools use typed inputs;
          workflow mutations require the current revision so stale requests can be rejected.
        </p>
      </section>

      <section>
        <h2>4. What remains human-only</h2>
        <p>
          A person must accept the structured brief, select a concept, freeze the build contract,
          approve a pilot, handle exceptions, and decide whether anything should be released or
          used outside the prototype. The agent cannot invoke these controls through the registered
          tool surface.
        </p>
      </section>

      <section>
        <h2>5. Known limits</h2>
        <ul>
          <li>WebMCP support depends on the browser and may be unavailable in an ordinary browser.</li>
          <li>The prototype builds from a small allowlist; it is not a general-purpose app generator.</li>
          <li>Workflow data is device-local and does not synchronize between browsers or devices.</li>
          <li>An external browser agent may misunderstand instructions or return inaccurate text.</li>
          <li>A passing evidence gate demonstrates the listed checks, not production readiness or legal compliance.</li>
        </ul>
      </section>

      <section>
        <h2>6. Responsible use</h2>
        <p>
          Use fictional or non-sensitive evaluation data. Do not use the Site to make high-impact
          decisions about health, safety, employment, credit, legal rights, or access to essential
          services. Review every recommendation, preserve the human checkpoints, and do not attempt
          to bypass them through browser automation or adversarial instructions.
        </p>
      </section>

      <section>
        <h2>7. Questions or reports</h2>
        <p>
          Report a safety, privacy, or security concern to
          <a href="mailto:info@allnew.work"> info@allnew.work</a>. Please do not include secrets or
          sensitive personal information in the report.
        </p>
      </section>
    </LegalPage>
  );
}
