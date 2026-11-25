# 0012 — Composite is a multi-cell widget with a brain

**Date:** 2026-11-25
**Status:** Accepted
**Builds on:** 0001–0011
**Amends:** C-3, C-41, C-44, C-47; S-1–S-44; the `Composite` and `MemberEdge` shapes

## D-047 — A Composite has exactly one Brain, zero or more Parts, and zero or more Members

The previous model defined a Composite as a generic grouping: membership edges, an alias table,
folds, an optional manager, and presentation. That is too loose. It describes a *set* of entities,
not a *thing*. It also conflates two different objects:

- a **gauge** made of three cells, which behaves as one visual widget;
- a **dashboard** that arranges several independent widgets.

The correction is not a new entity kind. It is a role model inside the existing Composite:

| Role | What it is | Cardinality |
|---|---|---|
| **Brain** | the Blockie that owns the Composite's state, ports, and logic | exactly one |
| **Part** | a Blockie that renders a slice of the Composite; visual, vacant, driven by the Brain | zero or more |
| **Member** | a Blockie or nested Composite with its own behavior; coordinated by the Composite | zero or more |
| **Manager** | a Run hosted by a Member (often the Brain) with `composite.dispatch` over Members | zero or one |

### The rules

1. **Exactly one Brain.** It MUST be a direct member, MUST be a Blockie, and MUST have role
   `brain`. The Brain is an identity, not a Blueprint: `gaugeBrain` pins `gauge@1`; the Composite
   points at `gaugeBrain`.
2. **Parts are Blockies and MUST be vacant.** A Part is a visual extension; if it hosts a Run, its
   role is `member`, not `part`.
3. **Members are Blockies or Composites.** A nested Composite is a Member, never a Part.
4. **At least one non-Brain child.** A Composite with only a Brain is a Blockie, not a Composite.
   Removing the last non-Brain child dissolves the Composite; the Brain becomes standalone.
5. **The Composite itself still has no Blueprint, no state, and no ports.** The Brain provides the
   behavior; aliases expose the Brain's or Members' ports. The Composite is the arrangement.
6. **Parts are not interface.** An alias or fold MUST NOT source a Part. The Manager's `memberSet`
   contains Members and the Brain, never Parts. Parts are driven by the Brain through internal
   connections.
7. **The Manager is a Run role, not the Brain.** The Brain owns behavior; the Manager coordinates
   Members. A Brain may host the Manager Run, or the Manager may live on another Member.
8. **Gauge and Dashboard are patterns, not kinds.** Both are Composites. The Gauge's children are
   Parts; the Dashboard's children are Members. The entity kind is Composite either way.

### Why one kind, not two

If Gauge and Dashboard were different kinds, every operation would need a case for each: place,
move, nest, alias, fold, footprint, template, fork, dissolve, and hit test. Mixed trees — a
dashboard containing a gauge — would need a rule at every boundary. And the boundary between
"widget" and "group" is subjective: a card with a title and a button is both. Roles answer that
without a taxonomy, and they preserve the four entity kinds.

### Schema changes

| Before | After |
|---|---|
| `MemberEdge` has `entity`, `provenance` | adds `role: "brain" \| "part" \| "member"` |
| `Composite.members` may be any length | at least two members: exactly one `brain`, at least one non-brain |
| `Alias` may source any member port | sources the Brain or a Member, never a Part |
| `Fold` may select any member | selects Members, never Parts |
| `DispatchGrant.memberSet` may list any member | lists Members and the Brain, never Parts |
| `Run.host` may be any Blockie | a Part MUST be vacant; a Run on a Part makes it a Member |

### The running example

- **Gauge**: a Composite `gaugeWidget` with Brain `gaugeBrain` (Blueprint `gauge@1`) and two Parts
  `gaugeSegment0`, `gaugeSegment1` (Blueprint `gauge-segment@1`). The Brain reads `count`, computes
  `level` and `display`; each Part computes its `fill` from `level` and its `index` config.
- **Dashboard**: a Composite `dashboard` with Brain `managerBlockie` (Blueprint `manager@1`) and
  Members `button`, `counter1`, `counter2`, and the `gaugeWidget` Composite. The Manager Run
  `orchestrator` is hosted by `managerBlockie`.
- **Button**: a Blockie (one cell).
- **Counter**: a Blockie (one cell).

This gives a two-level tree: dashboard → gauge → parts. Each Composite has a Brain; the Gauge's
Brain is compute-only, the Dashboard's Brain hosts the Manager Run.

### Consequences

The specifications, schema, example, field guide, glossary, and both traces change. The decision
log remains append-only; this document amends the Composite requirements without rewriting the
earlier decisions.
