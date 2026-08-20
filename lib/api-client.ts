/**
 * One fetch wrapper for the whole client. Every route answers with the same
 * error envelope, so this is the only place that has to know what a failure
 * looks like — and the only place that decides what the user gets told.
 */
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, 'offline', "You appear to be offline. We'll keep your changes here until you're back.");
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = (payload as { error?: { code: string; message: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? 'unknown',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.fields,
    );
  }

  return payload as T;
}

export const messageFor = (error: unknown): string =>
  error instanceof ApiClientError
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';
