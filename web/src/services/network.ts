export const API_UNAVAILABLE_MESSAGE =
  'The API could not be reached. The labeled demo remains available; hosted registration/login needs the production API configured.';

export const SESSION_VERIFICATION_MESSAGE =
  'The API could not be reached while verifying your session. The labeled demo remains available; hosted sign-in needs the production API configured.';

const FALLBACK_MESSAGE = 'This action is unavailable right now. Please try again or use the labeled demo.';

const NETWORK_CODES = [
  'ERR_NETWORK',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ERR_EMPTY_RESPONSE',
  'ERR_CONNECTION_RESET',
];

const TECHNICAL_MESSAGE =
  /network\s*error|networkerror|failed to fetch|load failed|err_network|econnrefused|enotfound|etimedout|econnaborted|timeout of \d+|request failed with status code/i;

const NETWORK_TEXT = /network\s*error|networkerror|failed to fetch|load failed|err_network|econnrefused|enotfound|etimedout|econnaborted|timeout|timed out/i;

interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  friendlyMessage?: string;
  response?: { status?: number; data?: any };
}

export interface FriendlyApiError extends Error {
  friendlyMessage: string;
  status?: number;
  code?: string;
  response?: any;
}

function asErrorLike(error: unknown): ErrorLike | null {
  if (typeof error === 'string') return { message: error };
  if (error && typeof error === 'object') return error as ErrorLike;
  return null;
}

function readableMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const message = value.trim();
  if (!message || message.length > 300) return null;
  if (TECHNICAL_MESSAGE.test(message) || /^[a-z]+error:\s*/i.test(message)) return null;
  return message;
}

export function isNetworkError(error: unknown): boolean {
  const candidate = asErrorLike(error);
  if (!candidate) return false;
  if (candidate.response) return false;
  const code = String(candidate.code || '').toUpperCase();
  if (NETWORK_CODES.some((item) => code === item || code.startsWith(`${item}_`))) return true;
  return NETWORK_TEXT.test(`${candidate.name || ''} ${candidate.message || ''}`);
}

export function friendlyNetworkMessage(
  error: unknown,
  fallbackMessage = FALLBACK_MESSAGE,
  networkMessage = API_UNAVAILABLE_MESSAGE
): string {
  const candidate = asErrorLike(error);
  const existing = readableMessage(candidate?.friendlyMessage);
  if (existing) return existing;
  const data = candidate?.response?.data;
  if (data && typeof data === 'object') {
    const serverMessage = readableMessage(data.error ?? data.message ?? data.detail);
    if (serverMessage) return serverMessage;
  }
  if (isNetworkError(error)) return networkMessage;
  return readableMessage(candidate?.message) || fallbackMessage;
}

export function normalizeApiError(error: unknown, networkMessage = API_UNAVAILABLE_MESSAGE): FriendlyApiError {
  const candidate = asErrorLike(error);
  const friendlyMessage = friendlyNetworkMessage(error, networkMessage, networkMessage) || FALLBACK_MESSAGE;
  const normalized = new Error(friendlyMessage) as FriendlyApiError;
  normalized.friendlyMessage = friendlyMessage;
  if (candidate?.code) normalized.code = candidate.code;
  if (candidate?.response) {
    normalized.response = candidate.response;
    normalized.status = candidate.response.status;
  }
  Object.defineProperty(normalized, 'cause', { value: error, enumerable: false, configurable: true });
  return normalized;
}
