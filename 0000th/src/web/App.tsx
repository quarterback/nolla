import { useCallback, useEffect, useRef, useState } from 'react';
import type { State } from '../shared/turn';
import { api, type ScenarioInfo } from './api';
import { Thread } from './Thread';
import { Ledger } from './Ledger';

const SCENARIO = 'move-my-tuesday';
const KEY = `0000th:${SCENARIO}`;

type ModelStatus = 'scripted' | 'off' | 'ready' | 'starting' | 'unknown';

export function App() {
  const [info, setInfo] = useState<ScenarioInfo | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [model, setModel] = useState<ModelStatus>('unknown');
  const [draft, setDraft] = useState('');
  const stateRef = useRef<State | null>(null);
  stateRef.current = state;

  useEffect(() => {
    api
      .scenario(SCENARIO)
      .then((s) => {
        setInfo(s);
        let saved: State | null = null;
        try {
          saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        } catch {
          saved = null;
        }
        setState(saved && saved.scenario === SCENARIO ? saved : s.state);
      })
      .catch((e: Error) => setProblem(e.message));
  }, []);

  useEffect(() => {
    let stop = false;
    const poll = () =>
      api
        .health()
        .then((h) => !stop && setModel(h.model))
        .catch(() => !stop && setModel('unknown'));
    poll();
    const id = setInterval(() => {
      if (model !== 'ready' && model !== 'scripted') poll();
    }, 15000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [model]);

  useEffect(() => {
    if (state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch {
        // Nothing to do: the session just will not survive a reload.
      }
    }
  }, [state]);

  const runTurn = useCallback(async (from: State, text: string) => {
    setBusy(true);
    setProblem(null);
    setLive('');
    try {
      const next = await api.turn(from, text, setLive);
      setState(next);
    } catch (e) {
      setProblem((e as Error).message);
      if (text.trim()) setState({ ...from, messages: [...from.messages, { role: 'person', text: text.trim() }] });
    } finally {
      setLive(null);
      setBusy(false);
    }
  }, []);

  const send = (text: string) => {
    if (!state || busy || !text.trim()) return;
    setDraft('');
    void runTurn(state, text);
  };

  const act = async (body: Omit<Parameters<typeof api.act>[0], 'state'>, thenContinue = true) => {
    if (!state || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const { state: next } = await api.act({ ...body, state });
      setState(next);
      setBusy(false);
      const last = [...next.messages].reverse().find((m) => m.role === 'agent');
      if (thenContinue && last) await runTurn(next, '');
    } catch (e) {
      setProblem((e as Error).message);
      setBusy(false);
    }
  };

  const reset = () => {
    if (!info) return;
    localStorage.removeItem(KEY);
    setState(info.state);
    setProblem(null);
  };

  if (!info || !state) {
    return <div className="boot">{problem ?? 'Loading'}</div>;
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="zero">0000th</span>
          <span className="sep">/</span>
          <span className="scenario">{info.name}</span>
        </div>
        <div className="status">
          <span className={`dot ${model}`} />
          <span className="label">{modelLabel(model)}</span>
        </div>
      </header>
      <main className="columns">
        <section className="thread-col">
          <Thread
            state={state}
            info={info}
            live={live}
            busy={busy}
            onStart={() => send(info.opening)}
            onApprove={(request_id, limits) => act({ action: 'approve', request_id, limits })}
            onDecline={(request_id) => act({ action: 'decline', request_id })}
            onDispute={(request_id) => act({ action: 'dispute', request_id }, false)}
          />
          {problem && <div className="problem">{problem}</div>}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Tell the agent" disabled={busy} />
            <button type="submit" disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
        <aside className="ledger-col">
          <Ledger
            state={state}
            agent={info.agent}
            onWithdraw={(mandate_id) => act({ action: 'withdraw', request_id: '', mandate_id }, false)}
            onReset={reset}
          />
        </aside>
      </main>
    </div>
  );
}

function modelLabel(m: ModelStatus) {
  switch (m) {
    case 'ready':
      return 'Model ready';
    case 'starting':
      return 'Model starting';
    case 'scripted':
      return 'Scripted answers';
    case 'off':
      return 'Model off';
    default:
      return 'Checking model';
  }
}
