import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { clearDraft, readDraft, saveDraft, type DraftEnvelope } from './drafts';
import { isEditableTarget, suggestTestName, validateRecordUrl } from './fast-start';
import { generateCode } from './generator';
import { History } from './history';
import { getLocatorQuality } from './locator-quality';
import { canRun, normalizeRunResult, runLabel, type RunFailure, type RunResult, type RunStatus } from './runner';
import { importSpec } from './importer';
import { removeRedundantNavigationSteps } from './recorder-utils';
import { getRecentTests } from './recent-tests';
import { readRecentFiles, touchRecentFile, type RecentFile } from './recent-files';
import { defaultEnvironments } from './environments';
import { collectTestFolders, filterTests } from './test-organization';
import { getStepGroup, matchesStepQuery, type StepGroup } from './step-organizer';
import { createTemplateSteps, templateDefinitions, type TemplateId, type TemplateVariable } from './templates';
import type { VariableMap } from './variables';
import type { LocatorDiagnostic, LocatorType, ManagedTest, ProjectState, Step, StepType } from './types';

const newStep = (type: StepType): Step => ({ id: crypto.randomUUID(), type, selector: type === 'navigate' ? undefined : 'body', locatorType: 'css', url: type === 'navigate' ? 'https://example.com' : undefined, assertion: type === 'assert' ? 'visible' : undefined, value: type === 'wait' ? '500' : '' });
const labels: Record<StepType, string> = { navigate: 'Navigate', click: 'Click', hover: 'Hover', focus: 'Focus', clear: 'Clear input', press: 'Press key', fill: 'Fill', select: 'Select option', check: 'Checkbox / radio', upload: 'Upload file', assert: 'Assertion', wait: 'Wait', screenshot: 'Screenshot' };
const initialTest = (): ManagedTest => ({ id: `test-${Date.now()}`, name: 'Untitled test', steps: [], generatedCode: '', source: 'studio', readOnly: false });
const webProjectKey = 'playwright-studio-web-project';
const stepGroups: Array<'All' | StepGroup> = ['All', 'Setup', 'Login', 'Action', 'Assertion', 'Cleanup'];
const templateVariableLabels: Record<TemplateVariable, string> = { baseUrl: 'Base URL', email: 'Email', password: 'Password' };
const webProject = (): ProjectState => ({ project: { name: 'Browser workspace', testDir: 'tests' }, tests: [], projectPath: 'browser-local' });
const themeKey = 'playwright-studio-theme';
const pageAssertions = new Set<Step['assertion']>(['url', 'urlContains', 'title']);
const valueAssertions = new Set<Step['assertion']>(['text', 'value', 'url', 'urlContains', 'attribute', 'count', 'title']);
const formatLocation = (location: NonNullable<RunFailure['location']>) => `${location.file}${location.line === undefined ? '' : `:${location.line}`}${location.column === undefined ? '' : `:${location.column}`}`;
type MotionKind = 'idle' | 'test-select' | 'step-add' | 'step-update' | 'step-reorder' | 'step-delete' | 'save-success' | 'feedback-error' | 'run-state' | 'recorder-state' | 'panel-reveal' | 'theme-switch';
const stepError = (step: Step) => {
  if (step.type === 'navigate' && !step.url?.trim()) return 'URL is required';
  if (step.type === 'wait' && (!step.value?.trim() || Number(step.value) < 0 || Number.isNaN(Number(step.value)))) return 'Use a valid wait time';
  if (step.type === 'screenshot' && !step.value?.trim()) return 'Screenshot path is required';
  if (step.type !== 'navigate' && step.type !== 'wait' && step.type !== 'screenshot' && !(step.type === 'assert' && pageAssertions.has(step.assertion)) && !step.selector?.trim()) return 'Locator is required';
  if (['fill', 'select', 'upload', 'press'].includes(step.type) && !step.value?.trim()) return 'Value is required';
  if (step.type === 'assert' && valueAssertions.has(step.assertion) && !step.value?.trim()) return 'Expected value is required';
  if (step.type === 'assert' && step.assertion === 'attribute' && !step.options?.trim()) return 'Attribute name is required';
  return '';
};

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  const [state, setState] = useState<ProjectState | null>(null);
  const [selected, setSelected] = useState<ManagedTest>(initialTest());
  const historyRef = useRef(new History<ManagedTest>(selected));
  const [historyVersion, setHistoryVersion] = useState(0);
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'stopping' | 'error'>('idle');
  const [recordUrl, setRecordUrl] = useState('');
  const [recordedSteps, setRecordedSteps] = useState<Step[]>([]);
  const [recorderMessage, setRecorderMessage] = useState('');
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runMessage, setRunMessage] = useState('');
  const [runHeaded, setRunHeaded] = useState(true);
  const runIdRef = useRef(0);
  const stoppedRunIdRef = useRef<number | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [testQuery, setTestQuery] = useState('');
  const [suiteFilter, setSuiteFilter] = useState('');
  const [environmentName, setEnvironmentName] = useState('Project');
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [draftNotice, setDraftNotice] = useState<DraftEnvelope | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [templateVariables, setTemplateVariables] = useState<VariableMap>({});
  const [stepQuery, setStepQuery] = useState('');
  const [stepGroupFilter, setStepGroupFilter] = useState<'All' | StepGroup>('All');
  const [motion, setMotion] = useState<{ kind: MotionKind; nonce: number; stepId?: string }>({ kind: 'idle', nonce: 0 });
  const motionNonceRef = useRef(0);
  const motionTimerRef = useRef<number | null>(null);
  const code = useMemo(() => generateCode(selected.name, selected.steps, selected.variables), [selected.name, selected.steps, selected.variables]);
  const previewCode = selected.readOnly ? selected.generatedCode : code;
  const isDirty = !selected.readOnly && (!state || code !== selected.generatedCode);
  const errors = selected.steps.map(stepError);
  const canSave = errors.every((error) => !error);
  const visibleSteps = useMemo(() => selected.steps.map((step, index) => ({ step, index })).filter(({ step }) => (
    (stepGroupFilter === 'All' || getStepGroup(step) === stepGroupFilter) && matchesStepQuery(step, stepQuery)
  )), [selected.steps, stepGroupFilter, stepQuery]);
  const recordUrlError = validateRecordUrl(recordUrl);
  const canRecord = Boolean(window.studio) && (recorderState === 'idle' || recorderState === 'error') && !selected.readOnly && !recordUrlError;
  const projectContextAvailable = Boolean(state?.project.baseURL || state?.project.projects?.length);
  const selectedEnvironment = defaultEnvironments.find((environment) => environment.name === environmentName) || defaultEnvironments[0];
  const suiteOptions = collectTestFolders(state?.tests || []);
  const visibleTests = state ? filterTests(state.tests, { query: testQuery, folder: suiteFilter || undefined }) : [];
  const recentTests = getRecentTests(visibleTests);
  const testGroups = useMemo(() => {
    const groups = new Map<string, ManagedTest[]>();
    visibleTests.forEach((test) => {
      const folder = test.folder?.trim() || 'Root';
      groups.set(folder, [...(groups.get(folder) || []), test]);
    });
    return [...groups.entries()].map(([folder, tests]) => ({ folder, tests }));
  }, [visibleTests]);
  const recentCount = recentFiles.length + recentTests.length;

  const rememberRecentFile = (test: ManagedTest, projectPath: string | undefined) => {
    if (!projectPath || test.readOnly) return;
    setRecentFiles(touchRecentFile(window.localStorage, { projectPath, testId: test.id, name: test.name, updatedAt: new Date().toISOString() }));
  };
  const selectedTemplate = templateDefinitions.find((template) => template.id === templateId);
  const missingTemplateVariables = selectedTemplate?.requiredVariables.filter((name) => !templateVariables[name]?.trim()) || [];
  const canApplyTemplate = Boolean(selectedTemplate && missingTemplateVariables.length === 0);

  const triggerMotion = (kind: MotionKind, stepId?: string, duration = 720) => {
    if (motionTimerRef.current !== null) window.clearTimeout(motionTimerRef.current);
    const nonce = ++motionNonceRef.current;
    setMotion({ kind, nonce, stepId });
    motionTimerRef.current = window.setTimeout(() => {
      setMotion({ kind: 'idle', nonce: ++motionNonceRef.current });
      motionTimerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    setSuiteFilter('');
  }, [state?.projectPath]);

  useEffect(() => {
    setRecentFiles(readRecentFiles(window.localStorage));
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(themeKey, theme); } catch { /* Theme preference is best effort. */ }
  }, [theme]);

  useEffect(() => {
    try {
      setDraftNotice(readDraft(window.localStorage));
    } catch {
      setDraftNotice(null);
    }
    if (!window.studio) {
      try {
        const stored = localStorage.getItem(webProjectKey);
        const loaded = stored ? JSON.parse(stored) as ProjectState : webProject();
        setState(loaded);
        const next = loaded.tests.find((test) => !test.readOnly) || initialTest();
        historyRef.current.reset(next);
        setSelected(next);
      } catch {
        const fallback = webProject();
        setState(fallback);
        const next = initialTest();
        historyRef.current.reset(next);
        setSelected(next);
      }
      return;
    }
    const offEvent = window.studio.onRecorderEvent((step) => setRecordedSteps((current) => [...current, step]));
    const offError = window.studio.onRecorderError((message) => {
      setRecordedSteps([]);
      setRecorderMessage(message);
      setRecorderState('error');
    });
    return () => { offEvent(); offError(); };
  }, []);
  useEffect(() => () => {
    if (motionTimerRef.current !== null) window.clearTimeout(motionTimerRef.current);
  }, []);
  const saveDraftFor = (test: ManagedTest) => {
    try {
      saveDraft(window.localStorage, state?.projectPath || 'browser-local', test);
    } catch {
      // Draft persistence is best effort and must never interrupt editing.
    }
  };
  const commit = (next: ManagedTest, motionKind: MotionKind = 'step-update', stepId?: string) => {
    historyRef.current.push(next);
    setSelected(next);
    setHistoryVersion((current) => current + 1);
    saveDraftFor(next);
    triggerMotion(motionKind, stepId);
  };
  const update = (next: Partial<ManagedTest>) => {
    const current = historyRef.current.current;
    const motionKind = next.steps && next.steps.length < current.steps.length ? 'step-delete' : 'step-update';
    commit({ ...current, ...next }, motionKind);
  };
  const selectTest = (test: ManagedTest) => {
    historyRef.current.reset(test);
    setSelected(test);
    setTemplateId(null);
    setHistoryVersion((current) => current + 1);
    triggerMotion('test-select');
    if (state?.tests.some((item) => item.id === test.id)) rememberRecentFile(test, state.projectPath);
  };
  const undo = () => {
    const previous = historyRef.current.undo();
    if (!previous) return;
    setSelected(previous);
    setHistoryVersion((current) => current + 1);
    saveDraftFor(previous);
    triggerMotion('step-update');
  };
  const redo = () => {
    const next = historyRef.current.redo();
    if (!next) return;
    setSelected(next);
    setHistoryVersion((current) => current + 1);
    saveDraftFor(next);
    triggerMotion('step-update');
  };
  const restoreDraft = () => {
    if (!draftNotice) return;
    selectTest({ ...draftNotice.test, source: 'studio', readOnly: false });
    setDraftNotice(null);
    setSaveMessage('Draft restored. Save the test when ready.');
  };
  const discardDraft = () => {
    try { clearDraft(window.localStorage); } catch { /* Ignore unavailable storage. */ }
    setDraftNotice(null);
  };

  async function openProject() {
    const path = await window.studio?.selectProject(); if (!path) return;
    const loaded = await window.studio?.readProject(path); if (loaded) { setState(loaded); selectTest(loaded.tests.find((test) => !test.readOnly) || initialTest()); }
  }
  async function openRecentFile(file: RecentFile) {
    if (window.studio) {
      const loaded = await window.studio.readProject(file.projectPath);
      if (!loaded) return;
      setState(loaded);
      selectTest(loaded.tests.find((test) => test.id === file.testId) || loaded.tests.find((test) => !test.readOnly) || initialTest());
      return;
    }
    const matching = state?.tests.find((test) => test.id === file.testId);
    if (matching) selectTest(matching);
  }
  async function openFolder() {
    if (!state?.projectPath || !window.studio) return;
    const opened = await window.studio.openProjectFolder(state.projectPath);
    if (!opened) setSaveMessage('Unable to open project folder.');
  }
  async function createProject() {
    const path = await window.studio?.createProjectDialog(); if (path) { const loaded = await window.studio?.readProject(path); if (loaded) { setState(loaded); selectTest(initialTest()); } }
  }
  async function save() {
    if (!canSave || selected.readOnly) return;
    const saved = { ...selected, generatedCode: code, updatedAt: new Date().toISOString() };
    if (window.studio && state) {
      await window.studio.saveTest(state.projectPath, saved);
      setState({ ...state, tests: [...state.tests.filter((test) => test.id !== saved.id), saved] });
    } else {
      const current = state || webProject();
      const next = { ...current, tests: [...current.tests.filter((test) => test.id !== saved.id), saved] };
      localStorage.setItem(webProjectKey, JSON.stringify(next));
      setState(next);
    }
    historyRef.current.reset(saved);
    setSelected(saved);
    rememberRecentFile(saved, state?.projectPath || 'browser-local');
    setHistoryVersion((current) => current + 1);
    try { clearDraft(window.localStorage); } catch { /* Ignore unavailable storage. */ }
    setSaveMessage('Test saved successfully.');
    triggerMotion('save-success');
    window.setTimeout(() => setSaveMessage(''), 2500);
  }
  async function renameSelected() {
    if (!state || !window.studio || selected.readOnly) return;
    const name = window.prompt('Rename test', selected.name)?.trim();
    if (!name || name === selected.name) return;
    try {
      const renamed = await window.studio.renameTest(state.projectPath, selected.id, name);
      const next = { ...state, tests: state.tests.map((test) => test.id === renamed.id ? { ...test, ...renamed } : test) };
      setState(next); setSelected({ ...selected, ...renamed }); setSaveMessage('Test renamed.'); triggerMotion('save-success');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Unable to rename test.'); triggerMotion('feedback-error');
    }
  }
  async function deleteSelected() {
    if (!state || !window.studio || selected.readOnly) return;
    if (!window.confirm(`Delete "${selected.name}" and its generated TypeScript file?`)) return;
    try {
      await window.studio.deleteTest(state.projectPath, selected.id);
      const next = { ...state, tests: state.tests.filter((test) => test.id !== selected.id) };
      setState(next); setSelected(next.tests.find((test) => !test.readOnly) || initialTest()); setSaveMessage('Test deleted.'); triggerMotion('step-delete');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Unable to delete test.'); triggerMotion('feedback-error');
    }
  }
  async function exportCode() {
    const safeName = selected.name.trim().toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'playwright-test';
    if (window.studio) {
      const exported = await window.studio.exportCode(safeName, previewCode);
      if (exported) { setSaveMessage('TypeScript file exported.'); triggerMotion('save-success'); }
      return;
    }
    const blob = new Blob([previewCode], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${safeName}.spec.ts`; link.click();
    URL.revokeObjectURL(url);
    setSaveMessage('TypeScript file downloaded.');
    triggerMotion('save-success');
    window.setTimeout(() => setSaveMessage(''), 2500);
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(previewCode);
      setCopyMessage('Copied');
      triggerMotion('save-success', undefined, 520);
      window.setTimeout(() => setCopyMessage(''), 1600);
    } catch {
      setCopyMessage('Copy unavailable');
      triggerMotion('feedback-error');
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    const imported = importSpec(await file.text());
    if (!imported.steps.length) {
      setImportMessage('No supported Playwright steps found.');
      triggerMotion('feedback-error');
      return;
    }
    if (selected.steps.length && !window.confirm('Replace the current steps with the imported steps?')) return;
    commit({ ...historyRef.current.current, steps: imported.steps }, 'step-add');
    setImportMessage(`${imported.steps.length} steps imported${imported.warnings.length ? `, ${imported.warnings.length} warning${imported.warnings.length === 1 ? '' : 's'}` : ''}.`);
    triggerMotion('save-success');
  }
  async function runTest() {
    if (!window.studio || !canRun({ readOnly: Boolean(selected.readOnly), hasErrors: !canSave, hasStudio: true, status: runStatus })) return;
    const runId = ++runIdRef.current;
    stoppedRunIdRef.current = null;
    setRunStatus('queued');
    triggerMotion('run-state');
    setRunResult(null);
    setRunMessage('');
    try {
      setRunStatus('running');
      const runSource = selected.readOnly ? previewCode : generateCode(selected.name, removeRedundantNavigationSteps(selected.steps), selected.variables);
      const result = normalizeRunResult(await window.studio.runTest({ testId: selected.id, source: runSource, projectPath: state?.projectPath, testDir: state?.project.testDir, baseURL: selectedEnvironment.baseURL || state?.project.baseURL, environment: selected.variables, headed: runHeaded }));
      if (runId !== runIdRef.current) return;
      if (stoppedRunIdRef.current === runId) {
        const { errorLocation, failures, ...report } = result.report;
        setRunResult({ ...result, status: 'stopped', report });
        return;
      }
      setRunResult(result);
      setRunStatus(result.status);
      triggerMotion('run-state');
    } catch (error) {
      if (runId !== runIdRef.current || stoppedRunIdRef.current === runId) return;
      setRunStatus('failed');
      setRunMessage(error instanceof Error ? error.message : 'Unable to run test.');
      triggerMotion('feedback-error');
    }
  }
  async function stopTest() {
    if (!window.studio || (runStatus !== 'queued' && runStatus !== 'running')) return;
    stoppedRunIdRef.current = runIdRef.current;
    setRunStatus('stopped');
    setRunMessage('Run stopped.');
    triggerMotion('run-state');
    await window.studio.stopTest();
  }
  async function startRecording() {
    if (!window.studio || recordUrlError) return;
    setRecordedSteps([]); setRecorderMessage(''); setRecorderState('recording'); triggerMotion('recorder-state');
    const result = await window.studio.startRecorder(recordUrl.trim());
    if (!result.ok) { setRecorderState('idle'); setRecorderMessage('Unable to start recorder. Check the URL and try again.'); triggerMotion('feedback-error'); return; }
    if (selected.name.trim().toLowerCase() === 'untitled test') update({ name: suggestTestName(recordUrl) });
  }
  async function stopRecording() {
    if (!window.studio) return;
    setRecorderState('stopping'); triggerMotion('recorder-state');
    const result = await window.studio.stopRecorder();
    if (!result.ok) { setRecorderMessage('Recorder session is no longer active.'); setRecorderState('error'); triggerMotion('feedback-error'); return; }
    const captured = removeRedundantNavigationSteps(recordedSteps);
    commit({ ...historyRef.current.current, steps: [...historyRef.current.current.steps, ...captured] });
    const actionSummary = captured.map((step) => labels[step.type]).join(', ');
    setRecordedSteps([]); setRecorderMessage(captured.length ? `${captured.length} step${captured.length === 1 ? '' : 's'} captured: ${actionSummary}` : 'Recording stopped. No steps captured.'); setRecorderState('idle'); triggerMotion(captured.length ? 'step-add' : 'recorder-state');
  }
  function chooseTemplate(nextTemplateId: TemplateId) {
    const definition = templateDefinitions.find((template) => template.id === nextTemplateId);
    if (!definition) return;
    const currentVariables = definition.requiredVariables.reduce<VariableMap>((values, name) => {
      values[name] = selected.variables?.[name] || '';
      return values;
    }, {});
    setTemplateId(nextTemplateId);
    setTemplateVariables(currentVariables);
    triggerMotion('panel-reveal');
  }
  function applyTemplate() {
    if (!selectedTemplate || !canApplyTemplate) return;
    if (isDirty && selected.steps.length && !window.confirm('Replace unsaved steps with this template?')) return;
    commit({ ...historyRef.current.current, steps: createTemplateSteps(selectedTemplate.id, templateVariables), variables: templateVariables }, 'step-add');
    setTemplateId(null);
    setShowTemplates(false);
    setSaveMessage('Template added.');
    triggerMotion('save-success');
  }
  const addStep = (type: StepType) => {
    const step = newStep(type);
    commit({ ...historyRef.current.current, steps: [...historyRef.current.current.steps, step] }, 'step-add', step.id);
  };
  const setStep = (id: string, patch: Partial<Step>) => commit({ ...historyRef.current.current, steps: historyRef.current.current.steps.map((step) => step.id === id ? { ...step, ...patch } : step) }, 'step-update', id);
  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    const currentSteps = historyRef.current.current.steps;
    if (target < 0 || target >= currentSteps.length) return;
    const steps = [...currentSteps]; [steps[index], steps[target]] = [steps[target], steps[index]]; commit({ ...historyRef.current.current, steps }, 'step-reorder', steps[target].id);
  };
  const duplicateStep = (index: number) => {
    const currentSteps = historyRef.current.current.steps;
    const copy = { ...currentSteps[index], id: crypto.randomUUID() };
    commit({ ...historyRef.current.current, steps: [...currentSteps.slice(0, index + 1), copy, ...currentSteps.slice(index + 1)] }, 'step-add', copy.id);
  };
  const toggleTemplates = () => {
    setShowTemplates((current) => !current);
    setTemplateId(null);
    triggerMotion('panel-reveal');
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || !(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
      const canHandle = key === 'n'
        || key === 'e'
        || (key === 's' && canSave && !selected.readOnly)
        || (key === 'r' && canRecord)
        || (isUndo && historyRef.current.canUndo)
        || (isRedo && historyRef.current.canRedo);
      if (!canHandle) return;
      event.preventDefault();
      if (key === 'n') selectTest(initialTest());
      if (key === 'r') void startRecording();
      if (key === 's') void save();
      if (key === 'e') void exportCode();
      if (isUndo) undo();
      if (isRedo) redo();
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [canRecord, canSave, selected.readOnly, recordUrl, recorderState, selected.name, selected.steps, state, historyVersion]);

  return <div className="app-shell" data-motion={motion.kind} data-motion-nonce={motion.nonce}>
    <header className="topbar"><div className="brand"><span className="brand-mark">PW</span><div><strong>Playwright Studio</strong><small>Visual test builder</small></div></div><div className="top-actions"><button className="primary" onClick={() => { triggerMotion('panel-reveal'); void createProject(); }}>New project</button><button onClick={() => { triggerMotion('panel-reveal'); void openProject(); }}>Open project</button>{state && <><span className="project-pill">{state.project.name}</span><button className="folder-action" onClick={() => { triggerMotion('panel-reveal'); void openFolder(); }} disabled={!window.studio} aria-label="Reveal in Finder" title="Reveal in Finder">↗</button><span className={`context-pill ${projectContextAvailable ? '' : 'unavailable'}`}>{state.project.baseURL || 'context unavailable'}</span></>}<button className="theme-toggle" onClick={() => { setTheme((current) => current === 'dark' ? 'light' : 'dark'); triggerMotion('theme-switch'); }} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☼ Light' : '◐ Dark'}</button></div></header>
    <main className="workspace">
      <aside className="sidebar"><div className="eyebrow">PROJECT EXPLORER</div>{recentCount > 0 && <><button className="tree-section tree-disclosure" aria-expanded={showRecent} onClick={() => setShowRecent((current) => !current)}><span>{showRecent ? '⌄' : '›'} Recent</span><small>{recentCount}</small></button>{showRecent && <div className="recent-list">{recentFiles.map((file) => <button className={`tree-test recent-test ${state?.projectPath === file.projectPath && selected.id === file.testId ? 'active' : ''}`} key={`${file.projectPath}:${file.testId}`} onClick={() => void openRecentFile(file)}><span className="tree-glyph">◷</span><span className="tree-test-copy"><span>{file.name}</span><small>{file.projectPath}</small></span></button>)}{recentTests.map((test) => <button className={`tree-test recent-test ${selected.id === test.id ? 'active' : ''}`} key={`recent-${test.id}`} onClick={() => selectTest(test)}><span className="tree-glyph">◷</span><span className="tree-test-copy"><span>{test.name}</span><small>recent test</small></span></button>)}</div>}</>}{state ? <><div className="tree-root"><span className="tree-glyph">⌄</span><span className="tree-root-copy"><strong>{state.project.name}</strong><small>{state.project.testDir}</small></span><span className={`context-dot ${projectContextAvailable ? 'available' : 'unavailable'}`} title={projectContextAvailable ? 'Project context available' : 'Static project context unavailable'} /></div><details className="project-context-details"><summary>Project details</summary><div className="project-context"><div className="context-row"><span>testDir</span><code>{state.project.testDir}</code></div>{state.project.baseURL && <div className="context-row"><span>baseURL</span><code title={state.project.baseURL}>{state.project.baseURL}</code></div>}{state.project.projects?.length ? <div className="context-row context-projects"><span>projects</span><div>{state.project.projects.map((project) => <code className="context-project" key={project}>{project}</code>)}</div></div> : null}{!projectContextAvailable && <small className="context-unavailable">Static project context unavailable.</small>}</div></details><div className="tree-section suites-heading"><span>Test suites</span><small>{suiteOptions.length}</small></div><div className="suite-list"><button className={`suite-filter ${!suiteFilter ? 'active' : ''}`} aria-pressed={!suiteFilter} onClick={() => setSuiteFilter('')}><span className="tree-glyph">▦</span><span>All tests</span><small>{state.tests.length}</small></button>{suiteOptions.map((suite) => <button className={`suite-filter ${suiteFilter === suite ? 'active' : ''}`} aria-pressed={suiteFilter === suite} key={suite} onClick={() => setSuiteFilter(suite)}><span className="tree-glyph">▾</span><span>{suite}</span><small>{state.tests.filter((test) => test.folder === suite).length}</small></button>)}</div><label className="project-search"><span>Search tests <small>{visibleTests.length}</small></span><input value={testQuery} onChange={(event) => setTestQuery(event.target.value)} placeholder="Name, tag, folder" /></label><div className="tree-section tests-heading"><span>Tests</span><small>{visibleTests.length}</small></div>{testGroups.length ? testGroups.map(({ folder, tests }) => <div className="test-group" key={folder}><div className="folder-heading"><span className="tree-glyph">⌄</span><span>{folder}</span><small>{tests.length}</small></div>{tests.map((test) => <button className={`tree-test ${selected.id === test.id ? 'active' : ''}`} key={test.id} onClick={() => selectTest(test)}><span className="tree-glyph">◫</span><span className="tree-test-copy"><span>{test.name}</span>{test.readOnly && <small className="readonly-inline">read-only</small>}</span></button>)}</div>) : <div className="empty-side search-empty">No tests found.</div>}<button className="new-test" onClick={() => selectTest(initialTest())}>＋ New test</button></> : <div className="empty-side">Create or open a project to begin.</div>}</aside>
      <section className="builder"><div className="section-head"><div><div className="eyebrow">TEST BUILDER</div><input className="test-title" value={selected.name} readOnly={selected.readOnly} onChange={(event) => update({ name: event.target.value })} /></div><div className="builder-actions">{!selected.readOnly && <><button className="ghost" onClick={undo} disabled={!historyRef.current.canUndo}>Undo</button><button className="ghost" onClick={redo} disabled={!historyRef.current.canRedo}>Redo</button><button className="ghost" onClick={renameSelected} disabled={!state || !window.studio}>Rename</button><button className="ghost danger-action" onClick={deleteSelected} disabled={!state || !window.studio}>Delete</button><button className="ghost" onClick={() => update({ steps: [] })}>Clear</button><button className="primary" onClick={save} disabled={!canSave}>Save test</button></>}</div></div>
        {!selected.readOnly && <div className="recorder-bar"><div><div className="eyebrow">BROWSER RECORDER</div><small className={!window.studio ? 'browser-mode-message' : undefined}>{!window.studio ? 'Recorder requires Playwright Studio Desktop.' : recorderState === 'recording' ? `${recordedSteps.length} steps captured` : recorderState === 'stopping' ? 'Finishing recording…' : 'Record actions from a controlled Chromium window'}</small></div>{recorderState === 'recording' || recorderState === 'stopping' ? <button className="stop-record" onClick={stopRecording} disabled={recorderState === 'stopping'}>■ Stop recording</button> : <div className="record-start"><div><input value={recordUrl} onChange={(event) => setRecordUrl(event.target.value)} placeholder="https://example.com" aria-invalid={Boolean(recordUrl && recordUrlError)} aria-describedby="record-url-help" /><small id="record-url-help">{recordUrlError || 'Enter the starting URL for Chromium.'}</small></div><button className="record" onClick={startRecording} disabled={!canRecord}>● Record</button></div>}</div>}
        {recorderMessage && <div className={`recorder-message ${recorderState === 'error' ? 'error' : ''}`}>{recorderMessage}</div>}
        {saveMessage && <div className="recorder-message">{saveMessage}</div>}
        {importMessage && <div className="recorder-message">{importMessage}</div>}
        <div className="environment-bar"><label><span>Environment</span><select value={environmentName} onChange={(event) => setEnvironmentName(event.target.value)}>{defaultEnvironments.map((environment) => <option key={environment.name} value={environment.name}>{environment.name}</option>)}</select></label><label><span>Test suite</span><select value={selected.folder || ''} disabled={selected.readOnly} onChange={(event) => { const value = event.target.value; if (value === '__new__') { const name = window.prompt('New test suite')?.trim(); if (name) update({ folder: name }); } else update({ folder: value || undefined }); }}><option value="">No suite</option>{suiteOptions.map((suite) => <option key={suite} value={suite}>{suite}</option>)}<option value="__new__">＋ New suite…</option></select></label><small>{selectedEnvironment.baseURL || state?.project.baseURL || 'Uses project configuration'}</small></div>
        <RunPanel status={runStatus} result={runResult} message={runMessage} available={Boolean(window.studio)} headed={runHeaded} onHeadedChange={setRunHeaded} onRun={() => void runTest()} onStop={() => void stopTest()} />
        {draftNotice && <div className="recorder-message"><span>Unsaved draft from {new Date(draftNotice.savedAt).toLocaleString()}.</span><button onClick={restoreDraft}>Restore draft</button><button onClick={discardDraft}>Discard</button></div>}
        {selected.readOnly ? <div className="readonly-preview">Open the source file in VS Code to edit this test.</div> : <><div className="step-filters"><label className="filter-search"><span>Search steps</span><input value={stepQuery} onChange={(event) => setStepQuery(event.target.value)} placeholder="Type, locator, value…" /></label><label className="filter-group"><span>Group</span><select value={stepGroupFilter} onChange={(event) => setStepGroupFilter(event.target.value as 'All' | StepGroup)}>{stepGroups.map((group) => <option key={group} value={group}>{group === 'All' ? 'All groups' : group}</option>)}</select></label></div><div className="steps-list">{selected.steps.length ? (visibleSteps.length ? visibleSteps.map(({ step, index }) => <StepCard key={step.id} index={index} step={step} error={errors[index]} onChange={(patch) => setStep(step.id, patch)} onDelete={() => update({ steps: historyRef.current.current.steps.filter((item) => item.id !== step.id) })} onMove={moveStep} onDuplicate={duplicateStep} onApplyRecommendation={(patch) => setStep(step.id, patch)} />) : <div className="empty-steps filtered-empty">No steps match this search or group.</div>) : <div className="empty-steps">Add an action from the toolbar below or start with a template.</div>}</div><div className="action-toolbar"><span className="toolbar-label">ADD ACTION</span>{(Object.keys(labels) as StepType[]).map((type) => <button key={type} onClick={() => addStep(type)}>＋ {labels[type]}</button>)}<button onClick={() => { setShowTemplates((current) => !current); setTemplateId(null); }}>＋ Use template</button><label className="import-button">Import .spec.ts<input type="file" accept=".ts,.tsx" onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></div>{showTemplates && <div className="template-picker"><div className="eyebrow">STARTER TEMPLATES</div>{templateDefinitions.map((template) => <button className={templateId === template.id ? 'selected' : ''} key={template.id} onClick={() => chooseTemplate(template.id)}><strong>{template.name}</strong><small>{template.description}</small></button>)}{selectedTemplate && <div className="template-config"><div><div className="eyebrow">CONFIGURE {selectedTemplate.name.toUpperCase()}</div><small>Required values become local test variables in the generated TypeScript.</small></div>{selectedTemplate.requiredVariables.map((name) => <label className="field" key={name}><span>{templateVariableLabels[name]}</span><input type={name === 'password' ? 'password' : 'text'} value={templateVariables[name] || ''} placeholder={name === 'baseUrl' ? 'https://app.example.com' : name === 'email' ? 'qa@example.com' : '••••••••'} aria-invalid={missingTemplateVariables.includes(name)} onChange={(event) => setTemplateVariables((current) => ({ ...current, [name]: event.target.value }))} /></label>)}{missingTemplateVariables.length > 0 && <div className="validation-note">{missingTemplateVariables.map((name) => templateVariableLabels[name]).join(', ')} {missingTemplateVariables.length === 1 ? 'is' : 'are'} required.</div>}<div className="template-config-actions"><button className="ghost" onClick={() => setTemplateId(null)}>Cancel</button><button className="primary" onClick={applyTemplate} disabled={!canApplyTemplate}>Apply template</button></div></div>}</div>}</>}
        {isDirty && <div className="dirty-note">● Unsaved changes</div>}
      </section>
      <aside className="code-panel"><div className="code-head"><div><div className="eyebrow">{selected.readOnly ? 'EXISTING SOURCE' : 'GENERATED CODE'}</div><span>Playwright TypeScript{copyMessage && ` · ${copyMessage}`}</span></div><div className="code-actions"><button className="icon-button" onClick={() => void copyCode()}>Copy</button><button className="icon-button export-button" onClick={exportCode}>Export .ts</button></div></div><pre><code>{previewCode}</code></pre></aside>
    </main>
  </div>;
}

function RunPanel({ status, result, message, available, headed, onHeadedChange, onRun, onStop }: { status: RunStatus; result: RunResult | null; message: string; available: boolean; headed: boolean; onHeadedChange: (value: boolean) => void; onRun: () => void; onStop: () => void }) {
  const running = status === 'queued' || status === 'running';
  const report = result?.report;
  const cleanPass = result?.status === 'passed' && report?.failed === 0;
  const reportStatus = result?.status;
  const reportStatusLabel = reportStatus === 'passed' ? 'Passed' : reportStatus === 'failed' ? 'Failed' : 'Stopped';
  const failureLocation = report?.errorLocation && formatLocation(report.errorLocation);
  const failureText = result && !cleanPass ? result.error || (report?.failed ? `${report.failed} test${report.failed === 1 ? '' : 's'} failed.` : 'Test run did not complete successfully.') : '';
  return <section className="run-panel" aria-label="Test runner"><div className="run-head"><div><div className="eyebrow">LOCAL TEST RUNNER</div><small>{available ? 'Execute the generated test without changing your saved steps.' : 'Desktop runner unavailable in browser mode.'}</small></div><div className="run-actions"><label className={`run-headed-toggle${running ? ' is-disabled' : ''}`}><input type="checkbox" checked={headed} onChange={(event) => onHeadedChange(event.target.checked)} disabled={running} /><span className="run-switch" aria-hidden="true"><span /></span><span className="run-headed-copy"><strong>Show browser</strong><small>{headed ? 'VISIBLE' : 'HEADLESS'}</small></span></label>{running ? <button className="stop-record" onClick={onStop}>■ Stop</button> : <button className="primary" onClick={onRun} disabled={!available}>{runLabel(status)}</button>}</div></div>{status !== 'idle' && <div className={`run-status ${status}`}><span className="run-dot" />{status === 'queued' ? 'Queued' : status === 'running' ? 'Running…' : status === 'passed' ? 'Passed' : status === 'failed' ? 'Failed' : 'Stopped'}{result && <span>{result.durationMs} ms</span>}</div>}{message && <div className="run-error">{message}</div>}{result && report && <section className={`test-report ${reportStatus}`} aria-label="Test report"><div className="eyebrow">TEST REPORT</div><dl className="test-report-grid"><div><dt>Status</dt><dd>{reportStatusLabel}</dd></div><div><dt>Duration</dt><dd>{result.durationMs} ms</dd></div><div><dt>Total</dt><dd>{report.total}</dd></div><div><dt>Passed</dt><dd>{report.passed}</dd></div><div><dt>Failed</dt><dd>{report.failed}</dd></div><div><dt>Skipped</dt><dd>{report.skipped}</dd></div><div className="test-report-file"><dt>File</dt><dd>{report.file || 'Not reported'}</dd></div>{failureLocation && <div className="test-report-file"><dt>Failure location</dt><dd>{failureLocation}</dd></div>}</dl>{report.failures?.length ? <section className="test-report-failures" aria-labelledby="failed-steps-heading"><h3 className="test-report-subhead" id="failed-steps-heading">Failed steps</h3>{report.failures.map((failure, index) => <article className="test-report-failure" key={`${failure.title}-${index}`}><strong>{failure.title}</strong><p>{failure.message}</p>{failure.location && <small>{formatLocation(failure.location)}</small>}</article>)}</section> : null}{cleanPass ? <p className="test-report-message success">All tests passed</p> : <p className="test-report-message failure">{failureText}</p>}</section>}{result && <div className="run-details">{result.error && <div className="run-error">{result.error}</div>}{(result.stdout || result.stderr) && <details><summary>Show runner logs</summary><pre>{[result.stdout, result.stderr].filter(Boolean).join('\n')}</pre></details>}{result.artifacts.length > 0 && <div className="run-artifacts">{result.artifacts.map((artifact) => <button key={artifact.path} onClick={() => window.studio?.openArtifact(artifact.path)}>{artifact.kind}</button>)}</div>}</div>}</section>;
}

function LocatorDiagnosticPanel({ step }: { step: Step }) {
  const [diagnostic, setDiagnostic] = useState<LocatorDiagnostic>();
  const [checking, setChecking] = useState(false);
  useEffect(() => setDiagnostic(undefined), [step.locatorType, step.selector, step.role]);
  const check = async () => {
    if (!window.studio) {
      setDiagnostic({ status: 'unavailable', count: null, message: 'Locator checks require Playwright Studio Desktop.' });
      return;
    }
    setChecking(true);
    try {
      setDiagnostic(await window.studio.countLocator(step.locatorType || 'css', step.selector || '', step.role));
    } catch {
      setDiagnostic({ status: 'unavailable', count: null, message: 'Locator check is unavailable.' });
    } finally {
      setChecking(false);
    }
  };
  const label = diagnostic?.status === 'available' ? (diagnostic.count === 0 ? '0 matches' : diagnostic.count === 1 ? '1 match' : '2+ matches') : diagnostic?.message;
  const level = diagnostic?.status === 'available' ? (diagnostic.count === 0 ? 'zero' : diagnostic.count === 1 ? 'one' : 'many') : 'unavailable';
  return <div className="locator-diagnostics"><button className="check-locator" onClick={check} disabled={checking || !step.selector?.trim()}>{checking ? 'Checking…' : 'Check locator'}</button>{label && <span className={`match-status ${level}`}>{label}</span>}</div>;
}

function StepCard({ index, step, error, onChange, onDelete, onMove, onDuplicate, onApplyRecommendation }: { index: number; step: Step; error: string; onChange: (patch: Partial<Step>) => void; onDelete: () => void; onMove: (index: number, direction: -1 | 1) => void; onDuplicate: (index: number) => void; onApplyRecommendation: (patch: Partial<Step>) => void }) {
  const quality = !['navigate', 'wait', 'screenshot'].includes(step.type) ? getLocatorQuality(step) : null;
  const needsLocator = !(step.type === 'assert' && pageAssertions.has(step.assertion));
  return <article className={`step-card ${error ? 'has-error' : ''}`}><div className="step-index">{String(index + 1).padStart(2, '0')}</div><div className="step-body"><div className="step-head"><div><strong>{labels[step.type]}</strong>{quality && <span className={`quality-badge ${quality.level}`} aria-label={`Locator quality: ${quality.label}`}>{quality.label}</span>}<label className="step-group"><span>Group</span><select aria-label="Step group" value={getStepGroup(step)} onChange={(event) => onChange({ group: event.target.value as StepGroup })}>{stepGroups.filter((group): group is StepGroup => group !== 'All').map((group) => <option key={group} value={group}>{group}</option>)}</select></label></div><div className="step-tools"><button aria-label="Move step up" title="Move up" onClick={() => onMove(index, -1)} disabled={index === 0}>↑</button><button aria-label="Move step down" title="Move down" onClick={() => onMove(index, 1)}>↓</button><button aria-label="Duplicate step" title="Duplicate" onClick={() => onDuplicate(index)}>⧉</button><button className="delete" aria-label="Delete step" title="Delete" onClick={onDelete}>×</button></div></div>{quality?.recommendation && <div className="locator-recommendation">Recommended: {quality.recommendation.locatorType} <button onClick={() => onApplyRecommendation({ locatorType: quality.recommendation?.locatorType, selector: quality.recommendation?.selector })}>Apply</button></div>}{step.type === 'navigate' ? <Field label="URL" value={step.url} onChange={(value) => onChange({ url: value })} placeholder="https://example.com" /> : step.type === 'wait' ? <Field label="Milliseconds" value={step.value} onChange={(value) => onChange({ value })} /> : step.type === 'screenshot' ? <Field label="Path" value={step.value} onChange={(value) => onChange({ value })} placeholder="artifacts/home.png" /> : <>{needsLocator && <><div className="locator-row"><label className="field locator-kind"><span>Strategy</span><select value={step.locatorType || 'css'} onChange={(event) => onChange({ locatorType: event.target.value as LocatorType })}><option value="css">CSS selector</option><option value="xpath">XPath</option><option value="role">Role + name</option><option value="text">Text</option><option value="label">Label</option><option value="testId">Test ID</option><option value="placeholder">Placeholder</option></select></label><Field label="Locator" value={step.selector} onChange={(value) => onChange({ selector: value })} placeholder={step.locatorType === 'testId' ? 'submit-button' : step.locatorType === 'xpath' ? '//button[@type="submit"]' : 'Submit'} /></div><LocatorDiagnosticPanel step={step} /></>}{['fill', 'select', 'upload', 'press'].includes(step.type) && <Field label={step.type === 'press' ? 'Key' : 'Value'} value={step.value} onChange={(value) => onChange({ value })} placeholder={step.type === 'press' ? 'Enter' : undefined} />}{step.type === 'assert' && <><label className="field"><span>Assertion</span><select value={step.assertion} onChange={(event) => onChange({ assertion: event.target.value as Step['assertion'] })}><option value="visible">Element visible</option><option value="text">Contains text</option><option value="value">Has value</option><option value="checked">Checked</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="attribute">Attribute</option><option value="count">Count</option><option value="url">Page URL</option><option value="urlContains">URL contains</option><option value="title">Page title</option></select></label>{valueAssertions.has(step.assertion) && <Field label="Expected value" value={step.value} onChange={(value) => onChange({ value })} />}{step.assertion === 'attribute' && <Field label="Attribute" value={step.options} onChange={(value) => onChange({ options: value })} placeholder="aria-label" />}</>}{step.type === 'check' && <label className="field"><span>Action</span><select value={step.options || 'check'} onChange={(event) => onChange({ options: event.target.value })}><option value="check">Check</option><option value="uncheck">Uncheck</option></select></label>}</>}</div>{error && <div className="validation-note">! {error}</div>}</article>;
}
function Field({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="field"><span>{label}</span><input value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }

createRoot(document.getElementById('root')!).render(<App />);
