import type { Step } from './types';
import type { VariableMap } from './variables';

export type TemplateId = 'login' | 'checkout' | 'search' | 'form';
export type TemplateVariable = 'baseUrl' | 'email' | 'password';

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  description: string;
  requiredVariables: TemplateVariable[];
};

export const templateDefinitions: TemplateDefinition[] = [
  { id: 'login', name: 'Login', description: 'Sign in and verify the landing page.', requiredVariables: ['baseUrl', 'email', 'password'] },
  { id: 'checkout', name: 'Checkout', description: 'Open a cart, apply shipping details, and place an order.', requiredVariables: ['baseUrl'] },
  { id: 'search', name: 'Search', description: 'Search for a term and verify the results.', requiredVariables: ['baseUrl'] },
  { id: 'form', name: 'Form submission', description: 'Complete a form and verify the confirmation.', requiredVariables: ['baseUrl', 'email'] }
];

const step = (type: Step['type'], fields: Omit<Step, 'id' | 'type'> = {}): Step => ({
  id: crypto.randomUUID(),
  type,
  ...fields
});

const configuredValue = (variables: VariableMap | undefined, name: TemplateVariable, fallback: string) => (
  variables && Object.prototype.hasOwnProperty.call(variables, name) ? `{{${name}}}` : fallback
);

export function createTemplateSteps(templateId: TemplateId, variables?: VariableMap): Step[] {
  switch (templateId) {
    case 'login':
      return [
        step('navigate', { url: `${configuredValue(variables, 'baseUrl', 'https://example.com')}/login` }),
        step('fill', { locatorType: 'label', selector: 'Email', value: configuredValue(variables, 'email', 'qa@example.com') }),
        step('fill', { locatorType: 'label', selector: 'Password', value: configuredValue(variables, 'password', 'password') }),
        step('click', { locatorType: 'role', role: 'button', selector: 'Sign in' }),
        step('assert', { locatorType: 'text', selector: 'Dashboard', assertion: 'visible' })
      ];
    case 'checkout':
      return [
        step('navigate', { url: `${configuredValue(variables, 'baseUrl', 'https://example.com')}/shop` }),
        step('click', { locatorType: 'role', role: 'link', selector: 'Cart' }),
        step('fill', { locatorType: 'label', selector: 'Promo code', value: 'SAVE10' }),
        step('select', { locatorType: 'label', selector: 'Shipping method', value: 'standard' }),
        step('check', { locatorType: 'label', selector: 'Terms and conditions', options: 'check' }),
        step('click', { locatorType: 'role', role: 'button', selector: 'Place order' }),
        step('assert', { locatorType: 'text', selector: 'Order confirmed', assertion: 'visible' })
      ];
    case 'search':
      return [
        step('navigate', { url: configuredValue(variables, 'baseUrl', 'https://example.com') }),
        step('fill', { locatorType: 'placeholder', selector: 'Search', value: 'playwright' }),
        step('press', { locatorType: 'placeholder', selector: 'Search', value: 'Enter' }),
        step('assert', { locatorType: 'text', selector: 'Search results', assertion: 'visible' })
      ];
    case 'form':
      return [
        step('navigate', { url: `${configuredValue(variables, 'baseUrl', 'https://example.com')}/contact` }),
        step('fill', { locatorType: 'label', selector: 'Name', value: 'QA Engineer' }),
        step('fill', { locatorType: 'label', selector: 'Email', value: configuredValue(variables, 'email', 'qa@example.com') }),
        step('select', { locatorType: 'label', selector: 'Topic', value: 'support' }),
        step('check', { locatorType: 'label', selector: 'Consent', options: 'check' }),
        step('click', { locatorType: 'role', role: 'button', selector: 'Submit' }),
        step('assert', { locatorType: 'text', selector: 'Thank you', assertion: 'visible' })
      ];
  }
}
