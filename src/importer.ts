import type { LocatorType, Step } from './types';

export type ImportWarning = { line: number; message: string; source: string };
export type ImportResult = { steps: Step[]; warnings: ImportWarning[] };

const id = (line: number) => `import-${line}`;
const locatorFrom = (expression: string): Pick<Step, 'selector' | 'locatorType' | 'role'> => {
  const role = expression.match(/getByRole\(['"]([^'"]+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?/);
  if (role) return { locatorType: 'role', role: role[1], selector: role[2] || role[1] };
  const typed = expression.match(/(getByText|getByLabel|getByTestId|getByPlaceholder)\(['"]([^'"]+)['"]\)/);
  if (typed) {
    const map: Record<string, LocatorType> = { getByText: 'text', getByLabel: 'label', getByTestId: 'testId', getByPlaceholder: 'placeholder' };
    return { locatorType: map[typed[1]], selector: typed[2] };
  }
  const css = expression.match(/locator\(['"]([^'"]+)['"]\)/);
  return { locatorType: 'css', selector: css?.[1] || '' };
};

export function importSpec(source: string): ImportResult {
  const steps: Step[] = [];
  const warnings: ImportWarning[] = [];
  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('import ') || line.startsWith('test(') || line === '});') continue;
    const lineNumber = index + 1;
    const goto = line.match(/page\.goto\(['"]([^'"]+)['"]\)/);
    const wait = line.match(/page\.waitForTimeout\((\d+)\)/);
    const screenshot = line.match(/page\.screenshot\(\{\s*path:\s*['"]([^'"]+)['"]/);
    const action = line.match(/(page\.(?:getByRole|getByText|getByLabel|getByTestId|getByPlaceholder|locator)\([^;]+\))\.(click|hover|focus|clear|check|uncheck)\(\)/);
    const fill = line.match(/(page\.(?:getByRole|getByText|getByLabel|getByTestId|getByPlaceholder|locator)\([^;]+\))\.fill\(['"]([^'"]*)['"]\)/);
    const press = line.match(/(page\.(?:getByRole|getByText|getByLabel|getByTestId|getByPlaceholder|locator)\([^;]+\))\.press\(['"]([^'"]+)['"]\)/);
    const select = line.match(/(page\.(?:getByRole|getByText|getByLabel|getByTestId|getByPlaceholder|locator)\([^;]+\))\.selectOption\(['"]([^'"]+)['"]\)/);
    if (goto) steps.push({ id: id(lineNumber), type: 'navigate', url: goto[1] });
    else if (wait) steps.push({ id: id(lineNumber), type: 'wait', value: wait[1] });
    else if (screenshot) steps.push({ id: id(lineNumber), type: 'screenshot', value: screenshot[1] });
    else if (action) steps.push({ id: id(lineNumber), type: action[2] === 'uncheck' ? 'check' : action[2] as Step['type'], ...locatorFrom(action[1]), options: action[2] === 'uncheck' ? 'uncheck' : undefined });
    else if (fill) steps.push({ id: id(lineNumber), type: 'fill', ...locatorFrom(fill[1]), value: fill[2] });
    else if (press) steps.push({ id: id(lineNumber), type: 'press', ...locatorFrom(press[1]), value: press[2] });
    else if (select) steps.push({ id: id(lineNumber), type: 'select', ...locatorFrom(select[1]), value: select[2] });
    else warnings.push({ line: lineNumber, message: 'Unsupported Playwright statement.', source: rawLine });
  }
  return { steps, warnings };
}
