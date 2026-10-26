// Cloudflare Access puts a signed JWT on every request that passed the login
// page. Checking it here keeps /api closed even if a request reaches the
// Worker some other way. In dev the check is skipped.

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from './env';
import { isDev } from './env';
import { fail } from './util';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export const requireAccess: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (isDev(c.env)) {
    c.set('email', 'dev@localhost');
    return next();
  }
  const team = c.env.ACCESS_TEAM_DOMAIN;
  const aud = c.env.ACCESS_AUD;
  if (!team || !aud) fail(503, 'Access is not set up.');
  const token = c.req.header('cf-access-jwt-assertion');
  if (!token) fail(401, 'Sign in first.');
  const issuer = `https://${team}`;
  let keys = keySets.get(team);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(team, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, { issuer, audience: aud });
    c.set('email', typeof payload.email === 'string' ? payload.email : 'unknown');
  } catch {
    fail(401, 'Sign in again.');
  }
  return next();
};
