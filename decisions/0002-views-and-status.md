# 0002 — Views, representation, status

**Date:** 2026-11-14
**Status:** Accepted (working)
**Builds on:** 0001

## D-007 — One World, global placement, views are cameras

Image 2 contains **four distinct entities**: two composite members (beige, presenter side) and two
button Blockies (green, audience side) that drive them. They are labelled A/B only to show the
causal link.

There is one source of view truth: one World, one placement tree. A view is a **viewport**
(camera framing a region) plus a renderer plus a grant set. Views do not reflow, re-layout, or
copy entities.

Consequence: the World must be laid out so that every intended viewport is legible at its own
scale. If per-device reflow is ever wanted, it must be a per-view *projection* and it will fork
footprint, group move, and every geometry-touching semantic per view. That cost is accepted
now by choosing camera-only.

## D-008 — Representation is stage/backstage, and it is presentation

Every managed run has exactly one host Blockie (unchanged). Whether that host is drawn is a
presentation decision, not a run state. Two stored values and one derived value:

| Value | Kind | Meaning |
|---|---|---|
| `stage` | stored, on the host Blockie's placement/presentation | placed in a viewport region |
| `backstage` | stored | exists, placed in a non-framed region, never drawn |
| `aggregated` | derived per view | drawn as part of the nearest ancestor's indicator (LOD) |

`backstage` preserves the universal-placement invariant while letting background workers exist
without carpeting the Frame. "Bring it on stage" is then an ordinary placement operation, which
makes promotion an explicit, auditable act.

Invariant to test: changing stage/backstage, or aggregation, must not change any execution
trace, membership, or authority.

## D-009 — Attention is derived, not an entity (v1)

Attention was "what is an agent observing or assisting". In v1 it is fully derivable from
session scope: which actor holds a session whose viewport/grant covers which entity. Keeping it
as a separate relationship would create a second truth about who is working on what.

Delete the entity. Revisit only if a real need appears for *intent without a view* — an agent
declaring interest in an entity it is not currently viewing. That is the one thing sessions
cannot express.

## D-010 — Status is a projection with multiple dialects

There is one internal run-status projection (run state, wait reason, acknowledgement). Exporters
render it into dialects: the Frame badge, a TUI, an agent inbox, Prometheus, OSC 7501.

Two additions to the inventory, forced by the OSC 7501 comparison:

- **Wait reason** is missing from F-01. "Waiting" without a reason cannot distinguish "blocked on
  a human decision" from "waiting for a service". Add `wait_reason: human_permission |
  human_question | human_auth | external_service | timer | dependency`.
- **Result acknowledgement** is missing. OSC 7501's `done` means "finished and the user has not
  seen it yet" — terminal status plus an unacknowledged result. Add
  `acknowledgement: unacknowledged | acknowledged | expired`.

OSC 7501 is an **egress-only** dialect. It is unauthenticated and ambient; reading it back into a
World would introduce an ambient dependency and break determinism. Its hierarchical record IDs
correspond to process parentage, which is independent confirmation that a run tree is the right
shape.

## D-011 — Performance posture: declared graph, not runtime tracking

The value dependency graph plus topological stabilisation plus equality-gated propagation is a
signal graph whose edges are declared rather than tracked. That is the intended performance
model. A real signal library (Solid/Svelte style) buys automatic fine-grained tracking at the
cost of serialisability, cross-boundary cost, and static validation — the wrong trade for a
World document.

Performance levers, in order: batch a transaction rather than one per input; recompute only the
dirty closure; suppress propagation of unchanged values; memoise compute by input/state hash;
share structure in snapshots instead of cloning the World; flatten composite boundaries in the
evaluation graph; parallelise independent nodes; keep the sandbox call coarse (one call per node,
not per value); use WASM for hot Types.

There is **no performance tier of process**. Speed is an engine property. Adding an entity tier
for speed forks semantics, which is how architectures die.

## D-012 — Aggregation is declared, implicit fan-in stays forbidden

A value input has one effective producer. Fan-out is free; fan-in is not. `SUM(A1:A10)` is
fan-in, so spreadsheets need an explicit form of it.

Resolution: a Composite may declare a **fold** over a named set of same-typed member outputs
(`sum`, `count`, `min`, `max`, `collect`), evaluated in the value phase with no process and no
shared state. Aggregation becomes declared rather than implicit, and the single-writer rule
survives.
