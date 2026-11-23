import { CLIENT_DEMO_TOKEN } from '../demo/constants';

type ReadinessModule = typeof import('./readiness');

const validPayload = {
  checked_at: '2026-11-23T10:00:00Z',
  overall: 'partial',
  groups: [
    {
      id: 'core',
      label: 'Core services',
      checks: [
        {
          id: 'api',
          label: 'Backend API',
          status: 'Production implemented',
          detail: 'Authenticated admin endpoint is implemented.',
          source: 'docs/PRODUCT_STATUS.md',
        },
      ],
    },
  ],
  sources: ['docs/PRODUCT_STATUS.md'],
};

describe('readiness service', () => {
  let readiness: ReadinessModule;
  let getMock: jest.Mock;
  let createMock: jest.Mock;
  let getAPIBaseURLMock: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    localStorage.clear();
    getMock = jest.fn();
    createMock = jest.fn(() => ({
      defaults: { baseURL: '' },
      get: getMock,
    }));
    getAPIBaseURLMock = jest.fn(() => '/api/v1');
    jest.doMock('axios', () => ({
      __esModule: true,
      default: { create: createMock },
    }));
    jest.doMock('../config/editions', () => ({
      getAPIBaseURL: getAPIBaseURLMock,
    }));
    readiness = await import('./readiness');
  });

  it('creates a client with the configured base URL and timeout', () => {
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: '/api/v1',
        timeout: readiness.READINESS_TIMEOUT_MS,
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('requests the platform endpoint with the admin bearer token and normalizes the payload', async () => {
    localStorage.setItem('auth_token', 'admin-token');
    getMock.mockResolvedValue({ data: validPayload });

    await expect(readiness.getProductionReadiness()).resolves.toEqual(validPayload);
    expect(getMock).toHaveBeenCalledWith('/platform/readiness', {
      headers: { Authorization: 'Bearer admin-token' },
    });
  });

  it('uses the latest API base URL for each request', async () => {
    getAPIBaseURLMock.mockReturnValue('http://localhost:9090/api/v1');
    getMock.mockResolvedValue({ data: validPayload });

    await readiness.getProductionReadiness();

    const client = createMock.mock.results[0].value as { defaults: { baseURL: string } };
    expect(client.defaults.baseURL).toBe('http://localhost:9090/api/v1');
  });

  it('does not attach a client-side demo token', async () => {
    localStorage.setItem('auth_token', CLIENT_DEMO_TOKEN);
    getMock.mockResolvedValue({ data: validPayload });

    await readiness.getProductionReadiness();

    expect(getMock).toHaveBeenCalledWith('/platform/readiness', { headers: undefined });
  });

  it('keeps empty check lists empty instead of inventing checks', async () => {
    const emptyPayload = { ...validPayload, groups: [], sources: [] };
    getMock.mockResolvedValue({ data: emptyPayload });

    await expect(readiness.getProductionReadiness()).resolves.toEqual(emptyPayload);
  });

  it('normalizes map-shaped sources and backend maturity metadata', async () => {
    const backendPayload = {
      ...validPayload,
      groups: [
        {
          id: 'core',
          label: 'Core',
          status: 'partial',
          checks: [
            {
              id: 'core.database_configured',
              label: 'Database configured',
              status: 'not-ready',
              detail: 'No database DSN is configured.',
              source: 'DATABASE_URL',
              maturity: 'Production implemented',
            },
          ],
        },
      ],
      sources: { DATABASE_URL: 'not-configured', none: 'not-applicable' },
    };
    getMock.mockResolvedValue({ data: backendPayload });

    const result = await readiness.getProductionReadiness();

    expect(result.sources).toEqual(['DATABASE_URL: not-configured', 'none: not-applicable']);
    expect(result.groups[0].status).toBe('partial');
    expect(result.groups[0].checks[0]).toEqual(
      expect.objectContaining({ status: 'not-ready', maturity: 'Production implemented' }),
    );
  });

  it('normalizes timeout, forbidden and network errors without logging credentials', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      getMock.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        config: { url: '/platform/readiness', headers: { Authorization: 'Bearer admin-token' } },
      });
      await expect(readiness.getProductionReadiness()).rejects.toThrow(readiness.READINESS_MESSAGES.timeout);

      getMock.mockRejectedValueOnce({ response: { status: 403 } });
      await expect(readiness.getProductionReadiness()).rejects.toThrow(readiness.READINESS_MESSAGES.admin);

      getMock.mockRejectedValueOnce({ request: {} });
      await expect(readiness.getProductionReadiness()).rejects.toThrow(readiness.READINESS_MESSAGES.network);

      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('rejects an invalid payload with a friendly message', async () => {
    getMock.mockResolvedValue({ data: { overall: 'ready' } });

    await expect(readiness.getProductionReadiness()).rejects.toThrow(readiness.READINESS_MESSAGES.invalid);
  });
});
