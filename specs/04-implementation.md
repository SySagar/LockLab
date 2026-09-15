# LockLab Implementation Plan

This document is the working implementation guide for the first milestone of LockLab.

The project starts from the written specs only. We are not building the full product at once. We are shipping one feature at a time, starting with the smallest end-to-end proof of the architecture.

Important implementation policy:
- AI may assist with ideas, command suggestions, boilerplate, and inline completions.
- Human developers remain the final decision-makers for architecture, code, and merge readiness.
- AI should not directly write the implementation itself for core app logic, protocol changes, or Postgres/session behavior without explicit human approval.
- Editor autocompletion and tab completion are allowed as speed tools only; the human must review and accept anything that changes behavior.
- The human decides what to copy, edit, keep, or discard.

Test-driven development policy:
- Every phase must begin with a failing test, smoke check, or minimal reproducible validation.
- The test must cover the behavior we are trying to add before implementation code is written.
- The implementation is only considered valid when the test passes.
- No feature is considered complete without the relevant verification step.
- Tests are the source of truth for correctness; implementation without a proving check is not complete.

Standard operating procedure for every phase:
1. AI proposes the next phase in small, numbered steps.
2. Each step includes the exact command(s) to run.
3. The human reviews and approves the step before any file is created or edited.
4. After approval, the human executes the commands.
5. The human validates the result with the smallest relevant check.
6. Only after verification do we move to the next step.
7. Every new behavior must have a failing test before implementation and a passing test after implementation.

Output style rule for implementation guidance:
- AI must keep implementation guidance at the phase and command level.
- AI must not dump large implementation code blocks in chat when the user is expected to copy and paste commands manually.
- The human is the final implementer; the chat output should give the next exact step(s) to run, not a full code walkthrough.
- If a phase needs more detail, it should be a short checklist and explicit commands, not verbose code reproduction.

This doc is intentionally written as a command-by-command checklist so the same pattern can be reused across phases without repeating the approval process.

---

## 1. Product direction and rule

LockLab is a local PostgreSQL lock playground built around real PostgreSQL behavior, not simulation.

Core implementation rule:
- Browser never talks to PostgreSQL directly.
- Bridge only relays protocol messages.
- Connector is the only component that creates `psql` processes and interacts with the local PostgreSQL instance.
- The first milestone is a working browser terminal session flowing from Browser -> Bridge -> Connector -> `psql` -> PostgreSQL.

---

## 2. Human-in-the-loop implementation rules

The following rules apply to every phase in this plan:

1. Human ownership
   - The human developer owns the implementation decisions.
   - AI may propose, draft, or complete code, but it does not decide the final shape of the architecture.

2. AI-assisted coding boundaries
   - AI can help with boilerplate, type stubs, file scaffolding, and inline completions inside an already-approved design.
   - AI cannot directly introduce or modify the core protocol contract, runtime session logic, lock logic, or PostgreSQL process lifecycle without explicit review.

3. Manual approval before persistence
   - Any file change that affects protocol messages, process creation, terminal lifecycle, or database interaction must be reviewed by a human before it is finalized.
   - If a code suggestion is accepted, it should be checked in small increments and validated with the smallest relevant test or smoke run.

4. Completion assistance is allowed, not autonomous execution
   - Tab completion and editor suggestions are allowed for speed.
   - The human must inspect, reject, or refine every suggestion that changes behavior.

5. Safety checkpoints
   - Before moving to the next phase, the human confirms the previous phase works and the current design still matches the spec.
   - No phase is considered complete by AI alone.

---

## 3. Repository structure

Use a monorepo with the following structure:

```text
LockLab/
  backend/
    locklab/            # Django project
    bridge/             # Django app (Channels) for WebSocket relay
    connector/          # Python connector service / CLI
  apps/
    web/                # browser UI (React + xterm.js)
  packages/
    protocol/
    types/
    shared-utils/
  docs/
    implementation-plan.md
```

Why this structure:
- `apps/web` owns the browser UI
- `apps/bridge` owns WebSocket relay logic
- `apps/connector` owns local `psql` and Docker/Postgres interaction
- The backend is Python-based:
  - `backend/locklab` is the Django project container
  - `backend/bridge` is a Django app (using Django Channels) that implements the dumb WebSocket relay
  - `backend/connector` is a Python service/CLI that spawns `psql` processes and manages sessions
- `packages/protocol` owns the shared message contract
- `packages/types` owns shared domain types
- `packages/shared-utils` is optional but useful for common code

---

## 4. Implementation order

We will not move to the next phase until the previous phase proves working.

Every phase follows this workflow:
- write the smallest failing test or smoke check first
- implement only the behavior needed to satisfy it
- run the validation command
- confirm the result before proceeding

---

### Phase 1: Shared protocol contract

Human control note:
- This is the most important contract boundary in the project. The protocol must be language-agnostic so the Python backend and the browser can share one canonical message definition.

Goal:
- define the message contract between Browser, Bridge, and Connector
- keep the contract small, readable, and stable
- avoid changing message names later without extra approval

Required execution pattern for this phase:
- Step 1: create directories
- Step 2: create package manifest
- Step 3: create canonical schema
- Step 4: create protocol README
- Step 5: create runtime helper constants
- Step 6: validate the package
- Step 7: review and approve before Phase 2

Step 1: create the protocol package directory structure

```bash
cd /home/sagar/work/LockLab
mkdir -p packages/protocol/schema packages/protocol/src
```

Why: this creates the canonical location for the shared contract and generated runtime helpers.

Step 2: create the package manifest

Why: the protocol package becomes the shared source of the message contract and the validation entry point.

Step 3: create the base JSON schema envelope

Why: this is the canonical envelope all protocol traffic must follow.

Step 4: create the human-readable protocol documentation

Why: humans need a readable contract as well as the JSON schema; this prevents protocol drift between browser and connector.

Step 5: create the runtime message constants and helpers


Why: this keeps the shared contract usable in both Node/TypeScript and browser-side code without drift.

Step 6: validate the protocol package

```bash
cd /home/sagar/work/LockLab
node --check packages/protocol/src/index.js
```

Expected result:
- no syntax errors
- exit code 0

Why: this is the smallest verification step before continuing to Phase 2.

Approval gate before Phase 2:
- confirm the message names match the protocol spec
- confirm the canonical error codes match the spec
- confirm the Browser, Bridge, and Connector all agree on this contract
- do not change or add message names after approval unless the human explicitly revisits Phase 1

Done when:
- the schema exists
- the README documents the contract
- the runtime constants exist
- validation passes
- the message contract is stable enough for Phase 2

---
---

### Phase 2: Connector startup and registration

Human control note:
- The connector will be a Python service/CLI that spawns `psql` processes. AI may help scaffold the Python code, but every process spawn/kill and DB interaction must be reviewed and approved by a human.

Goal: create a minimal Python connector that starts, validates local environment, and registers with the Django bridge.

Tasks:
- scaffold a Python connector in `backend/connector` (or `apps/connector`) using `argparse` or `click` for a CLI entry
- add a `config.example.toml` or `config.yml` for local Postgres connection
- validate local prerequisites (Python version, `psql` binary, optional Docker)
- confirm local database is reachable
- establish a WebSocket connection to the bridge and send `connector.register`
- wait for `connector.registered`

Done when:
- connector starts without crashing
- it can report `postgres.status`
- it can establish a connection to the Django bridge and exchange registration messages

Notes:
- no auth yet
- no automatic restart logic yet
- no DB reset logic yet

---

### Phase 3: Terminal creation and session lifecycle

Human control note:
- This phase contains the real PostgreSQL process lifecycle and is high-risk.
- AI may suggest patterns for spawning `psql` and session tracking, but the human must inspect every call to spawn processes, kill sessions, and map session IDs to PIDs.
- No auto-generated cleanup logic should be accepted without explicit verification.

Goal: build the first end-to-end capability.

This is the first real feature and should be treated as milestone 1.

The flow:
1. Browser sends `terminal.create`
2. Bridge relays request to Connector
3. Connector creates a new session ID
4. Connector spawns a fresh `psql` process with a new DB connection
5. Connector stores a sessionId -> pid mapping locally
6. Connector sends `terminal.created` back to Browser
7. Browser sends `terminal.input`
8. Connector writes that data to `psql` stdin
9. `psql` output is read and forwarded as `terminal.output`
10. Browser closes session with `terminal.close`
11. Connector kills the `psql` process and emits `terminal.closed`

Technical requirements:
- each browser tab maps to one real `psql` process
- sessions must be isolated and not share connections
- process must be terminated immediately on close or refresh
- support up to 5 concurrent sessions
- reject new sessions above the limit with `error`

Done when:
- one browser session can successfully open a terminal
- text can be sent to `psql`
- output is returned to the browser
- session can be closed cleanly

This is the first major completion milestone.

---

### Phase 4: Bridge WebSocket relay

Human control note:
- Implement the bridge as a minimal WebSocket relay using Django + Django Channels so it runs in the same Python ecosystem as other backend pieces. AI can help shape code but human review of message routing is required.

Goal: make the bridge a dumb message-forwarding layer implemented as a Django Channels consumer.

Bridge responsibilities:
- accept browser socket connections (via Channels)
- accept connector socket connections (via Channels or a lightweight WebSocket client interface)
- relay messages between the two sides
- maintain mapping of browser sessions to connector sessions if required
- pass through error messages without interpreting them

Bridge should not:
- connect to PostgreSQL
- execute SQL
- inspect terminal content beyond forwarding

Done when:
- a browser can send `terminal.create` and receive `terminal.created` through the bridge
- connector can receive browser messages and respond through the bridge
- the bridge does not break the message flow

---

### Phase 5: Browser terminal UI

Human control note:
- Tab-completion assistance is acceptable for UI boilerplate, state wiring, and event handlers.
- Human must confirm the terminal UX matches the actual lifecycle rules and does not hide connection errors or close behavior.

Goal: render the terminal in React using xterm.js.

Tasks:
- create terminal panel in the web app
- manage multiple terminal tabs
- attach input to xterm
- print output from `terminal.output`
- show connection status
- show session state
- send `terminal.close` when a tab is closed
- show explicit error states for terminal failures

Done when:
- the browser can open and use a terminal session
- one terminal tab corresponds to one real `psql` process
- closing the tab terminates the connection and process

---

### Phase 6: Lock watcher and lock state UI

Human control note:
- AI can help draft SQL queries and UI rendering, but the human must validate all queries against PostgreSQL semantics and output shapes before this is trusted.
- Lock-state interpretation is part of the product behavior and should never be fully delegated to auto-completion.

Goal: add polling against PostgreSQL and display lock information.

Tasks:
- implement polling every 6 seconds
- query `pg_stat_activity` and `pg_locks`
- map results into lock state payload
- send `lock.state` from connector to browser
- render lock tables and blocking relationships in the browser UI
- map session IDs to lock state where possible

Minimum payload shape:

```ts
{
  sessions: [],
  locks: [],
  blocking: []
}
```

This is not the first milestone; it comes after session flow is proven.

---

### Phase 7: Initialization, limits, and error handling

Goal: make the app robust enough for actual developer use.

Tasks:
- enforce maximum of 5 sessions
- ensure failed Postgres or tunnel conditions show explicit errors
- implement `database.initialize` flow
- reject `database.reset` with a clear machine-readable error
- handle unexpected `psql` exits
- keep the UX honest: no automatic restarts

Done when:
- the app clearly surfaces failures
- the user can recover by manually restarting the session
- system respects initial product constraints

---

## 4. First milestone definition

The first milestone is:

"The browser can open a real terminal session, send SQL to a real `psql` process, and receive output through the bridge and connector."

This is the must-win target before any lock or scenario work begins.

---

## 5. Working principle for the next steps

From this point onward, do not take on any feature outside this sequence.

Correct order:
1. repo setup
2. protocol package
3. connector registration
4. terminal create/input/output/close
5. bridge relay
6. UI terminal session
7. lock watcher
8. error and session limits
9. initialization

Do not jump ahead.

---

## 6. Deliverables before moving on

Before we start feature implementation, we need these verified outputs:

- repo scaffold created
- shared protocol package exists
- connector skeleton exists
- bridge skeleton exists
- web app skeleton exists
- first terminal session flow works end-to-end

Once that is done, we move to lock watcher and lock state display.

---

## 7. Next action

The next work item is:

"Create the repo skeleton and the shared protocol package."

No lock watcher, no UI polish, no database reset logic. Only the foundation and first session flow.
