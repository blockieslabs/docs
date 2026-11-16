# FSM inventory

**Status:** Working draft
**Principle:** D-004 — every state that carries transition authority is explicit. Derived
projections are labelled as such and are not state machines.

Levels (A0–A6) are defined in [`layers.md`](layers.md).

## How to read this

Every entry declares eight things: owner, state set, event set, guards, transition
authority, durability, load-recovery rule, and the observable projection a renderer or agent
reads. An FSM missing any of these is not ready to implement.

Two rules:

1. **One field, one owner.** Two FSMs may not write the same field. Where two lifecycles
   touch (run terminal + manager designation) the transition is one transaction with two
   effects, not two FSMs racing.
2. **Durability is a choice, not a default.** A durable FSM must state what happens when the
   process dies mid-transition.

## Protocol FSMs

### F-01 — Process Run

| | |
|---|---|
| Level | A1 (registry) with A2 (executor) |
| States | `queued`, `running`, `waiting`, `suspended`, `cancelling` → `succeeded`, `failed`, `cancelled` |
| Events | `enqueue`, `schedule`, `step_returned`, `await`, `resume`, `suspend`, `cancel_requested`, `cancel_acknowledged`, `step_failed` |
| Authority | World transaction (create/attach); scheduler (`queued→running`); the run's own step result (`running→waiting/succeeded/failed`); command + policy (`→cancelling`); cancellation acknowledgement (`cancelling→cancelled`) |
| Durability | Durable. Full run record, including parent run, host, definition ref, checkpoint |
| Recovery | On load, a run in `running` with no live executor becomes `failed` (crash) or resumes from its last checkpoint, per the host's declared policy. This must be stated, not assumed |
| Projection | Status, host, parent, elapsed, last checkpoint, acknowledgement, placement present/null |

`waiting` and `suspended` are distinct: `waiting` means the run has an unsatisfied wake
condition and is expected to continue; `suspended` means execution is withheld by policy or
operator action.

### F-02 — Process Step

| | |
|---|---|
| Level | A1 (transaction) with A2 (adapter) |
| States | `idle`, `scheduled`, `executing`, `yielded`, `completed`, `failed`, `aborted` |
| Authority | Transaction coordinator only |
| Durability | Transient. Only an `executing` marker plus checkpoint are persisted, for crash detection |
| Recovery | An `executing` marker at load means the step was interrupted: the run returns to `queued` from its checkpoint, or fails, per policy |
| Projection | None directly; surfaced as run status plus step trace |

A step never spans a commit. A step that exhausts its budget returns `yielded` and the run
resumes in a later transaction. This is the mechanism that makes "a whole program" safe.

### F-03 — Inbox Delivery

| | |
|---|---|
| Level | A1 |
| States | `enqueued`, `claimed`, `consumed`, `rejected`, `expired` |
| Events | `deliver`, `claim`, `step_consumed`, `validate_failed`, `ttl_expired` |
| Authority | Runtime; the run may not rewrite an item |
| Durability | Durable while `enqueued`. Deduplicated by delivery ID |
| Recovery | Items survive a crash and are redelivered at least once; the step must be idempotent or the definition must declare otherwise |
| Projection | Queue depth, oldest item age (drives the "why is it not responding" view) |

Only event inputs claimed by the run's host contract enter the inbox (D-016). An unclaimed input
goes to the Type reducer and never appears here.

### F-04 — Run Attachment

| | |
|---|---|
| Level | A1 |
| States | `unattached`, `attaching`, `attached`, `detaching` |
| Authority | World document transaction only |
| Durability | Transient; the settled states are derivable from F-01 |
| Recovery | An interrupted `attaching`/`detaching` at load resolves to `unattached` (fail-safe) |
| Projection | This is what makes Blockie occupancy derivable. It is not itself stored as a mode |

### F-05 — Composite Membership Edge

| | |
|---|---|
| Level | A0 schema, A1 transaction |
| States | `committed`, `removed` |
| Authority | World document transaction |
| Durability | Durable, with provenance (`grouping` or `template:<local_id>`) |
| Recovery | A member whose provenance does not match its pinned template is a materialisation error, not a repair |
| Projection | Membership list per Composite |

No `proposed` state: document transactions are atomic, so a half-added member cannot exist.

### F-06 — Composite Lifecycle

| | |
|---|---|
| Level | A1 |
| States | `forming`, `assembled`, `dissolving`, `dissolved` |
| Authority | World document transaction |
| Durability | Only `assembled` is durable, encoded as presence in `composites`. `dissolved` is removal, not a stored state (D-034) |
| Recovery | `forming` and `dissolving` are transaction-internal and cannot appear at load |
| Projection | Existence in the world, member count |

### F-07 — Composite Management

| | |
|---|---|
| Level | A1 |
| States | `unmanaged`, `designating`, `managed`, `handoff_pending` |
| Events | `designate`, `run_terminal`, `handoff_requested`, `handoff_committed`, `manager_removed` |
| Authority | World document transaction; `run_terminal` is an *input* to that transaction, not an independent writer |
| Durability | Durable: manager reference plus a designation epoch |
| Recovery | A dangling designation at load (manager run terminal, or manager no longer a member) is repaired to `unmanaged` with a diagnostic. Repair, not reject |
| Projection | Manager, availability, epoch |

The `run_terminal` case must commit run status, host occupancy, and designation in one
transition. Splitting them is what produces a Composite that claims a manager it does not
have.

### F-08 — Composite Interface Mode (withdrawn)

Withdrawn by D-018 / amendment to D-003. The mode was fully implied by `management ≠ unmanaged`,
so it carried no independent information. "Managed" survives as a derived label. A Composite's
interface is always an alias table (D-015); whether a manager exists is F-07.

### F-09 — World Document

| | |
|---|---|
| Level | A1 (document) with A3 (host) |
| States | `editing`, `validating`, `committed(N)`, `rejected` |
| Coherence | `coherent`, `stabilizing`, `incoherent` |
| Authority | Document layer |
| Durability | Revisions durable and monotonic; coherence is transient |
| Recovery | A committed revision always has a stabilised generation, or the World refuses to open |
| Projection | Revision, generation, coherence |

`stabilizing` is the window in which the structure is N+1 but outputs are still N. Views must
not observe that window. This is the single most under-specified area in the v0.1 drafts
(their P1.10) and it is a prerequisite for manager handoff atomicity.

### F-10 — Runtime Transaction

| | |
|---|---|
| Level | A1 |
| States | `accepted`, `validating`, `staging`, `event_phase`, `process_phase`, `value_phase`, `prepared`, `committed`, `published`, `effects_pending`, `complete`, `aborted` |
| Authority | Transaction coordinator |
| Durability | Transaction record durable if the host claims durability; `aborted` publishes nothing |
| Projection | Trace events only |

`process_phase` is new relative to the v0.1 runtime spec and is required by D-002.

### F-11 — Effect Request

| | |
|---|---|
| Level | A2 (executor) with A3 (outbox) |
| States | `requested`, `validated`, `outboxed`, `dispatched`, `succeeded` / `failed` / `timed_out`, `result_delivered`, `acked`, `dead_lettered` |
| Authority | Runtime for the first three; executor for dispatch and outcome; host for delivery |
| Durability | Must be durable if the host claims durable effects; otherwise process-lifetime, stated explicitly |
| Recovery | An `outboxed` or `dispatched` request at load is redelivered; idempotency key required |
| Projection | Pending effects, failure rate |

### F-12 — Definition / Package

| | |
|---|---|
| Level | A0 schema, A3 registry |
| States | `drafted`, `validated`, `published`, `deprecated`, `retired`; agent-authored adds `proposed → accepted` |
| Authority | Registry; author for drafting |
| Durability | Durable and immutable once `published` |
| Projection | Availability, compatibility |

### F-13 — Session / View

| | |
|---|---|
| Level | A3 (session) with A4 (view) |
| States | `created`, `live`, `catching_up`, `paused`, `closed` |
| Grant | `granted`, `suspended`, `revoked` (per view, per scope) |
| Authority | Host |
| Durability | Session durable while live; view-local state never durable |
| Projection | Connection count, lag, grant summary |

`catching_up` is what makes the presenter/audience split honest: a phone that has not received
generation N+1 is not silently showing N as if it were current.

### F-14 — Actor Authority

| | |
|---|---|
| Level | A3 (enforcement), A6 (identity) |
| States | `unauthenticated`, `authorized`, `suspended`, `revoked` |
| Authority | Host, from World policy |
| Durability | Durable grants |
| Projection | Effective capability set per actor |

Manager authority is a *grant* scoped to one Composite, not a role and not a property of the
process definition. In v1 the grant has exactly one verb, `composite.dispatch` (D-018).

### F-15 — Attention (withdrawn)

Withdrawn by D-009. Attention is a projection, not an entity. See the derived projections table.

Open detail (integrity finding I-001): D-009 derives attention from session scopes, which does
not cover an in-world supervisor Blockie — it observes through its process's input bindings,
not through a session. The projection must union both sources before this is closed.

### F-16 — Connection / Route

| | |
|---|---|
| Level | A1 |
| States | `declared`, `materialized`, `active`, `removed` |
| Authority | Document transaction; runtime activates |
| Durability | Durable with provenance |
| Projection | Active routes per endpoint |

### F-17 — Placement Operation

| | |
|---|---|
| Level | A1 |
| States | `requested`, `validated`, `applied` / `aborted` |
| Authority | Document transaction |
| Durability | Transient |
| Projection | None |

Included because group move, reparent, and coordinate-scope change must be atomic; a partially
moved group is a corrupt World.

Operations: `assign` (promote from null), `clear` (demote to null), `move`, `reparent`,
`group_move`, `dissolve_convert`. See D-022 and D-023.

### F-18 — Renderer Resolution

| | |
|---|---|
| Level | A4 |
| States | `unresolved`, `loading`, `ready`, `missing`, `unsupported` |
| Authority | Renderer |
| Durability | Never durable |
| Projection | Missing-renderer badge |

`unsupported` must never block loading or execution. A World without a renderer is still a
World.

### F-19 — Node Computation Status

| | |
|---|---|
| Level | A1 |
| States | `ready`, `dirty`, `running`, `blocked`, `error`, `suspended` |
| Authority | Value-stabilisation pass |
| Durability | Not persisted; recomputed on load |
| Projection | Per-port status, consumed by renderers and by agents debugging a World |

Derived from the stabilisation result, but it has real transitions and is published, so it is
tracked explicitly rather than recomputed ad hoc.

### F-20 — Collaboration / Sync

| | |
|---|---|
| Level | A3 |
| States | deferred |
| | |

Not designed. Placeholder so the gap is visible.

### F-21 — Wait Condition

| | |
|---|---|
| Level | A1 |
| States | `pending`, `satisfied`, `cancelled`, `expired` |
| Events | `await`, `wake`, `cancel`, `ttl` |
| Authority | Runtime for `wake`/`ttl`; the run for `await`/`cancel` |
| Durability | Durable with the run (it is why the run is `waiting`) |
| Recovery | A `pending` condition survives a crash and is re-evaluated at load; a condition whose target no longer exists resolves to `cancelled` |
| Projection | **Wait reason**: `human_permission`, `human_question`, `human_auth`, `external_service`, `timer`, `dependency`, `inbox` |

"Waiting" without a reason is not implementable and not renderable. The reason is the entire
value of the status: it distinguishes "needs a human" from "waiting on a service".

### F-22 — Result Acknowledgement

| | |
|---|---|
| Level | A1 with A3 (delivery) |
| States | `unacknowledged`, `acknowledged`, `expired` |
| Events | `result_ready`, `seen`, `ttl` |
| Authority | Host, on behalf of an actor |
| Durability | Durable while unacknowledged |
| Recovery | Survives restart; an unacknowledged result is still unacknowledged |
| Projection | The difference between "finished" and "finished and nobody has looked" |

This is what terminal-status dialects mean by `done`. It is not run status: a run can be
`succeeded` and unacknowledged for a week.

## Derived projections (not FSMs)

| Projection | Derived from | Never stored because |
|---|---|---|
| Occupancy (`vacant` / `occupied`) | F-01 active run for host | Two writers would disagree |
| Composite footprint | Member placements | Geometry must not become semantic state |
| Manager availability | F-01 status of the designated manager | Availability is a query, designation is the state |
| Interface completeness | F-08 mode plus route table | It is a validation result |
| Run count per Composite | F-01 hosts in the membership tree | Needed for level-of-detail rendering, not for semantics |
| Attention | Session scopes ∪ process input bindings | D-009: derived, grants nothing, implies nothing |

## User-declared FSMs (proposal)

If "everything that can be a state is a state" is to hold for user programs too, the state
machine should be a first-class declared construct in Type and Process Definitions, not an
enum scattered through user code:

```
state_machine {
  states: [...]
  transitions: [{ from, on, guard, to, entry?, exit? }]
  initial: ...
}
```

A Process Run with `kind: fsm` is then an instance of a declared machine, and `step` is one
transition evaluation. Two consequences worth taking seriously:

- The "visual mode to see state flow" becomes a renderer over F-01/F-02 plus the declared
  transition table, instead of a bespoke feature.
- Programs that are not naturally tabular (agent loops, simulations) stay `kind: program`:
  an opaque step function that the runtime still wraps in F-01/F-02. Both kinds share the
  same lifecycle, so the platform does not fork.

## Missing from this inventory

- The spawn transaction (create run + create host Blockie + attach) is atomic, not an FSM,
  but it needs an explicit precondition list.
- Cancellation *policy* (who may cancel a run whose host is in another Composite) is
  authority, not state. It belongs with F-14, not F-01.
- Scheduler capacity (`available` / `reserved` / `busy`) only matters if a World has a run
  budget. Deferred.
