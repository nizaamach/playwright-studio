import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEnvironment } from '../src/environments.ts';

test('resolves environment values without mutating the stored profile', () => {
  const profile = { name: 'QA', baseURL: 'https://qa.example.com', values: { email: 'qa@example.com' } };
  assert.deepEqual(resolveEnvironment(profile, { email: 'override@example.com' }), { name: 'QA', baseURL: 'https://qa.example.com', values: { email: 'override@example.com' } });
  assert.equal(profile.values.email, 'qa@example.com');
});
