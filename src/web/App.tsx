import { useEffect, useState } from 'react';
import { SCHEDULE, counterRefund, managerDecision, options, price, type CounterReason, type Want } from '../shared/desk';
import { api, type Quote } from './api';
import { callNumber, fmt, load, save, type Call, type Store } from './store';
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
  const sort = async (text: string): Promise<{ call: Call; quotes: Quote[] } | null> => {
    setBusy(true);
    setProblem(null);
    try {
      const earlier = store.calls.filter((c) => c.answer).length;
      const { sort, quotes } = await api.sort(text, 0);
      const call: Call = { id: crypto.randomUUID(), n: store.calls.length + 1, text, at: new Date().toISOString(), sort, refunds: [], flagged: false, redo: false };
      setStore((s) => ({ ...s, balance: s.balance - SCHEDULE.sort, calls: [...s.calls, call] }));
      void earlier;
      return { call, quotes };
    } catch (e) {
      setProblem((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  /** Step 2: run the option. The bill replaces the estimate with real words,
   * capped at the quote, which is the posted price. */
  const run = async (call: Call, quote: Quote) => {
    setBusy(true);
    setProblem(null);
    try {
      const { answer, words, charged } = await api.answer(call.text, call.sort, quote.key, 0);
      const capped = charged.total > quote.price.total ? quote.price : charged;
      update(call.id, { option: quote.key, quote: quote.price, charged: capped, answer, words }, { balance: store.balance - (capped.total - SCHEDULE.sort) });
      setView({ name: 'answer', id: call.id });
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** A free redo runs the same option again at no charge. */
  const redo = async (call: Call) => {
    if (!call.option || !call.quote) return;
    setBusy(true);
    try {
      const { answer, words } = await api.answer(call.text, call.sort, call.option, 0);
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

  const manager = async (call: Call, claim: Receipt['claim'], cost: Receipt['cost'], want: Want) => {
    if (!call.charged || !call.quote || !call.answer || !call.option) return;
    setBusy(true);
    setProblem(null);
    try {
      const { checks } = await api.manager(call.text, call.answer, call.option, claim);
      const over = Math.max(0, call.charged.total - call.quote.total);
      const full = { ...checks, priceMatched: over === 0 };
      const decision = managerDecision(full, call.charged, over, want);
      const n = `${callNumber(call.n)}-R${call.refunds.filter((r) => r.kind === 'manager').length + 1}`;
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
  const head = c ? [c.sort.category, c.sort.place].filter(Boolean).join(' · ') : 'Reference desk';

  return (
    <div className="page">
      <header className="masthead">
        <button className="brand" onClick={() => setView({ name: 'call' })} aria-label="New call">
          NOLLA
        </button>
        <span className="section">{head}</span>
        <button className="balance" onClick={() => setView({ name: 'register' })}>
          <span className="num">{fmt(store.balance)}</span> tkn
        </button>
      </header>
      <div className="rule" />
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
      <footer className="colophon">
        <span>Prices are posted before work runs. 1,000 tkn is {'$'}0.25, a notional rate. Allowance refills Monday.</span>
        <span>Model: {model}. Every charge is simulated.</span>
      </footer>
    </div>
  );
}

export type Receipt = NonNullable<Call['receipt']>;
export { options, price };
