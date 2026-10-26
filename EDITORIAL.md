# Editorial policy for nolla

Ron Bronson owns this policy. His latest explicit instructions take precedence over any editorial suggestion, including suggestions from prosekeep or another agent.

## Purpose and audience

- Publisher or author: Ron Bronson.
- Primary readers: people asking everyday questions they would otherwise put to a search engine or a chatbot.
- What 0000th should help people do: get a straight answer when the desk can give one, and reach the right real person or place when it cannot.
- Source of approved product facts: `docs/SPEC.md` and the `0000th` skill.

## Voice and register

- Plain, direct and confident. The desk states facts and stops.
- Follow the U.S. Federal Plain Language Guidelines: most useful information first, familiar words, active voice, short sentences, clear paragraphs. Keep needed technical terms and explain unfamiliar ones.
- The interface speaks as the desk, never as "I."
- Use the 0000th terms where the skill defines them: call, desk, route, slip, price, counter, manager. Use plain words everywhere else. Invent no other terms.

## Language we avoid

- Dashes of any kind in prose: em dashes, en dashes, and hyphens used as punctuation. Rewrite the sentence.
- Eyebrow or kicker labels above titles.
- Negation led sentences and contrastive frames ("X, not Y") in public copy.
- Praise, reassurance, emotional claims and closing offers.
- Trailing summary sentences that restate the point.
- Stock AI vocabulary, staged introductions, forced lists of three, vague claims and generic section headings. The standard for writing that does not read as AI is github.com/blader/humanizer.
- Marketing language, inflated claims and filler.
- Arcane or overwrought phrasing.
- Setup and reveal: a sentence that sets up an expectation so the next one can turn it.
- Contrast pairs: "X is A. Y is not." Write one rule the reader can apply.
- Restrictive tags: "only when," "only what," "just." State the rule directly.
- Lists of three by habit. List what the reader needs, however many that is.
- Sentences that explain the desk's reasoning or reassure the reader. State the fact and stop.
- Text from the design canvas or any assistant reply, until Ron approves it.

## Writing mechanics

- Sentence case for headings, labels and buttons.
- Numbers as numerals. Token amounts as "540 tkn" in the interface.
- Cite people by full name. Use primary sources with verified publication details.
- Link text says where the link goes.

## Factual fidelity and decisions

- Never invent a source, a phone number, hours or an address.
- Name a real public desk only when a source confirms it exists and does what is claimed.
- Decisions an agent may not revise: the price schedule, the refund limits, the allowance, the voice rules in the `0000th` skill, and the look Ron approves.
- Ron writes his own site copy, bios and blog posts. Agents do not draft them. When Ron asks for edits to his drafts, keep his wording and sentences exactly as written and change only what he asked.

## Publishing checks

- `npm run check:docs`, which runs prosekeep on the docs and `scripts/check-copy.mjs` on every interface string.
- `npx prosekeep review` on the extracted strings, worked through by hand, before any pull request that changes copy.
- `npx prosekeep@0.3.0 compare` on any revision of Ron's writing.
- Ron signs off on all public copy.
