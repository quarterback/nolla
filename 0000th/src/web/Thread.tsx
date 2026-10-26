import type { State } from '../shared/turn';
import type { ScenarioInfo } from './api';
import { ProposalCard } from './ProposalCard';

interface Props {
  state: State;
  info: ScenarioInfo;
  live: string | null;
  busy: boolean;
  onStart: () => void;
  onApprove: (request_id: string, limits?: { max_amount: number; hours: number }) => void;
  onDecline: (request_id: string) => void;
  onDispute: (request_id: string) => void;
}

export function Thread({ state, info, live, busy, onStart, onApprove, onDecline, onDispute }: Props) {
  return (
    <div className="thread">
      {state.messages.length === 0 && (
        <div className="opening">
          <p className="opening-text">{info.opening}</p>
          <button className="primary" onClick={onStart} disabled={busy}>
            Start
          </button>
        </div>
      )}
      {state.messages.map((m, i) => {
        if (m.role === 'system') {
          return (
            <div key={i} className="note">
              {m.text}
            </div>
          );
        }
        if (m.role === 'person') {
          return (
            <div key={i} className="msg person">
              <div className="who">You</div>
              <div className="text">{m.text}</div>
            </div>
          );
        }
        const request = m.request_id ? state.requests.find((r) => r.id === m.request_id) : undefined;
        return (
          <div key={i} className="msg agent">
            <div className="who">{info.agent}</div>
            <div className="text">{m.text}</div>
            {request && <ProposalCard state={state} request={request} busy={busy} onApprove={onApprove} onDecline={onDecline} onDispute={onDispute} />}
          </div>
        );
      })}
      {live !== null && (
        <div className="msg agent live">
          <div className="who">{info.agent}</div>
          <div className="text">
            {live}
            <span className="cursor" />
          </div>
        </div>
      )}
    </div>
  );
}
