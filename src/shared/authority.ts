// Mandate checks, ported from the Vloora agent-interaction-patterns demo
// (vloora/demos/agent-interaction-patterns/lib/authority.mjs). Illustrative
// policy evaluation: a browser decision or a local object confers no
// authorization. This app runs the check in the Worker before any simulated
// attempt, with state the browser sent, so it is a test specimen, not
// enforcement.

export interface Request {
  id: string;
  version: number;
  operation: string;
  recipient: string;
  description: string;
  amount: number;
  fields_shared: string[];
}

export interface Mandate {
  id: string;
  principal: string;
  allowed_operations: string[];
  allowed_recipients: string[];
  max_amount: number;
  expires_at: string;
  requires_approval: boolean;
  revoked: boolean;
}

export interface Decision {
  status: 'approved' | 'declined';
  request_id: string;
  bound_request: string;
  at: string;
}

export type Code =
  | 'WITHIN_TERMS'
  | 'INVALID_REQUEST'
  | 'REVOKED'
  | 'EXPIRED'
  | 'OUT_OF_SCOPE'
  | 'WRONG_RECIPIENT'
  | 'OVER_LIMIT'
  | 'NEEDS_APPROVAL'
  | 'APPROVAL_MISMATCH'
  | 'NO_MANDATE';

export interface Check {
  allowed: boolean;
  code: Code;
  message: string;
}

export function requestBinding(request: Request): string {
  return JSON.stringify([
    request.id,
    request.version,
    request.operation,
    request.recipient,
    request.amount,
    request.description,
    request.fields_shared,
  ]);
}

export function makeDecision(request: Request, status: Decision['status'], now = new Date().toISOString()): Decision {
  if (status !== 'approved' && status !== 'declined') throw new Error('Unknown decision');
  return Object.freeze({ status, request_id: request.id, bound_request: requestBinding(request), at: now });
}

const deny = (code: Code, message: string): Check => ({ allowed: false, code, message });

export function checkPermission(
  request: Request | null | undefined,
  mandate: Mandate | null | undefined,
  decision: Decision | null = null,
  now = new Date().toISOString(),
): Check {
  if (
    !request ||
    !request.id ||
    !request.operation ||
    !request.recipient ||
    !Number.isFinite(request.amount) ||
    request.amount < 0
  ) {
    return deny('INVALID_REQUEST', 'The request has missing or invalid fields.');
  }
  if (!mandate) return deny('NO_MANDATE', 'No permission covers this service.');
  if (mandate.revoked) return deny('REVOKED', 'The person has withdrawn this permission.');
  if (
    !mandate.expires_at ||
    !Number.isFinite(Date.parse(mandate.expires_at)) ||
    !Number.isFinite(Date.parse(now)) ||
    Date.parse(now) >= Date.parse(mandate.expires_at)
  ) {
    return deny('EXPIRED', 'This permission has expired.');
  }
  if (!Array.isArray(mandate.allowed_operations) || !mandate.allowed_operations.includes(request.operation)) {
    return deny('OUT_OF_SCOPE', 'This operation is outside the permission granted.');
  }
  if (!Array.isArray(mandate.allowed_recipients) || !mandate.allowed_recipients.includes(request.recipient)) {
    return deny('WRONG_RECIPIENT', 'The person did not permit this receiving service.');
  }
  if (!Number.isFinite(mandate.max_amount) || request.amount > mandate.max_amount) {
    return deny('OVER_LIMIT', 'This request exceeds the amount permitted.');
  }
  if (mandate.requires_approval) {
    if (!decision || decision.status !== 'approved') {
      return deny('NEEDS_APPROVAL', 'The person must approve this exact request.');
    }
    if (decision.request_id !== request.id || decision.bound_request !== requestBinding(request)) {
      return deny('APPROVAL_MISMATCH', 'The request changed after approval. Ask again.');
    }
  }
  return { allowed: true, code: 'WITHIN_TERMS', message: 'The request fits the recorded permission.' };
}

/** The mandate that covers a request's recipient, if any. The newest wins. */
export function mandateFor(request: Request, mandates: Mandate[]): Mandate | null {
  const matches = mandates.filter((m) => m.allowed_recipients.includes(request.recipient));
  return matches.length ? matches[matches.length - 1] : null;
}
