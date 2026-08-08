import type { Step } from './types';
import type { VariableMap } from './variables';

const quote = (value = '') => JSON.stringify(value);
const screenshotPath = (value: string | undefined, fallback: string) => {
  const path = value?.trim() || fallback;
  return /\.(png|jpe?g)$/i.test(path) ? path : `${path}.png`;
};
const locator = (step: Step) => {
  const value = quote(step.selector || '');
  switch (step.locatorType) {
    case 'role': return `page.getByRole(${quote(step.role || 'button')}, { name: ${value} })`;
    case 'xpath': return `page.locator('xpath=' + ${value})`;
    case 'text': return `page.getByText(${value})`;
    case 'label': return `page.getByLabel(${value}, { exact: true })`;
    case 'testId': return `page.getByTestId(${value})`;
    case 'placeholder': return `page.getByPlaceholder(${value})`;
    default: return `page.locator(${value})`;
  }
};

const variableTokenPattern = /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g;
const isIdentifier = (value: string) => /^[A-Za-z_$][\w$]*$/.test(value);
const dataReference = (name: string) => isIdentifier(name) ? `testData.${name}` : `testData[${quote(name)}]`;

const hasVariable = (variables: VariableMap | undefined, name: string): variables is VariableMap => (
  typeof variables?.[name] === 'string'
);

const valueExpression = (value = '', variables?: VariableMap) => {
  if (!variables || !Object.keys(variables).length) return quote(value);

  const parts: string[] = [];
  let cursor = 0;
  let found = false;
  for (const match of value.matchAll(variableTokenPattern)) {
    const name = match[1];
    if (!hasVariable(variables, name)) continue;
    found = true;
    const index = match.index ?? 0;
    if (index > cursor) parts.push(quote(value.slice(cursor, index)));
    parts.push(dataReference(name));
    cursor = index + match[0].length;
  }

  if (!found) return quote(value);
  if (cursor < value.length) parts.push(quote(value.slice(cursor)));
  return parts.length === 1 ? parts[0] : parts.join(' + ');
};

const testDataDeclaration = (variables: VariableMap) => {
  const entries = Object.keys(variables).sort().map((name) => `  ${isIdentifier(name) ? name : JSON.stringify(name)}: ${quote(variables[name])}`);
  return `const testData = {\n${entries.join(',\n')}\n};`;
};

export function generateCode(name: string, steps: Step[], variables?: VariableMap) {
  const variableMap = variables && Object.keys(variables).length ? variables : undefined;
  const lines = steps.map((step) => {
    const target = locator(step);
    switch (step.type) {
      case 'navigate': return `  await page.goto(${valueExpression(step.url, variableMap)});`;
      case 'click': return `  await ${target}.click();`;
      case 'hover': return `  await ${target}.hover();`;
      case 'focus': return `  await ${target}.focus();`;
      case 'clear': return `  await ${target}.clear();`;
      case 'press': return `  await ${target}.press(${valueExpression(step.value, variableMap)});`;
      case 'fill': return `  await ${target}.fill(${valueExpression(step.value, variableMap)});`;
      case 'select': return `  await ${target}.selectOption(${valueExpression(step.value, variableMap)});`;
      case 'check': return `  await ${target}.${step.options === 'uncheck' ? 'uncheck' : 'check'}();`;
      case 'upload': return `  await ${target}.setInputFiles(${valueExpression(step.value, variableMap)});`;
      case 'wait': return `  await page.waitForTimeout(${Math.max(0, Number(step.timeout || step.value || 500))});`;
      case 'screenshot': return `  await page.screenshot({ path: ${quote(screenshotPath(step.value, `${name}.png`))}, fullPage: true });`;
      case 'assert':
        if (step.assertion === 'text') return `  await expect(${target}).toContainText(${valueExpression(step.value, variableMap)});`;
        if (step.assertion === 'value') return `  await expect(${target}).toHaveValue(${valueExpression(step.value, variableMap)});`;
        if (step.assertion === 'checked') return `  await expect(${target}).toBeChecked();`;
        if (step.assertion === 'enabled') return `  await expect(${target}).toBeEnabled();`;
        if (step.assertion === 'disabled') return `  await expect(${target}).toBeDisabled();`;
        if (step.assertion === 'url') return `  await expect(page).toHaveURL(${valueExpression(step.value, variableMap)});`;
        if (step.assertion === 'urlContains') return `  await expect(page).toHaveURL(new RegExp(${valueExpression(step.value, variableMap)}));`;
        if (step.assertion === 'title') return `  await expect(page).toHaveTitle(${valueExpression(step.value, variableMap)});`;
        if (step.assertion === 'attribute') return `  await expect(${target}).toHaveAttribute(${quote(step.options || 'aria-label')}, ${valueExpression(step.value, variableMap)});`;
        if (step.assertion === 'count') return `  await expect(${target}).toHaveCount(${Math.max(0, Number(step.value || 0))});`;
        return `  await expect(${target}).toBeVisible();`;
      default: return '';
    }
  }).filter(Boolean);
  const data = variableMap ? `${testDataDeclaration(variableMap)}\n\n` : '';
  return `import { test, expect } from '@playwright/test';\n\n${data}test(${quote(name)}, async ({ page }) => {\n${lines.join('\n')}\n});\n`;
}
