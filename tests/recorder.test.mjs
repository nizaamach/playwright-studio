import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

test('recorder captures navigation, fill, and click actions', async () => {
  process.env.PW_STUDIO_HEADLESS = '1';
  const { startRecorder } = await import('../electron/recorder.cjs');
  const server = createServer((_request, response) => {
    response.end('<!doctype html><input id="email"><button data-testid="submit">Submit</button>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const events = [];
  const session = await startRecorder(`http://127.0.0.1:${port}`, (event) => events.push(event), () => {});
  await session.page.locator('#email').fill('qa@example.com');
  await session.page.locator('[data-testid="submit"]').click();
  await session.page.waitForTimeout(350);
  await session.close();
  await new Promise((resolve) => server.close(resolve));
  assert.ok(events.some((event) => event.type === 'navigate'));
  assert.ok(events.some((event) => event.type === 'fill' && event.value === 'qa@example.com'));
  assert.ok(events.some((event) => event.type === 'click' && event.locatorType === 'role' && event.role === 'button' && event.selector === 'Submit'));
});
