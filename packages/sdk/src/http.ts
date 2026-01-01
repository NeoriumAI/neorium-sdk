import { NeoAPIError, NeoAuthError, NeoNetworkError, NeoRateLimitError } from './errors.js';

export type HttpClientOptions = {
  baseUrl: string;
  apiKey: string;
  userAgent: string | undefined;
  timeoutMs: number;
  maxRetries: number;
  fetchImpl: typeof fetch;
};

function parseRetryAfterMs(resp: Response): number | undefined {
  const h = resp.headers.get('retry-after');
  if (!h) return undefined;
  const seconds = Number(h);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(h);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(t);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
        return;
      }
      const onAbort = () => {
        clearTimeout(t);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function backoffMs(attempt: number): number {
  const base = 250;
  const cap = 5000;
  const exp = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.random() * 0.2 * exp;
  return exp + jitter;
}

export async function httpJson<T>(
  opts: HttpClientOptions,
  input: {
    path: string;
    method: 'GET' | 'POST';
    body?: unknown;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  }
): Promise<{ response: Response; json: T }>
{
  const url = new URL(input.path.replace(/^\/+/, ''), opts.baseUrl.replace(/\/+$/, '') + '/');
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${opts.apiKey}`
  };
  if (opts.userAgent) headers['user-agent'] = opts.userAgent;
  if (input.headers) Object.assign(headers, input.headers);

  if (!opts.apiKey) throw new NeoAuthError('Missing API key');

  for (let attempt = 1; attempt <= Math.max(1, opts.maxRetries + 1); attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), opts.timeoutMs);
    const signal = mergeSignals([input.signal, controller.signal]);

    try {
      const init: RequestInit = {
        method: input.method,
        headers
      };
      if (input.body !== undefined) init.body = JSON.stringify(input.body);
      if (signal) init.signal = signal;

      const resp = await opts.fetchImpl(url.toString(), init);

      if (resp.status === 401 || resp.status === 403) {
        throw new NeoAuthError('Authentication failed (check NEO_APIKEY).', { status: resp.status });
      }

      if (resp.status === 429) {
        const retryAfterMs = parseRetryAfterMs(resp);
        const bodyText = await safeReadText(resp);
        const err = new NeoRateLimitError('Rate limited by API.', {
          status: resp.status,
          ...(retryAfterMs !== undefined ? { retryAfterMs } : {})
        });
        (err as any).body = bodyText;
        if (attempt <= opts.maxRetries + 1) {
          await sleep(retryAfterMs ?? backoffMs(attempt), input.signal);
          continue;
        }
        throw err;
      }

      if (!resp.ok) {
        const body = await safeReadJson(resp);
        const err = new NeoAPIError(`API request failed with status ${resp.status}.`, {
          status: resp.status,
          body
        });
        if (isRetriableStatus(resp.status) && attempt <= opts.maxRetries + 1) {
          await sleep(backoffMs(attempt), input.signal);
          continue;
        }
        throw err;
      }

      const json = (await resp.json()) as T;
      return { response: resp, json };
    } catch (e: any) {
      // Abort/timeout should surface immediately.
      if (e?.name === 'AbortError' || e?.name === 'TimeoutError') throw e;

      // Retriable network errors.
      const isNetwork = e instanceof TypeError;
      if (isNetwork && attempt <= opts.maxRetries + 1) {
        await sleep(backoffMs(attempt), input.signal);
        continue;
      }

      if (e instanceof NeoAuthError || e instanceof NeoRateLimitError || e instanceof NeoAPIError) throw e;
      throw new NeoNetworkError('Network error while calling API.', { cause: e });
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new NeoNetworkError('Exhausted retries.');
}

export async function safeReadText(resp: Response): Promise<string | undefined> {
  try {
    return await resp.text();
  } catch {
    return undefined;
  }
}

export async function safeReadJson(resp: Response): Promise<unknown> {
  try {
    return await resp.json();
  } catch {
    return await safeReadText(resp);
  }
}

export function mergeSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const active = signals.filter(Boolean) as AbortSignal[];
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];

  const controller = new AbortController();
  const onAbort = (s: AbortSignal) => {
    if (!controller.signal.aborted) controller.abort(s.reason ?? new DOMException('Aborted', 'AbortError'));
  };
  for (const s of active) {
    if (s.aborted) {
      onAbort(s);
      break;
    }
    s.addEventListener('abort', () => onAbort(s), { once: true });
  }
  return controller.signal;
}
