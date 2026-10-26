import { useEffect, useState } from 'react';
import { RATE_USD_PER_1000, SCHEDULE, counterRefund, managerDecision, type Claim, type CostToYou, type CounterReason, type Price, type Want } from '../shared/desk';
import type { Parts } from '../shared/desk-schemas';
import { api } from './api';
import { fmt, load, save, type Call, type Store } from './store';
import { CallForm } from './CallForm';
import { AnswerPage } from './AnswerPage';
import { Counter, Manager } from './Refunds';
import { Register } from './Register';

type View = { name: 'call' } | { name: 'answer'; id: string } | { name: 'counter'; id: string } | { name: 'manager'; id: string } | { name: 'register' };

export function App() {
  const [store, setStore] = useState<Store>(() => load());
  const [view, setView] = useState<View>({ name: 'call' });
  const [model, setModel] = useState<string>('checking');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => save(store), [store]);
  useEffect(() => {
    let stop = false;
    const poll = () => api.health().then((h) => !stop && setModel(h.model)).catch(() => !stop && setModel('unknown'));
    poll();
    const id = setInterval(() => model !== 'ready' && model !== 'scripted' && poll(), 15000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [model]);

  const update = (id: string, patch: Partial<Call>, more: Partial<Store> = {}) =>
    setStore((s) => ({ ...s, ...more, calls: s.calls.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const current = (id: string) => store.calls.find((c) => c.id === id);

  /** Step 1: sort. Always charged. */
  const sort = async (text: string): Promise<Call | null> => {
    setBusy(true);
    setProblem(null);
    try {
      const { sort } = await api.sort(text, 0);
      const call: Call = { id: crypto.randomUUID(), n: store.calls.length + 1, text, at: new Date().toISOString(), sort, refunds: [], flagged: false, redo: false };
      setStore((s) => ({ ...s, balance: s.balance - SCHEDULE.sort, calls: [...s.calls, call] }));
      return call;
    } catch (e) {
      setProblem((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  /** Step 2: run the form the person set. The bill uses real words, capped
   * at the posted price. */
  const run = async (call: Call, parts: Parts, quote: Price) => {
    setBusy(true);
    setProblem(null);
    try {
      const { answer, words, charged } = await api.answer(call.text, call.sort, parts, 0);
      const capped = charged.total > quote.total ? quote : charged;
      update(call.id, { parts, quote, charged: capped, answer, words }, { balance: store.balance - (capped.total - SCHEDULE.sort) });
      setView({ name: 'answer', id: call.id });
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** A free redo runs the same form again at no charge. */
  const redo = async (call: Call) => {
    if (!call.parts) return;
    setBusy(true);
    try {
      const { answer, words } = await api.answer(call.text, call.sort, call.parts, 0);
      update(call.id, { answer, words, redo: false, flagged: false, receipt: undefined, pick: undefined });
      setView({ name: 'answer', id: call.id });
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const counter = (call: Call, reason: CounterReason) => {
    if (!call.charged || !call.quote) return null;
    const over = Math.max(0, call.charged.total - call.quote.total);
    const r = counterRefund(reason, call.charged, over, store.counterWeek);
    if (!r.toManager) {
      update(call.id, { flagged: r.amount > 0 || call.flagged, refunds: [...call.refunds, { kind: 'counter', reason, amount: r.amount, lines: r.lines, why: r.why, at: new Date().toISOString() }] }, { balance: store.balance + r.amount, counterWeek: store.counterWeek + r.amount });
    }
    return r;
  };

  const manager = async (call: Call, claim: Claim, cost: CostToYou, want: Want) => {
    if (!call.charged || !call.quote || !call.answer || !call.parts) return;
    setBusy(true);
    setProblem(null);
    try {
      const { checks } = await api.manager(call.text, call.answer, call.parts, claim);
      const over = Math.max(0, call.charged.total - call.quote.total);
      const full = { ...checks, priceMatched: over === 0 };
      const decision = managerDecision(full, call.charged, over, want);
      const n = `${String(call.n).padStart(4, '0')}-R${call.refunds.filter((r) => r.kind === 'manager').length + 1}`;
      const receipt = { n, claim, cost, want, checks: full, note: checks.note, decision, at: new Date().toISOString() };
      update(call.id, { receipt, flagged: true, redo: decision.redo, refunds: decision.refund ? [...call.refunds, { kind: 'manager', reason: claim, amount: decision.refund, lines: decision.lines, why: decision.found, at: receipt.at }] : call.refunds }, { balance: store.balance + decision.refund });
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    localStorage.removeItem('nolla:desk');
    setStore(load());
    setView({ name: 'call' });
  };

  const c = 'id' in view ? current(view.id) : undefined;

  return (
    <div className="page">
      <header className="top">
        <button className="name" onClick={() => setView({ name: 'call' })}>
          nolla
        </button>
        <button className="balance" onClick={() => setView({ name: 'register' })}>
          {fmt(store.balance)} tkn · 1,000 = ${RATE_USD_PER_1000.toFixed(2)}
        </button>
      </header>
      {problem && <div className="problem">{problem}</div>}
      <main>
        {view.name === 'call' && <CallForm busy={busy} model={model} onSort={sort} onRun={run} />}
        {view.name === 'answer' && c && (
          <AnswerPage call={c} busy={busy} onPick={(pick) => update(c.id, { pick })} onRefund={() => setView({ name: 'counter', id: c.id })} onRedo={() => redo(c)} onNew={() => setView({ name: 'call' })} />
        )}
        {view.name === 'counter' && c && <Counter call={c} store={store} onPick={(r) => counter(c, r)} onManager={() => setView({ name: 'manager', id: c.id })} onBack={() => setView({ name: 'answer', id: c.id })} />}
        {view.name === 'manager' && c && <Manager call={c} busy={busy} onDecide={(cl, co, w) => manager(c, cl, co, w)} onRedo={() => redo(c)} onBack={() => setView({ name: 'answer', id: c.id })} />}
        {view.name === 'register' && <Register store={store} model={model} onOpen={(id) => setView({ name: 'answer', id })} onReset={resetAll} />}
      </main>
      <footer className="colophon">Tokens are a game currency. Every charge is simulated.</footer>
    </div>
  );
}
