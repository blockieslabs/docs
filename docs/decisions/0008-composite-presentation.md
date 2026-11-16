# 0008 — Composite presentation

**Date:** 2026-11-16
**Status:** Accepted (working)
**Closes:** the last open architectural gap — a Composite has no Type, so nothing draws it.

## The problem

A Blockie's appearance comes from its Type: `archetype.renderer` names a renderer package. A
Composite has no Type, by design (0001). Yet a Composite is visibly a thing — the beige cluster in
the reference image, the grouping affordances in an editor, the label a presenter reads. Without a
rule, the platform's most visible artifact is undefined at the layer that makes it visible.

## D-035 — Presentation is a declarative record, not a Type

A Composite MAY carry a presentation record:

```ts
presentation?: {
  label: string;          // human name; the Composite equivalent of config.label
  renderer?: DefRef;      // a renderer package, not a Type
  body?: EntityRef;       // a member that visually stands for the assembly
}
```

Three things this is **not**:

- not a Type. A Type carries ports, state, and logic. A renderer package carries only drawing. The
  distinction is the reason `renderer` is a separate field rather than a hidden Type;
- not a styling system. Style belongs to the renderer package. The World records *what* to draw and
  *who draws it*, never *how it looks*;
- not a member. `body` names an existing member; it does not create a surface entity.

When `presentation` is absent, the session's default composite renderer draws bounds and the id as
a label. That is the zero-configuration case and it must look reasonable, because most Composites
will have no presentation record.

`body` must be a direct member. If it is unplaced, it is ignored and the default chrome is used. A
nested Composite may be a body; nesting is acyclic, so this cannot recurse.

## D-036 — Chrome is never interactive

Only Blockies are hit-tested. A Composite's chrome, its body surface, and its label are not click
targets. Interaction always resolves to a Blockie's port, or to a Composite alias whose ref is a
member port.

Reason: an invisible or decorative click target has no owner, so no authority can be attached to
it. The audience-voting scenario works because the buttons are Blockies with ports and a grant
scope — not because a region of the screen was clickable.

## D-037 — A Composite's own appearance is static per revision

Presentation is authored by a document transaction. It is never written by a run: D-002 and D-018
forbid runs writing the document, and presentation is document state.

Anything dynamic about a Composite's appearance must come from a member. A member has a Type, a
renderer, and ports; a run can publish to a member's process port; the renderer draws the change.
The Composite's chrome does not animate, tick, or bind to values in v1.

Consequence: a Composite that needs a live counter in its frame gets a member Blockie that renders
the counter, not a template string in the presentation record.

## D-038 — Draw order is members above the assembly; layer orders members

- A Composite's body and chrome draw beneath its members.
- Among members of the same scope, draw order is `Placement.layer` ascending, default `0`, ties
  broken by entity id (bytewise). `layer` is presentation data and is semantically inert (D-006).
- An unplaced Composite has no origin, so its members cannot resolve to world coordinates and are
  not drawn, regardless of their own placement records. Placement still exists; visibility does
  not. Promotion of a member therefore requires its scope to be placed first.

## Schema impact

- `Composite.presentation?: CompositePresentation`
- `Placement.layer?: integer`

Both optional, so every existing document stays valid. The example for trace A is unchanged.

## What this deliberately leaves open

- Style, typography, corner radii, materials. Renderer package territory.
- Whether a session may hide a Composite's chrome. View configuration (A3), not World state.
- Animated chrome. Deferred; D-037 makes it a member's job.
- 3D surfaces. The `body` mechanism generalises; the renderer contract does not exist yet.
