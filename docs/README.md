# Blockies — Documentation

Working documentation for the Blockies architecture. Nothing here is frozen unless a
document says so in its header.

## Reading order

1. [`decisions/0001-foundations.md`](decisions/0001-foundations.md) — the ontology and the
   decisions taken on 2026-11-14. Start here.
2. [`architecture/layers.md`](architecture/layers.md) — the seven-layer stack, and what each
   layer may and may not do.
3. [`architecture/fsm-inventory.md`](architecture/fsm-inventory.md) — every state machine in
   the system, its owner, and the level it latches onto.

## What is still missing

- `specs/` — BCM (core model), BPS (process), BCS (composite) as standalone normative drafts.
  They exist only as prose summaries in the handoff today.
- `traces/` — execution traces for the four reference scenarios. These should be written
  **before** the schemas; the traces are what disambiguate the schemas.
- `ontology/` — the entity and relationship glossary, once the vocabulary settles.

## Repository plan

One repository per architecture level, not per component. The layer document defines the
levels; a repository should be created only when a level has something to build.

| Level | Repository | Contents |
|---|---|---|
| A0 | `blockiess/spec` | Protocol text, JSON Schemas, conformance fixtures |
| A1 | `blockiess/core` | Rust document model, validator, transaction engine (WASM-capable) |
| A2 | `blockiess/adapters` | Script engines, effect executor, simulation services |
| A3 | `blockiess/host` | Session loop, persistence, views, grants |
| A4 | `blockiess/render` | Renderers and Type renderer packages |
| A5 | `blockiess/clients` | CLI, TUI, web, native, mobile |
| A6 | `blockiess/operators` | Agent adapters, package sources |

`blockiess/docs` (this repository) is the design record and sits outside the stack.

## Conventions

- Decisions are recorded as numbered documents under `decisions/`. They are append-only:
  a later document supersedes an earlier one, it does not edit it.
- A claim that changes behaviour must name the level (A0–A6) it belongs to.
- Anything described as a state must appear in the FSM inventory with an owner and a
  transition authority, or it is a derived projection and must be labelled as one.
