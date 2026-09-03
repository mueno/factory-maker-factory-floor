'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase =
  | 'brief'
  | 'brief_review'
  | 'concept_ready'
  | 'concept_review'
  | 'contract_ready'
  | 'contract_review'
  | 'build_ready'
  | 'evidence_ready'
  | 'verified';
type Actor = 'agent' | 'human' | 'system';
type EvidenceStatus = 'pass' | 'blocked';
type StructuredBrief = { summary: string; audience: string; outcome: string };
type Concept = { id: string; label: string; promise: string; primaryAction: string; accent: 'blue' | 'amber' | 'violet' };
type BuildContract = { productName: string; template: string; goal: string; primaryAction: string; agentPermission: string; humanBoundary: string };
type Evidence = { id: string; label: string; detail: string; status: EvidenceStatus };
type FactoryEvent = { id: string; actor: Actor; action: string; detail: string; revision: number; at: string };
type PreviewResult = { name: string; score: number; lane: 'Run a pilot' | 'Clarify evidence' | 'Park for now'; rationale: string };
type FactoryState = {
  phase: Phase; revision: number; rawBrief: string; brief: StructuredBrief | null; briefAccepted: boolean;
  concepts: Concept[]; selectedConceptId: string | null; contract: BuildContract | null; contractFrozen: boolean;
  generated: boolean; outputHash: string | null; evidence: Evidence[]; events: FactoryEvent[]; previewResult: PreviewResult | null; pilotApproved: boolean;
};
type JsonSchema = Record<string, unknown>;
type ToolDefinition = {
  name: string; title?: string; description: string; inputSchema?: JsonSchema;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, signal?: AbortSignal) => unknown | Promise<unknown>;
};
type ModelContext = { registerTool: (tool: ToolDefinition, options?: { signal?: AbortSignal }) => Promise<void> };

const STORAGE_KEY = 'factory-floor-state-v1';
const demoBrief = 'I need a small tool for a consultancy to triage incoming AI project ideas. It should help people decide what to test first and keep final decisions with a human.';
const concepts: Concept[] = [
  { id: 'decision-board', label: 'Decision Board', promise: 'Compare ideas by impact, effort, and evidence before a person approves the next test.', primaryAction: 'Score a project candidate', accent: 'blue' },
  { id: 'guided-intake', label: 'Guided Intake', promise: 'Turn an unstructured request into a complete, reviewable project brief.', primaryAction: 'Complete a bounded intake', accent: 'amber' },
  { id: 'evidence-queue', label: 'Evidence Queue', promise: 'Track assumptions, supporting signals, and questions that block a responsible decision.', primaryAction: 'Review an evidence gap', accent: 'violet' },
];
const stages = [['01', 'Brief'], ['02', 'Concepts'], ['03', 'Contract'], ['04', 'Build'], ['05', 'Evidence']] as const;
const initialState: FactoryState = {
  phase: 'brief', revision: 0, rawBrief: demoBrief, brief: null, briefAccepted: false, concepts: [], selectedConceptId: null,
  contract: null, contractFrozen: false, generated: false, outputHash: null, evidence: [], previewResult: null, pilotApproved: false,
  events: [{ id: 'event-0', actor: 'system', action: 'Workspace opened', detail: 'Blank factory state created.', revision: 0, at: 'Now' }],
};
const emptySchema = { type: 'object', properties: {}, additionalProperties: false };

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `ff-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function eventFor(actor: Actor, action: string, detail: string, revision: number): FactoryEvent {
  return { id: `${revision}-${action.toLowerCase().replaceAll(' ', '-')}`, actor, action, detail, revision, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
}
function publicState(state: FactoryState) {
  return {
    phase: state.phase, revision: state.revision, brief: state.brief, briefAccepted: state.briefAccepted,
    concepts: state.concepts.map(({ id, label, promise }) => ({ id, label, promise })), selectedConceptId: state.selectedConceptId,
    contract: state.contract, contractFrozen: state.contractFrozen, generated: state.generated, outputHash: state.outputHash, evidence: state.evidence, pilotApproved: state.pilotApproved,
    blockers: [!state.briefAccepted && 'A human must accept the structured brief.', !state.selectedConceptId && 'A human must select one concept.', !state.contractFrozen && 'A human must freeze the build contract.', !state.generated && 'The bounded preview has not been generated.', state.evidence.some((item) => item.status === 'blocked') && 'At least one evidence check is blocked.'].filter(Boolean),
  };
}
function getModelContext(): ModelContext | null {
  if (typeof document === 'undefined') return null;
  return (document as Document & { modelContext?: ModelContext }).modelContext ?? null;
}

export default function Home() {
  const [state, setState] = useState<FactoryState>(initialState);
  const [mcpSupported, setMcpSupported] = useState(false);
  const [registeredTools, setRegisteredTools] = useState<string[]>([]);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [view, setView] = useState<'factory' | 'preview'>('factory');
  const [notice, setNotice] = useState('Ready for a human or browser agent.');
  const stateRef = useRef(state);
  const mcpSupportedRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FactoryState;
        stateRef.current = parsed;
        // Restore the last shared factory revision after the client mounts.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(parsed);
      }
    } catch { window.localStorage.removeItem(STORAGE_KEY); }
  }, []);

  const replaceState = useCallback((updater: (previous: FactoryState) => FactoryState) => {
    setState((previous) => {
      const next = updater(previous); stateRef.current = next; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next;
    });
  }, []);
  const stale = useCallback((expected: unknown, current: FactoryState) => {
    if (expected !== current.revision) {
      setNotice(`Blocked stale write: expected r${String(expected)}, current r${current.revision}.`);
      return { ok: false, error: 'stale_revision', expected_revision: expected, current_revision: current.revision, state_changed: false };
    }
    return null;
  }, []);

  const stageBrief = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (current.contractFrozen) return { ok: false, error: 'contract_frozen', state_changed: false };
    const summary = String(input.summary ?? current.rawBrief).trim().slice(0, 280);
    const audience = String(input.audience ?? 'Small consultancy teams evaluating AI project ideas').trim().slice(0, 140);
    const outcome = String(input.outcome ?? 'Choose one evidence-backed idea for a bounded pilot').trim().slice(0, 180);
    if (!summary) return { ok: false, error: 'summary_required', state_changed: false };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'brief_review', revision, brief: { summary, audience, outcome }, briefAccepted: false, concepts: [], selectedConceptId: null, contract: null, contractFrozen: false, generated: false, evidence: [], events: [eventFor('agent', 'Brief staged', 'Structured intent is ready for human review.', revision), ...previous.events] }; });
    setNotice('The agent staged a structured brief. Human acceptance is required.');
    return { ok: true, next: 'human_accept_brief', revision: current.revision + 1 };
  }, [replaceState, stale]);

  const stageConcepts = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (!current.briefAccepted) return { ok: false, error: 'brief_not_accepted', state_changed: false };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'concept_review', revision, concepts, events: [eventFor('agent', 'Concepts staged', 'Three bounded directions created from the accepted brief.', revision), ...previous.events] }; });
    setNotice('Three concepts are ready. Only a human can choose one.');
    return { ok: true, concept_count: 3, next: 'human_select_concept', revision: current.revision + 1 };
  }, [replaceState, stale]);

  const stageContract = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    const chosen = concepts.find((concept) => concept.id === current.selectedConceptId);
    if (!chosen) return { ok: false, error: 'concept_not_selected', state_changed: false };
    const contract: BuildContract = { productName: chosen.label, template: 'bounded-decision-board/v1', goal: chosen.promise, primaryAction: chosen.primaryAction, agentPermission: 'Read state, score candidates, and stage recommendations.', humanBoundary: 'Only a human may approve a pilot or release an output.' };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'contract_review', revision, contract, events: [eventFor('agent', 'Contract staged', 'A template-bounded build contract is ready to freeze.', revision), ...previous.events] }; });
    setNotice('Build contract staged. The agent cannot freeze it.');
    return { ok: true, contract, next: 'human_freeze_contract', revision: current.revision + 1 };
  }, [replaceState, stale]);

  const generatePreview = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (!current.contractFrozen || !current.contract) return { ok: false, error: 'contract_not_frozen', state_changed: false };
    const outputHash = hashText(JSON.stringify(current.contract));
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'evidence_ready', revision, generated: true, outputHash, evidence: [], pilotApproved: false, events: [eventFor('agent', 'Preview generated', `Bounded template compiled as ${outputHash}.`, revision), ...previous.events] }; });
    setNotice('Working micro-app generated. Open it or run the evidence gate.');
    return { ok: true, output_hash: outputHash, next: 'run_factory_checks', revision: current.revision + 1 };
  }, [replaceState, stale]);

  const runChecks = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (!current.generated || !current.outputHash) return { ok: false, error: 'preview_not_generated', state_changed: false };
    const support = mcpSupportedRef.current;
    const staleProbe = stale(Math.max(0, current.revision - 1), current);
    const checks: Evidence[] = [
      { id: 'contract', label: 'Frozen contract', detail: `Output is bound to ${current.outputHash}.`, status: current.contractFrozen ? 'pass' : 'blocked' },
      { id: 'revision', label: 'Stale-write guard', detail: `r${Math.max(0, current.revision - 1)} was rejected against current r${current.revision}; no state changed.`, status: staleProbe?.error === 'stale_revision' ? 'pass' : 'blocked' },
      { id: 'tools', label: 'Top-level WebMCP', detail: support ? 'document.modelContext accepted phase tools.' : 'Open in a supported WebMCP browser to complete this check.', status: support ? 'pass' : 'blocked' },
      { id: 'boundary', label: 'Human authority', detail: 'Concept selection and contract freeze are recorded as human events.', status: current.selectedConceptId && current.contractFrozen ? 'pass' : 'blocked' },
      { id: 'readback', label: 'UI read-back', detail: 'Visible contract, revision, hash, and tool surface share one state object.', status: 'pass' },
    ];
    const allPass = checks.every((item) => item.status === 'pass');
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: allPass ? 'verified' : 'evidence_ready', revision, evidence: checks, events: [eventFor('agent', 'Evidence gate run', allPass ? 'All deterministic checks passed.' : 'One check needs a supported WebMCP browser.', revision), ...previous.events] }; });
    setNotice(allPass ? 'Evidence gate passed. The output remains human-controlled.' : 'Evidence recorded; WebMCP browser verification is still required.');
    return { ok: allPass, checks, output_hash: current.outputHash, revision: current.revision + 1 };
  }, [replaceState, stale]);

  const undoAgentChange = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    const lastAgentAction = current.events.find((item) => item.actor === 'agent')?.action;
    if (!lastAgentAction) return { ok: false, error: 'nothing_to_undo', state_changed: false };
    if (lastAgentAction === 'Evidence gate run') replaceState((previous) => ({ ...previous, phase: 'evidence_ready', revision: previous.revision + 1, evidence: [], events: [eventFor('agent', 'Evidence undone', 'Evidence records removed; generated output preserved.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Preview generated') replaceState((previous) => ({ ...previous, phase: 'build_ready', revision: previous.revision + 1, generated: false, outputHash: null, previewResult: null, events: [eventFor('agent', 'Preview undone', 'Generated output removed; frozen contract preserved.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Contract staged' && !current.contractFrozen) replaceState((previous) => ({ ...previous, phase: 'contract_ready', revision: previous.revision + 1, contract: null, events: [eventFor('agent', 'Contract undone', 'Staged contract removed.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Concepts staged' && !current.selectedConceptId) replaceState((previous) => ({ ...previous, phase: 'concept_ready', revision: previous.revision + 1, concepts: [], events: [eventFor('agent', 'Concepts undone', 'Staged concepts removed.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Brief staged' && !current.briefAccepted) replaceState((previous) => ({ ...previous, phase: 'brief', revision: previous.revision + 1, brief: null, events: [eventFor('agent', 'Brief undone', 'Structured brief removed.', previous.revision + 1), ...previous.events] }));
    else return { ok: false, error: 'human_boundary', message: 'The latest agent change is protected by a later human decision.', state_changed: false };
    setNotice('Last reversible agent change was undone with a compensating revision.');
    return { ok: true, revision: current.revision + 1 };
  }, [replaceState, stale]);

  const scoreCandidate = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const name = String(input.name ?? 'Untitled candidate').trim().slice(0, 80);
    const impact = Math.min(5, Math.max(1, Number(input.impact) || 1)); const effort = Math.min(5, Math.max(1, Number(input.effort) || 1)); const confidence = Math.min(5, Math.max(1, Number(input.confidence) || 1));
    const score = impact * confidence * 4 - effort * 3; const lane = score >= 55 ? 'Run a pilot' : score >= 28 ? 'Clarify evidence' : 'Park for now';
    const result: PreviewResult = { name, score, lane, rationale: `${impact}/5 impact × ${confidence}/5 confidence, adjusted for ${effort}/5 effort.` };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, revision, previewResult: result, pilotApproved: false, events: [eventFor('agent', 'Candidate scored', `${name} routed to “${lane}”.`, revision), ...previous.events] }; });
    setNotice(`Generated app scored “${name}” and updated the visible result.`);
    return { ok: true, result, revision: current.revision + 1, human_approval_required: lane === 'Run a pilot' };
  }, [replaceState]);

  const activeToolNames = useMemo(() => {
    if (view === 'preview') return ['read_generated_app_state', 'score_project_candidate'];
    const names = ['read_factory_state'];
    if (state.phase === 'brief' || state.phase === 'brief_review') names.push('stage_brief');
    if (state.phase === 'concept_ready') names.push('stage_concepts');
    if (state.phase === 'contract_ready' || state.phase === 'contract_review') names.push('stage_build_contract');
    if (state.phase === 'build_ready') names.push('generate_template_preview');
    if (state.phase === 'evidence_ready' || state.phase === 'verified') names.push('run_factory_checks', 'read_evidence');
    if (state.events.some((item) => item.actor === 'agent')) names.push('undo_last_stage');
    return names.slice(0, 8);
  }, [state.events, state.phase, view]);

  const toolSignature = activeToolNames.join('|');
  useEffect(() => {
    const context = getModelContext();
    const supported = Boolean(context?.registerTool);
    mcpSupportedRef.current = supported;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setMcpSupported(supported);
      setRegistrationError(null);
      if (!supported) setRegisteredTools([]);
    });
    if (!context) return () => { active = false; };

    const toolNames = toolSignature.split('|').filter(Boolean);
    const toolDefinitions = toolNames.map<ToolDefinition>((name) => {
      if (name === 'read_factory_state') return { name, title: 'Read factory state', description: 'Read the current Factory Floor phase, revision, human decisions, blockers, output hash, and evidence. Use before any mutation.', inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => publicState(stateRef.current) };
      if (name === 'read_generated_app_state') return { name, title: 'Read generated app state', description: 'Read the currently generated decision app, its latest visible result, and the parent factory revision.', inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => ({ revision: stateRef.current.revision, output_hash: stateRef.current.outputHash, latest_result: stateRef.current.previewResult, pilot_approved_by_human: stateRef.current.pilotApproved }) };
      if (name === 'stage_brief') return { name, title: 'Stage structured brief', description: 'Stage a bounded intent card from the visible fuzzy brief. Does not accept it; a human must review and accept the card.', inputSchema: { type: 'object', properties: { summary: { type: 'string', minLength: 1, maxLength: 280 }, audience: { type: 'string', minLength: 1, maxLength: 140 }, outcome: { type: 'string', minLength: 1, maxLength: 180 }, expected_revision: { type: 'integer', minimum: 0 } }, required: ['summary', 'audience', 'outcome', 'expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: stageBrief };
      if (name === 'stage_concepts') return { name, title: 'Stage three concepts', description: 'Create exactly three traceable, template-bounded concepts from the human-accepted brief. Does not choose a winner.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: stageConcepts };
      if (name === 'stage_build_contract') return { name, title: 'Stage build contract', description: 'Stage the bounded implementation contract for the human-selected concept. Does not freeze the contract.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: stageContract };
      if (name === 'generate_template_preview') return { name, title: 'Generate bounded preview', description: 'Generate a working micro-app only from the frozen contract and allowlisted template. Returns the output hash.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: generatePreview };
      if (name === 'run_factory_checks') return { name, title: 'Run evidence gate', description: 'Run deterministic contract, stale-write, WebMCP, human-boundary, and UI read-back checks for the generated output.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: runChecks };
      if (name === 'read_evidence') return { name, title: 'Read evidence', description: 'Read check records and the output hash for the current generated revision.', inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ output_hash: stateRef.current.outputHash, evidence: stateRef.current.evidence }) };
      if (name === 'score_project_candidate') return { name, title: 'Score project candidate', description: 'Score one project idea in the visible generated Decision Board. Updates the same result card the human sees; it never approves a pilot.', inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 80 }, impact: { type: 'integer', minimum: 1, maximum: 5 }, effort: { type: 'integer', minimum: 1, maximum: 5 }, confidence: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['name', 'impact', 'effort', 'confidence'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: scoreCandidate };
      return { name: 'undo_last_stage', title: 'Undo last agent stage', description: 'Append a compensating revision for the latest reversible agent mutation. Never undoes a later human decision.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: undoAgentChange };
    });
    const controller = new AbortController();
    Promise.all(toolDefinitions.map((tool) => context.registerTool(tool, { signal: controller.signal }))).then(() => { if (active) setRegisteredTools(toolNames); }).catch((error: unknown) => { if (active && !controller.signal.aborted) setRegistrationError(error instanceof Error ? error.message : 'Tool registration failed.'); });
    return () => { active = false; controller.abort(); };
  }, [generatePreview, runChecks, scoreCandidate, stageBrief, stageConcepts, stageContract, toolSignature, undoAgentChange]);

  const activeStage = state.generated ? 4 : state.contractFrozen ? 3 : state.selectedConceptId ? 2 : state.briefAccepted ? 1 : 0;
  const selectedConcept = concepts.find((concept) => concept.id === state.selectedConceptId) ?? null;
  const acceptBrief = () => replaceState((previous) => { if (!previous.brief) return previous; const revision = previous.revision + 1; setNotice('Brief accepted by a human. Concept staging is now available.'); return { ...previous, phase: 'concept_ready', revision, briefAccepted: true, events: [eventFor('human', 'Brief accepted', 'Human accepted the structured intent card.', revision), ...previous.events] }; });
  const selectConcept = (id: string) => replaceState((previous) => { const revision = previous.revision + 1; const concept = concepts.find((item) => item.id === id); setNotice(`${concept?.label ?? 'Concept'} selected by a human.`); return { ...previous, phase: 'contract_ready', revision, selectedConceptId: id, contract: null, contractFrozen: false, generated: false, evidence: [], events: [eventFor('human', 'Concept selected', `${concept?.label ?? id} selected as the build direction.`, revision), ...previous.events] }; });
  const freezeContract = () => replaceState((previous) => { if (!previous.contract) return previous; const revision = previous.revision + 1; setNotice('Contract frozen by a human. The build tool is now available.'); return { ...previous, phase: 'build_ready', revision, contractFrozen: true, events: [eventFor('human', 'Contract frozen', 'Build authority is bound to this immutable revision.', revision), ...previous.events] }; });
  const approvePilot = () => replaceState((previous) => {
    if (previous.previewResult?.lane !== 'Run a pilot' || previous.pilotApproved) return previous;
    const revision = previous.revision + 1;
    setNotice('Pilot approved by a human and recorded in the shared ledger.');
    return { ...previous, revision, pilotApproved: true, events: [eventFor('human', 'Pilot approved', `${previous.previewResult.name} approved for a bounded pilot.`, revision), ...previous.events] };
  });
  const resetFactory = () => { stateRef.current = initialState; setState(initialState); setView('factory'); window.localStorage.removeItem(STORAGE_KEY); setNotice('Factory reset to a clean demo state.'); };

  if (view === 'preview' && state.generated) return <GeneratedPreview state={state} mcpSupported={mcpSupported} registeredTools={registeredTools} scoreCandidate={scoreCandidate} approvePilot={approvePilot} onBack={() => setView('factory')} />;

  return <main className="app-shell">
    <header className="topbar"><button className="brand brand-button" type="button" onClick={resetFactory} aria-label="Reset Factory Maker demo"><span className="brand-mark">F</span><span><b>FACTORY MAKER</b><small>Browser-native build system</small></span></button><div className="topbar-center"><span className="eyebrow">ACTIVE FLOOR</span><strong>{selectedConcept?.label ?? 'New service'}</strong></div><div className="topbar-actions"><span className={`protocol-pill ${mcpSupported ? '' : 'offline'}`}><i /> {mcpSupported ? 'WebMCP live' : 'UI fallback'}</span><button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(publicState(state), null, 2)).then(() => setNotice('Shared state copied to clipboard.'))}>Copy state</button></div></header>
    <div className="workspace" id="top">
      <aside className="stage-rail" aria-label="Factory stages"><p className="rail-label">BUILD LINE</p><ol>{stages.map(([number, label], index) => <li key={label} className={index === activeStage ? 'active' : index < activeStage ? 'done' : ''}><span>{index < activeStage ? '✓' : number}</span><div><strong>{label}</strong><small>{index < activeStage ? 'Complete' : index === activeStage ? 'In progress' : 'Waiting'}</small></div></li>)}</ol><div className="revision-card"><span>REVISION</span><strong>r{state.revision}</strong><small>Shared by human + agent</small></div></aside>
      <section className="factory-floor">
        <div className="hero-row"><div><p className="kicker"><span>LIVE</span> HUMAN × AGENT WORKBENCH</p><h1>Turn a fuzzy brief into<br />a verified WebMCP app.</h1><p className="lede">The agent structures and builds. You choose, freeze, and release. Every decision stays visible in the same browser state.</p></div><div className="hero-stamp" aria-hidden="true"><span>ONE</span><b>SHARED</b><span>STATE</span></div></div>
        <div className="notice-bar" role="status"><span>{registrationError ? '!' : '↳'}</span><p>{registrationError ?? notice}</p><b>r{state.revision}</b></div>
        <section className="floor-card brief-card"><div className="card-heading"><div><span className="step-chip">01 · BRIEF</span><h2>What should this service make possible?</h2></div><span className={`state-chip ${state.brief ? 'ready' : ''}`}>{state.briefAccepted ? 'Accepted' : state.brief ? 'Review' : 'Draft'}</span></div><label htmlFor="brief">Describe it the way you would to a colleague.</label><textarea id="brief" value={state.rawBrief} disabled={state.contractFrozen} onChange={(event) => replaceState((previous) => ({ ...previous, rawBrief: event.target.value }))} maxLength={420} /><div className="input-footer"><span>{state.rawBrief.length}/420</span>{!state.briefAccepted && <button className="primary-button" type="button" disabled={!state.rawBrief.trim()} onClick={() => stageBrief({ expected_revision: state.revision, summary: state.rawBrief, audience: 'Small consultancy teams evaluating AI project ideas', outcome: 'Choose one evidence-backed idea for a bounded pilot' })}><span>✦</span> Stage structured brief</button>}</div>{state.brief && <div className="intent-grid"><div><span>AUDIENCE</span><strong>{state.brief.audience}</strong></div><div><span>OUTCOME</span><strong>{state.brief.outcome}</strong></div></div>}{state.brief && !state.briefAccepted && <div className="human-action"><div><span>HUMAN CHECKPOINT</span><p>Confirm that the structured intent reflects what you meant.</p></div><button type="button" onClick={acceptBrief}>Accept brief</button></div>}</section>
        {state.briefAccepted && <section className="floor-card concepts-card"><div className="card-heading"><div><span className="step-chip">02 · CONCEPTS</span><h2>Three bounded directions</h2></div><span className="human-chip">Human decision</span></div>{state.concepts.length === 0 ? <EmptyStage label="The accepted brief is ready for concept generation." action="Stage 3 concepts" onClick={() => stageConcepts({ expected_revision: state.revision })} /> : <div className="concept-grid">{state.concepts.map((concept, index) => <button key={concept.id} className={`concept-card ${concept.accent} ${state.selectedConceptId === concept.id ? 'selected' : ''}`} type="button" disabled={state.contractFrozen} onClick={() => selectConcept(concept.id)}><span className="concept-number">0{index + 1}</span><i aria-hidden="true"><span /><span /><span /></i><strong>{concept.label}</strong><small>{concept.promise}</small><em>{state.selectedConceptId === concept.id ? 'Selected by you' : 'Select direction'}</em></button>)}</div>}</section>}
        {state.selectedConceptId && <section className="floor-card contract-card"><div className="card-heading"><div><span className="step-chip">03 · CONTRACT</span><h2>Build only what was agreed</h2></div><span className={`state-chip ${state.contractFrozen ? 'frozen' : state.contract ? 'ready' : ''}`}>{state.contractFrozen ? 'Frozen' : state.contract ? 'Review' : 'Waiting'}</span></div>{!state.contract ? <EmptyStage label="The selected concept is ready for a bounded build contract." action="Stage build contract" onClick={() => stageContract({ expected_revision: state.revision })} /> : <><dl className="contract-grid"><div><dt>PRODUCT</dt><dd>{state.contract.productName}</dd></div><div><dt>TEMPLATE</dt><dd><code>{state.contract.template}</code></dd></div><div><dt>GOAL</dt><dd>{state.contract.goal}</dd></div><div><dt>PRIMARY ACTION</dt><dd>{state.contract.primaryAction}</dd></div><div><dt>AGENT MAY</dt><dd>{state.contract.agentPermission}</dd></div><div className="guarded"><dt>HUMAN KEEPS</dt><dd>{state.contract.humanBoundary}</dd></div></dl>{!state.contractFrozen && <div className="human-action freeze-action"><div><span>IRREVERSIBLE BOUNDARY</span><p>Freezing locks the build target. Amendments require a new revision.</p></div><button type="button" onClick={freezeContract}>Freeze contract</button></div>}</>}</section>}
        {state.contractFrozen && <section className="floor-card build-card"><div className="card-heading"><div><span className="step-chip">04 · BUILD</span><h2>A real app from an allowlisted template</h2></div><span className={`state-chip ${state.generated ? 'ready' : ''}`}>{state.generated ? 'Generated' : 'Ready'}</span></div>{!state.generated ? <EmptyStage label="The frozen contract authorizes one bounded generation step." action="Generate working preview" onClick={() => generatePreview({ expected_revision: state.revision })} /> : <div className="output-card"><div className="mini-preview"><span className="mini-nav" /><div><i /><i /><i /></div><strong>Decision Board</strong></div><div><span>GENERATED OUTPUT</span><h3>{state.contract?.productName}</h3><p>A working micro-app with its own top-level WebMCP tool.</p><code>{state.outputHash}</code></div><button type="button" onClick={() => setView('preview')}>Open generated app ↗</button></div>}</section>}
        {state.generated && <section className="floor-card evidence-card"><div className="card-heading"><div><span className="step-chip">05 · EVIDENCE</span><h2>Proof attached to this exact output</h2></div><span className={`state-chip ${state.phase === 'verified' ? 'ready' : ''}`}>{state.phase === 'verified' ? 'Passed' : 'Ready'}</span></div>{state.evidence.length === 0 ? <EmptyStage label="Run deterministic checks against the frozen contract and visible UI." action="Run evidence gate" onClick={() => runChecks({ expected_revision: state.revision })} /> : <div className="evidence-grid">{state.evidence.map((item) => <div className={item.status} key={item.id}><span>{item.status === 'pass' ? '✓' : '!'}</span><strong>{item.label}</strong><p>{item.detail}</p><em>{item.status.toUpperCase()}</em></div>)}</div>}</section>}
        <section className="history-section"><div className="history-heading"><div><span>SHARED LEDGER</span><h2>Every change has an owner</h2></div><button type="button" onClick={() => undoAgentChange({ expected_revision: state.revision })}>↶ Undo agent change</button></div><div className="history-list">{state.events.slice(0, 6).map((item) => <div key={item.id}><span className={`actor ${item.actor}`}>{item.actor === 'human' ? 'H' : item.actor === 'agent' ? 'A' : 'S'}</span><p><strong>{item.action}</strong><small>{item.detail}</small></p><code>r{item.revision}</code><time>{item.at}</time></div>)}</div></section>
      </section>
      <aside className="agent-panel" aria-label="Agent surface"><div className="panel-heading"><div className="agent-orb">A</div><div><span>AGENT SURFACE</span><strong>Tools on this page</strong></div><i className={`online-dot ${mcpSupported ? '' : 'offline'}`} /></div><p className="panel-copy">The inventory changes with the factory stage. Each write requires the revision returned by <code>read_factory_state</code>.</p><div className="tool-list">{activeToolNames.map((name, index) => <div className="tool-row" key={name}><span>{index + 1}</span><code>{name}</code><small>{name.startsWith('read_') ? 'READ' : 'WRITE'}</small></div>)}</div><p className="registration-note">{mcpSupported ? `${registeredTools.length}/${activeToolNames.length} tools registered on document.modelContext` : 'Open in ChatGPT or Chrome with WebMCP enabled to expose these tools.'}</p><div className="boundary-card"><span className="lock">◇</span><div><strong>Human boundary</strong><p>The agent cannot select a concept, freeze a contract, approve a pilot, or release an app.</p></div></div><div className="activity-card"><span>LATEST EVENT</span><strong>{state.events[0]?.action}</strong><small>{state.events[0]?.actor} · revision r{state.events[0]?.revision}</small></div></aside>
    </div>
  </main>;
}

function EmptyStage({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return <div className="empty-stage"><div><span>AGENT-AVAILABLE STEP</span><p>{label}</p></div><button type="button" onClick={onClick}>✦ {action}</button></div>;
}

function GeneratedPreview({ state, mcpSupported, registeredTools, scoreCandidate, approvePilot, onBack }: { state: FactoryState; mcpSupported: boolean; registeredTools: string[]; scoreCandidate: (input: Record<string, unknown>) => unknown; approvePilot: () => void; onBack: () => void }) {
  const [name, setName] = useState('Support knowledge pilot'); const [impact, setImpact] = useState(4); const [effort, setEffort] = useState(2); const [confidence, setConfidence] = useState(4);
  return <main className="preview-shell"><header className="preview-topbar"><button type="button" onClick={onBack}>← Factory Floor</button><div><span>GENERATED FROM FROZEN CONTRACT</span><strong>Decision Board</strong></div><span className={`protocol-pill ${mcpSupported ? '' : 'offline'}`}><i /> {mcpSupported ? `${registeredTools.length} WebMCP tools` : 'UI fallback'}</span></header><section className="preview-main"><div className="preview-intro"><div><p className="kicker"><span>OUTPUT</span> {state.outputHash}</p><h1>Which idea deserves<br />a pilot next?</h1><p>Score one candidate. The app makes the recommendation visible, but only a person can approve the pilot.</p></div><div className="preview-stat"><span>FACTORY REVISION</span><strong>r{state.revision}</strong><small>Contract locked</small></div></div><div className="score-workspace"><form onSubmit={(event) => { event.preventDefault(); scoreCandidate({ name, impact, effort, confidence }); }}><div className="card-heading"><div><span className="step-chip">PROJECT INPUT</span><h2>Score a candidate</h2></div><span className="state-chip frozen">Bounded</span></div><label>Project name<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label><div className="range-grid"><RangeField label="Impact" value={impact} setValue={setImpact} /><RangeField label="Effort" value={effort} setValue={setEffort} /><RangeField label="Confidence" value={confidence} setValue={setConfidence} /></div><button className="primary-button" type="submit">Calculate recommendation</button></form><section className={`result-panel ${state.previewResult ? 'has-result' : ''}`} aria-live="polite">{state.previewResult ? <><span className="result-label">RECOMMENDED LANE</span><h2>{state.previewResult.lane}</h2><strong>{state.previewResult.name}</strong><div className="score-ring"><b>{state.previewResult.score}</b><small>SCORE</small></div><p>{state.previewResult.rationale}</p>{state.previewResult.lane === 'Run a pilot' && <button type="button" disabled={state.pilotApproved} onClick={approvePilot}>{state.pilotApproved ? 'Approved by you ✓' : 'Approve pilot — human only'}</button>}<small className="result-readback">This is the same result returned to the browser agent.</small></> : <><span className="empty-orb">✦</span><h2>No score yet</h2><p>Use the form or ask the browser agent to call <code>score_project_candidate</code>.</p></>}</section></div><div className="preview-boundary"><div><span>AGENT CAN</span><strong>Read state · score a candidate · explain the result</strong></div><div><span>HUMAN KEEPS</span><strong>Approval · exceptions · release authority</strong></div></div></section></main>;
}
function RangeField({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <label className="range-field"><span>{label}<b>{value}</b></span><input type="range" min="1" max="5" value={value} onChange={(event) => setValue(Number(event.target.value))} /><small>1</small><small>5</small></label>;
}
