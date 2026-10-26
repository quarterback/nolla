import type { State } from '../shared/turn';
import { exportRecord, type Event } from '../shared/records';
import { short } from './ProposalCard';

interface Props {
  state: State;
  agent: string;
  onWithdraw: (mandate_id: string) => void;
  onReset: () => void;
}

export function Ledger({ state, agent, onWithdraw, onReset }: Props) {
  const exportJson = () => {
    const record = exportRecord({ id: state.scenario, agent }, state.mandates, state.requests, state.decisions, state.events as Event[]);
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.scenario}-record.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="ledger">
      <div className="ledger-head">
        <h2>Authority</h2>
        <span className="clock">{short(state.now)}</span>
      </div>
      <div className="mandates">
        {state.mandates.length === 0 && <div className="empty">No permissions</div>}
        {state.mandates.map((m, i) => {
          const replacement = m.revoked ? state.mandates.slice(i + 1).find((x) => !x.revoked && x.allowed_recipients.join() === m.allowed_recipients.join()) : undefined;
          return (
          <div key={m.id} className={`mandate ${m.revoked ? 'revoked' : ''}`}>
            <div className="m-top">
              <span className="m-to">{m.allowed_recipients.join(', ')}</span>
              <span className="m-id">{m.id}</span>
            </div>
            <div className="m-terms">
              <span>{m.allowed_operations.join(', ')}</span>
              <span>up to ${m.max_amount}</span>
              <span>until {short(m.expires_at)}</span>
              <span>{m.requires_approval ? 'asks each time' : 'no ask'}</span>
            </div>
            {m.revoked ? (
              <div className="m-state">{replacement ? `Replaced by ${replacement.id}` : 'Withdrawn'}</div>
            ) : (
              <button className="quiet" onClick={() => onWithdraw(m.id)}>
                Withdraw
              </button>
            )}
          </div>
          );
        })}
      </div>

      <div className="ledger-head">
        <h2>Record</h2>
        <span className="simulated">All services simulated</span>
      </div>
      <ol className="events">
        {state.events.map((e) => (
          <li key={e.sequence} className={`event ${e.type.split('.')[0]}`}>
            <span className="seq">{e.sequence}</span>
            <span className="src">{e.source}</span>
            <span className="type">{e.type}</span>
            {e.note && <span className="note">{e.note}</span>}
            <span className="at">{short(e.at)}</span>
          </li>
        ))}
        {state.events.length === 0 && <li className="empty">Nothing yet</li>}
      </ol>
      <div className="ledger-actions">
        <button onClick={exportJson} disabled={state.events.length === 0}>
          Export record
        </button>
        <button className="quiet" onClick={onReset}>
          Reset scenario
        </button>
      </div>
    </div>
  );
}
