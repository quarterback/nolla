import { TOUR, type TourState } from './tour';

/** The front page: what the desk is, and a tour of every state. */
export function Front({ onStart, onTour }: { onStart: () => void; onTour: (key: TourState) => void }) {
  return (
    <section className="front">
      <h1 className="display">A reference desk with a price list.</h1>
      <button className="primary wide" onClick={onStart}>
        Start a call
      </button>
      <details className="tour-menu">
        <summary>The tour</summary>
        <ul className="tour">
          {TOUR.map((t) => (
            <li key={t.key}>
              <button onClick={() => onTour(t.key)}>
                <span className="t-name">{t.name}</span>
                <span className="t-what">{t.what}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
