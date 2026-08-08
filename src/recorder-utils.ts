import type { Step, StepType } from './types';

const navigationActions = new Set<StepType>(['click', 'press', 'check', 'select']);

const sameLocator = (left: Step, right: Step) => (
  left.locatorType === right.locatorType
  && left.selector === right.selector
  && left.role === right.role
);

/** Removes recorder noise while preserving the user's meaningful actions. */
export function removeRedundantNavigationSteps(steps: Step[]) {
  const normalized: Step[] = [];
  for (const step of steps) {
    const previous = normalized[normalized.length - 1];
    if (step.type === 'fill') {
      if (previous?.type === 'fill' && sameLocator(previous, step)) {
        normalized[normalized.length - 1] = step;
        continue;
      }
      let previousFillIndex = -1;
      for (let index = normalized.length - 1; index >= 0; index -= 1) {
        const candidate = normalized[index];
        if (candidate.type === 'fill' && sameLocator(candidate, step)) {
          previousFillIndex = index;
          break;
        }
      }
      if (previousFillIndex >= 0 && normalized.slice(previousFillIndex + 1).every((candidate) => candidate.type === 'press' && sameLocator(candidate, step))) {
        normalized[previousFillIndex] = step;
        continue;
      }
    }
    if (step.type === 'navigate' && previous?.type === 'navigate' && step.url === previous.url) continue;
    if (step.type === 'navigate' && previous && navigationActions.has(previous.type)) continue;
    normalized.push(step);
  }
  return normalized;
}
