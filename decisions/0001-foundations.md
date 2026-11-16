# 0001 — Foundations

**Date:** 2026-11-14
**Status:** Accepted (working)
**Supersedes:** the ontology in the v0.1 specification family (Composite-as-Blockie,
`kind: atomic | composite`, Computer/Drawing as primitive types)

## Context

Blockies is an agent-operated visualization platform. Users provide information and intent;
external AI agents construct and operate a visual World out of a fixed vocabulary of Blockie
Types. Earlier drafts treated a Composite as a kind of Blockie and treated "Computer" and
"Drawing" as primitive Types. Both are retired. This document records the ontology that
replaces them and the decisions taken in the 2026-11-14 session.

## The ontology

One universal entity: **Blockie**. Stable identity, one versioned Type, configuration,
optional persistent Model State, a placement, and explicit relationships.

A Blockie either has an attached Process Run or it does not. That is a **derived
projection**, not a stored field and not a state machine: the Process Registry is
authoritative.

A **Process Run** is a first-class, resumable, cancellable in-world activity with its own
identity and lifecycle. Every managed run is hosted by exactly one Blockie, and a Blockie
hosts at most one active run. A run may have a parent run; its host's Composite membership is
chosen explicitly and is never inferred from process parentage.

A **Composite** is a grouping entity. It is not a Blockie, has no Type, and has no visual
archetype of its own. Membership is explicit, acyclic, and one Composite per Blockie.
A Composite may designate zero or one **manager**, which must be a direct member and must be
occupied by an active run.

The relationships that must never be conflated: placement, membership, nesting, management,
process hosting, process parentage, communication, attention, and process lifecycle
authority.

## Decisions

### D-001 — Composites support both grouping and instantiation

Two distinct operations, with different identity and mutability rules:

- **Grouping** (`group`): an ad-hoc, mutable assembly of existing Blockies. Members keep
  their identities. Membership can be changed by an explicit document transaction.
- **Instantiation** (`instantiate`): a pinned Composite Definition materialises fresh
  members with fresh identities. The resulting topology is immutable for that instance.

A grouping may be **saved as** a Composite Definition, which is then immutable and
versioned. A materialised instance may be **forked** into a grouping, preserving identities
and dropping the template binding; this is the only way to change an instantiated topology
without publishing a new definition version.

Consequence: the World document must be able to carry agent-authored Composite Definitions.
Definitions created inside a World are embedded in that World's manifest; published packages
are referenced by digest.

### D-002 — Run state is separate from host Model State

A Process Run owns its own state (run state), checkpointed with the run. It does not write its
host Blockie's Model State directly. It observes its host through declared inputs and
publishes through declared output bindings.

Reason: one Blockie with a reducer and a process would otherwise have two writers to one
state, violating single-writer discipline inside a single entity. Separating the two also
makes checkpoint, resume, cancellation, and "terminal run returns the host to unoccupied" pure
registry operations with no state reconciliation.

### D-003 — Composites may be static

A Composite may exist and function with no manager. Its public interface may be **declarative**
(aliases and bindings, no computation) or **managed** (a computing member coordinates). A
manager is required only for coordination that needs computation, not for wiring.

This makes the Composite state space three independent dimensions rather than one enum:
existence (`forming → assembled → dissolving → dissolved`), management (`unmanaged →
designating → managed → handoff_pending`), and interface mode (`declarative | managed`).

### D-004 — Explicit state, minimal implicit state machines

Every state that can carry transition authority must be explicit, with a declared owner,
states, events, guards, and durability. See `architecture/fsm-inventory.md`.

This principle has two necessary bounds:

1. **Derived projections are not state machines.** Occupancy, footprint, manager
   availability, and node computation status are functions of authoritative records. They
   have no transition authority and must not be stored as independent fields.
2. **View-local ephemera are not World state.** Hover, focus, scroll, drag, and per-view
   selection are presentation state. They must not enter the World document; otherwise
   collaboration and determinism break.

### D-005 — Every managed process is represented in the Frame

The current design is one visual representation per managed run, hosted by its Blockie.
Representation is a property of the run, not a law of the universe: `represented: bool`.
Spawn-heavy programs must be able to create runs that are represented only by their parent,
or the Frame becomes unrenderable. This is expected to be revisited.

### D-006 — Geometry is semantically inert

No semantic relation — membership, management, process parentage, communication, authority —
may depend on placement. Placement is a hierarchy of local coordinates owned by the
placement structure, not by the Composite's meaning. A property test should assert that
randomising geometry leaves the execution trace unchanged.

## Consequences and open work

- The Composite endpoint question resolves as: Composite ports are **aliases** with no
  independent state, resolved at materialisation. The Connection model needs a scope-relative
  endpoint, not a second port-ownership system.
- Process execution needs a named phase in the transaction model (see `layers.md`).
- Composite presentation is still undefined: a Composite has no Type, so nothing draws it.
  Candidate: declarative presentation metadata rendered as chrome, never as a Type.
- The v0.1 conformance suite (163 cases, 45 blocked) is keyed to the retired ontology and
  must be re-derived from traces rather than patched.
