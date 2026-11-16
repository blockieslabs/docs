# BCS — Blockies Composite Specification

**Version:** 0.1.0-draft
**Status:** Proposed. Normative once ratified.
**Derived from:** decisions 0001–0008, F-05 … F-08, F-17.
**Depends on:** BCM (entities, identity, derivations), BPS (runs, grants).

## 1. Normative language

Requirements are numbered `S-n`.

## 2. Scope and authority

BCS defines how Composites come into existence, how membership changes, how a manager is
designated, what a public interface means, and how a Composite is presented. BCM defines what a
Composite *is*; BCS defines what may be *done* to one.

A Composite owns no ports. Its interface is an alias table over member ports and folds. This is
the single most important property in this document: there is no second port system.

## 3. Origins

**S-1.** A Composite has exactly one origin:

- **grouping** — assembled ad hoc from existing entities. Membership is mutable.
- **template** — materialised from a pinned Composite definition. Membership is immutable for the
  life of the instance.

**S-2.** A grouping MAY be saved as a definition, which is then immutable and versioned.

**S-3.** A template instance MAY be forked into a grouping. Fork preserves every member identity,
rewrites every membership edge's provenance from `template` to `grouping`, and drops the pinned
definition and member map. Fork is the only way to change an instantiated topology without
publishing a new definition version.

**S-4.** A grouping containing an ad-hoc nested Composite MUST be saved recursively: each nested
grouping becomes its own definition. A save that would produce a recursive definition is rejected.

**S-5.** Save-as captures structure, member Type references, initial configuration, the alias
table, folds, and presentation. It MUST NOT capture Model State, run state, or member identities.

## 4. Membership

**S-6.** Membership is explicit. Adjacency, visual similarity, and shared origin MUST NOT imply it.

**S-7.** A Blockie or Composite is a direct member of at most one Composite (C-39). A standalone
entity has no membership edge.

**S-8.** Containment is acyclic. A Composite MUST NOT contain itself directly or transitively.

**S-9.** Every membership edge carries provenance: `grouping`, or `template` with the local node
id. Provenance MUST match the Composite's origin.

**S-10.** Removing a member does not delete it. It remains in the World with its identity, state,
placement, and Run unchanged.

**S-11.** A committed Composite MUST NOT be empty. Removing the last direct member dissolves the
Composite in the same transaction.

**S-12.** Dissolving preserves members. Their placements are converted into the parent scope,
preserving world transforms (C-22). Aliases, folds, presentation, and the manager designation are
discarded, and connections addressing the dissolved Composite's aliases are removed, in the same
transaction.

## 5. Manager

**S-13.** A Composite MAY designate zero or one manager. The manager MUST be a direct member and
MUST be occupied by an active Run (C-41).

**S-14.** Management is a designation, not a role and not ownership. The manager's Run holds
exactly one capability: `composite.dispatch`, bounded by a `memberSet` materialised from the
Composite's direct members.

**S-15.** A manager MUST NOT add, remove, move, or reparent members; read member Model State,
configuration, or nested internals; cancel a member's Run; or write any part of the document,
including presentation.

**S-16.** Every designation carries an epoch that increments on every change. A grant from an
earlier epoch is rejected.

**S-17.** Designation and attachment of the manager's Run MAY commit in one transaction. A
designation MUST NOT exist for a Run that is not yet attached.

**S-18.** When the manager's Run becomes terminal, the Run status, the host's vacancy, the
cleared designation, and the resulting output unavailability MUST commit in one generation
(C-46). A dangling designation found at load is repaired to unmanaged with a diagnostic (C-50).

**S-19.** A Composite MAY exist and function with no manager. Its interface is then fully
declarative: aliases and folds only.

## 6. Aliases

**S-20.** An alias declares a public endpoint and exactly one source: a direct member's port, or a
fold. It has no state and no lifecycle.

**S-21.** A public value output MUST have exactly one source. A public value input MAY fan out
through multiple alias entries, each with exactly one target; the target input still has one
effective producer.

**S-22.** A public event output MAY have several sources. Ordering follows the phase rule (P-20).

**S-23.** The member port's type is canonical. The alias type is an assertion and MUST be
assignable in the correct direction; it MUST NOT widen the member's contract.

**S-24.** Alias chains resolve outward-in through nesting and MUST terminate at a member port or a
fold. A cycle is invalid.

**S-25.** A connection endpoint naming a Composite names an alias. It never names a member port
(C-47). External consumers never see member identities.

**S-26.** Removing a member that an alias references invalidates the alias. The transaction that
removes the member MUST repair or reject the interface in the same commit.

**S-27.** Dispatch is never exposed as an alias. It is internal to the manager's Run (S-14).

## 7. Folds

**S-28.** A fold aggregates a declared set of member value outputs with one operation: `sum`,
`count`, `min`, `max`, or `collect`. It is evaluated by the runtime in the value phase. It uses no
process and no shared state.

**S-29.** A fold selects either all direct members or an explicit list. On any membership change
the fold is revalidated in the same transaction: every selected member MUST expose the declared
port with a compatible type, or the transaction repairs or rejects.

**S-30.** An empty selection is legal only when the fold declares an `emptyValue` valid for its
result type.

**S-31.** A fold may select a nested Composite's public output; it never reaches into nested
internals.

**S-32.** A fold is the only permitted aggregation. Implicit fan-in remains forbidden (C-43).

## 8. Nesting and visibility

**S-33.** A nested Composite is a member of its parent. The parent MAY bind to and observe the
nested Composite's public aliases. It MUST NOT address the nested Composite's members.

**S-34.** A nested Composite has its own manager, aliases, folds, and presentation. A parent's
manager gains no authority over a child.

**S-35.** A child manager's termination does not cascade upward. The parent's designation is
untouched; only outputs that depended on the child become unavailable.

## 9. Footprint

**S-36.** A Composite's footprint is derived from member world bounds (C-31). It is not stored and
does not determine membership.

**S-37.** A Composite MAY be spatially disconnected. Spatial order MUST NOT imply execution order,
communication, membership, parentage, or authority.

**S-38.** An unplaced Composite has no origin; its members are not drawn (C-21). A placed Composite
whose members are all unplaced has an empty footprint and is not drawn.

## 10. Presentation

**S-39.** A Composite MAY carry `label`, an optional renderer package reference, and an optional
`body` naming a direct member. It MUST NOT carry styling: style belongs to the renderer package.

**S-40.** Chrome and body surfaces are never interactive. Only Blockies are hit-tested; interaction
resolves to a Blockie port or a Composite alias whose source is a member port.

**S-41.** A Composite's own presentation is static per document revision. A Run never writes it.
Anything dynamic MUST be a member.

**S-42.** When presentation is absent, the session's default composite renderer draws bounds and
the id. That default MUST be usable without configuration.

**S-43.** Members draw above the body and chrome. Among members of one scope, order is
`Placement.layer` ascending, ties broken by entity id (C-24).

## 11. Operations

Each operation is one atomic document transaction. A partial result is a corrupt World.

| Operation | Preconditions | Effects |
|---|---|---|
| `group` | entities exist and are unowned | Composite created, edges added with `grouping` provenance |
| `instantiate` | definition resolves and pins; parameters valid | fresh IDs for Composite and members, `template` provenance, member map |
| `save_as` | origin is grouping; no recursive definition | immutable definition published or embedded |
| `fork` | origin is template | provenance rewritten, definition and member map dropped |
| `add_member` | entity unowned; no cycle | edge added; folds revalidated |
| `remove_member` | — | edge removed; aliases repaired or rejected; grant invalidated; empty → dissolve |
| `dissolve` | — | members preserved, placements converted, interface discarded, connections removed |
| `designate` | manager is a direct member and occupied | designation set, epoch incremented, grant materialised |
| `handoff` | new manager is a direct member and occupied | old grant revoked, new designation, epoch incremented |
| `set_presentation` | `body` is a direct member | presentation replaced |

**S-44.** Every operation MUST be validated against S-6 through S-43 before commit.

## 12. Validation

A Composite document is invalid if: a member is owned twice; containment is cyclic; an alias has
zero or multiple sources, or a source that is not a direct member; an alias chain cycles; a
public value output has two producers; a fold selects a member without the declared port; a
manager is not a direct member or not occupied; `presentation.body` is not a direct member; a
dispatch target falls outside `memberSet`; or a connection addresses a member port from outside.

## 13. Conformance

An implementation claiming BCS conformance MUST: distinguish grouping from template origin; keep
identity across fork, dissolve, and reparenting; enforce the one-composite and acyclicity rules;
implement the empty-composite rule; keep manager termination atomic; resolve aliases outward-in
with redaction; revalidate folds on membership change; and pass VAL-001 through VAL-018 and the
runtime vectors RT-A-2 and RT-D-1.

## 14. Not owned here

Run execution (BPS). Entity identity and placement mathematics (BCM). Type semantics (BTS).
Instantiation of nested definitions beyond the recursive save rule (deferred: conditional nodes,
repeated nodes, hot-swap).
