export function validateRecordUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter a URL to start recording.';

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'Enter a valid http:// or https:// URL.';
  }

  if (!['http:', 'https:'].includes(url.protocol)) return 'Use an http:// or https:// URL.';
  if (!url.hostname) return 'Enter a valid http:// or https:// URL.';
  return '';
}

export function suggestTestName(value: string): string {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return 'new-test';

    const name = url.hostname
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^\[|\]$/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return name || 'new-test';
  } catch {
    return 'new-test';
  }
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;

  const element = target as EventTarget & {
    tagName?: string;
    contentEditable?: string;
    isContentEditable?: boolean;
  };
  const tagName = element.tagName?.toLowerCase();
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || element.isContentEditable === true
    || element.contentEditable === 'true'
    || element.contentEditable === 'plaintext-only';
}
