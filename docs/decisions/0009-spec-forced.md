# 0009 — Spec-forced decisions

**Date:** 2026-11-16
**Status:** Accepted (working)
**Source:** `specs/BPS-process.md`, `specs/BCM-core-model.md`

Writing the specifications required three decisions that the earlier records did not cover. They
are recorded here rather than left implicit in normative text.

## D-039 — The step result is a three-way outcome

A step returns `state` (required) and optionally `publish`, `dispatch`, `wait`, and `outcome`.

| Result contains | Meaning |
|---|---|
| `outcome` | terminal: `succeeded`, `failed`, or `cancelled` |
| `wait` | `waiting` with that reason |
| neither | the Run returns to `queued` and is stepped again in a later transaction |

The third case is what makes loops expressible without a special "continue" flag. It is bounded
by P-24 (one step per Run per transaction), so a loop costs one transaction per iteration and can
never spin inside a commit.

`outcome` and `wait` together are a contract violation: a Run cannot both finish and wait.

## D-040 — The step context includes host configuration, never host state

A step receives its own state, the host's configuration read-only, the resolved `reads` values,
its inbox, and its grant.

Configuration is declared, typed, and construction-shaped; excluding it would force every author
to copy the same values into run state. It is not a value dependency: a configuration change takes
effect at the next step and does not wake the Run. Host Model State is excluded because it changes
under the reducer, and a run reading it would be a second reader of mutable state with no
dependency edge to keep it coherent.

## D-041 — Repair is limited to dangling designation

Validation rejects on structural and cross-reference failures. Among invariant failures, exactly
one is repaired rather than rejected: a manager designation whose Run is terminal or whose host is
no longer a direct member. It is cleared, the Composite becomes unmanaged, and a diagnostic is
emitted.

Every other invariant failure rejects the document. Repair is not a general recovery mechanism; it
exists because a crashed host can leave a designation that is unambiguous to clear, and refusing
to open the World would be worse than clearing it.
