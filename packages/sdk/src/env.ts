import { NeoAuthError } from './errors.js';

// `process.env` is Node-only; keep the SDK browser-compatible.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultEnv: Record<string, string | undefined> = (((globalThis as any).process?.env ?? {}) as any) as Record<
  string,
  string | undefined
>;

export function readNeoApiKeyFromEnv(env: Record<string, string | undefined> = defaultEnv):
  | string
  | undefined {
  return env.NEO_APIKEY ?? env.neo_apikey;
}

export function requireNeoApiKey(apiKey?: string): string {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new NeoAuthError('Missing API key. Set NEO_APIKEY (alias: neo_apikey) or pass apiKey explicitly.');
  }
  return apiKey;
}

export function readNeoBaseUrlFromEnv(env: Record<string, string | undefined> = defaultEnv):
  | string
  | undefined {
  return env.NEO_BASE_URL;
}

export function readNeoModelFromEnv(env: Record<string, string | undefined> = defaultEnv):
  | string
  | undefined {
  return env.NEO_MODEL;
}

export function readNeoTimeoutMsFromEnv(env: Record<string, string | undefined> = defaultEnv):
  | number
  | undefined {
  const raw = env.NEO_TIMEOUT_MS;
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
