import type { LocatorType, Step } from './types';

export type LocatorQuality = {
  level: 'stable' | 'acceptable' | 'fragile';
  label: 'Stable' | 'Acceptable' | 'Fragile';
  recommendation?: {
    locatorType: LocatorType;
    selector: string;
  };
};

const stableLocatorTypes = new Set<LocatorType>(['role', 'label', 'testId', 'placeholder']);

export function getLocatorQuality(step: Step): LocatorQuality {
  const hasSelector = Boolean(step.selector?.trim());
  const locatorType = step.locatorType;
  let level: LocatorQuality['level'] = 'fragile';

  if (hasSelector && locatorType && stableLocatorTypes.has(locatorType)) level = 'stable';
  else if (hasSelector && locatorType === 'text') level = 'acceptable';

  const quality: LocatorQuality = {
    level,
    label: level[0].toUpperCase() + level.slice(1) as LocatorQuality['label']
  };

  if (level === 'fragile' && step.role?.trim() && hasSelector && locatorType !== 'role') {
    quality.recommendation = { locatorType: 'role', selector: step.selector!.trim() };
  }

  return quality;
}
