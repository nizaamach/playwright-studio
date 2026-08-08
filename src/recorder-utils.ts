import type { Step, StepType } from './types';

const navigationActions = new Set<StepType>(['click', 'press', 'check', 'select']);

/** Removes navigation events that are already caused by the immediately preceding action. */
export function removeRedundantNavigationSteps(steps: Step[]) {
  return steps.filter((step, index) => {
    const previous = steps[index - 1];
    return !(step.type === 'navigate' && previous && navigationActions.has(previous.type));
  });
}
