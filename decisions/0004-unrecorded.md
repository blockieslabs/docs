# 0004 — The four unrecorded decisions

**Date:** 2026-11-16
**Status:** Accepted (working)
**Resolves:** integrity findings I-002, I-003, I-007, I-008, I-009, I-010
**Amends:** D-003 (dimensions, declarative)

## Context

Four decisions were being assumed by accepted decisions but had never been written down:
Composite endpoints (handoff IR-005), process input dispatch (IR-001), host output producers
(IR-002), and manager authority (IR-003). This document records them and, in doing so, resolves
two definitional errors found in the integrity check.

The unifying constraint: **a process never writes World state.** It publishes through declared
ports. Everything below follows from that.

## D-015 — A Composite interface is an alias table (IR-005)

A Composite owns no ports. It owns a **declaration table** whose entries name public endpoints
and point at something that already exists:

| Source kind | Points at | Allowed for |
|---|---|---|
| `member_port` | a port of a direct member (Blockie or nested Composite) | value in/out, event in/out |
| `fold` | a protocol-provided aggregation over a named member set (D-012) | value out only |
| `addressed_dispatch` | the manager's bounded dispatch endpoint (D-018) | event out only |

An alias has: a stable local ID, direction, kind, a declared type, and one source. It has **no
state, no lifecycle, and no storage of its own**. Deleting an alias does not touch the member
port. Deleting a member does not delete the alias; it invalidates it, and the transaction that
removes the member must repair or reject the interface in the same commit.

Rules:

1. **A public value output has exactly one source.** One member port, one fold, or one dispatch
   endpoint. Never two.
2. **A public value input may fan out.** Several alias entries may share one public input, each
   with exactly one target. The target input still has one effective producer.
3. **A public event output may have several sources.** Events are channels. Ordering follows the
   phase rule in D-017.
4. **The target port's type is canonical.** The alias type is an assertion that must be
   assignable in the correct direction. It cannot widen a member's contract.
5. **Aliases chain through nesting.** Parent alias → nested Composite alias → member port. Chains
   must terminate at a port, a fold, or a dispatch endpoint; an alias cycle is invalid.
6. **Placement is irrelevant.** An alias may point at an unplaced member (D-006, D-013).
7. **Resolution is scope-relative.** A connection endpoint stores the outermost visible entity
   plus the alias ID. The runtime resolves inward. External consumers never see the member.

This replaces the legacy `exposures` and `input_bindings` machinery with one table, and it is
what makes D-003's declarative interface possible without a second port system.

## D-016 — Claim routing decides reducer versus run (IR-001)

A Process Definition declares a **host contract** containing `claims: [event_input_id]`. Claims
are validated at attach time against the Type package's declared claimable inputs.

- An input is **exclusive**: claimed by the run, or owned by the Type reducer. Never both. There
  is no double invocation.
- A delivery to a claimed input is appended to the run's inbox (F-03) and handled in the process
  phase. A delivery to an unclaimed input goes to the Type reducer in the event phase.
- Only **event inputs** can be claimed. Value inputs are read, not delivered; a run that cares
  about a value change declares a wake condition (F-21).
- Claims are fixed for the run's lifetime. No dynamic claims in v1.
- A Computing Blockie can still have live reducer behaviour on its unclaimed inputs. Occupancy
  does not freeze the Type, except when every input is claimed — which is a stated consequence,
  not an accident.

Ordering follows the transaction phases: all reducer work in the event phase, then all run steps
in the process phase.

Rejected: dispatching to both (two writers, duplicate effects). Rejected: the run always wins
(kills reducer-owned presentation state and makes the Type dead weight while occupied).

## D-017 — Host output ports declare their producer (IR-002)

Every value output port in a Type package declares `producer: compute | process`.

- `compute`: produced by the Type's Compute. A run may not publish to it.
- `process`: produced only by the attached run's output binding. Type Compute must not return it;
  this is a definition-time validation, not a runtime check.
- A `process` port with no attached run has status **unavailable**, and consumers are blocked.
  It never falls back to a default or a stale value.

Event output ports have no exclusivity rule. A reducer and a run may both emit on one, and
ordering is deterministic: event-phase emissions enqueue before process-phase emissions.

A Process Definition declares which ports it publishes to; attach validates that every target is
a `process` port. A terminal run returns its `process` ports to unavailable.

## D-018 — Management grants dispatch, nothing else (IR-003)

Management is a **designation** (F-07), not a role and not ownership. The manager's run holds one
capability, scoped to one Composite:

**`composite.dispatch`** — emit an addressed event to a direct member's event input, where the
destination is drawn from a **declared member set** on the manager's dispatch endpoint.

The member set is declared, so the possible route graph is statically known and validatable. The
*choice* within the set is dynamic, which is what makes an agent manager useful: it can decide
which worker to poke without the World having to pre-wire every pair.

Explicitly **not** granted, to the manager or to anyone:

- add, remove, move, or reparent members — those are document operations (D-001);
- read member Model State, configuration, or nested internals;
- cancel a member's run — lifecycle authority is separate from management;
- write any part of the World document, including presentation.

Presentation follows the same rule as everything else: a run that wants to change what is shown
publishes a value on a port. The renderer binds it. A run never writes the document.

Encoding of the dispatch endpoint (an addressed event output versus a third port kind) is
deferred to schema work; the capability boundary above is what is being decided.

## Amendments to D-003

**I-002 — the dimensions were not independent.** `interface_mode: managed` was implied by
`management ≠ unmanaged`, so it carried no independent information. Rather than patch it, the
dimension is **deleted**. A Composite has two state dimensions:

- existence: `forming → assembled → dissolving → dissolved`;
- management: `unmanaged → designating → managed → handoff_pending`.

"Managed" is a derived label meaning a manager is designated. F-08 is withdrawn.

**I-003 — "declarative" was defined as "no computation", which D-012's fold contradicts.**
Declarative is redefined as **no manager and no process**. Protocol-provided folds are permitted
because they are runtime evaluation of declared member outputs, not user computation. A Composite
with a fold and no manager is declarative and does compute; that is consistent.

## Consequences

- Six accepted decisions no longer rest on conversation.
- The legacy `exposures` contract is fully replaced, which also closes the old P1.4 and P1.5.
- The manager is now a *routing* designation. If dynamic routing is ever removed, `composite.manage`
  has no verbs left and the designation becomes purely a rendering and lifecycle-coupling label.
- Remaining open from the integrity check: I-006 (status mapping), I-011 through I-022.
