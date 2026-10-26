# nolla: revision brief for PR 2

Ron reviewed PR 2. Two things need to change before it merges: the look, and how copy gets checked. His instructions here override `docs/SPEC.md` and the "One look" decision in `docs/aar-desk-build-2026-10-26.md`.

## 1. The look: minimal, with the deconstruction put back

PR 2 blended four looks into one tabloid page. Ron wants the minimal direction from the design canvas, with the deconstructed pieces kept as working parts of the interface. The goal from the start of the project still holds: the desk should feel like operating a machine, and nothing on screen should read as a person talking.

### Keep

- The type sizes and the reading text as they are now: the condensed headline at its current sizes, Source Serif 4 for reading text, the same line lengths.
- The structure of each page: the call at the top word for word, the price, the answer sections in the skill's order, the counter, the manager, the register.

### Change

| PR 2 has | Change to |
| --- | --- |
| White page, red `NOLLA` masthead | The minimal palette from the canvas boards "Minimal: a call is sorted", "Minimal: your city" and "Thread, minimal": cobalt `#1f2bff` ground, white ink, pale blue `#c9ccff` for secondary text. No masthead bar. The name sits in the top left in plain type, the balance in the top right. |
| Price options in bordered boxes | A ruled list: one line per option, the formula under it, a hairline between options. The selected option is marked by weight and a filled marker, without a box. |
| IBM Plex Mono for metadata lines throughout | Mono only where the text is machine output: the price formula, the call number, the classification code, token counts. Everything else in the sans or the serif. |
| Gray panels for questions and receipts | Full width bands of white on cobalt, or rules. No cards anywhere. |

### Put the deconstruction back

Take these from the canvas boards "Deconstructed: call slip", "Deconstructed: wire form" and "Thread, deconstructed". Each one is a working part of the desk:

1. **The classification.** Every sorted call shows its classification code and path, large and set apart: `HSG 4.21` with Housing, Renting, Deposits, Deductions for wear stepping down beneath it. This is the information architecture of the desk made visible.
2. **The price as an exposed form.** The formula reads as a filled-in form grid: each line of work in its own cell with its count and charge, the way a telegraph blank listed words and charge. The person edits the cells to change the price.
3. **The tokenized input.** Under the call field, the words split into numbered pieces as the person types, with the running count. It shows the input being processed.
4. **The slip.** A routed call produces a slip set apart from the page, like the call slip board: desk name, then ASK, BRING and COST lines in mono.
5. **Stamps for outcomes.** ROUTED, REFUNDED, APPROVED, PARTLY APPROVED and DENIED appear as stamped marks on the slip, the bill or the decision receipt. Each stamp is real text, readable and accessible, and repeats what the page states in words.

Use these five where they belong. A how to answered at the desk needs the classification and the price, and nothing else from this list.

Before building, put two screens on the canvas or in `docs/screens`: the answer page and the quote, in this style. Ron approves the look before the rest is rebuilt.

## 2. Copy: the editorial tools were installed and never reached the interface

What happened:

- `.editorial.json` scans `.md`, `.html` and `.txt`. Every word a person sees in nolla lives in `.ts` and `.tsx` files, so prosekeep never read the interface. Its PASS covered the README, the spec and the record only.
- prosekeep's mechanical checks catch stock phrases and some contrast patterns. The AI writing Ron objects to is mostly rhythm and framing that only a review catches. That review never ran. The record was a self review.
- `EDITORIAL.md`, Ron's own policy, is missing from the repo. The agent worked from the generic `vloora` profile.
- Much of the scripted copy came from the design canvas, where the text was written by an AI assistant as placeholder. Canvas text is placeholder until Ron approves it.

Examples now in the interface, with the pattern each shows:

| Text | Pattern |
| --- | --- |
| "Liking the drink is the easy part. The block has to buy enough of it every day…" | setup and reveal contrast |
| "Carpet worn thin from walking is normal use. Stains, burns and pet damage are not." | contrast pair |
| "No tokens back. A free redo is yours." | contrast pair |
| "Every call is sorted, priced in the open, and sent to the people who handle it. Answers only when they belong here." | list of three, then a restrictive tag |
| "The counter refunds only specific, checkable problems." | restrictive framing |
| "Sorting and sources stay charged because that work was done." | justification aimed at the reader |
| "Usually the flapper, the chain or the water level. Each is a fifteen minute fix with no tools." | list of three, then a reassurance |
| "sends people to real desks instead of keeping them talking" (SPEC) | "instead of" contrast |

### The fix

1. Add `EDITORIAL.md` from this revision to the repo root. It is Ron's policy and overrides the profile.
2. Add `scripts/check-copy.mjs` from this revision and run it from `check:docs`. It pulls every interface string out of the `.ts` and `.tsx` files, runs prosekeep on them, and fails on the contrast and negation frames Ron bans. Add `.copy/` to `.gitignore`.
3. Run the review that the checks cannot do. For every page, run `npx prosekeep review .copy/strings.md` and work through its AI writing checklist. Use github.com/blader/humanizer as the pattern list. Rewrite each sentence that sets up a contrast, lists three things by habit, explains itself to the reader, or reassures.
4. Rewrite in Ron's direction: state what is true, in the order the person needs it. Example: "Stains, burns and pet damage count as damage. Carpet worn thin from walking counts as normal use." becomes one rule the reader can apply.
5. Mark every scripted answer and every label that came from the canvas as placeholder in `src/worker/script.ts` until Ron approves it.
6. In the record for this revision, quote three before and after pairs and name the check or review step that caught each.

`npm run check:docs` passing is the minimum. Ron signs off on copy.

## 3. Records

Write a new closedtab record for this revision, `docs/aar-minimal-revision-<date>.md`. Reviewed by: Ron, after he looks at it. Note under Deviation that PR 2 merged four looks against his direction and that the copy checks never covered the interface.
