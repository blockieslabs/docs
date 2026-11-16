# 0003 — Host is mandatory, placement is nullable

**Date:** 2026-11-15
**Status:** Accepted
**Supersedes:** D-008 in 0002 (stage/backstage)

## D-013 — Every run has a host; a host may have no placement

The host Blockie is the run's **interface to the World** — its ports, membership, authority
scope, and identity. It is not the run's picture. Removing the host to hide a run removes the
run's ability to communicate, which is why "no host" was rejected.

`placement` is therefore nullable. A Blockie with `placement: null`:

- has identity, ports, state, and Composite membership as usual;
- is not drawn and is not hit-tested;
- contributes nothing to any footprint;
- is not moved by a group move;
- is still countable and still promotable.

**Promotion** is `assign placement`. **Demotion** is `clear placement`. Both are ordinary
placement operations: reversible, identity-preserving, and they change no capability.

Rejected alternatives:

| Option | Why rejected |
|---|---|
| Headless runs (no host) | Removes the run's ports and membership; needs a second channel; two classes of run with different capabilities; promotion becomes a capability change |
| Backstage region | Invents a spatial concept with no meaning; unplaced is the honest form |

## D-014 — Primary status is derived, never declared

The status vocabulary is fixed by the protocol and computed from authoritative records:

| Status | Derived from |
|---|---|
| `working` | run `running` or `queued` |
| `idle` | run `waiting`, no pending external dependency |
| `blocked` | run `waiting` with a human wait reason (F-21) |
| `done` | run `succeeded` and unacknowledged (F-22) |
| `error` | run `failed` |

A definition may **not** declare its primary status. A declared status can be wrong — stuck in a
retry loop, waiting on a dead socket, silently finished — and a status that can lie is worse
than no status, because viewers and agents will trust it. Derived status cannot lie.

Definitions MAY declare optional **sub-phases** inside `working` (`planning`, `fetching`,
`verifying`) as display detail. Sub-phases:

- are cosmetic and carry no semantics;
- are never the primary status;
- are absent by default;
- are deferred from v1.

Reason for the split: a per-definition vocabulary is not comparable across definitions, so no
shared question ("which runs are blocked right now?") can be answered. One shared axis is
required; the detail is optional.
