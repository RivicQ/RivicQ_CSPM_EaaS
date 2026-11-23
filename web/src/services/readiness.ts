import axios from 'axios';
import { getAPIBaseURL } from '../config/editions';
import { isClientDemoToken } from '../demo/constants';

export type ReadinessOverall = 'ready' | 'partial' | 'not-ready';

export interface ReadinessCheck {
  id: string;
  label: string;
  status: string;
  detail: string;
  source: string;
  maturity?: string;
}

export interface ReadinessGroup {
  id: string;
  label: string;
  status?: string;
  checks: ReadinessCheck[];
}

export interface ProductionReadiness {
  checked_at: string;
  overall: ReadinessOverall;
  groups: ReadinessGroup[];
  sources: string[];
}

export const READINESS_TIMEOUT_MS = 10000;

export const READINESS_MESSAGES = {
  network: 'Cannot reach the authoritative backend. Check connectivity and try again.',
  timeout: 'The readiness request timed out. Please try again.',
  admin: 'Administrator access is required to view production readiness.',
  invalid: 'The readiness service returned an invalid response.',
} as const;

const client = axios.create({
  baseURL: getAPIBaseURL(),
  timeout: READINESS_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validSources(value: unknown): boolean {
  if (Array.isArray(value)) return value.every((source) => typeof source === 'string');
  return isRecord(value) && Object.values(value).every((state) => typeof state === 'string');
}

export function isProductionReadiness(value: unknown): value is ProductionReadiness {
  if (!isRecord(value)) return false;
  if (!nonEmptyString(value.checked_at)) return false;
  if (value.overall !== 'ready' && value.overall !== 'partial' && value.overall !== 'not-ready') return false;
  if (!Array.isArray(value.groups) || !validSources(value.sources)) return false;
  return value.groups.every(
    (group) =>
      isRecord(group) &&
      nonEmptyString(group.id) &&
      nonEmptyString(group.label) &&
      Array.isArray(group.checks) &&
      group.checks.every(
        (check) =>
          isRecord(check) &&
          nonEmptyString(check.id) &&
          nonEmptyString(check.label) &&
          nonEmptyString(check.status),
      ),
  );
}

export function normalizeProductionReadiness(payload: unknown): ProductionReadiness {
  if (!isProductionReadiness(payload)) throw new Error(READINESS_MESSAGES.invalid);
  const rawSources: unknown = payload.sources;
  const sources = Array.isArray(rawSources)
    ? rawSources.filter(nonEmptyString).map((source) => source.trim())
    : Object.entries(rawSources as Record<string, string>)
        .filter(([key, state]) => nonEmptyString(key) && nonEmptyString(state))
        .map(([key, state]) => `${key.trim()}: ${state.trim()}`);
  return {
    checked_at: payload.checked_at.trim(),
    overall: payload.overall,
    groups: payload.groups.map((group) => ({
      id: group.id.trim(),
      label: group.label.trim(),
      status: nonEmptyString(group.status) ? group.status.trim() : undefined,
      checks: group.checks.map((check) => ({
        id: check.id.trim(),
        label: check.label.trim(),
        status: check.status.trim(),
        detail: nonEmptyString(check.detail) ? check.detail.trim() : 'No detail supplied by the readiness service.',
        source: nonEmptyString(check.source) ? check.source.trim() : 'not specified',
        maturity: nonEmptyString(check.maturity) ? check.maturity.trim() : undefined,
      })),
    })),
    sources,
  };
}

function normalizeError(error: unknown): string {
  const err = error as { code?: string; message?: string; response?: { status?: number } } | null;
  if (error instanceof Error && error.message === READINESS_MESSAGES.invalid) return error.message;
  if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) return READINESS_MESSAGES.timeout;
  if (err?.response?.status === 401 || err?.response?.status === 403) return READINESS_MESSAGES.admin;
  if (err?.response) return 'The authoritative backend could not provide readiness data. Please try again.';
  return READINESS_MESSAGES.network;
}

function readAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export async function getProductionReadiness(): Promise<ProductionReadiness> {
  client.defaults.baseURL = getAPIBaseURL();
  const token = readAuthToken();
  try {
    const response = await client.get<unknown>('/platform/readiness', {
      headers: token && !isClientDemoToken(token) ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return normalizeProductionReadiness(response.data);
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}
