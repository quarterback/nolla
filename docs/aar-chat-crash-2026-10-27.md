# Agent Action Record: The blank page after Send on the chat

**Review date:** 2026-10-27
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Find and fix the blank teal page that appeared on `/chat` after pressing Send
**Accountable human (name or role):** Ron Bronson, repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** a screenshot of `0000th.ai/chat` as a plain teal page, with "submit answer and get this".
**Scope:** the chat page and any page that shares its code.
**Success defined in advance as:** the failure reproduced, the cause named, a fix verified in a browser against a model that streams the way the live one does.
**Authority granted to the agent:** the owner's instruction.
**Out of scope:** the content of the model's answers.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Ran a fake model server that streams like Qwen: a role chunk, reasoning, content, a finish chunk, token counts, and the done marker. Pointed a local Worker at it.
2. Reproduced the crash in a browser: "l is not a function", then the whole page unmounted. An unminified build named it: "destroy_ is not a function", an effect that returned a value that is not a cleanup function.
3. Found two such effects. The scroll effect on the chat returned the result of `scrollIntoView`. The save effect in the app returned the result of `save`. Both now return nothing.
4. Reran the chat and the desk against the fake model. Both complete with no page errors; the chat shows reasoning, the reply and "31 ms to first token · 14 tokens".
5. Added an error boundary that shows the error message when a page throws, so a crash no longer leaves a blank page.

**What it produced or changed:** the commit on `claude/tender-mccarthy-w59ret`.
**Where actual behavior differed from the instruction:** none known.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** none beyond reporting the failure.
**Decisions the agent made alone, for owner review:** the error boundary is a new element. It shows the message in the same line style as other failures and nothing else.
**Points where it should have escalated and didn't:** the effect pattern went in with the chat page without a browser run against a streaming model. My earlier walk of the chat used scripted mode, which has no chat.

## 4. Deviation: the gaps
- The live model was not called from here. The fake server models its stream format from the OpenAI chat protocol; the live endpoint may differ.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** checks pass: build, 53 tests, prosekeep, the copy checker. The chat and the desk run clean against the streaming fake.
**Risk:** a crash in a browser extension or an unusual stream could still throw; the page now says why.
**Downstream affected parties:** the owner.
**Expected failure if this run happened 100 times:** a stream shape the fake does not cover would still break the chat.

## 6. Change: what happens next
1. The owner sends a message on the live chat and reports what the timing line and the reply show.
**Keep doing:** run every new page against a fake of the live service before shipping.
**Should not be delegated to an agent at all:** reading the live model's answers.
**Signal that the change worked:** a message on `/chat` returns text and a timing line.
