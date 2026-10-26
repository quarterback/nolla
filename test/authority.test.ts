import { describe, expect, test } from 'vitest';
import { checkPermission, makeDecision, mandateFor, type Mandate, type Request } from '../src/shared/authority';

const now = '2026-11-02T09:00:00Z';
const mandate: Mandate = {
  id: 'm-rail',
  principal: 'You',
  allowed_operations: ['rail.book', 'rail.status'],
  allowed_recipients: ['Example Rail'],
  max_amount: 150,
  expires_at: '2026-11-09T09:00:00Z',
  requires_approval: true,
  revoked: false,
};
const request: Request = {
  id: 'r-1',
  version: 1,
  operation: 'rail.book',
  recipient: 'Example Rail',
  description: 'Reserve a refundable ticket on the 10:00 Wednesday departure.',
  amount: 120,
  fields_shared: ['Departure time', 'Destination', 'Passenger details'],
};

describe('checkPermission', () => {
  test('a request that fits the mandate still waits for the person', () => {
    expect(checkPermission(request, mandate, null, now).code).toBe('NEEDS_APPROVAL');
  });
  test('an approved exact request fits the recorded limits', () => {
    expect(checkPermission(request, mandate, makeDecision(request, 'approved', now), now).allowed).toBe(true);
  });
  test('decline is not approval', () => {
    expect(checkPermission(request, mandate, makeDecision(request, 'declined', now), now).allowed).toBe(false);
  });
  test('editing amount after approval invalidates the approval', () => {
    const approval = makeDecision(request, 'approved', now);
    expect(checkPermission({ ...request, amount: 121 }, mandate, approval, now).code).toBe('APPROVAL_MISMATCH');
  });
  test('changing recipient cannot reuse permission', () => {
    const changed = { ...request, recipient: 'Another Rail Company' };
    expect(checkPermission(changed, mandate, makeDecision(changed, 'approved', now), now).code).toBe('WRONG_RECIPIENT');
  });
  test('out-of-scope operation is refused', () => {
    const changed = { ...request, operation: 'rail.refund' };
    expect(checkPermission(changed, mandate, makeDecision(changed, 'approved', now), now).code).toBe('OUT_OF_SCOPE');
  });
  test('amount over limit is refused', () => {
    const changed = { ...request, amount: 151 };
    expect(checkPermission(changed, mandate, makeDecision(changed, 'approved', now), now).code).toBe('OVER_LIMIT');
  });
  test('expired mandate is refused', () => {
    const expired = { ...mandate, expires_at: '2026-11-01T00:00:00Z' };
    expect(checkPermission(request, expired, makeDecision(request, 'approved', now), now).code).toBe('EXPIRED');
  });
  test('revoked mandate is refused', () => {
    expect(checkPermission(request, { ...mandate, revoked: true }, makeDecision(request, 'approved', now), now).code).toBe('REVOKED');
  });
  test('malformed amount is refused', () => {
    expect(checkPermission({ ...request, amount: NaN }, mandate, null, now).code).toBe('INVALID_REQUEST');
  });
  test('no mandate for the recipient is refused', () => {
    expect(checkPermission(request, null, null, now).code).toBe('NO_MANDATE');
  });
  test('a no-approval lookup can be authorized within scope', () => {
    const lookup = { ...request, operation: 'rail.status', amount: 0 };
    const terms = { ...mandate, requires_approval: false };
    expect(checkPermission(lookup, terms, null, now).allowed).toBe(true);
  });
});

describe('mandateFor', () => {
  test('finds the newest mandate that names the recipient', () => {
    const narrower = { ...mandate, id: 'm-rail-2', max_amount: 130 };
    expect(mandateFor(request, [mandate, narrower])?.id).toBe('m-rail-2');
  });
  test('returns null when nothing covers the recipient', () => {
    expect(mandateFor({ ...request, recipient: 'Example City 311' }, [mandate])).toBeNull();
  });
});
