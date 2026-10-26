# Agent Action Record: Fidelity to the flow boards

**Review date:** 2026-10-26
**Reviewed by:** Ron Bronson, after he looks at it
**Agent / system:** Claude (cloud session)
**Task or period under review:** Apply section 0 of `docs/GUIDELINES.md`, the fidelity rules from pull request 13
**Accountable human (name or role):** Ron Bronson, repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** the link to pull request 13, "Bind the agent to the boards: a fidelity section".
**Scope:** remove the additions the section names: the exchange rate in the header, the formula subline under every option, the charge footnote under the ask button, the sample calls section, the standing status banner. Options as four compact rows. No dollars anywhere in the interface.
**Success defined in advance as:** the ask screen matches the "Blue: quote" and chartreuse ask boards row for row; checks pass.
**Authority granted to the agent:** the guidelines. New elements go to the owner first.
**Out of scope:** the model deploy, which failed on a malformed Modal token id and waits on the owner.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Merged pull request 13 and main into the working branch.
2. Header: the balance alone, `5,000 tkn`.
3. Ask screen: the call field, four rows of name and price at 44 px, the ask button with the price. Removed the formula sublines, the charge footnote, the model status hint, the sample calls section and the tokenized pieces, which the ask board also lacks.
4. The failure line `The desk did not answer.` now renders under the action that failed, on the ask screen and the manager screen. The banner at the top of the page is gone.
5. Register: the balance line no longer shows dollars.
6. Build, 44 tests, prosekeep and the copy checker pass: 158 strings, 0 banned frames. Screenshots retaken in light and dark.

**What it produced or changed:** one commit on `claude/tender-mccarthy-w59ret`.
**Where actual behavior differed from the instruction:** none known.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** the fidelity rules.
**Decisions the agent made alone, for owner review:**
- The tokenized pieces came out too. The section lists five additions and the pieces are not among them, but its first rule covers any element the boards lack, and the chartreuse ask board has none.
- The sort path stays on the generating and answered screens, as section 3 of the implementation notes says.
- The front page and tour stay, as section 6 of the implementation notes says.

**Points where it should have escalated and didn't:** none known.

## 4. Deviation: the gaps
- The model is still not connected. The "Deploy model" run failed at the first step with "Token ID is malformed": the `MODAL_TOKEN_ID` secret does not hold a Modal token id of the form `ak-...`.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** checks pass; the ask screen is the call, four rows and a button.
**Risk:** without the sample calls, a visitor has to type. The tour on the front page still shows every state.
**Downstream affected parties:** none until deployed.
**Expected failure if this run happened 100 times:** some runs would keep an element the boards lack because it was useful; the fidelity rule says to raise it instead.

## 6. Change: what happens next
1. The owner fixes the two Modal secrets and reruns "Deploy model".
2. Then the conversation mode, if the owner wants it: a thread, priced per turn, with the desk's sections on request.
**Keep doing:** compare each screen to its board before opening the pull request.
**Should not be delegated to an agent at all:** adding anything to a screen.
**Signal that the change worked:** the ask screen and the board are the same rows.
