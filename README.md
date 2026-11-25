# Blockies — Documentation

> **Start here if you are learning the project:**
> open [`html/index.html`](html/index.html) in a browser. It is a linked field guide that explains
> every concept in plain language, with diagrams and a glossary. The markdown below is the
> engineering record behind it.

Working documentation for the Blockies architecture. Nothing here is frozen unless a
document says so in its header.

## Reading order

1. [`decisions/0001-foundations.md`](decisions/0001-foundations.md) — the ontology and the
   decisions taken on 2026-11-14. Start here.
2. [`decisions/0011-naming.md`](decisions/0011-naming.md) — D-046, the vocabulary: Blueprint,
   value type, appearance, Blockie state. Read this before the specifications.
3. [`decisions/0012-composite-brain.md`](decisions/0012-composite-brain.md) — D-047, the Composite
   as a multi-cell widget: one Brain, zero or more Parts, zero or more Members, and a Manager that
   is a Run role.
4. [`architecture/layers.md`](architecture/layers.md) — the seven-layer stack, and what each
   layer may and may not do.
5. [`architecture/fsm-inventory.md`](architecture/fsm-inventory.md) — every state machine in
   the system, its owner, and the level it latches onto.
6. [`specs/BCM-core-model.md`](specs/BCM-core-model.md),
   [`specs/BPS-process.md`](specs/BPS-process.md),
   [`specs/BCS-composite.md`](specs/BCS-composite.md) — the normative model, requirements
   numbered `C-n`, `P-n`, `S-n` so they can be cited.
7. [`traces/0001-reference-traces.md`](traces/0001-reference-traces.md) — four scenarios as
   transaction logs. These are the golden vectors.
8. [`schema/0001-minimal-model.md`](schema/0001-minimal-model.md) — the derived model, with a
   traceability table and a list of what was deliberately cut.
9. [`schema/blockies-0.schema.json`](schema/blockies-0.schema.json) and
   [`schema/0002-conformance-fixtures.md`](schema/0002-conformance-fixtures.md) — the machine
   schema and the fixture vectors.
10. [`performance/0001-bottleneck-analysis.md`](performance/0001-bottleneck-analysis.md) — where a
    conforming implementation will be slow, by layer, with the technique that removes each cost.

## What is still missing

- **Effects.** F-11 tracks the lifecycle; nothing declares an effect, its result type, or the
  event input that receives a completion.
- **Canonical encoding.** Key order, number form, and decimal form for digesting are unresolved,
  so `sha256:` values cannot yet be produced reproducibly.
- **An ontology glossary.** The vocabulary is consistent across the documents but has no single
  alphabetical reference.

## Repository plan

One repository per architecture level, not per component. The layer document defines the
levels; a repository should be created only when a level has something to build.

| Level | Repository | Contents |
|---|---|---|
| A0 | `blockieslabs/spec` | Protocol text, JSON Schemas, conformance fixtures |
| A1 | `blockieslabs/core` | Rust document model, validator, transaction engine (WASM-capable) |
| A2 | `blockieslabs/adapters` | Script engines, effect executor, simulation services |
| A3 | `blockieslabs/host` | Session loop, persistence, views, grants |
| A4 | `blockieslabs/render` | Renderers and renderer packages |
| A5 | `blockieslabs/clients` | CLI, TUI, web, native, mobile |
| A6 | `blockieslabs/operators` | Agent adapters, package sources |

`blockieslabs/docs` (this repository) is the design record and sits outside the stack.

## Conventions

- Decisions are recorded as numbered documents under `decisions/`. They are append-only:
  a later document supersedes an earlier one, it does not edit it.
- A claim that changes behaviour must name the level (A0–A6) it belongs to.
- Anything described as a state must appear in the FSM inventory with an owner and a
  transition authority, or it is a derived projection and must be labelled as one.

## Amendments to the handoff

The handoff (`reference/handoff/BLOCKIES-HANDOFF.md`) predates these decisions and is
amended by them. Known deltas:

| Handoff statement | Amended by |
|---|---|
| Every Blockie has "a placement in a Frame" | D-013 — placement is nullable |
| Operational mode is `drawing` / `computing` | D-019 — `vacant` / `occupied` |
| Manager must hold explicit World-granted authority | D-018 — one verb, `composite.dispatch` |
| Composite endpoint union with independent ports | D-015 — Composite ports are aliases |
| "A Composite is a first-class grouping entity" plus templates | D-001 — grouping and instantiation are separate operations |
| A Composite is a generic grouping of independent entities | D-047 — a Composite is a multi-cell widget with one Brain, zero or more Parts, and zero or more Members |
| Attention is a relationship | D-009 — attention is a projection |
