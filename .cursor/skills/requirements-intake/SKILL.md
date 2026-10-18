---
name: requirements-intake
description: Turn a feature request into structured requirements by presenting the fixed 7-item intake (Title, Screenshot, Features/Sub-features, Actors, Rules, Data elements, Architecture/folder structure), each pre-filled with inferences and answered by numbered options. Handles screenshots pasted in chat or saved in the repo. Use at the start of any Medium/High-risk feature or significant modification, before planning.
---
# Requirements intake

## Purpose
Turn a request into an approved `REQUIREMENTS.md` in one or two short rounds. Every intake covers
the same 7 items, so results are consistent across developers.

## Trigger
Full lane (AGENTS.md §4): a new feature, a significant modification, or a bug whose fix changes
behaviour.

## Inputs
- The prompt.
- Any images attached to the chat.
- Any `@`-mentioned files.
- `.agent/memory/INDEX.md`.
- A quick repo scan (manifests, folders, similarly named modules). Deep analysis is
  `codebase-audit`'s job.

## Process
1. **Infer first.** Draft all 7 items from the inputs. Tag every value `EXPLICIT`,
   `INFERRED (<source>)` or `UNKNOWN`. Never invent business rules: a rule nobody stated is
   UNKNOWN.
2. **Present the intake** in **one** message, using `.agent/templates/INTAKE.md` exactly. The
   items are always in this order:
   1. **Title**: inferred from the prompt. Ask the developer to keep it or rename it.
   2. **Screenshot / reference**: see the screenshot handling below.
   3. **Features / sub-features**: a proposed numbered list (F1, F1.1…). Options: accept, add,
      remove.
   4. **Actors**: options are Admin, Manager, Employee, System, External service and Other,
      multi-select. Pre-select the inferred ones.
   5. **Rules (business rules)**: the proposed rules, each tagged. UNKNOWN rules that change
      behaviour are asked as options.
   6. **Data elements**: a proposed field table (name, type, required, source). Options: accept,
      add, remove.
   7. **Architecture / folder structure**: the detected structure plus where the new files go.
      In a **greenfield** repo (no app code), offer stack and layout options from
      `architecture-review/references/default-layouts.md`.
   After the 7 items, ask at most 3 extra high-impact questions (integrations, acceptance
   criteria) when they are material.
3. **Screenshot handling**:
   - **An image is attached in the chat**: say `Using the screenshot you attached` and describe
     it in one line. Then transcribe it into the `Reference` section of `REQUIREMENTS.md`:
     layout regions, components, visible fields and labels, actions, states.
     Later chats and subagents cannot see chat images, so this transcription is the durable
     record.
   - **A file is `@`-mentioned or sits in the repo**: read it. During build, copy it to
     `.sdd/work/<id>/refs/` and link it from `REQUIREMENTS.md`.
   - **Neither, and the feature has UI**: ask item 2 with these options:
     `1) I'll paste/drag it into this chat  2) I saved it — I'll @-mention the file  3) Match an existing page: ___  4) No visual reference`.
     If they choose 1 or 2 and the next message has no image or file, ask once more. Then
     continue without it and record that as a Risk.
   - **The feature has no UI** (API, DB or job): item 2 is `Not applicable (no UI)`. Don't ask
     for a screenshot.
4. **Read the reply.** Answers look like `1. ok  2. 1  3. 1  4. 1,2  5. 2: approvals need 2 managers  6. 1  7. 1`.
   Record the answers as EXPLICIT. Derive testable acceptance criteria from the features and
   rules (Given/When/Then).
5. **Write** `REQUIREMENTS.md` from the template. In Cursor Plan mode, if file writes aren't
   available, put it as the first section of the plan instead (AGENTS.md §4).
6. End with `Requirements complete.` and go on to `codebase-audit`.

## Output
`REQUIREMENTS.md`, with the 7 items, the Reference transcription, acceptance criteria and
assumptions.

## Question quality
- Every item shows **what was inferred**, so the developer confirms instead of typing from
  scratch.
- Options are numbered. Put the recommended option first and mark it `(recommended)`.
  Multi-select is allowed where it fits (`1,3`).
- Never ask about implementation details the agent can decide (component names, file names).
  Item 7 asks only *where* things go and whether the developer agrees with the structure.

## Guardrails
- The same 7 items every time, even if some are pre-answered. Show them as `✓ inferred` lines.
- At most 2 rounds. After that, proceed with recorded assumptions and list them as Risks.
- Never store secrets or personal data from screenshots. Redact them in the transcription.

## Stop conditions
- The request is actually an investigation or a bug. Re-route as AGENTS.md §2 says.
- The request conflicts with a recorded decision in `.agent/memory/decisions/`. Show the conflict
  and ask.
