# Layers

**Status:** Working draft, for discussion
**Supersedes:** the `core (server) → runtimes → clients` tree in the 2026-11-14 sketch

## What was wrong with the sketch

The sketch had a `core (server)` at the root, three runtimes as siblings, and clients hanging
off the runtimes. Five problems:

1. **The core is not a server.** It is a contract: the ontology, the schemas, the validator,
   the transaction engine. Making it a server forces every client to be online, which
   contradicts local-first execution and the presentation scenario (a presenter running a
   World on a laptop, audience on phones).
2. **Runtimes are implementations of the core, not peers of it.** Three parallel runtimes
   means three implementations of the same semantics, which is a maintenance disaster. There
   should be one authoritative engine and pluggable *adapters* for user code.
3. **Client arrows point the wrong way.** Clients do not consume a runtime; they consume a
   session: committed generations, subscriptions, and an authorised command channel.
4. **Missing: views.** The presenter/audience scenario needs two views of one World with
   different visibility and different interaction grants. That is not a client feature.
5. **Missing: operators, packages, effects.** Agents are the primary users of the platform;
   Blueprints are where the vocabulary comes from; effects are how the outside world gets
   in. None of the three appears in the sketch.

## The stack

```
A6  Operators        humans · AI agents · automation · package sources
      |
A5  Clients          CLI · TUI · web · native desktop · mobile        (thin)
      |
A4  Presentation     renderers · renderer packages · LOD · interaction translation
      |
A3  Host & Session   authoritative loop · sessions/views · grants · persistence · sync adapter
      |
A2  Adapters         script engines (JS, WASM, …) · effect executor · simulation service
      |
A1  Core             document model · validator · canonical serialization · transaction engine
      |
A0  Protocol         ontology · schemas · conformance fixtures                (no code)
```

Dependencies point **up only**. No layer reaches past its neighbour.

### A0 — Protocol

The ontology, the entity and relationship schemas, the type system, and the conformance
fixtures. Text and JSON Schema only. Every other level is a consumer.

### A1 — Core

Deterministic, no I/O, no ambient time or randomness, no threads. Holds the World document,
validates it, canonicalises it, and runs the transaction engine: event phase, process phase,
value phase, commit. Must compile to WASM so the same engine runs in a browser tab and on a
server.

A1 owns: identity, the Process Registry as *state*, membership, placement, the document
revision, and the stabilisation pass. A1 does **not** decide when to start a transaction; that
is A3.

### A2 — Adapters

Everything non-deterministic or external, behind a narrow contract:

- **Script adapters** execute a bounded `step`. The adapter is not the runtime; it is a
  function the runtime calls with a snapshot and a budget, and it must return a
  serialisable result. See "Language and engine" below.
- **Effect executor** performs authorised external operations after commit and returns results
  as events in a later transaction.
- **Simulation service** (physics, 3D solvers) is an effect-plus-derived-output provider. It
  may not write Blockie state directly; it publishes through a declared channel, for the same
  single-writer reason that a process may not write its host's state.

### A3 — Host & Session

The authoritative loop. Loads a World, decides when to start transactions (wake-ups, external
events, timers, effect completions), owns sessions and views, enforces actor authority, and
publishes committed generations.

This layer is where "local vs server" is decided. It is the same layer either way; a server is
a host that several clients share. That is why "core (server)" was the wrong root.

**Views are filters, not copies.** A view selects a region or entity set, a renderer, and a
grant set. The presenter view and the audience view show the same Blockies; the audience view
is not a second World. Audience interaction is a command submitted under the view's grant.

### A4 — Presentation

Renderers consume committed generations only. Two distinct plugin surfaces live here:

- **renderer packages** — how a given Blueprint draws itself. One Blueprint, many renderers
  (spreadsheet cell, dashboard tile, presentation slide).
- **View composition** — layout, level-of-detail, aggregation of runs, animation.

Animation is presentation. A value change may drive an animation; an animation may never
change a value.

### A5 — Clients

Thin. If a client needs protocol semantics, that logic belongs in A3 or A1.

### A6 — Operators

Humans, AI agents, automation. An agent is an operator of the World: it issues authorised
commands and events. If it needs an in-world body, it gets a representative Blockie and a
Process Run — which are not the same identity as the agent.

Package sources also live here: where Blueprints, process definitions, and composite
definitions come from.

## Process execution and the transaction

The v0.1 runtime had two phases: events, then values. A process step is neither. Proposed:

```
accept → validate → stage
      → event phase      (reducers, FIFO, no recursion)
      → process phase    (bounded steps; a step may return wait/yield)
      → value phase      (reactive stabilisation)
      → prepare → commit → publish → effects
```

A step that returns `wait` commits inbox consumption plus wait state and ends the transaction;
the run wakes in a later transaction. This keeps local steps atomic and gives external waits a
defined suspension point — which is also the only clean place to cancel.

## Language and engine

**Recommendation: JS/TS first, behind a `step` ABI, on an embeddable engine.**

The framing that matters: the runtime never runs "a whole program" inside a transaction. It
runs a *bounded step*. Whether the user wrote a loop or a state machine is their business; the
contract is `step(snapshot) → { state, outputs, effects, wait? }` plus a budget.

- **JS/TS** wins on ecosystem, tooling, and the fact that AI agents write it far better than
  Lua. That last point is not cosmetic: in an agent-operated platform, the authoring language
  is the one agents are best at.
- **Engine:** QuickJS or Boa (pure Rust, embeddable, deterministic, small). Not V8 — too
  large for browser/mobile targets and its async model fights deterministic stepping.
- **Hard requirements on the adapter:** no ambient time, randomness, network, or filesystem;
  deterministic microtask draining; structured-clone at the boundary; BTS-native value
  mapping (Decimal as a canonical string plus SDK helpers, DateTime as an RFC 3339 string,
  Bytes as base64url) — never silent conversion to JS `number`.
- **WASM** as a second adapter: it is how Rust/C-authored Blockies, physics, and
  performance-sensitive Blueprints plug in without a native ABI.
- **Lua** only if a specific audience needs it. Do not build it speculatively; the adapter
  contract makes it cheap to add later, which is the point.

Plugin system follows from the two surfaces:

- **Computation plugins** are Blueprint/Process Definitions plus a JS or WASM module. Capability-
  gated, digest-pinned, sandboxed.
- **Presentation plugins** are renderer packages, versioned against a renderer contract.
- **Never native dynamic libraries.** They break the sandbox, the portability story, and the
  WASM story at once.

## What each product scenario demands

| Scenario | Demands | Where it lands |
|---|---|---|
| Presentation with presenter + audience views, audience voting | One World, N views, per-view grants, committed-generation consistency, attributed commands | A3 (views, grants), A4 (two renders), A1 (one World) |
| Developer visualising code as process flow | Process parentage as a first-class visible structure; step traces; state-flow rendering | A1 (runs), A4 (flow renderer), F-01/F-02 |
| Students brainstorming with UI + pixel Blockies | Cheap reactive compute at spreadsheet scale (no process per cell); editable UI Blueprints; animation driven by values | A1 (compute), A4 (UI Blueprint, animation), A0 (UI Blueprint) |
| Spreadsheet replacement | Ranges and aggregation without shared state or a process per formula | **Gap** — see below |
| Physics and 3D | Space-agnostic placement; simulation as an adapter that publishes, never writes; 3D as renderer + spatial capability | A0/A1 (placement schema), A2 (simulation), A4 (3D renderer) |

### The range/aggregation gap

The v0.1 model forbids implicit aggregation: one value input, one producer, no fan-in. That is
correct for the protocol and hostile to spreadsheets, where `SUM(A1:A10)` is the basic
operation. Options:

1. One Blockie per cell plus an aggregate Blockie with N declared inputs — works, ugly.
2. A shared collection entity — reintroduces the shared mutable store the architecture avoids.
3. **Declarative fold on a Composite**: a Composite may declare an aggregate over a named set
   of member outputs of the same type, evaluated in the value phase with no process and no
   shared state. This is the "static Composite" case from D-003, and it is the only option
   that keeps both the single-writer rule and spreadsheet ergonomics.

Recommendation: option 3, scoped to same-typed member outputs, with the fold operation
declared (sum, count, min, max, collect) rather than arbitrary code.

### 3D without a rewrite

Make `Placement` space-agnostic now: a transform plus a space tag, with 2D as the only
conforming space in v1. Retrofitting a third dimension into a 2D placement schema is the
classic way to lose a year.

## Rules that keep the stack flexible

1. No layer may assume a renderer.
2. No extension may write World state; extensions publish, the core commits.
3. Every state that matters appears in the FSM inventory with an owner.
4. Entity kinds do not proliferate. Computer and Drawing Blockie were the failure mode; a new
   *kind* of thing needs an argument that a Blueprint, a relationship, or a mode cannot express it.
5. Values cross boundaries; references do not.
