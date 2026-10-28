# Agent Action Record: Redesign of the plain chat at /chat

**Review date:** 2026-10-28
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session), branch `claude/chat-design`
**Task or period under review:** Bring the `/chat` page up to the design of the desk
**Accountable human (name or role):** Ron Bronson, repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "the /chat version looks kind of terrible because it wasn't designed to be used versus the demo and i'd want that to look better than it does now even if i only use it sparingly"
**Scope:** `src/web/Chat.tsx` and the chat rules in `src/web/styles.css`. The request, streaming, and the worker route stay as they are.
**Success defined in advance as:** the chat reads as part of the same product as the desk in both colorways, at desktop and phone width, with the checks passing.

## 2. Action: what actually happened
1. Set each question in the display face at 24px with a 3px ink rule above it, the way the desk sets a call. The uppercase "you" and model labels are gone; the type tells the two sides apart.
2. Split replies into paragraphs in the body face at 17px.
3. Folded the model's reasoning into a closed disclosure in mono, labeled `reasoning · N words`. It opens on its own while the model is still reasoning and has written no reply yet.
4. Replaced the stats string with a meter row under each reply: `writing · N words` while it streams, then `first token N ms` on the left and tokens, seconds, and tokens per second on the right. Tokens per second is left out when the reply streamed in under a quarter second, which removes the "14000.0 tokens/s" reading.
5. Rebuilt the composer. Before the first message it is the desk's question field, in the display face between two 3px rules, with a full width Send button. After that it is a bar pinned to the bottom: a one line field that grows to six lines, with Send beside it. Disabled Send is an ink outline instead of a faded fill. Focus thickens the rules to 6px in place of a ring that doubled against them.
6. Moved the model name to the top row and hid it until the endpoint names the model. Clear shows once there is something to clear.
7. Rendered every state against a local server that streams the same events as the worker, in light and dark, at 1280px and 390px. Updated `docs/screens/`.
8. Ran `npm run check` (typecheck, build, 53 tests) and `npm run check:docs` (prosekeep, closedtab, 164 interface strings with no banned frames).

## 3. Judgment: human in the loop
**Decisions made without the owner:**
- Reused the desk's placeholder, "The question, as you would say it", in the composer.
- Added three short interface strings: `reasoning`, `first token`, and `tokens/s`. They follow the `writing · N words` pattern already on the desk.
- The layout follows the desk's flow boards. The canvas has no board for `/chat`, so these screenshots are the proposal.

## 4. Deviation: the gaps
None from the request. The chat still has no price, balance, or sort, as its comment states.

## 5. Consequence: what it cost or risked
No change to the request or the worker, so a break here is visual. The risk is the three new strings and the placeholder, which need the owner's approval under EDITORIAL.md.

## Second pass: no eyebrows, no repeats
**Instruction given (actual wording):** "i don't like any eyebrow text ever, nor repetitive descriptions"
**What changed:**
- `/chat`: removed the model name line above the conversation and the reasoning label above each reply. The meter now appears once, under the latest reply, and its left side is a `reasoning` switch that shows the model's reasoning below it. Older replies show the question and the answer alone. Clear moved into the composer beside Send.
- Ask screen: "The call" label above the question field is now read by screen readers only. The field grows with the question in place of cutting it off at three lines, and focus thickens its rules in place of drawing a second frame around them.
- Tour: removed the "tour · Ask" line above each tour screen; "Back to the tour" stays.
- Counter: removed "used this week 120 of 1,000" from the line under the heading, the weekly meter the owner rejected on the boards.
- Manager decision: removed "counter limit 300 tkn", which repeated the counter screen, and the paragraph that restated the checks and the refund line. The model's own note shows when there is a refund. Removed "the receipt stays with the call" under the buttons.

**Decided by the owner:** the decision receipt's Found line repeated the checks list above it. Ron asked for it cut, so it is gone from the receipt, from the four manager boards on the design canvas, and from the screens on ronbronson.dev. The Register still lists counter refunds for the week.

## 6. Change: what happens next
- Ron reviews the screenshots, the new strings, and the receipt question before merge.
- If `/chat` is going to stay, add a board for it to the design canvas so the next build works from a spec.
- Keep rendering against a streaming mock before calling chat work done; the earlier blank page bug only showed with a real stream.
