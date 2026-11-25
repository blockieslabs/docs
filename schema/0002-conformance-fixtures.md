# 0002 — Conformance fixtures

**Status:** Working draft
**Schema:** `blockies-0.schema.json`
**Source vectors:** `traces/0001-reference-traces.md`

Three levels, reported separately. A schema pass says nothing about runtime conformance.

| Level | What it proves |
|---|---|
| `schema` | The document has the canonical shape |
| `validator` | Cross-references, types, membership, aliases, cycles |
| `runtime` | Reducers, steps, phases, commit, publication |

## Schema vectors

**Positive:** `examples/trace-a.json` validates against `blockies-0.schema.json` with zero errors.

**Negative** — each must be rejected by the schema alone:

| ID | Mutation | Rejected because |
|---|---|---|
| SCH-001 | A fold ref on an `event` alias | Fold refs are `value`/`out` only (D-026) |
| SCH-002 | `producer` on a value input port | Producer applies to value outputs only (D-017) |
| SCH-003 | A run in `waiting` with no `wait` | Wait condition is required when waiting (F-21) |
| SCH-004 | A run in `running` that carries `wait` | Wait is legal only while waiting |
| SCH-005 | A `placement` field on a Blockie | Placement lives in its own table (D-013) |
| SCH-006 | `interface_mode` on a Composite | Deleted as redundant (D-018) |

SCH-005 and SCH-006 are regression tests for the ontology: if either ever passes, a retired
concept has been reintroduced.

## Validator vectors

| ID | Given | Expected |
|---|---|---|
| VAL-001 | A placement key that is not in `blockies` or `composites` | Reject |
| VAL-002 | An alias whose `ref.member` is not a direct child | Reject |
| VAL-003 | `run.host` naming a missing Blockie | Reject |
| VAL-004 | A manager run whose host is not a direct Brain/Member | Reject |
| VAL-005 | A manager run that is not occupied | Reject |
| VAL-006 | An alias naming a port the child's Blueprint does not declare | Reject |
| VAL-007 | A connection whose `from` endpoint is an input | Reject |
| VAL-008 | A connection whose endpoints differ in kind or fail assignability | Reject |
| VAL-009 | Two aliases with the same id | Reject |
| VAL-010 | A fold selecting a Member without the declared port | Reject |
| VAL-011 | A Blockie whose Blueprint is unresolvable or digest-mismatched | Reject |
| VAL-012 | A membership cycle, or a member with two parents | Reject |
| VAL-013 | A connection addressing a child port from outside its Composite | Reject |
| VAL-014 | A run whose `host.claims` names an input the Blueprint does not mark claimable | Reject |
| VAL-015 | A run whose `host.publishes` names a port not marked `producer: process` | Reject |
| VAL-016 | A dispatch target outside `grant.memberSet`, or a Part | Reject |
| VAL-017 | `presentation.body` naming something that is not a direct child | Reject |
| VAL-018 | `presentation.renderer` resolving to a Blueprint instead of a renderer package | Reject |
| VAL-019 | A grant whose scope names a child port from outside its Composite | Reject |
| VAL-020 | Two roles with the same id | Reject |
| VAL-021 | A grant scope combining two forms, such as `world` and `entities` | Reject (schema) |
| VAL-022 | A Composite with no `role: "brain"` member | Reject |
| VAL-023 | A Composite with two `role: "brain"` members | Reject |
| VAL-024 | A `role: "brain"` member whose `entity` is a Composite | Reject |
| VAL-025 | A `role: "part"` member whose `entity` is a Composite | Reject |
| VAL-026 | A `role: "part"` Blockie hosting an active Run | Reject |
| VAL-027 | An alias, fold, or dispatch target naming a Part | Reject |
| VAL-028 | A Composite with a Brain and no other child | Reject |

## Runtime vectors

Each vector names a starting document, one stimulus, and the committed generation. Stimuli are
events; the harness normalises traces so ordering is comparable.

### RT-A-1 — the button

```
given   examples/trace-a.json
when    event press → C.press, actor = audience, grant = deliver press on C.press
then    R1.status      = waiting (reason inbox)
        R1.inbox       = []
        R1.state       = true
        computerM.result = true
        C.lit          = true
        lamp.shown     = true
        lamp.state     = false        (no reducer, unchanged)
        generation     = +1
```

### RT-A-2 — the manager fails

```
given   the state after RT-A-1
when    event press → C.press, and the step throws
then    R1.status        = failed
        R1.ack           = unacknowledged   (display: error)
        computerM        = vacant
        computerM.result = unavailable
        C.manager        = absent
        C                = still assembled  (members remain)
        C.lit            = unavailable
        lamp.shown       = blocked
        generation       = +1, all of the above in ONE generation
```

The single-generation assertion is the test for IR-004. A harness that observes an intermediate
state where `C.manager` exists but `R1` is terminal has failed.

### RT-A-3 — unauthorised delivery

```
given   world_trace_a with policy: role audience may deliver only on C.press
when    event press → C.press from a principal bound to no role
then    rejected before staging
        generation unchanged
        no reducer invocation and no step in the trace
```

Authority is checked once, at entry (D-044). A rejected delivery must leave no partial trace.

### RT-B-1 — delegate

```
given   manager R1 with grant memberSet {W1, W2}
when    event task → C.task, and the step dispatches { to: W2 }
then    R1 steps exactly once
        the dispatch event has a new id and causation = the task event
        W2.inbox consumed, RW2 steps exactly once
        W2.out changes; R1 is NOT re-run in this transaction
        generation = +1
```

### RT-B-2 — completion

```
given   the state after RT-B-1, with W2.out wired to computerM.in
when    RW2 emits completed → R1.inbox
then    R1 steps in a LATER transaction
        generation = +1
```

### RT-C-1 — supervisor reads

```
given   S standalone, inputs wired to C_A.lit and C_B.lit
when    event watch → S.watch
then    the step receives both values as declared inputs
        no Composite authority is exercised
        S remains standalone
```

### RT-C-2 — wake on change

```
given   the state after RT-C-1
when    C_A.lit changes in transaction N
then    R_s is scheduled for transaction N+1, never N
        the step reads one coherent generation
```

### RT-D-1 — nested

```
given   Company with nested Finance, each with its own manager
when    event refresh → Company.refresh, and the parent manager dispatches to Finance
then    the event arrives at Finance's public alias, never an internal port
        Finance's manager steps; Company.revenue updates
        the boundary view reports Company, never Finance member ids
        generation = +1
```

## Deliberately not fixtures

- Renderer output, LOD, aggregation of runs, animation.
- Camera behaviour and viewport framing.
- Presentation metadata.
- Effect execution timing (post-commit, not deterministic).

These belong to A4 and A3. A runtime vector that asserts on pixels is testing the wrong layer.

## Harness contract

```
validate_schema(document)                        -> valid | invalid + path
validate_world(document)                         -> report
submit_event(world, event, actor_grant)          -> transaction_result
read_committed(world)                            -> generation snapshot
read_trace(transaction)                          -> ordered phase events
```

Traces must exclude wall-clock time, thread ids, and memory addresses. Event ids, route ids,
run ids, entity ids, and generation numbers are retained.
