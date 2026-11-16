# BCM — Blockies Core Model

**Version:** 0.1.0-draft
**Status:** Proposed. Normative once ratified.
**Derived from:** decisions 0001–0008, `architecture/fsm-inventory.md`, `schema/0001-minimal-model.md`.
**Supersedes:** the v0.1 family's ontology (Composite-as-Blockie, `kind: atomic | composite`,
Computer/Drawing as primitive Types).

## 1. Normative language

MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are normative. Requirements are numbered so they can be
cited: `C-12` is a core requirement, not a section.

## 2. Scope and authority

BCM defines **what exists** in a World, how it is identified, placed, and related, and which
values are derived. It does not define execution (BPS) or Composite operations (BCS). Type
expressions and value semantics are owned by the Blockies Type System; where the v0.1 BTS
conflicts with D-020 (typed value equality) and D-021 (staged resolution), this document and the
decisions prevail.

| Concern | Owner |
|---|---|
| Entities, identity, World document, placement, relationship definitions, derivations, invariants | BCM |
| Run lifecycle, host contract, steps, scheduling, inbox, dispatch, failure classes | BPS |
| Composite origins, membership operations, manager designation, aliases, folds, presentation | BCS |
| Type expressions, values, assignability, equality | BTS + D-020 |
| Document shape | `blockies-0.schema.json` |

The schema defines shape; the specifications define meaning. Neither redefines the other.

## 3. Entities

**C-1.** A World contains exactly four kinds of first-class entity: **Blockie**, **Composite**,
**Run**, and the two **definitions** (Type package, Process definition). Nothing else is an
entity.

**C-2.** A Blockie is a persistent, independently identifiable inhabitant with exactly one pinned
Type, configuration, Model State, and an optional placement. A Blockie has no mode, no owner
field, and no parent field: those are derived or stored elsewhere.

**C-3.** A Composite is a grouping entity. It is not a Blockie, has no Type, and owns no ports. It
owns membership edges, an optional manager designation, an alias table, folds, and an optional
presentation record.

**C-4.** A Run is a first-class managed activity with its own identity and state, hosted by
exactly one Blockie (BPS).

**C-5.** A Type package is an immutable, digest-pinned blueprint: archetype, state and config
schemas, ports, and optional logic. A Process definition is an immutable, digest-pinned
executable contract (BPS).

**C-6.** Definitions are never entities in a World's runtime sense. They are pinned references or
embedded documents, and they never carry instance state.

## 4. Identity

**C-7.** Every entity ID is opaque, stable for the lifetime of the entity, and unique within the
World.

**C-8.** An ID MUST NOT be derived from position, display name, template path, membership, or
process parentage.

**C-9.** Identity survives movement, reparenting, membership changes, attachment and detachment of
runs, and every terminal run the host has ever carried.

**C-10.** An ID MUST NOT be reused after deletion, dissolution, or archival.

## 5. The World document

**C-11.** A World is a single document with separate tables: `frame`, `definitions`, `blockies`,
`composites`, `placements`, `connections`, `runs`. The schema is normative for shape.

**C-12.** The Process Registry (`runs`) is authoritative for occupancy. No field anywhere else may
record whether a Blockie is occupied.

**C-13.** Absence and `null` are distinct. A Blockie with no placement is absent from
`placements`. A dissolved Composite is absent from `composites`. Neither is encoded as `null`.

**C-14.** Derived values — occupancy, footprint, display status, attention, availability, run
counts — MUST NOT be stored. They are functions of the tables (section 8).

**C-15.** Runtime-only information — committed generations, derived outputs, event queues, dirty
flags, effect outboxes, view state — MUST NOT appear in the World document.

## 6. Frame and placement

**C-16.** A World has exactly one Frame. The Frame is the root coordinate scope and carries a
space tag. `2d` is the only conforming space in 0.1.

**C-17.** Placement is hierarchical and local: an entity's placement is relative to its nearest
placed ancestor scope — its Composite if it has one, otherwise the Frame.

**C-18.** A transform is translation plus uniform scale. Rotation is not part of 0.1, because
rotation composed with non-uniform scale is not closed and would make reparenting lossy.

**C-19.** A Composite stores its own transform. Moving a Composite changes that transform; member
local placements do not change.

**C-20.** Placement is optional. An unplaced entity has no coordinate, no footprint contribution,
and is not hit-tested.

**C-21.** An unplaced Composite has no origin, so its members cannot resolve to world coordinates
and MUST NOT be drawn, regardless of their own placement records. Their placements still exist.

**C-22.** Reparenting and scope changes MUST preserve the entity's world transform.

**C-23.** Placement MUST NOT influence any semantic relation. Membership, management, process
parentage, communication, and authority are independent of geometry. Randomising all placement
values MUST leave every execution trace unchanged.

**C-24.** `Placement.layer` orders members within one scope for drawing. It is presentation data
and is semantically inert.

## 7. Relationships

**C-25.** These relationships are distinct and MUST NOT be inferred from one another:

| Relationship | Answers | Must not imply |
|---|---|---|
| Placement | Where is it? | Membership, management, parentage |
| Membership | Which Composite directly contains it? | Process parentage or manager status |
| Nesting | Which Composite contains another? | That child members are direct parent members |
| Management | Which member coordinates this Composite? | Ownership of members or their state |
| Hosting | Which Blockie represents this Run? | Membership |
| Process parentage | Which Run spawned another? | Spatial or Composite hierarchy |
| Communication | Which endpoints exchange values or events? | Membership or authority |
| Attention (derived) | What is observing this? | Membership, management, or access |
| Lifecycle authority | Who may cancel or suspend this Run? | Management |

**C-26.** Attention is a projection, never an entity: it is the union of session scopes (external
actors) and the declared input bindings of in-world runs. It grants nothing.

**C-27.** An external actor is not a World entity. An in-world representative Blockie and its Run
are not the same identity as the actor.

## 8. Derivations

Each of these is a function; none is stored.

**C-28. Occupancy.** A Blockie is `occupied` if the registry holds a Run for it in any
non-terminal state, otherwise `vacant`. The words `computing` and `drawing` are retired as
normative vocabulary.

**C-29. Display status.** Derived from run status, wait reason, and acknowledgement:

| Registry | Display |
|---|---|
| `queued`, `running`, `cancelling` | `working` |
| `waiting` with a human wait reason | `blocked` |
| `waiting` otherwise | `idle` |
| `suspended` | `paused` |
| `succeeded` unacknowledged | `done` |
| `cancelled` unacknowledged | `cancelled` |
| `failed` | `error` |
| terminal and acknowledged | none |

**C-30. Manager availability.** A manager is available if its Run is in any non-terminal state.
Designation and availability are separate: designation is state, availability is a query.

**C-31. Footprint.** A Composite's footprint is the union of its members' world-space bounds,
ignoring unplaced members and unplaced subtrees.

**C-32. Output availability.** A port with `producer: process` is unavailable when its host is
vacant. Unavailability is never replaced by a default or a stale value.

## 9. Type packages

**C-33.** A Type package declares an archetype (opaque geometry descriptor plus a renderer
package reference), state and config schemas with initial values, ports, and optional compute and
reduce logic.

**C-34.** Every port declares direction, kind, and a BTS type. A value output MAY declare
`producer: compute | process`. An event input MAY declare `claimable: true`. Neither is legal
anywhere else.

**C-35.** A Blockie MUST NOT have more than one effective producer for any value output, and MUST
NOT expose a port its Type does not declare.

**C-36.** A Type package is immutable once published. Changing ports, schemas, logic, or
capabilities requires a new version. A World never silently resolves a different version.

## 10. Invariants

**C-37.** At most one active Run per Blockie.
**C-38.** Exactly one host Blockie per Run.
**C-39.** At most one direct Composite per Blockie.
**C-40.** Containment and process parentage are both acyclic.
**C-41.** At most one manager per Composite; the manager MUST be a direct member and occupied.
**C-42.** Every alias has exactly one source; alias chains terminate at a member port or a fold.
**C-43.** A value output has exactly one effective producer; a value input has at most one.
**C-44.** A Composite is never empty while assembled; removing the last member dissolves it.
**C-45.** A Run never writes the World document and never writes its host's Model State.
**C-46.** A terminal Run, the clearing of its manager designation, and the resulting output
unavailability MUST commit in one generation.
**C-47.** No connection addresses a member port from outside its owning Composite.

## 11. Validation and repair

**C-48.** Validation proceeds in three passes: structural (schema), cross-reference (every
reference resolves and every type relation holds), then invariant.

**C-49.** A structural or cross-reference failure MUST reject the document. The World does not
load.

**C-50.** An invariant failure whose repair is unambiguous MUST be repaired with a diagnostic
rather than rejected. The only repair in 0.1 is a dangling manager designation: if the manager Run
is terminal or the manager is no longer a direct member, the designation is cleared and the
Composite becomes unmanaged.

**C-51.** State or configuration that fails its declared type MUST reject. It is never coerced,
defaulted, or partially applied.

## 12. Conformance

An implementation claiming BCM conformance MUST: parse and validate the canonical document;
preserve identity across every structural change; derive occupancy, status, availability, and
footprint rather than storing them; enforce C-37 through C-47; and pass the `schema` and
`validator` vectors in `schema/0002-conformance-fixtures.md`.

## 13. Not owned here

Run execution and scheduling (BPS). Composite operations and interface semantics (BCS). Type
expressions, assignability, and equality (BTS + D-020). Document encoding for digesting — still
open.
