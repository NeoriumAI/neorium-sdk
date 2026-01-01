export class NeoError extends Error {
  public override name: string = 'NeoError';
  public readonly code?: string;
  public readonly status?: number;
  public readonly cause?: unknown;

  constructor(message: string, opts?: { code?: string; status?: number; cause?: unknown }) {
    super(message);
    if (opts?.code !== undefined) this.code = opts.code;
    if (opts?.status !== undefined) this.status = opts.status;
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }
}

export class NeoAuthError extends NeoError {
  public override name: string = 'NeoAuthError';
}

export class NeoRateLimitError extends NeoError {
  public override name: string = 'NeoRateLimitError';
  public readonly retryAfterMs?: number;

  constructor(message: string, opts?: { status?: number; cause?: unknown; retryAfterMs?: number }) {
    super(message, {
      code: 'rate_limited',
      ...(opts?.status !== undefined ? { status: opts.status } : {}),
      ...(opts?.cause !== undefined ? { cause: opts.cause } : {})
    });
    if (opts?.retryAfterMs !== undefined) this.retryAfterMs = opts.retryAfterMs;
  }
}

export class NeoNetworkError extends NeoError {
  public override name: string = 'NeoNetworkError';
}

export class NeoAPIError extends NeoError {
  public override name: string = 'NeoAPIError';
  public readonly body?: unknown;

  constructor(message: string, opts?: { status?: number; body?: unknown; cause?: unknown }) {
    super(message, {
      code: 'api_error',
      ...(opts?.status !== undefined ? { status: opts.status } : {}),
      ...(opts?.cause !== undefined ? { cause: opts.cause } : {})
    });
    if (opts?.body !== undefined) this.body = opts.body;
  }
}
