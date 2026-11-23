import { AxiosAdapter, AxiosError, AxiosResponse } from 'axios';
import api from './api';
import {
  API_UNAVAILABLE_MESSAGE,
  SESSION_VERIFICATION_MESSAGE,
  friendlyNetworkMessage,
  isNetworkError,
  normalizeApiError,
} from './network';

describe('network utilities', () => {
  it('recognizes raw network failures', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK', message: 'Network Error' })).toBe(true);
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isNetworkError({ name: 'AxiosError', message: 'Network Error', code: 'ECONNABORTED' })).toBe(true);
  });

  it('does not treat HTTP status failures as network failures', () => {
    expect(isNetworkError({ response: { status: 503 }, message: 'Request failed with status code 503' })).toBe(false);
    expect(isNetworkError({ response: { status: 400, data: { error: 'Invalid email or password' } } })).toBe(false);
  });

  it('returns a friendly message and never exposes raw axios text', () => {
    expect(friendlyNetworkMessage(new Error('Network Error'))).toBe(API_UNAVAILABLE_MESSAGE);
    expect(friendlyNetworkMessage(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
      API_UNAVAILABLE_MESSAGE
    );
    expect(friendlyNetworkMessage(new Error('Network Error'))).not.toMatch(/network\s*error/i);
    expect(friendlyNetworkMessage(new Error('Network Error'), 'Authentication failed')).toBe(API_UNAVAILABLE_MESSAGE);
  });

  it('keeps readable server messages', () => {
    expect(friendlyNetworkMessage({ response: { status: 400, data: { error: 'Invalid email or password' } } })).toBe(
      'Invalid email or password'
    );
  });

  it('normalizes errors with a friendlyMessage and preserved metadata', () => {
    const normalized = normalizeApiError({ code: 'ERR_NETWORK', message: 'Network Error', config: {} });
    expect(normalized.message).toBe(API_UNAVAILABLE_MESSAGE);
    expect(normalized.friendlyMessage).toBe(API_UNAVAILABLE_MESSAGE);
    expect(normalized.code).toBe('ERR_NETWORK');
    expect(normalizeApiError(normalized).message).toBe(API_UNAVAILABLE_MESSAGE);
  });

  it('supports a context-specific fallback for session verification', () => {
    const normalized = normalizeApiError(new Error('Network Error'), SESSION_VERIFICATION_MESSAGE);
    expect(normalized.friendlyMessage).toBe(SESSION_VERIFICATION_MESSAGE);
  });
});

describe('api network robustness', () => {
  const originalAdapter = api.defaults.adapter;

  const okResponse = (config: any): AxiosResponse => ({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

  const networkError = (config: any) => new AxiosError('Network Error', 'ERR_NETWORK', config);

  afterEach(() => {
    api.defaults.adapter = originalAdapter as AxiosAdapter;
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('retries a GET once after a network error and hides the retry flag from config keys', async () => {
    let calls = 0;
    const adapter = jest.fn(async (config: any) => {
      calls += 1;
      if (calls === 1) throw networkError(config);
      expect((config as any).__networkRetried).toBe(true);
      expect(Object.keys(config)).not.toContain('__networkRetried');
      return okResponse(config);
    });
    api.defaults.adapter = adapter as unknown as AxiosAdapter;

    const response = await api.get('/inventory/summary');

    expect(response.data).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('retries a GET once after a 502/503/504', async () => {
    let calls = 0;
    const adapter = jest.fn(async (config: any) => {
      calls += 1;
      if (calls === 1) {
        throw new AxiosError('Request failed with status code 503', 'ERR_BAD_RESPONSE', config, undefined, {
          data: { error: 'temporarily unavailable' },
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          config,
        } as AxiosResponse);
      }
      return okResponse(config);
    });
    api.defaults.adapter = adapter as unknown as AxiosAdapter;

    const response = await api.get('/auth/editions');

    expect(response.data).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('does not retry auth POSTs and rejects with a friendly error', async () => {
    const adapter = jest.fn(async (config: any) => {
      throw networkError(config);
    });
    api.defaults.adapter = adapter as unknown as AxiosAdapter;

    await expect(api.post('/auth/login', { email: 'ada@example.test', password: 'password123' })).rejects.toMatchObject({
      friendlyMessage: API_UNAVAILABLE_MESSAGE,
    });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
