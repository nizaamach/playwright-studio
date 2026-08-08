const { chromium } = require('playwright');
const { randomUUID } = require('node:crypto');

const marker = '__playwright_studio_recorder__';

const locatorTypes = new Set(['css', 'xpath', 'role', 'text', 'label', 'testId', 'placeholder']);
const unavailable = (message) => ({ status: 'unavailable', count: null, message });

async function countLocator(page, locatorType, selector, role) {
  if (!locatorTypes.has(locatorType)) return unavailable('Unsupported locator strategy.');
  if (typeof selector !== 'string' || !selector.trim()) return unavailable('A locator value is required.');
  if (locatorType === 'role' && (typeof role !== 'string' || !role.trim())) return unavailable('A role is required for role locators.');
  if (!page) return unavailable('Start recording in Playwright Studio Desktop to check locator matches.');

  try {
    const value = selector.trim();
    const locator = locatorType === 'role'
      ? page.getByRole(role.trim(), { name: value })
      : locatorType === 'label'
        ? page.getByLabel(value, { exact: true })
        : locatorType === 'text'
          ? page.getByText(value)
          : locatorType === 'testId'
            ? page.getByTestId(value)
            : locatorType === 'placeholder'
              ? page.getByPlaceholder(value)
              : page.locator(locatorType === 'xpath' ? `xpath=${value}` : value);
    return { status: 'available', count: await locator.count() };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'Unable to check locator.');
  }
}

const captureScript = `(() => {
  const emit = (event) => window.__pwStudioEmit && window.__pwStudioEmit(event);
  const text = (node) => (node.innerText || node.value || node.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 100);
  const cssEscape = (value) => String(value).replace(/([\\\\"'#.:\\[\\]()>+~])/g, '\\\\$1');
  const locator = (node) => {
    const tag = node.tagName.toLowerCase();
    const label = node.getAttribute('aria-label') || (node.labels && node.labels[0] && text(node.labels[0]));
    if (label) return { locatorType: 'label', selector: label };
    const role = node.getAttribute('role') || ({ button: 'button', a: 'link', textarea: 'textbox', select: 'combobox' }[tag]);
    const name = text(node);
    if (role && name && ['button', 'link', 'checkbox', 'radio', 'combobox'].includes(role)) return { locatorType: 'role', role, selector: name };
    const testId = node.getAttribute('data-testid');
    if (testId) return { locatorType: 'testId', selector: testId };
    if (node.id) return { locatorType: 'css', selector: '#' + cssEscape(node.id) };
    const placeholder = node.getAttribute('placeholder');
    if (placeholder) return { locatorType: 'placeholder', selector: placeholder };
    const nameAttr = node.getAttribute('name');
    if (nameAttr) return { locatorType: 'css', selector: tag + '[name="' + nameAttr.replace(/"/g, '\\\\"') + '"]' };
    if (name) return { locatorType: 'text', selector: name };
    const path = [];
    let current = node;
    while (current && current.nodeType === 1 && current !== document.body && path.length < 6) {
      let index = 1; let sibling = current.previousElementSibling;
      while (sibling) { if (sibling.tagName === current.tagName) index++; sibling = sibling.previousElementSibling; }
      path.unshift(current.tagName.toLowerCase() + '[' + index + ']'); current = current.parentElement;
    }
    return { locatorType: 'xpath', selector: '/' + path.join('/') };
  };
  let inputTimer;
  const target = (event) => event.target && event.target.closest && event.target.closest('input,textarea,select,button,a,[role]');
  document.addEventListener('click', (event) => { const node = target(event); if (node) emit({ type: 'click', ...locator(node) }); }, true);
  document.addEventListener('input', (event) => { const node = target(event); if (!node || node.type === 'checkbox' || node.type === 'radio') return; clearTimeout(inputTimer); inputTimer = setTimeout(() => emit({ type: 'fill', ...locator(node), value: node.value || '' }), 250); }, true);
  document.addEventListener('change', (event) => { const node = target(event); if (!node) return; if (node.tagName.toLowerCase() === 'select') emit({ type: 'select', ...locator(node), value: node.value }); else if (node.type === 'checkbox' || node.type === 'radio') emit({ type: 'check', ...locator(node), options: node.checked ? 'check' : 'uncheck' }); }, true);
  document.addEventListener('keydown', (event) => { const keys = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']; if (!keys.includes(event.key)) return; const node = target(event); if (node) emit({ type: 'press', ...locator(node), value: event.key }); }, true);
})();`;

async function startRecorder(url, onEvent, onError) {
  let browser;
  try {
    browser = await chromium.launch({ headless: process.env.PW_STUDIO_HEADLESS === '1' });
    const context = await browser.newContext();
    const page = await context.newPage();
    let closing = false;
    await page.exposeBinding('__pwStudioEmit', (_source, event) => onEvent({ id: randomUUID(), ...event }));
    await page.addInitScript({ content: captureScript });
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame() && !closing) onEvent({ id: randomUUID(), type: 'navigate', url: frame.url() }); });
    page.on('close', () => { if (!closing) onError('Recorder browser was closed before recording stopped.'); });
    context.on('close', () => { if (!closing) onError('Recorder session ended unexpectedly.'); });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (error) {
      const timedOut = error && (error.name === 'TimeoutError' || /timeout/i.test(error.message || ''));
      if (!timedOut) throw error;
      // A slow page can still be interactive enough to record. Keep the
      // session alive and let the user continue instead of failing startup.
    }
    return { browser, context, page, close: async () => { closing = true; await browser.close(); } };
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    throw error;
  }
}

module.exports = { countLocator, startRecorder };
