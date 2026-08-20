import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * Every route returns the same envelope, so the client has exactly one error
 * path to handle and users get a sentence instead of a stack trace.
 */
export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static unauthorized(message = 'Please sign in to continue.') {
    return new ApiError(401, 'unauthorized', message);
  }
  static forbidden(message = "You don't have permission to do that.") {
    return new ApiError(403, 'forbidden', message);
  }
  static notFound(message = "We couldn't find that.") {
    return new ApiError(404, 'not_found', message);
  }
  static conflict(message: string) {
    return new ApiError(409, 'conflict', message);
  }
  static invalid(message: string, fields?: Record<string, string>) {
    return new ApiError(422, 'invalid', message, fields);
  }
  static tooMany(message = 'Slow down a moment, then try again.') {
    return new ApiError(429, 'rate_limited', message);
  }
}

function fieldsFromZod(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw ApiError.invalid('That request body was not valid JSON.');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const fields = fieldsFromZod(result.error);
    throw ApiError.invalid(Object.values(fields)[0] ?? 'Some fields need attention.', fields);
  }
  return result.data;
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    const fields = fieldsFromZod(result.error);
    throw ApiError.invalid(Object.values(fields)[0] ?? 'Invalid query.', fields);
  }
  return result.data;
}

function toResponse(error: unknown, context: Record<string, unknown>): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    if (error.status >= 500) logger.error({ err: error, ...context }, error.message);
    else logger.debug({ code: error.code, ...context }, error.message);
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const fields = fieldsFromZod(error);
    return NextResponse.json(
      { error: { code: 'invalid', message: Object.values(fields)[0] ?? 'Invalid input.', fields } },
      { status: 422 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'conflict', message: 'That already exists.' } },
        { status: 409 },
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: { code: 'not_found', message: "We couldn't find that." } },
        { status: 404 },
      );
    }
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: { code: 'invalid', message: 'That reference points at something missing.' } },
        { status: 422 },
      );
    }
  }

  logger.error({ err: error, ...context }, 'Unhandled API error');
  return NextResponse.json(
    { error: { code: 'server_error', message: 'Something went wrong on our end.' } },
    { status: 500 },
  );
}

type Handler<C> = (request: Request, context: C) => Promise<Response> | Response;

/** Wraps a route so no handler has to write its own try/catch again. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    const url = new URL(request.url);
    try {
      return await handler(request, context);
    } catch (error) {
      return toResponse(error, { path: url.pathname, method: request.method });
    }
  };
}

export function ok<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
