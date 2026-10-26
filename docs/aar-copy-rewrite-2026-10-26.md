# Agent Action Record: Copy rewrite to remove contrastive frames

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Remove contrastive frames and other AI patterns from the site copy, the scripted answers, the refund wording and the model instructions
**Accountable human (name or role):** Ron Bronson, repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "the page is full of contrastive frames, it breaks my design ... there is no policy remove thta!" Then: "use my prosekeep npm package, along with an ap styl guide editorial skill and the other editorial rules on my vloora or other repos".
**Scope:** every string a person sees, the scripted answers, and the model's instructions in `prompts.ts`, which shape every live answer. The two lines in `EDITORIAL.md` that barred agents from drafting site copy come out, and so does the matching sentence in `docs/GUIDELINES.md`.
**Success defined in advance as:** prosekeep and the copy checker pass; the vloora style manual's rewrite rules applied; a compare of before and after shows only intended changes.
**Authority granted to the agent:** the owner's instruction.
**Out of scope:** the model connection.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Removed "Ron writes his own site copy ... Agents do not draft them" and "Text from the design canvas or any assistant reply, until Ron approves it" from `EDITORIAL.md`, and the ownership and placeholder sentence from `docs/GUIDELINES.md`.
2. Read all 158 interface strings and the vloora style manual (`guides/style/source.md`, `docs/house-style-review.md`) and rewrote each contrast pair, setup, justification and restrictive tag.
3. Rewrote the model instructions in positive form: state facts, one rule once, about 20 words a sentence, each sentence adds a fact.
4. Applied the manual's mechanics: serial comma, numerals from 10, spelled out one through nine, hyphenated compounds.
5. Ran the copy checker, prosekeep audit, and prosekeep compare on the extracted strings before and after.

**What it produced or changed:** the commit on `claude/tender-mccarthy-w59ret`.
**Where actual behavior differed from the instruction:** no AP Stylebook skill exists in the four repos or the installed skills, so no AP text was applied directly. The manual's own rules cover the AP-aligned mechanics (numerals, percent, dates, "p.m."). Where AP and the manual differ, as on the serial comma, the manual governs.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** removing the policy; using prosekeep and the vloora rules.
**Decisions the agent made alone, for owner review:**
- Three before and after pairs, with the step that caught each:
  1. "Your landlord can deduct only for damage you caused beyond normal use. Carpet worn thin from walking is normal use. Stains, burns and pet damage are not." became "A landlord can deduct for stains, burns, tears, and pet damage. Walking wears carpet thin, and that wear is normal use." Caught by the style manual, "State the claim without a contrast".
  2. "The answer covered the call, so the full charge stays." became "The answer covered the call." Caught by the hand review for explanation aimed at the reader.
  3. "Sorting and sources stay charged because that work was done." became a sentence that names only what is refunded. Caught by the hand review for a refunded-versus-charged pair.
- Also rewritten: "It depends on three numbers" (staged run-up), "the rent, the staff and you" (habitual three), "Some experts still advise" (the contrast word), the fallback answer that named the script, and the counter's "only specific, checkable problems".
- Compare shows three intended number changes: "7 days" is "seven days", "3 to 4" is "three to four", "fifteen" is "15".
- The vloora manual's "A person reviews appeals" and the manager's three questions keep the owner's skill wording.

**Points where it should have escalated and didn't:** none known.

## 4. Deviation: the gaps
- The model's live output has not been read. The new instructions apply when the endpoint is connected, and the copy review applies to it then.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** 158 strings, 0 banned frames, prosekeep 0 findings, build and 44 tests pass.
**Risk:** the rewritten answers are the agent's wording on the owner's topics. The owner reads them on the live page.
**Downstream affected parties:** none until deployed.
**Expected failure if this run happened 100 times:** a few runs would keep a frame the checker does not catch, such as a setup that avoids the banned words.

## 6. Change: what happens next
1. Read the live model's answers to the four sample calls and tighten the instructions where frames return.
2. Add the vloora checker's rules to `check-copy.mjs` if prosekeep misses patterns on live captures.
**Keep doing:** run prosekeep compare on every revision.
**Should not be delegated to an agent at all:** the owner's final read of the live answers.
**Signal that the change worked:** the live answers contain no contrast pair on the first read.
