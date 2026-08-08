import type { LocatorDiagnostic, LocatorType, Step } from './types';

export type LocatorRecommendation = { locatorType: LocatorType; selector: string; reason: string };

export function recommendLocators(step: Pick<Step, 'selector' | 'locatorType' | 'role'>, diagnostic: LocatorDiagnostic): LocatorRecommendation[] {
  if (diagnostic.status !== 'available' || diagnostic.count !== 1 || !step.selector?.trim()) return [];
  const suggestions: LocatorRecommendation[] = [];
  if (step.role?.trim() && step.locatorType !== 'role') suggestions.push({ locatorType: 'role', selector: step.selector.trim(), reason: 'Role locators are easier to maintain.' });
  const testId = step.selector.match(/data-testid=["']([^"']+)["']/)?.[1];
  if (testId && step.locatorType !== 'testId') suggestions.push({ locatorType: 'testId', selector: testId, reason: 'Test IDs are stable when available.' });
  return suggestions;
}
