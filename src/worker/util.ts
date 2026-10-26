import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function fail(status: ContentfulStatusCode, message: string): never {
  throw new HTTPException(status, { message });
}

/** The scenario clock moves one minute per action so events stay ordered. */
export function tick(iso: string, minutes = 1): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}
