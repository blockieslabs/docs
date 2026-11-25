# BPS — Blockies Process Specification

**Version:** 0.1.0-draft
**Status:** Proposed. Normative once ratified.
**Derived from:** decisions 0001–0008, F-01 … F-03, F-11, F-21, F-22.
**Depends on:** BCM (entities, identity, derivations).

## 1. Normative language

Requirements are numbered `P-n`.

## 2. Scope and authority

BPS defines how a Run is defined, attached, scheduled, stepped, waited, cancelled, and recovered.
It does not define Composite structure (BCS) or the document model (BCM). Scheduling order between
phases is defined here; document transactions are BCS.

The Brain is a Blockie role; the Manager is a Run role. A Brain may host the Manager Run, but being
the Brain does not grant management authority.

## 3. Definitions

**P-1.** A Process definition is immutable and digest-pinned. It declares:

- `stateType`: the value type of the run's own state;
- `host`: `claims`, `reads`, `publishes`;
- `step`: runtime, module digest, export;
- `wake`: the wait conditions the run may use;
- optional `limits`.

**P-2.** A definition MUST NOT declare capabilities. Capabilities are granted by the World or the
host, never by the definition.

**P-3.** `claims` MUST be a subset of the host Blueprint's claimable event inputs. `publishes` MUST be a
subset of the host Blueprint's `producer: process` value outputs. `reads` MUST be a subset of the host
Blueprint's value inputs. Violations are rejected at attach, not at run time.

## 4. Runs

**P-4.** A Run has: identity, host Blockie, definition reference, status, optional wait condition,
acknowledgement, optional parent Run, its own state, an inbox, and an optional dispatch grant.

**P-5.** Run state is owned by the Run. It is never the host's Blockie state and is never written by
the host's reducer or compute.

**P-6.** A Run's state MUST validate against `stateType` after every step. An invalid state is a
contract violation (P-22), not a run-local failure.

**P-7.** Process parentage is set at spawn and never changes. It is independent of Composite
membership: a spawned host MAY be placed in any Composite, or none, by a separate explicit
document transaction.

**P-8.** A Run MAY be spawned without being a member of anything. Membership is never inferred
from parentage.

## 5. Lifecycle

**P-9.** Statuses: `queued`, `running`, `waiting`, `suspended`, `cancelling`; terminal `succeeded`,
`failed`, `cancelled`.

**P-10.** Transition authority:

| Transition | Authority |
|---|---|
| create → `queued` | document transaction (attach) |
| `queued` → `running` | scheduler, at the start of a step |
| `running` → `waiting` | the step's own result |
| `waiting` → `queued` | satisfied wait condition |
| `running`/`waiting` → `suspended` | World or host policy |
| `suspended` → `queued` | policy |
| any non-terminal → `cancelling` | authorised cancellation request |
| `cancelling` → `cancelled` | step acknowledgement or grace expiry |
| `running` → `succeeded` / `failed` | the step's outcome or a run-local failure |

**P-11.** A terminal Run is detached from its host. The host becomes vacant, and any
`producer: process` port becomes unavailable, in the same generation (C-46).

## 6. Attachment

**P-12.** Attachment is atomic. It MUST verify: the host exists and is vacant; the host is not a
Part; the definition resolves and its digest matches; P-3 holds; the World policy permits the run;
and, if a manager designation is part of the same transaction, the host is a direct Brain or Member
of that Composite.

**P-13.** Attachment MUST NOT change the host's Blueprint, state, configuration, or placement.

**P-14.** A Blockie hosts at most one active Run (C-37). A second attachment is rejected.

## 7. Claims

**P-15.** A delivery to a claimed event input is appended to the Run's inbox and never invokes the
host's reducer. A delivery to an unclaimed input invokes the reducer and never enters the inbox.

**P-16.** Exclusivity is structural: an input is reducer-owned or run-owned, never both. There is
no double invocation and no fallback from one to the other.

**P-17.** Only event inputs may be claimed. Value changes are observed through `reads` and
satisfied through wait conditions.

**P-18.** Claims are fixed for the life of the Run. There are no dynamic claims in 0.1.

## 8. Producers

**P-19.** A Run publishes only to its `publishes` ports, and only through the step result. It
writes no other port, no host state, and no document field.

**P-20.** Event outputs are channels and may be produced by both the reducer and the Run. When
both emit in one transaction, event-phase emissions enqueue before process-phase emissions.

## 9. Steps

**P-21.** A step receives exactly: its own state, the host's configuration (read-only), the
resolved values of its `reads` ports, its inbox items, and its grant if any. It does not receive
host Blockie state, host ports outside `reads`, other entities, or ambient environment. A
configuration change takes effect at the next step and does not wake a Run.

**P-22.** A step returns: `state` (required), and optionally `publish`, `dispatch`, `wait`, and
`outcome`.

- `outcome` present → terminal (`succeeded`, `failed`, or `cancelled`).
- `wait` present → `waiting` with that reason.
- neither → the Run returns to `queued` and is stepped again in a later transaction.

**P-23.** A step is bounded by its limits. It never spans a commit.

**P-24.** A Run steps at most once per transaction.

## 10. Failure classes

**P-25.**

| Event | Class | Result |
|---|---|---|
| Step throws, traps, or exceeds time or memory | run-local | Run → `failed`; transaction commits |
| Step returns an invalid state, undeclared publish, invalid value, or undeclared dispatch target | contract violation | transaction aborts |
| Inbox append fails validation | transaction-fatal | transaction aborts |

**P-26.** A run-local failure MUST NOT roll back valid state transitions elsewhere in the
transaction.

## 11. Phases and scheduling

**P-27.** A transaction proceeds: accept → validate → stage → event phase → process phase → value
phase → prepare → commit → publish → effects.

**P-28.** The process phase begins only after the event queue is empty. Reducers never observe
derived values, and steps never run between reducer deliveries.

**P-29.** Ready Runs are processed through a FIFO. Among Runs that become ready at the same point,
order is ascending Run ID, bytewise.

**P-30.** A step may append to another Run's inbox or dispatch to a member. A target that has not
yet stepped joins the FIFO; a target that has already stepped is deferred to the next transaction.

**P-31.** A per-transaction step budget is enforced. Exhaustion defers the remaining Runs; it is
not an error.

## 12. Waiting and wake

**P-32.** Wait reasons: `inbox`, `human_permission`, `human_question`, `human_auth`,
`external_service`, `timer`, `dependency`.

**P-33.** A `dependency` condition is satisfied when one of the Run's `reads` values changes. That
change is visible only in the value phase, so the Run is scheduled for a later transaction.

**P-34.** A Run MUST NOT observe a value change in the transaction that produced it. A step always
reads one coherent generation.

**P-35.** `inbox` is satisfied by a non-empty inbox. `timer` by elapsed time. `human_*` only by an
explicit authorised response.

## 13. Dispatch

**P-36.** A Run holding a grant may dispatch an addressed event to a Member or the Brain in its
`memberSet`. It MUST NOT dispatch to a Part.

**P-37.** Dispatch creates a new event with a new ID and `causation` equal to the event being
handled. The target MUST be validated against `memberSet` before the event is created.

**P-38.** The grant is materialised at designation from the Composite's direct Members and its
Brain, excluding Parts, and is invalidated in the same transaction as any membership change that
removes a listed member.

## 14. Cancellation

**P-39.** Cancellation authority is separate from management. It comes from World policy, the
parent Run, or deletion of the host.

**P-40.** A cancellation request moves the Run to `cancelling`. The step acknowledges, or the host
applies a grace period and then forces `cancelled`.

**P-41.** When a Run reaches a terminal state, its descendants are requested to cancel. This is a
request, not a silent kill: each descendant transitions through `cancelling`.

**P-42.** Deleting a host Blockie with an active Run MUST terminate the Run first, in the same
transaction.

## 15. Recovery

**P-43.** A Run found in `running` at load, with no live executor, MUST resolve by declared host
policy to `failed`, or resume from its last checkpoint. The policy MUST be stated; it is not
implementation-defined at run time.

**P-44.** A Run found in `cancelling` at load completes cancellation.

**P-45.** Inbox items survive a restart and are delivered at least once. A step MUST be idempotent
or the definition MUST declare otherwise.

## 16. Conformance

An implementation claiming BPS conformance MUST: enforce P-3 at attach; implement claim
exclusivity; run the process phase after the event phase with one step per Run per transaction;
classify failures per P-25; honour P-33 and P-34; and pass the runtime vectors RT-A, RT-B, and
RT-C in `schema/0002-conformance-fixtures.md`.

## 17. Not owned here

Composite membership and manager designation (BCS). Document transactions (BCS). Effect execution
(F-11; no specification yet). Distributed or multi-host execution (deferred).
