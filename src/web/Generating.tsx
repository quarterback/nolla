import { SCHEDULE } from '../shared/desk';
import { fmt, tkn, type Call } from './store';
import { MachineLine } from './Classification';

interface Props {
  call: Call;
  label: string;
  fixed: number;
  sentences: string[];
  words: number;
  balance: number;
}

/** Generating: the answer written sentence by sentence, the meter running. */
export function Generating({ call, label, fixed, sentences, words, balance }: Props) {
  const meter = fixed + words;
  const [first, ...rest] = sentences;
  return (
    <section className="generating">
      <h1 className="headline">{call.text}</h1>
      <MachineLine call={call} extra={`${label} · quoted ${tkn(call.quote?.total ?? 0)}`} />
      <div className="writing">
        <p className="short">
          {first ?? ''}
          {sentences.length <= 1 && <span className="cursor" aria-hidden="true" />}
        </p>
        {rest.map((s, i) => (
          <p key={i}>
            {s}
            {i === rest.length - 1 && <span className="cursor small" aria-hidden="true" />}
          </p>
        ))}
      </div>
      <div className="meter">
        <span>{words ? `writing · ${fmt(words)} words` : `sorted · ${tkn(SCHEDULE.sort)}`}</span>
        <span className="meter-n num">{tkn(meter)}</span>
      </div>
      <p className="machine">balance {tkn(balance - Math.max(0, meter - SCHEDULE.sort))}</p>
    </section>
  );
}
