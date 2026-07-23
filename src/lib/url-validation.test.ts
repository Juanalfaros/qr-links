import { describe, expect, it } from 'vitest';
import { validateWebhookUrl } from './url-validation';

describe('validateWebhookUrl', () => {
  it('accepts a well-formed https URL', () => {
    expect(validateWebhookUrl('https://example.com/webhook')).toEqual({ valid: true });
  });

  it('rejects non-https protocols', () => {
    expect(validateWebhookUrl('http://example.com/webhook').valid).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(validateWebhookUrl('not a url').valid).toBe(false);
  });

  it('rejects localhost', () => {
    expect(validateWebhookUrl('https://localhost/webhook').valid).toBe(false);
  });

  it('rejects loopback and private IPv4 ranges', () => {
    expect(validateWebhookUrl('https://127.0.0.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://10.0.0.5/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://172.16.0.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://192.168.1.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://169.254.169.254/webhook').valid).toBe(false);
  });

  it('rejects IPv6 loopback and link-local addresses', () => {
    expect(validateWebhookUrl('https://[::1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[fe80::1]/webhook').valid).toBe(false);
  });

  it('accepts a public IPv4 address', () => {
    expect(validateWebhookUrl('https://8.8.8.8/webhook')).toEqual({ valid: true });
  });
});
