# 0007 — Corrections forced by schema work

**Date:** 2026-11-16
**Status:** Accepted (working)
**Source:** `schema/0001-minimal-model.md`

## D-032 — Dispatch is not a Composite alias source

D-015 listed `addressed_dispatch` as an allowed source for an `event`/`out` alias. That was
wrong. Dispatch is **internal**: the manager's run addresses a direct member's event input. It is
not a public endpoint, and exposing it as one would let external actors address members directly,
which is precisely what the boundary exists to prevent.

Correction: an alias ref is either `{ member, port }` or `{ fold }`. Nothing else.

The Composite's public event outputs are aliases to member event outputs, as before. A manager
that wants to emit outward publishes on its own host port and an alias picks it up.

## D-033 — The dispatch endpoint is a grant, not a port

D-018 deferred the encoding of the dispatch endpoint. It is not a port and not a third port kind.
It is the run's **grant**:

```ts
grant?: { composite: Id; memberSet: EntityRef[] }
```

A step returns dispatch actions in its result, and the runtime validates each target against
`memberSet` before creating the new event. Three consequences:

- no new port kind, so the type system is untouched;
- the possible route graph is still statically known from `memberSet`, so validation is preserved;
- a run without a grant cannot dispatch, so ordinary runs need no new rule.

`memberSet` is materialised at designation time from the Composite's direct members, and a
membership change that removes a listed member invalidates the grant in the same transaction.

## D-034 — Absence is the canonical encoding for unplaced and dissolved

A Blockie with no placement is **absent** from the `placements` table. A dissolved Composite is
**absent** from `composites`. Neither is encoded as `null`.

D-013's semantics are unchanged; only its encoding is. `placement: null` in that decision means
"there is no placement record".

Reason: absent and `null` are distinct values throughout the protocol (D-020), and using `null`
for "no placement" would make it indistinguishable from a placement whose value is explicitly
null, which is not a legal placement. Presence means placed; absence means unplaced.
