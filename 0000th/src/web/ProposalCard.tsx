import { useState } from 'react';
import type { State, RequestWithChoice } from '../shared/turn';
import { mandateFor } from '../shared/authority';
import { readOutcome, type Event } from '../shared/records';

interface Props {
  state: State;
  request: RequestWithChoice;
  busy: boolean;
  onApprove: (request_id: string, limits?: { max_amount: number; hours: number }) => void;
  onDecline: (request_id: string) => void;
  onDispute: (request_id: string) => void;
}

export function ProposalCard({ state, request, busy, onApprove, onDecline, onDispute }: Props) {
  const [limits, setLimits] = useState(false);
  const [maxAmount, setMaxAmount] = useState(String(request.amount));
  const [hours, setHours] = useState('24');
  const decision = state.decisions.find((d) => d.request_id === request.id);
  const events = state.events.filter((e) => e.request_id === request.id) as Event[];
  const outcome = readOutcome(events);
  const refused = events.find((e) => e.type === 'client.refused');
  const mandate = mandateFor(request, state.mandates);
  const covered = !!mandate && !mandate.revoked;
  const withdrawn = !!mandate && mandate.revoked;
  const money = request.amount > 0;

  return (
    <div className={`card ${outcome.key}`}>
      <div className="card-head">
        <span className="op">{request.operation}</span>
        <span className="to">{request.recipient}</span>
        <span className="amt">{money ? `$${request.amount}` : 'no charge'}</span>
      </div>
      <div className="card-body">
        <div className="row">
          <span className="k">Action</span>
          <span className="v">{request.description}</span>
        </div>
        <div className="row">
          <span className="k">Leaves your account</span>
          <span className="v">{request.fields_shared.join(', ')}</span>
        </div>
        <div className="row">
          <span className="k">Chosen</span>
          <span className="v">{request.choice.selected}</span>
        </div>
        <div className="row">
          <span className="k">Also considered</span>
          <span className="v">
            {request.choice.considered
              .filter((c) => c !== request.choice.selected)
              .map((c) => (
                <span key={c} className="alt">
                  {c}
                </span>
              ))}
          </span>
        </div>
        <div className="row">
          <span className="k">Basis</span>
          <span className="v">{request.choice.basis}</span>
        </div>
        <div className="row small">
          <span className="k">Source</span>
          <span className="v">
            {request.choice.source}. {request.choice.commercial_influence}.
          </span>
        </div>
        <div className="row">
          <span className="k">Permission</span>
          <span className="v">
            {mandate && covered && (
              <span className="mandate-ref">
                {mandate.id}: up to ${mandate.max_amount}, until {short(mandate.expires_at)}
              </span>
            )}
            {mandate && withdrawn && <span className="none">Withdrawn: {mandate.id}</span>}
            {!mandate && <span className="none">None for {request.recipient}</span>}
          </span>
        </div>
      </div>

      {!decision && (
        <div className="card-actions">
          {!limits ? (
            <>
              <button className="primary" disabled={busy} onClick={() => onApprove(request.id, mandate ? undefined : { max_amount: request.amount, hours: 1 })}>
                {mandate ? 'Allow once' : 'Grant and allow once'}
              </button>
              <button disabled={busy} onClick={() => setLimits(true)}>
                Allow with limits
              </button>
              <button className="quiet" disabled={busy} onClick={() => onDecline(request.id)}>
                Decline
              </button>
            </>
          ) : (
            <form
              className="limits"
              onSubmit={(e) => {
                e.preventDefault();
                onApprove(request.id, { max_amount: Number(maxAmount), hours: Number(hours) });
              }}
            >
              <label>
                Up to $<input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
              </label>
              <label>
                For <input type="number" min="1" max="720" value={hours} onChange={(e) => setHours(e.target.value)} /> hours
              </label>
              <button className="primary" type="submit" disabled={busy}>
                Allow
              </button>
              <button type="button" className="quiet" onClick={() => setLimits(false)}>
                Back
              </button>
            </form>
          )}
        </div>
      )}

      {decision && (
        <div className={`card-outcome ${outcome.key}`}>
          <span className="code">{refused ? refused.note : decision.status === 'declined' ? 'DECLINED' : codeFor(outcome.key)}</span>
          <span className="label">{outcome.label}</span>
          {(outcome.key === 'completed' || outcome.key === 'acknowledged') && (
            <button className="quiet" disabled={busy} onClick={() => onDispute(request.id)}>
              Dispute
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function codeFor(key: string) {
  return { completed: 'Completed, simulated', acknowledged: 'ACKNOWLEDGED', attempted: 'ATTEMPTED', disputed: 'DISPUTED', approved: 'APPROVED' }[key] ?? key.toUpperCase();
}

export function short(iso: string) {
  const d = new Date(iso);
  return `${d.toISOString().slice(5, 10)} ${d.toISOString().slice(11, 16)}`;
}
