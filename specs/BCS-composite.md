# BCS — Blockies Composite Specification

**Version:** 0.2.0-draft
**Status:** Proposed. Normative once ratified.
**Derived from:** decisions 0001–0012, F-05 … F-08, F-17.
**Depends on:** BCM (entities, identity, placement, derivations), BPS (runs, grants).
**Amends:** the v0.1 Composite as a generic grouping; the Composite is now a multi-cell widget.

## 1. Normative language

Requirements are numbered `S-n`.

## 2. Scope and authority

BCS defines how a Composite comes into existence, how its children are structured, how the Brain,
Parts, Members and Manager relate, what the public interface means, and how a Composite is
presented. BCM defines what a Composite *is*; BCS defines what may be *done* to one.

A Composite owns no ports. Its interface is an alias table over its Brain's and Members' ports and
its folds. This is the single most important property in this document: there is no second port
system.

## 3. Definitions

| Term | Definition |
|---|---|
| **Brain** | the Blockie that owns the Composite's state, ports, and logic. Exactly one, direct member, role `brain`. |
| **Part** | a Blockie that renders a slice of the Composite. Zero or more, direct member, role `part`, vacant. |
| **Member** | a Blockie or nested Composite with its own behavior. Zero or more, direct member, role `member`. |
| **Manager** | a Run hosted by a Brain or Member, holding `composite.dispatch` over Members. Zero or one. |

The Brain is not the Manager. The Brain is a Blockie role; the Manager is a Run role. A Brain may
host the Manager Run, or the Manager may live on another Member.

## 4. Origins

**S-1.** A Composite has exactly one origin:

- **grouping** — assembled ad hoc from existing entities. Membership is mutable.
- **template** — materialised from a pinned Composite definition. Membership is immutable for the
  life of the instance.

**S-2.** A grouping MAY be saved as a definition, which is then immutable and versioned.

**S-3.** A template instance MAY be forked into a grouping. Fork preserves every child identity,
rewrites every membership edge's provenance from `template` to `grouping`, and drops the pinned
definition and member map. Fork is the only way to change an instantiated topology without
publishing a new definition version.

**S-4.** A grouping containing an ad-hoc nested Composite MUST be saved recursively: each nested
grouping becomes its own definition. A save that would produce a recursive definition is rejected.

**S-5.** Save-as captures structure, child Blueprint references, roles, initial configuration, the
alias table, folds, and presentation. It MUST NOT capture Blockie state, Run state, or child
identities.

## 5. Membership and roles

**S-6.** Membership is explicit. Adjacency, visual similarity, and shared origin MUST NOT imply it.

**S-7.** A Blockie or Composite is a direct member of at most one Composite (C-39). A standalone
entity has no membership edge.

**S-8.** Containment is acyclic. A Composite MUST NOT contain itself directly or transitively.

**S-9.** Every membership edge carries:

- a **role**: `brain`, `part`, or `member`;
- **provenance**: `grouping`, or `template` with the local node id.

Provenance and role are independent. A template edge can be a brain, a part, or a member.

**S-10.** Removing a child does not delete it. It remains in the World with its identity, state,
placement, and Run unchanged.

**S-11.** A Composite MUST have exactly one Brain and at least one child that is not the Brain.
Removing the last non-Brain child dissolves the Composite in the same transaction. A Brain-only
Composite is a Blockie, not a Composite.

**S-12.** Dissolving preserves children. The Brain and every Part/Member become standalone. Their
placements are converted into the parent scope, preserving world transforms (C-22). Aliases, folds,
presentation, and the manager designation are discarded, and connections addressing the dissolved
Composite's aliases are removed, in the same transaction.

**S-45.** Exactly one child has role `brain`. It MUST be a direct member and MUST be a Blockie
(C-3a, C-41).

**S-46.** A child with role `part` MUST be a Blockie and MUST be vacant. It is a visual extension:
it MUST NOT be the source of an alias, a fold selection, or a dispatch target. If it hosts a Run,
its role MUST be `member`.

**S-47.** A child with role `member` MAY be a Blockie or a nested Composite. A nested Composite is
always a Member, never a Part.

**S-48.** The Brain owns the Composite's behavior. The Composite itself has no Blueprint, no state,
and no ports. The Brain's state, configuration, and ports are the Composite's substance; the
Composite is the arrangement.

## 6. The Brain

**S-49.** The Brain MUST be a direct member with role `brain`. It MUST be a Blockie. The Composite
references the Brain's identity, never the Brain's Blueprint.

**S-50.** The Brain MAY host a Run. It MAY be a compute-only Blockie with no Run. The Composite's
aliases MAY source the Brain's ports; they are the natural interface for the Composite's own
behavior.

**S-51.** A Brain MUST NOT be a Part. A Brain MAY be the Manager's host, but being the Brain does
not grant management authority.

## 7. Parts

**S-52.** A Part is a Blockie with role `part`. It renders a slice of the Composite: a segment, a
border, a label, a knob. It has no independent coordination role.

**S-53.** A Part MUST be vacant. A Run attached to a Part is a validation failure; the edge's role
must become `member` if the Blockie is to host a Run.

**S-54.** A Part's ports are internal to the Composite. The Brain drives them through connections.
An alias or fold MUST NOT source a Part (C-47).

**S-55.** A Composite grows by adding Parts. The Brain's configuration or logic declares how many
Parts it can drive and what each Part's `index` or role means. Removing a Part shrinks the
Composite; removing the last non-Brain child dissolves it (S-11).

## 8. Members and nesting

**S-33.** A nested Composite is a Member of its parent. The parent MAY bind to and observe the
nested Composite's public aliases. It MUST NOT address the nested Composite's children.

**S-34.** A nested Composite has its own Brain, Parts, Members, Manager, aliases, folds, and
presentation. A parent's Manager gains no authority over a child.

**S-35.** A child Manager's termination does not cascade upward. The parent's designation is
untouched; only outputs that depended on the child become unavailable.

## 9. Manager

**S-13.** A Composite MAY designate zero or one Manager. The Manager MUST be a direct member with
role `brain` or `member` and MUST be occupied by an active Run (C-41). A Part MUST NOT be the
Manager.

**S-14.** Management is a designation, not a role and not ownership. The Manager's Run holds
exactly one capability: `composite.dispatch`, bounded by a `memberSet` materialised from the
Composite's direct Members and its Brain. Parts are never in the memberSet.

**S-15.** A Manager MUST NOT add, remove, move, or reparent children; read child Blockie state,
configuration, or nested internals; cancel a child's Run; or write any part of the document,
including presentation.

**S-16.** Every designation carries an epoch that increments on every change. A grant from an
earlier epoch is rejected.

**S-17.** Designation and attachment of the Manager's Run MAY commit in one transaction. A
designation MUST NOT exist for a Run that is not yet attached.

**S-18.** When the Manager's Run becomes terminal, the Run status, the host's vacancy, the cleared
designation, the revoked grant, and the resulting output unavailability MUST commit in one
generation (C-46). A dangling designation found at load is repaired to unmanaged with a diagnostic
(C-50).

**S-19.** A Composite MAY exist and function with no Manager. Its interface is then fully
declarative: aliases and folds only.

## 10. Aliases

**S-20.** An alias declares a public endpoint and exactly one source: the Brain's port, a Member's
port, or a fold. It has no state and no lifecycle. It MUST NOT source a Part.

**S-21.** A public value output MUST have exactly one source. A public value input MAY fan out
through multiple alias entries, each with exactly one target; the target input still has one
effective producer.

**S-22.** A public event output MAY have several sources. Ordering follows the phase rule (P-20).

**S-23.** The child port's type is canonical. The alias type is an assertion and MUST be assignable
in the correct direction; it MUST NOT widen the child's contract.

**S-24.** Alias chains resolve outward-in through nesting and MUST terminate at a Brain port, a
Member port, or a fold. A cycle is invalid.

**S-25.** A connection endpoint naming a Composite names an alias. It never names a child port
(C-47). External consumers never see child identities.

**S-26.** Removing a child that an alias references invalidates the alias. The transaction that
removes the child MUST repair or reject the interface in the same commit.

**S-27.** Dispatch is never exposed as an alias. It is internal to the Manager's Run (S-14).

## 11. Folds

**S-28.** A fold aggregates a declared set of Member value outputs with one operation: `sum`,
`count`, `min`, `max`, or `collect`. It is evaluated by the runtime in the value phase. It uses no
process and no shared state. It MUST NOT select a Part.

**S-29.** A fold selects either all Members or an explicit list of Members. On any membership change
the fold is revalidated in the same transaction: every selected Member MUST expose the declared
port with a compatible type, or the transaction repairs or rejects.

**S-30.** An empty selection is legal only when the fold declares an `emptyValue` valid for its
result type.

**S-31.** A fold may select a nested Composite's public output; it never reaches into nested
internals.

**S-32.** A fold is the only permitted aggregation. Implicit fan-in remains forbidden (C-43).

## 12. Footprint

**S-36.** A Composite's footprint is derived from its children's world bounds (C-31). It is not
stored and does not determine membership.

**S-37.** A Composite MAY be spatially disconnected. Spatial order MUST NOT imply execution order,
communication, membership, parentage, or authority.

**S-38.** An unplaced Composite has no origin; its children are not drawn (C-21). A placed Composite
whose children are all unplaced has an empty footprint and is not drawn.

## 13. Presentation

**S-39.** A Composite MAY carry `label`, an optional renderer package reference, and an optional
`body` naming a direct child. It MUST NOT carry styling: style belongs to the renderer package.

**S-40.** Chrome and body surfaces are never interactive. Only Blockies are hit-tested; interaction
resolves to a Blockie port or a Composite alias whose source is a Brain/Member port.

**S-41.** A Composite's own presentation is static per document revision. A Run never writes it.
Anything dynamic MUST be a child.

**S-42.** When presentation is absent, the session's default composite renderer draws bounds and
the id. That default MUST be usable without configuration.

**S-43.** Children draw above the body and chrome. Among children of one scope, order is
`Placement.layer` ascending, ties broken by entity id (C-24).

## 14. Operations

Each operation is one atomic document transaction. A partial result is a corrupt World.

| Operation | Preconditions | Effects |
|---|---|---|
| `group` | entities exist, are unowned, and include exactly one Blockie chosen as Brain | Composite created; edges added with roles; `grouping` provenance |
| `instantiate` | definition resolves and pins; parameters valid | fresh IDs for Composite, Brain, Parts, Members; `template` provenance; member map |
| `save_as` | origin is grouping; no recursive definition | immutable definition published or embedded, with roles |
| `fork` | origin is template | provenance rewritten, definition and member map dropped, roles preserved |
| `add_member` | entity unowned; no cycle; role valid | edge added with role; folds revalidated |
| `remove_member` | — | edge removed; aliases repaired or rejected; grant invalidated; last non-Brain child dissolves |
| `replace_brain` | new Brain is a direct Blockie member; old Brain remains or is removed | role `brain` moved; old Brain becomes a Part or Member, or is removed |
| `dissolve` | — | children preserved, placements converted, interface discarded, connections removed |
| `designate` | Manager is a direct Brain/Member and occupied | designation set, epoch incremented, grant materialised |
| `handoff` | new Manager is a direct Brain/Member and occupied | old grant revoked, new designation, epoch incremented |
| `set_presentation` | `body` is a direct child | presentation replaced |

**S-44.** Every operation MUST be validated against S-6 through S-55 before commit.

## 15. Validation

A Composite document is invalid if:

- it has zero or more than one Brain, or the Brain is not a direct member or not a Blockie;
- a Part is not a Blockie, is not vacant, or is the source of an alias, fold, or dispatch target;
- it has no child other than the Brain;
- a child is owned twice;
- containment is cyclic;
- an alias has zero or multiple sources, or a source that is not the Brain, a Member, or a fold;
- an alias chain cycles;
- a public value output has two producers;
- a fold selects a Part or a Member without the declared port;
- a Manager is not a direct Brain/Member or not occupied;
- a Manager is a Part;
- `presentation.body` is not a direct child;
- a dispatch target is outside `memberSet` or is a Part;
- a connection addresses a child port from outside.

**S-52.** A missing, duplicate, or non-Blockie Brain MUST reject. It is not repaired.

**S-53.** A Part that hosts a Run MUST reject; the edge's role must be `member`.

**S-54.** A Part named by an alias, a fold selection, or a dispatch target MUST reject.

## 16. Conformance

An implementation claiming BCS conformance MUST: distinguish grouping from template origin; keep
identity across fork, dissolve, and reparenting; enforce the one-Composite and acyclicity rules;
enforce exactly one Brain, Blockie Parts, vacant Parts, and at least one non-Brain child; keep
Manager termination atomic; resolve aliases outward-in with redaction; revalidate folds on
membership change; and pass VAL-001 through VAL-021 and the runtime vectors RT-A-2 and RT-D-1,
plus the new role vectors VAL-022 through VAL-028.

## 17. Not owned here

Run execution (BPS). Entity identity and placement mathematics (BCM). Value type semantics (BTS).
Instantiation of nested definitions beyond the recursive save rule (deferred: conditional nodes,
repeated nodes, hot-swap).
