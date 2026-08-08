import type { Step } from './types';

export type StepGroup = 'Setup' | 'Login' | 'Action' | 'Assertion' | 'Cleanup';

const groups: StepGroup[] = ['Setup', 'Login', 'Action', 'Assertion', 'Cleanup'];
const loginTerms = /\b(email|password|username|login|sign[ -]?in|credential)\b/i;

const isStepGroup = (value: unknown): value is StepGroup => (
  typeof value === 'string' && groups.includes(value as StepGroup)
);

/** Returns the persisted group or a stable default inferred from the step. */
export function getStepGroup(step: Step): StepGroup {
  if (isStepGroup(step.group)) return step.group;
  if (step.type === 'assert') return 'Assertion';
  if (step.type === 'screenshot') return 'Cleanup';
  if (step.type === 'navigate' || step.type === 'wait') return 'Setup';

  const searchable = [step.selector, step.url, step.value, step.options, step.role].filter(Boolean).join(' ');
  return (step.type === 'fill' || step.type === 'press' || step.type === 'click') && loginTerms.test(searchable)
    ? 'Login'
    : 'Action';
}

/** Matches every term against the step's searchable fields, case-insensitively. */
export function matchesStepQuery(step: Step, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const searchable = [
    step.type,
    step.locatorType,
    step.selector,
    step.role,
    step.url,
    step.value,
    step.options,
    step.assertion,
    getStepGroup(step)
  ].filter(Boolean).join(' ').toLowerCase();
  return terms.every((term) => searchable.includes(term));
}

