import { useEffect, useState } from 'react';
import { SCHEDULE, counterRefund, managerDecision, price, type Claim, type CostToYou, type CounterReason, type Want } from '../shared/desk';
import type { Parts } from '../shared/desk-schemas';
import { api } from './api';
import { load, save, tkn, type Call, type Store } from './store';
import { sentencesSoFar, wordCount } from './stream';
import { CallForm } from './CallForm';
import { Generating } from './Generating';
import { AnswerPage } from './AnswerPage';
import { Counter, Manager } from './Refunds';
import { Register } from './Register';
import { Front } from './Front';
import { TOUR, TOUR_BALANCE, tourGenerating, tourState, type TourState } from './tour';

type View =
  | { name: 'front' }
  | { name: 'call' }
  | { name: 'generating'; id: string }
  | { name: 'answer'; id: string }
  | { name: 'counter'; id: string }
  | { name: 'manager'; id: string }
  | { name: 'register' }
  | { name: 'tour'; state: TourState };

export function App() {
  const [store, setStore] = useState<Store>(() => load());
  const [view, setView] = useState<View>({ name: 'front' });
  const [tour, setTour] = useState<Call | null>(null);
  const [model, setModel] = useState<string>('checking');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [live, setLive] = useState<{ label: string; fixed: number; sentences: string[]; words: number }>({ label: '', fixed: 0, sentences: [], words: 0 });

  useEffect(() => save(store), [store]);
  useEffect(() => {
    if (store.theme) document.documentElement.setAttribute('data-theme', store.theme);
    else document.documentElement.removeAttribute('data-theme');
  }, [store.theme]);
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

  /** Ask: sort the call, then run the chosen option as a stream. */
  const ask = async (text: string, parts: Parts, label: string) => {
    setBusy(true);
    setProblem(null);
    let call: Call | null = null;
    try {
      const { sort } = await api.sort(text, 0);
      const quote = price(parts, 0);
      call = { id: crypto.randomUUID(), n: store.calls.length + 1, text, at: new Date().toISOString(), sort, parts, quote, refunds: [], flagged: false, redo: false };
      const fixed = quote.total - parts.words * SCHEDULE.word;
      setStore((s) => ({ ...s, balance: s.balance - SCHEDULE.sort, calls: [...s.calls, call!] }));
      setLive({ label, fixed, sentences: [], words: 0 });
      setView({ name: 'generating', id: call.id });
      const { answer, words, charged } = await api.answerStream(text, sort, parts, 0, (raw) => {
        const sentences = sentencesSoFar(raw);
        setLive({ label, fixed, sentences, words: wordCount(sentences.join(' ')) });
      });
      const capped = charged.total > quote.total ? quote : charged;
      update(call.id, { charged: capped, answer, words }, { balance: store.balance - capped.total });
      setView({ name: 'answer', id: call.id });
    } catch (e) {
      setProblem((e as Error).message);
      setView({ name: 'call' });
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
    const theme = store.theme;
    localStorage.removeItem('nolla:desk');
    setStore({ ...load(), theme });
    setView({ name: 'call' });
  };

  const c = 'id' in view ? current(view.id) : undefined;
  const openTour = (state: TourState) => {
    setTour(tourState(state));
    setView({ name: 'tour', state });
  };
  const tourTitle = view.name === 'tour' ? TOUR.find((t) => t.key === view.state)?.name : '';

  return (
    <div className="page">
      <header className="top">
        <button className="name" onClick={() => setView({ name: 'front' })}>
          nolla
        </button>
        <button className="balance" onClick={() => setView({ name: 'register' })}>
          {view.name === 'tour' ? tkn(TOUR_BALANCE) : tkn(store.balance)}
        </button>
      </header>
      <main>
        {view.name === 'front' && <Front onStart={() => setView({ name: 'call' })} onTour={openTour} />}
        {view.name === 'tour' && tour && (
          <>
            <div className="tourbar">
              <span>tour · {tourTitle}</span>
              <button onClick={() => setView({ name: 'front' })}>Back to the tour</button>
            </div>
            <TourScreen state={view.state} call={tour} setCall={setTour} />
          </>
        )}
        {view.name === 'call' && <CallForm busy={busy} problem={problem} onAsk={ask} />}
        {view.name === 'generating' && c && <Generating call={c} label={live.label} fixed={live.fixed} sentences={live.sentences} words={live.words} balance={store.balance} />}
        {view.name === 'answer' && c && (
          <AnswerPage call={c} balance={store.balance} busy={busy} onPick={(pick) => update(c.id, { pick })} onRefund={() => setView({ name: 'counter', id: c.id })} onRedo={() => redo(c)} onNew={() => setView({ name: 'call' })} />
        )}
        {view.name === 'counter' && c && <Counter call={c} store={store} onPick={(r) => counter(c, r)} onManager={() => setView({ name: 'manager', id: c.id })} onBack={() => setView({ name: 'answer', id: c.id })} />}
        {view.name === 'manager' && c && <Manager call={c} busy={busy} problem={problem} onDecide={(cl, co, w) => manager(c, cl, co, w)} onRedo={() => redo(c)} onBack={() => setView({ name: 'answer', id: c.id })} />}
        {view.name === 'register' && (
          <Register store={store} model={model} onOpen={(id) => setView({ name: 'answer', id })} onReset={resetAll} onTheme={(theme) => setStore((s) => ({ ...s, theme }))} />
        )}
      </main>
    </div>
  );
}

/** One state of the tour, with the balance held at the tour's figure. */
function TourScreen({ state, call, setCall }: { state: TourState; call: Call; setCall: (c: Call) => void }) {
  const noop = () => undefined;
  const balance = TOUR_BALANCE - (call.charged?.total ?? 0) + call.refunds.reduce((n, r) => n + r.amount, 0);
  if (state === 'ask') return <CallForm busy={false} problem={null} onAsk={noop} preset={call.text} />;
  if (state === 'generating') {
    const g = tourGenerating();
    return <Generating call={call} label={g.label} fixed={g.fixed} sentences={g.sentences} words={g.words} balance={TOUR_BALANCE} />;
  }
  if (state === 'counter') {
    const store = { week: '', balance, counterWeek: 60, calls: [call] };
    return <Counter call={call} store={store} onPick={(reason) => counterRefund(reason, call.charged!, 0, 0)} onManager={noop} onBack={noop} />;
  }
  if (state === 'manager' || state === 'approved' || state === 'partly' || state === 'denied') {
    return <Manager call={call} busy={false} onDecide={noop} onRedo={noop} onBack={noop} />;
  }
  return <AnswerPage call={call} balance={balance} busy={false} onPick={(pick) => setCall({ ...call, pick })} onRefund={noop} onRedo={noop} onNew={noop} />;
}
