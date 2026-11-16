# Blockies Runtime Execution Specification

**Document ID:** BRES  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Normative dependencies:** Blockies Protocol v0.1, Blockies Type System (BTS) v0.1, Blockies Composite Instantiation (BCIS) v0.1, Blockies Composite Computation (BCCS) v0.1, Blockies Composite Event Flow (BCEFS) v0.1  
**Serialization:** JSON-compatible protocol values  
**Reference implementation direction:** Rust core with pluggable execution adapters (non-normative)

---

## About this document

This document specifies the unified execution algorithm for a Blockies World. It combines state transitions, event routing, value dependency evaluation, Composite computation, transaction handling, and post-commit effects into one runtime model.

This is a companion specification. It does not replace the Core Protocol, BTS, BCIS, BCCS, or BCEFS. Where those documents define individual contracts, this document defines their ordering and coordination during execution.

This document is a draft. Its rules should be treated as proposed normative behavior until the companion specifications are reconciled and the v0.1 family is frozen.

## 1. Abstract

A Blockies Runtime executes a World as a reactive system of independently identifiable Blockie instances. A World contains persistent Model State, typed ports, event routes, value dependencies, composition hierarchies, and Composite boundaries.

The Runtime MUST coordinate these mechanisms through one logical transaction scheduler per World.

The v0.1 execution model has two principal internal phases:

1. **Event phase:** process accepted event deliveries serially through a FIFO queue. Reducers produce staged state transitions, further event actions, and effect requests.
2. **Value phase:** after the event queue is empty, stabilize the affected reactive value graph. Atomic Blockie computations and Composite computations execute in dependency order against the staged state generation.

If both phases succeed according to their respective failure rules, the Runtime commits the staged Model State, output statuses, and externally publishable event/effect records as one coherent generation. It then publishes the committed generation and executes authorized effects.

Effects never execute inside a reducer or computation. An effect result enters the World as a new event in a later transaction.

## 2. Normative terminology

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are used normatively.

- **MUST / MUST NOT:** absolute requirement or prohibition.
- **SHOULD / SHOULD NOT:** recommended behavior; deviations require a documented reason.
- **MAY:** optional behavior.

## 3. Scope

### 3.1 In scope

This specification defines:

- Runtime initialization and execution state.
- The logical event and value graphs.
- Runtime transactions and their isolation boundary.
- External command/event acceptance.
- FIFO event delivery and reducer execution.
- Composite event forwarding, notification, exposure, and dispatch coordination.
- Reactive value invalidation and propagation.
- Atomic Blockie and Composite computation scheduling.
- Error propagation and transaction failure semantics.
- Effect collection, commit, execution, and result handling.
- Publication of committed changes.
- Execution limits and conformance requirements.

### 3.2 Out of scope

This specification does not define:

- A particular thread pool, async executor, graph library, or Rust crate.
- A particular JavaScript engine or sandbox implementation.
- The wire protocol for network synchronization.
- A CRDT algorithm or distributed transaction protocol.
- A universal persistence database or file format beyond companion Protocol requirements.
- Renderer layout, animation, or user-interface behavior.
- The semantics of future streaming, temporal-feedback, or parallel distributed computation extensions.

## 4. Terminology

| Term | Definition |
|---|---|
| World | The complete executable document and its Blockie instances and relationships. |
| Runtime | The implementation executing a World. |
| Transaction | A bounded unit of accepted input, staged state transitions, event processing, value stabilization, and commit or abort. |
| Generation | A committed version of the Runtime's observable state and computed outputs. |
| Committed snapshot | The last successfully committed generation. |
| Staged snapshot | The transaction-local working view derived from the committed snapshot. |
| Event | An immutable occurrence delivered to an event input or route. |
| Delivery | A routing operation that sends an event to one destination. |
| Reducer | A pure function producing a Blockie's next Model State and declared actions. |
| Compute | A pure function producing a Blockie's value outputs. |
| Effect | An authorized operation performed outside deterministic World computation. |
| Value dependency | A directed relationship used to determine when a computation must be recalculated. |
| Event route | A directed route by which an event can be delivered. |
| Dirty node | A computation node whose current output may no longer be valid for the staged generation. |
| Atomic Blockie | A Blockie whose behavior is not implemented as a Composite template. |
| Composite Blockie | A Blockie instance with a materialized child hierarchy and a public interface. |
| Internal Observation | A declared dependency from a child output to the owning Composite's computation. |
| Input Binding | A declared route from a Composite input to a descendant input. |
| Output Exposure | A declared route exposing a descendant output as a Composite output. |
| Event Forwarding | Delivery of an existing logical event through a declared event binding. |
| Event Dispatch | Creation of a new event by a Composite reducer for a declared child route. |
| Effect Outbox | A transactionally committed collection of effect requests awaiting execution. |

## 5. Core execution principles

A conforming v0.1 Runtime MUST follow these principles:

1. **One logical scheduler per World.** All Blockies in a World participate in the same transaction ordering model.
2. **Single-writer transaction processing.** Runtime transactions for one World MUST be serialized in v0.1.
3. **Reducers own state transitions.** A reducer changes only the Model State of the Blockie that owns it.
4. **Events are queued messages.** Event forwarding and dispatch MUST NOT recursively invoke reducers on the current call stack.
5. **Compute is pure.** Computation reads a declared snapshot and produces outputs; it does not mutate state or emit events.
6. **Effects are post-commit.** External operations MUST NOT execute before their originating transaction commits.
7. **Value dependencies are acyclic.** The complete logical value dependency graph MUST be a DAG in v0.1, including edges across Composite boundaries.
8. **Composite boundaries are explicit.** Parents interact with descendants only through declared bindings, observations, exposures, and dispatch routes.
9. **No intermediate publication.** Renderers and external observers see committed generations, not staged intermediate values.
10. **Observable ordering is deterministic.** A conforming Runtime MUST produce the same reducer delivery order and equivalent committed results for the same accepted inputs, World version, and deterministic logic.

## 6. Runtime model

### 6.1 Runtime ownership

A Runtime owns the execution state of one loaded World. It MUST maintain at least:

- The canonical World document and its document revision.
- The last committed Model State snapshot.
- The last committed computed-output snapshot.
- Output validity/status information.
- The materialized event routing graph.
- The materialized value dependency graph.
- Dirty-node and invalidation information.
- Definition and executable module references.
- Transaction sequence and committed generation counters.
- Runtime limits and capability policy.
- A committed effect outbox or an equivalent durable handoff mechanism.

The Runtime MAY cache additional data, including resolved inputs, topological order, immutable values, dependency indexes, and computation hashes.

### 6.2 Document revision and runtime generation

The Runtime MUST distinguish:

- **Document revision:** a version of the World structure, including instances, definitions, connections, composition, configuration, and other document-level data.
- **Runtime generation:** a successfully committed version of Model State and computed outputs for a particular document revision.

A runtime transaction MUST record the document revision against which it was evaluated. If the document changes while a transaction is being prepared, the transaction MUST either be aborted and retried against the new revision or be serialized before the document operation. It MUST NOT commit against a structurally different World without revalidation.

A document edit (for example, adding a Blockie, moving a child, changing a connection, or changing configuration) is a document operation, not an ordinary Model State event. Document operations MUST be validated and committed atomically by the document layer. After a structural or computation-relevant configuration change, the Runtime MUST rebuild or incrementally update affected graphs and mark affected computations dirty before accepting ordinary runtime transactions.

### 6.3 Committed and staged snapshots

The Runtime MUST distinguish two views:

- **Committed snapshot:** immutable to the active transaction and visible to renderers and external readers.
- **Staged snapshot:** transaction-local view containing successful reducer state transitions and the outputs computed during the transaction's value phase.

Reducer invocations within a transaction MUST read the latest staged state for their owning Blockie. They MUST NOT mutate the committed snapshot.

Compute invocations MUST read the final staged Model State after the event phase has drained, along with the staged configuration and resolved value inputs for the transaction's document revision.

No staged data may be published as committed before commit.

### 6.4 Runtime node statuses

The Runtime SHOULD expose statuses at least equivalent to:

- `ready`: a valid output is available for the current committed generation.
- `dirty`: recomputation is required for the staged generation.
- `running`: a computation is currently executing.
- `blocked`: computation cannot run because a required input is absent or an upstream output is unavailable.
- `error`: the node's own reducer/computation or output validation failed.
- `suspended`: execution is intentionally unavailable, for example because a required definition or capability is unavailable.

Statuses are Runtime metadata and MUST NOT be confused with Blockie Model State.

## 7. Logical graphs

### 7.1 Two graph families

A World contains two logically separate routing systems:

1. **Event graph:** describes where discrete event deliveries may go.
2. **Value dependency graph:** describes which computations depend on which values.

They MUST NOT be collapsed into one undifferentiated graph because their semantics differ. Event graph cycles may exist under limits; value dependency cycles are prohibited in v0.1.

### 7.2 Event graph

The event graph includes:

- Ordinary event connections.
- Composite parent-to-child input bindings.
- Child-to-parent private handler routes.
- Event exposures.
- Declared Composite dispatch routes.

Each event route MUST have a stable unique route ID within its routing scope. Route IDs are used for deterministic fan-out ordering.

The Runtime MUST validate event routing endpoints and payload compatibility before execution. A statically knowable forwarding-only cycle MUST be rejected.

### 7.3 Value dependency graph

The logical value graph includes dependency edges from:

- Source Blockie output to connected target input.
- Composite public input to each child input targeted by an Input Binding.
- Child output to each Internal Observation.
- Internal Observation to its owning Composite Compute node.
- Composite public input, own Model State, and configuration to Composite Compute when declared as dependencies.
- Child output to a Composite public output through an Output Exposure.
- Composite public output to connected consumers in its parent scope.

The Runtime MAY implement this as one flattened graph or as nested graphs with equivalent behavior. It MUST preserve Composite encapsulation and the dependency semantics of BCCS.

### 7.4 Acyclicity

The complete logical value dependency graph MUST be acyclic, including edges that cross Composite boundaries. A Composite boundary MUST NOT conceal a cycle.

A future temporal or delay extension MAY introduce explicit prior-generation dependencies. Such dependencies are not ordinary same-generation value edges and are outside v0.1.

### 7.5 Stable scheduling order

For a set of ready computations whose dependencies are satisfied, the Runtime MUST use a stable deterministic tie-breaker. Unless a future profile specifies another order, the tie-breaker MUST be ascending Blockie instance ID using bytewise UTF-8 lexical ordering. A Composite Compute node is ordered after all dirty computations that feed its declared observations or inputs.

Implementations MAY execute independent pure computations in parallel, provided their externally observable results and error selection are equivalent to the specified stable serial order. Reducers MUST NOT execute concurrently within one World transaction in v0.1.

## 8. Transaction input and acceptance

### 8.1 Transaction initiation

A runtime transaction MAY be initiated by:

- One external event accepted at a declared event input.
- An ordered batch of external events accepted by the host.
- An effect completion or failure represented as a declared event.
- A host command explicitly normalized to a declared event input.
- A trusted system event, such as a timer tick, delivered through a declared event input.

A host command MUST NOT bypass the event/reducer state-transition model to write Model State directly. A command that changes Model State MUST be normalized to a declared event delivery or use a separately specified privileged document operation where the change is structural rather than application state.

### 8.2 Initial event ordering

If a transaction contains multiple initial events, the Runtime MUST preserve the acceptance order established by the authoritative host. Concurrent callers MUST be serialized by the host before transaction processing. Wall-clock timestamps MUST NOT be used as an implicit ordering or conflict-resolution mechanism.

### 8.3 Validation before staging

Before creating a staged transaction, the Runtime MUST validate:

1. The target World and document revision.
2. The destination instance and event input/route.
3. The caller's authority to submit the command/event.
4. The event payload against BTS.
5. Any declared deduplication or idempotency policy.
6. Transaction-level resource constraints that can be checked before execution.

An invalid initial input MUST be rejected without creating a state-changing transaction.

### 8.4 Event envelope

The Runtime MUST use an event envelope equivalent to BCEFS. At minimum it contains:

```json
{
  "event_id": "evt_01J...",
  "transaction_id": "tx_01J...",
  "origin": { "kind": "actor", "id": "actor_123" },
  "emitter": { "kind": "actor", "id": "actor_123" },
  "causation_id": null,
  "correlation_id": "operation_001",
  "payload": { "value": 42 }
}
```

A delivery record additionally identifies the destination instance, destination port or private handler, route ID, and transaction-local delivery sequence. Delivery metadata MUST NOT be confused with immutable event identity.

Forwarding preserves the logical event ID and causal metadata. A reducer-created event receives a new event ID and sets its `causation_id` to the event currently being handled.

## 9. Unified transaction state machine

A Runtime transaction MUST progress through the following logical states:

```text
ACCEPTED
   |
   v
VALIDATING
   |
   v
STAGING
   |
   v
PROCESSING_EVENTS
   |
   v
STABILIZING_VALUES
   |
   v
PREPARED
   |
   v
COMMITTED
   |
   v
PUBLISHED
   |
   v
EFFECTS_PENDING / COMPLETE
```

Any fatal event-phase, validation, resource-limit, or commit-precondition failure transitions the transaction to `ABORTED`. A computation failure is represented in the staged output status and does not by itself abort the transaction.

The exact internal state names are implementation-defined, but the observable transition rules are normative.

## 10. Normative transaction algorithm

### 10.1 Overview

For each accepted transaction, the Runtime MUST execute the following algorithm:

1. Validate and order the initial inputs.
2. Create a staged snapshot from the last committed generation.
3. Process all event deliveries using one logical FIFO queue.
4. Collect state transitions, further event actions, and effect requests.
5. When the event queue is empty, stabilize all affected value computations in dependency order.
6. Validate staged state and outputs.
7. Commit the staged generation and effect outbox atomically.
8. Publish committed changes.
9. Execute effects after commit.
10. Convert effect results into new transactions.

### 10.2 Pseudocode

The following pseudocode is normative in observable behavior, not in programming language or data structure:

```text
execute_transaction(world, initial_deliveries):
    validate_world_revision(world)
    validate_initial_deliveries(initial_deliveries)

    tx = begin_transaction(
        base_generation = world.committed_generation,
        document_revision = world.document_revision
    )

    tx.staged_state = snapshot(world.committed_state)
    tx.staged_outputs = snapshot(world.committed_outputs)
    tx.event_queue = FIFO(initial_deliveries)
    tx.pending_effects = []
    tx.dirty_nodes = {}
    tx.staged_event_outbox = []

    try:
        # PHASE A: EVENT PROCESSING
        while not tx.event_queue.empty():
            delivery = tx.event_queue.pop_front()
            enforce_event_limits(tx, delivery)
            destination = resolve_delivery_destination(delivery)
            validate_delivery(tx, delivery, destination)

            reducer = resolve_reducer(destination)
            if reducer exists:
                context = make_reducer_context(
                    state = tx.latest_staged_state(destination.owner),
                    config = immutable_config(destination.owner),
                    event = delivery.event
                )

                result = invoke_reducer(reducer, context)
                validate_complete_reducer_result(destination.owner, result)

                tx.stage_state(destination.owner, result.state)
                tx.dirty_nodes += state_dependent_compute_nodes(destination.owner)

                enqueue_dispatches_in_result_order(tx, result.dispatch)
                enqueue_emitted_output_destinations_in_result_order(tx, result.emit)
                collect_effect_requests(tx, result.effects)

            # For a Composite public event input, forward the same logical
            # event to declared child input bindings after its local reducer
            # actions have been enqueued. Private handlers have no bindings.
            enqueue_composite_input_bindings_in_route_order(tx, delivery)
            require_destination_was_handled_or_explicitly_ignored(destination)

        # PHASE B: VALUE STABILIZATION
        candidate_nodes = affected_value_dependency_closure(tx.dirty_nodes)

        for node in stable_topological_order(candidate_nodes):
            if not node_has_changed_or_invalid_dependency(node, tx):
                continue

            inputs = resolve_inputs_from_staged_generation(tx, node)

            if inputs.have_required_unavailable_values:
                tx.stage_output_status(node, BLOCKED)
                mark_value_consumers_blocked_or_dirty(tx, node)
                continue

            result = invoke_compute(node, inputs, tx.staged_state)

            if result is valid:
                changed = compare_with_staged_previous_value(node, result)
                tx.stage_outputs(node, result, READY)
                if changed:
                    mark_value_consumers_changed(tx, node)
            else:
                tx.stage_output_status(node, ERROR)
                mark_value_consumers_blocked_or_dirty(tx, node)

        validate_staged_generation(tx)
        prepare_commit_record(tx)

        # PHASE C: COMMIT AND PUBLISH
        commit_atomically(tx)
        publish_committed_generation(tx)

        # PHASE D: EFFECTS
        execute_committed_effect_outbox(tx)

        return COMMITTED(tx.id, tx.new_generation)

    catch fatal_error:
        abort_without_publishing(tx)
        return ABORTED(tx.id, fatal_error)
```

An implementation MAY combine internal steps, cache results, or use parallel workers, but it MUST preserve the specified observable behavior.

## 11. Event phase

### 11.1 Single FIFO queue

A Runtime MUST process event deliveries through one logical FIFO queue per World transaction. Reducer invocation order MUST be equivalent to serial FIFO processing.

A Runtime MAY use multiple internal queues only if their combined behavior is observationally equivalent to the single FIFO queue.

### 11.2 Delivery processing

When a delivery is dequeued, the Runtime MUST:

1. Resolve the destination endpoint and route metadata.
2. Validate the event payload against the destination contract.
3. Determine whether the destination is a public event input, a private Composite handler, or an explicitly ignored input.
4. If the destination has a declared reducer handler, invoke the owning Blockie's reducer.
5. Validate the reducer's complete result before applying any part of it.
6. Stage the reducer's complete next Model State.
7. Enqueue Composite dispatch requests in returned array order.
8. Expand emitted event outputs into all declared destinations, ordered by route ID as specified by BCEFS.
9. Record effect requests for the post-commit outbox.
10. If the destination is a Composite public event input, enqueue its declared child Input Binding deliveries in binding route ID order, preserving the logical event ID.
11. Reject the delivery if it has no reducer, forwarding binding, parent handler, or explicit ignore policy.

A delivery to a child event input created by forwarding is an ordinary queued delivery when dequeued; it is not a special recursive call. Child-to-parent handler routes and event exposures are destinations of an emitted event output and are expanded when that output is emitted. No reducer may be invoked recursively as a result of forwarding.

### 11.3 Reducer ownership and visibility

A reducer MUST change only the Model State of its owning Blockie.

A child reducer cannot write its parent's state. A Composite reducer cannot write a child's state. A Composite reducer MUST use a child event payload delivered to a declared private handler if it needs to react to a child occurrence.

A reducer MAY read:

- Its own latest staged Model State.
- Its own immutable configuration.
- The current immutable event envelope and validated payload.
- Runtime-provided metadata explicitly included in the reducer ABI.

A reducer MUST NOT read computed outputs, arbitrary connected values, child state, parent state, or ambient World data in v0.1. If a state transition depends on a value, that value MUST be included in the accepted event payload or a future reducer-input extension must define the semantics explicitly.

### 11.4 Staged state visibility

When a reducer succeeds, its returned complete next state becomes the current staged state for that Blockie immediately. A later reducer invocation for the same Blockie in the same transaction MUST receive this latest staged state.

The staged state remains invisible to renderers and other external readers until commit.

### 11.5 Reducer result

The canonical reducer result is:

```typescript
type ReduceResult<State> = {
  state: State;
  dispatch: Array<{ route: string; payload: unknown }>;
  emit: Array<{ port: string; payload: unknown }>;
  effects: Array<{ effect: string; input: unknown }>;
};
```

For an atomic Blockie, `dispatch` MUST be empty. A Composite MAY use declared dispatch routes.

The Runtime MUST validate the entire result before staging the state transition or enqueuing any actions. If any state, dispatch, emitted event, or effect request is invalid, the transaction MUST abort.

### 11.6 Action ordering

For each successful reducer invocation, actions MUST be handled in this order:

1. Validate the full reducer result.
2. Stage the reducer's next state.
3. Enqueue `dispatch` requests in returned array order.
4. Enqueue `emit` requests in returned array order, expanding each event's destinations in ascending route ID order.
5. Record `effects` in returned array order for the post-commit effect outbox.
6. If the destination is a Composite public event input, enqueue that input's declared child Input Binding deliveries in route ID order, preserving the logical event ID. Handler and exposure routes are expanded from emitted event output ports, not from an unrelated incoming delivery.

Effect requests MUST NOT enter the event queue in the current transaction.

For a Composite public event input with both a local reducer and one or more Input Bindings, the Composite reducer is processed first. Its dispatches and emitted-output destinations are enqueued before the binding deliveries. The binding deliveries are then enqueued in ascending binding route ID order. This ordering is normative and MUST agree with BCEFS §8.3.

### 11.7 Forwarding versus dispatch

- **Forwarding** preserves the logical event ID and causal metadata. It creates a new delivery record, not a new logical event.
- **Dispatch** creates a new logical event with a new event ID and a `causation_id` referencing the event currently being handled.
- **Emission** creates a new logical event from a reducer output port, with the same new-event identity rules as dispatch.

Forwarding MUST NOT invoke a child reducer inline. Dispatch and emission destinations MUST be queued.

### 11.8 Child-to-parent notifications

A child event routed to a Composite private handler is an ordinary FIFO delivery whose reducer owner is the Composite. The Composite reducer receives the declared handler ID and payload. It does not receive a mutable child reference or implicit child state access.

### 11.9 Event-output destinations

When a reducer emits an event on an output port, the Runtime MUST resolve all declared routes for that output, including ordinary event Connections, Composite child-to-parent handler routes, and Composite event exposures. The Runtime MUST enqueue internal World deliveries in ascending route ID order using bytewise UTF-8 lexical ordering.

A delivery that targets a Composite private handler invokes the owning Composite reducer when that delivery is later dequeued. A delivery through an event exposure continues through the Composite's public event output routes, preserving the logical event identity while using boundary-safe source metadata.

Event routes whose destinations are inside the same World are processed during the event phase. Destinations outside the World or Runtime MUST be written to a post-commit publication outbox and MUST NOT be delivered externally before commit.

### 11.10 Event ordering and limits

The Runtime MUST enforce at least:

- Maximum event deliveries per transaction.
- Maximum reducer invocations per transaction.
- Maximum forwarding hops per logical event.
- Maximum causal event depth.
- Maximum event payload size.
- Maximum reducer execution time and memory.

A forwarding-only cycle MUST be rejected at validation when statically knowable. A reducer-mediated event cycle MAY execute but MUST be bounded by the limits above.

Exceeding a limit MUST abort the transaction without committing staged Model State or publishing staged events/effects.

## 12. Value phase: reactive stabilization

### 12.1 Start condition

The value phase begins only after the event queue is empty. All successful reducer state transitions from the event phase are then visible in the staged snapshot.

The Runtime MUST NOT interleave ordinary Compute invocations between reducer deliveries in v0.1. This guarantees that reducers do not observe a mixture of old and new derived values.

### 12.2 Dirty-node discovery

The Runtime MUST mark computations dirty when any declared dependency changes. Dirty dependencies include:

- A Blockie's Model State field used by its Compute function.
- A configuration field declared as a Compute dependency.
- A resolved value input.
- A Composite public input used by Composite Compute.
- A child output referenced by an Internal Observation.
- A child output referenced by an Output Exposure.
- A nested Composite public output used by its parent.

The Runtime SHOULD use dependency indexes to avoid invalidating unrelated computations.

### 12.3 Input resolution

Before invoking a Compute function, each value input MUST be resolved according to BTS:

1. If connected, use the current staged source output.
2. Otherwise, use a declared default if present.
3. Otherwise, omit an optional input.
4. Otherwise, mark the computation `blocked` because a required input is unresolved.

A connected source in `error`, `blocked`, or unavailable state MUST NOT silently fall back to a default. The target MUST receive a causal blocked/error status for that input.

### 12.4 Atomic Blockie Compute

A dirty atomic Blockie Compute MUST receive only its declared:

- Latest staged own Model State.
- Immutable configuration.
- Resolved typed value inputs.

It MUST NOT read arbitrary Blockie instances, invoke reducers, emit events, or perform effects.

The Runtime MUST validate every returned output against the declared output port type using BTS. Missing required outputs, undeclared output keys, non-serializable values, and invalid types MUST produce a computation error for that node.

### 12.5 Composite Compute

A Composite Compute is a computation node owned by the Composite instance. It executes only after all dirty child computations that feed its declared inputs or Internal Observations have reached a valid result or an explicit error/blocked status.

Its context MAY contain:

- The Composite's own latest staged Model State.
- The Composite's immutable configuration.
- Resolved public value inputs.
- Declared Internal Observations of descendant outputs.

It MUST NOT receive arbitrary child state, child configuration, private runtime data, or an ambient child lookup API.

A child failure that makes a required Internal Observation unavailable MUST block the affected Composite Compute. The Runtime MUST NOT use the prior generation's stale child output as if it were current.

A Composite with both direct Output Exposures and computed public outputs MUST evaluate each according to its declared producer. A public value output MUST have exactly one producer: either an exposure or Composite Compute.

### 12.6 Nested Composites

A nested Composite is treated as a child node in its parent's logical value graph. Its internal graph is stabilized before any parent computation that depends on its public output.

The parent MUST consume only the nested Composite's public value outputs. It MUST NOT traverse into private descendants.

The Runtime MAY flatten nested graphs internally, but MUST preserve the boundary semantics and dependency ordering.

### 12.7 Stable topological evaluation

The Runtime MUST evaluate dirty computation nodes in topological order. If multiple nodes are ready, it MUST use the stable tie-breaker in §7.5.

Since the value dependency graph is acyclic, one topological pass is sufficient when dependencies and input values are correctly indexed. If evaluation reveals a previously undeclared dependency, the Runtime MUST reject that behavior rather than silently modify the graph during Compute.

### 12.8 Output comparison and propagation

After successful output validation, the Runtime MUST compare the new typed value with the staged prior output according to BTS value equality, not object identity or JavaScript reference equality.

If the value is observably unchanged, the Runtime MAY retain the previous immutable representation and SHOULD avoid invalidating downstream consumers solely because the computation ran again.

If the value or its validity status changes, downstream value consumers MUST be marked dirty or blocked as appropriate.

### 12.9 No event emission from Compute

Compute functions MUST NOT emit events in v0.1. A computed value change propagates through value dependencies only.

If an application needs an occurrence derived from a computation, it MUST use an explicitly defined future threshold/transition Blockie or another declared mechanism that converts a value condition into an event. A Runtime MUST NOT invent implicit change events for every computed output.

## 13. Composite scheduling and boundary coordination

### 13.1 Composite as a logical node and execution scope

A Composite participates in its parent's graph as one public Blockie node while owning a private internal execution scope. The Runtime MUST coordinate both views as one World transaction.

### 13.2 Value boundary processing

During value stabilization:

1. Resolve changed Composite public inputs.
2. Apply declared Input Bindings to descendant input ports.
3. Mark affected descendant computations dirty.
4. Evaluate the affected internal graph.
5. Resolve Internal Observations.
6. Execute the Composite Compute node when its dependencies are stable.
7. Resolve direct Output Exposures.
8. Publish changed Composite public outputs only into the staged parent graph.
9. Continue evaluating affected parent consumers.

An implementation MAY flatten these steps into one global topological schedule, provided the same dependency and encapsulation rules are preserved.

### 13.3 Event boundary processing

Event boundary operations occur during the event phase, not the value phase:

- Parent-to-child event forwarding creates FIFO deliveries.
- Child-to-parent notifications create FIFO deliveries to private Composite handlers.
- Event exposure creates deliveries to applicable parent-scope event routes.
- Composite reducer dispatch creates new child-targeted events.

Each nested boundary uses the same queue and deterministic route ordering. There is no special recursive or ancestor-first call stack.

### 13.4 Composite state

A Composite MAY own Model State and a reducer independently of its children. Its reducer is invoked by public event inputs explicitly listed as handled or by declared private child-event handlers.

Composite reducers follow the same serial staging and validation rules as atomic reducers. They MUST NOT modify descendant state directly.

## 14. Errors and failure semantics

### 14.1 Two failure classes

The Runtime MUST distinguish:

1. **Transaction-fatal failures:** invalidate the event/state transition transaction and require abort.
2. **Computation-local failures:** invalidate affected derived outputs but do not, by themselves, roll back valid Model State transitions.

### 14.2 Transaction-fatal failures

The following MUST abort the current transaction:

- Invalid initial event or unauthorized command.
- Invalid event delivery or payload.
- Reducer execution failure.
- Reducer result failing state, dispatch, emission, or effect validation.
- Invalid internal event action or route.
- Event cycle/limit violation.
- Fatal Runtime resource exhaustion.
- Document revision mismatch that cannot be safely serialized/retried.
- Failure to prepare or atomically commit the transaction record.

An aborted transaction MUST NOT publish staged Model State, staged computed outputs, staged external event publications, or staged effect requests.

### 14.3 Computation-local failures

The following SHOULD be represented as node-local error/blocked statuses and MUST NOT alone abort an otherwise valid state transaction:

- Compute function throws or traps.
- Compute exceeds its local execution budget, provided the Runtime remains healthy.
- A Compute result violates its output type.
- A required input is missing.
- An upstream computed output is errored or blocked.
- A Composite Compute fails or has a required unavailable observation.

The failed node's output MUST NOT be presented as a current successful value. Stale previous values MUST NOT be silently propagated as current. Unaffected branches MAY still commit successfully.

### 14.4 Error representation

Errors SHOULD include:

```json
{
  "code": "upstream_computation_failed",
  "message": "A required input is unavailable.",
  "source": {
    "blockie": "chart_001",
    "port": "dataset"
  },
  "cause": {
    "blockie": "aggregator_001",
    "port": "results"
  },
  "generation": 42
}
```

The Runtime SHOULD preserve causal references while avoiding disclosure of private descendant identities outside their Composite boundary.

### 14.5 Recovery

A later transaction that changes the failed node's dependencies MAY cause it to become dirty and recompute. When the computation succeeds, the Runtime MUST replace the prior error status with the new valid output status in the committed generation.

## 15. Effects and the post-commit model

### 15.1 Effect collection

Reducers MAY return effect requests. Effects MUST be declared in the owning Definition and authorized by the Runtime's capability policy.

The Runtime MUST validate effect IDs, input payloads, capability grants, and effect-specific limits before the transaction can commit.

Effects MUST NOT execute during event processing, Compute, or before commit.

### 15.2 Effect outbox

Validated effect requests MUST be recorded in a transactionally committed effect outbox, or an equivalent mechanism that prevents an aborted transaction's effects from running.

Each effect request SHOULD receive a stable request ID and idempotency key. The request MUST record its originating transaction and Blockie instance.

### 15.3 Effect execution

After commit, the host Effect Executor performs authorized requests. Effect execution is outside the deterministic World transaction.

The protocol does not promise exactly-once execution across crashes or network retries. A host SHOULD provide retry and deduplication behavior and MUST document its delivery guarantees.

### 15.4 Effect results

An effect completion or failure MUST NOT mutate Blockie state directly. The host MUST convert the result into a validated event delivered to a declared event input in a subsequent transaction.

The event SHOULD include the effect request ID, success/failure status, and typed result or structured error. If no result handler is declared, the host MAY retain the result as an operational diagnostic, but MUST NOT silently write it into Model State.

### 15.5 Effect isolation

An effect executor MUST enforce declared capabilities. A Blockie MUST NOT gain network, filesystem, database, or AI access merely because another Blockie has that capability.

## 16. Commit and publication

### 16.1 Commit contents

A successful transaction MUST atomically commit, as one logical generation:

- All staged Model State changes.
- The output values and output validity statuses produced by stabilization.
- The new runtime generation identifier.
- Any committed event outbox records intended for external consumers.
- The validated pending effect outbox records.
- Transaction metadata required for recovery or audit.

Transient queue entries, reducer call stacks, dirty flags, and temporary computation contexts MUST NOT become canonical World Model State.

### 16.2 Commit semantics

The Runtime MUST ensure that external readers cannot observe a mixture of old and new committed values from one transaction. A renderer or subscriber MUST observe either the prior committed generation or the complete new committed generation.

If durable persistence is enabled, the host SHOULD use a write-ahead log, atomic snapshot replacement, database transaction, or equivalent mechanism to recover the commit boundary after a crash.

### 16.3 Publication order

After commit, the Runtime MUST:

1. Make the new generation available to local readers/renderers.
2. Publish committed document/runtime change notifications.
3. Publish externally routed event outbox records.
4. Hand committed effects to the Effect Executor.

The host MAY perform these independent post-commit actions concurrently, but MUST preserve per-channel ordering and idempotency requirements.

No notification or effect request from an aborted transaction may be published or executed.

### 16.4 Rendering

Renderers MUST consume committed snapshots. They MUST NOT read staged transaction state or invoke Blockie reducers/compute functions themselves.

User interaction from a renderer MUST be converted into an authorized command or event and submitted back to the Runtime.

## 17. Concurrency and determinism

### 17.1 Transactions per World

In v0.1, one World Runtime MUST serialize transactions. It MUST NOT expose overlapping uncommitted transactions for the same World.

An implementation MAY process transactions for different Worlds concurrently.

### 17.2 Parallel computation

Independent pure Compute nodes MAY execute in parallel. Their results MUST be staged and made visible only after all required nodes in the affected dependency closure have reached a valid result or error status.

If parallel execution would cause observable nondeterminism in errors or outputs, the Runtime MUST use the stable serial order instead.

### 17.3 Reducer execution

Reducers MUST execute serially within a World transaction. A later reducer invocation for the same Blockie sees the latest staged state produced by earlier reducer invocations in that transaction.

### 17.4 Sources of nondeterminism

Compute and Reduce MUST NOT access ambient wall-clock time, unseeded randomness, network, filesystem, process state, or arbitrary shared mutable memory.

Time, randomness, and external information MUST enter through explicit typed inputs or effect-result events.

### 17.5 Cross-client determinism

A host-authoritative Runtime is the v0.1 reference model for online execution. This specification does not require every audience client to independently execute the same World. If multiple replicas execute a World independently, they MUST use equivalent definitions, module digests, type semantics, and deterministic inputs; distributed agreement is outside this specification.

## 18. Execution limits

A Runtime MUST enforce configurable limits for at least:

| Limit | Applies to |
|---|---|
| Maximum event deliveries per transaction | Event phase |
| Maximum reducer invocations per transaction | Event phase |
| Maximum event forwarding hops | Each logical event |
| Maximum causal event depth | Event-created event chains |
| Maximum event payload size | Event validation |
| Maximum reducer time and memory | Each reducer |
| Maximum compute time and memory | Each Compute invocation |
| Maximum value size | State and ports |
| Maximum dirty computation count | Value phase |
| Maximum effect requests per transaction | Effect collection |
| Maximum pending effects per World | Effect outbox |

A limit violation MUST produce a structured error. Event-phase or transaction-wide limit violations MUST abort the transaction. A node-local Compute budget violation SHOULD become a computation error if the Runtime itself remains healthy.

## 19. Initialization and first generation

When loading or initializing a World, the Runtime MUST:

1. Validate the Protocol and BTS versions.
2. Resolve exact Blockie Definitions and executable module digests.
3. Validate all instances, states, configurations, generic specializations, and Composite materializations.
4. Validate composition, connections, boundary declarations, event routes, exposures, and capabilities.
5. Build the logical event graph and value dependency graph.
6. Reject invalid endpoints, invalid type compatibility, invalid cardinality, containment cycles, value dependency cycles, and forwarding-only event cycles.
7. Initialize computed outputs using a value stabilization pass with no user event deliveries.
8. Establish the initial committed generation only after initial validation and required computation handling are complete.

The initialization pass MUST NOT invoke reducers or execute effects. Definitions MUST use initial state and pure computation to establish initial outputs.

If an initial Compute fails, the Runtime MAY establish the World with affected outputs in error/blocked status, consistent with §14.3. If structural validation fails, the World MUST NOT become executable.

## 20. Reference execution example: interactive Poll

### 20.1 Structure

A Poll Composite contains:

```text
Poll Composite
├── Public event input: on_vote
├── Public event input: on_reset
├── Public value input: expected_audience
│
├── Vote Processor
│   ├── Event input: submit_vote
│   ├── Event output: accepted
│   └── Model State: accepted-vote records
│
├── Vote Collection
│   ├── Event input: append
│   ├── Event input: reset
│   └── Value output: votes
│
├── Aggregator
│   ├── Value input: votes
│   └── Value outputs: counts, total_votes, unique_voters
│
├── Internal Observations
│   ├── counts
│   ├── total_votes
│   └── unique_voters
│
├── Composite Reducer
│   └── private handler: on_vote_accepted
│
├── Composite Compute
│   └── completion_rate
│
└── Public outputs
    ├── results
    ├── total_votes
    └── completion_rate
```

### 20.2 Incoming vote

An audience member submits a vote. The host validates the participant's permission and submits an `on_vote` event to the Poll public input.

The event phase proceeds:

1. The Poll receives the event delivery.
2. If the Poll reducer handles `on_vote`, it runs first and stages only the Poll's own state transition.
3. Declared input bindings forward the same logical event to `Vote Processor.submit_vote`.
4. The Vote Processor reducer validates the vote using the information in the event payload and its own state. It does not inspect the Vote Collection's state.
5. If accepted, the reducer updates its own staged state and emits `accepted`.
6. The `accepted` event is routed to the Vote Collection through an explicit event connection and to the Poll's private handler through a declared child-to-parent handler route. These deliveries are enqueued in route order.
7. The Vote Collection reducer appends the accepted vote to its own staged state.
8. The Poll private handler may update Poll-owned state using the event payload. It MUST NOT directly read or modify the Vote Collection.
9. The event queue drains.

### 20.3 Value stabilization

After the queue drains:

1. The Vote Collection's `votes` output becomes dirty because its Model State changed.
2. The Aggregator recomputes counts, total votes, and unique voters.
3. The Poll's Internal Observations resolve from those outputs.
4. Poll Composite Compute calculates `completion_rate` using `unique_voters` and the public `expected_audience` input.
5. The Poll public outputs are updated in the staged generation.
6. Any parent-level chart or statistics Blockies depending on Poll outputs become dirty and recompute.

### 20.4 Commit

The Runtime commits all successful state transitions and the stabilized outputs as one generation. The presenter renderer sees the new vote count and chart together, not an intermediate state.

If the Aggregator fails, the accepted vote state may still commit, but the affected Poll outputs become error/blocked for that generation. The Runtime MUST NOT display the old total as if it represented the new vote collection.

### 20.5 Effects

If the Poll also requests an audit-log or notification effect, the request is committed to the effect outbox. The host executes it after commit. Its result, if relevant to the World, is submitted as a new event in a subsequent transaction.

## 21. Conformance requirements

A Runtime claiming BRES v0.1 core conformance MUST:

1. Maintain separate logical event and value dependency graphs.
2. Serialize transactions per World.
3. Create an isolated staged snapshot for each transaction.
4. Process initial and generated event deliveries using deterministic FIFO semantics.
5. Execute reducers serially and validate their complete results.
6. Preserve staged-state visibility between reducer invocations in the same transaction.
7. Enforce Composite event routing and encapsulation rules.
8. Drain the event queue before ordinary value stabilization.
9. Evaluate dirty atomic and Composite computations in valid topological order.
10. Validate all value inputs and computed outputs using BTS.
11. Prevent stale outputs from being treated as current after an upstream failure.
12. Keep Compute functions pure and prevent them from emitting events or effects.
13. Collect effects without executing them before commit.
14. Commit Model State, output statuses, and effect/event outboxes as one coherent generation.
15. Prevent renderers and external consumers from observing staged data.
16. Convert effect results into new transactions rather than direct state mutation.
17. Enforce event, computation, and resource limits.
18. Produce structured errors and preserve causal relationships.
19. Support initialization without invoking reducers or effects.
20. Serialize and restore the World without persisting transient queues or runtime caches as canonical Model State.

## 22. Required conformance tests

A conformance suite MUST include at least the following tests.

| Test | Scenario | Expected result |
|---|---|---|
| REX-001 | One event updates one Blockie's state | State commits in a new generation. |
| REX-002 | Two events target the same reducer in one transaction | FIFO order; second reducer sees first staged state. |
| REX-003 | Composite input forwards an event to two children | Both deliveries are queued in stable route order. |
| REX-004 | Child emits event handled by parent Composite | Parent reducer receives payload through a private handler. |
| REX-005 | Composite reducer dispatches to a child | New event ID; causation points to triggering event. |
| REX-006 | Event forwarding crosses nested Composites | FIFO behavior; no recursive reducer calls. |
| REX-007 | Reducer emits another event | New event is appended to the queue in defined order. |
| REX-008 | Event queue exceeds configured limit | Transaction aborts; no staged state or effects commit. |
| REX-009 | Reducer returns invalid state | Transaction aborts. |
| REX-010 | Reducer returns undeclared dispatch route | Transaction aborts. |
| REX-011 | Reducer requests undeclared effect | Transaction aborts. |
| REX-012 | State changes and value outputs depend on it | Event phase drains, then affected computations stabilize. |
| REX-013 | Two independent computations become dirty | Stable scheduling; parallel implementation remains observationally equivalent. |
| REX-014 | Child output changes and feeds Composite Compute | Composite Compute runs after child output stabilizes. |
| REX-015 | Nested Composite output feeds outer Composite Compute | Inner public output stabilizes before outer computation. |
| REX-016 | Value cycle crosses Composite boundary | World validation rejects the cycle. |
| REX-017 | Compute throws after valid reducer update | State commits; affected output is error. |
| REX-018 | Required upstream output fails | Downstream node is blocked/error; no stale value is used. |
| REX-019 | Computed output is unchanged | Downstream consumers need not be invalidated. |
| REX-020 | Compute attempts to emit an event | Runtime rejects the behavior. |
| REX-021 | Effect request is produced | Request is not executed before commit. |
| REX-022 | Effect completes | Result enters a new transaction through a declared event input. |
| REX-023 | Transaction aborts after collecting effects | No effect from the aborted transaction executes. |
| REX-024 | Renderer reads during an active transaction | Renderer sees only the last committed generation. |
| REX-025 | Two callers submit concurrently | Host establishes one deterministic acceptance order. |
| REX-026 | World initializes | Graphs validate and initial outputs compute without reducers or effects. |

## 23. Relationship to companion specifications

| Specification | Responsibility | BRES integration |
|---|---|---|
| Blockies Protocol | Core World, Blockie, port, and execution contracts | Defines entities and foundational behavior. |
| BTS | Type expressions, assignability, and value validation | Validates all state, ports, events, and outputs. |
| BCIS | Composite templates and instance materialization | Supplies concrete child instances and internal routes. |
| BCCS | Composite Compute and Internal Observations | Supplies Composite computation nodes and value dependencies. |
| BCEFS | Composite event forwarding, handlers, exposure, and ordering | Supplies event routes and reducer delivery semantics. |
| BRES | Unified Runtime execution | Defines the combined transaction algorithm and phase ordering. |

If an implementation encounters an ambiguity between companion drafts, it SHOULD follow the more specific companion contract for the relevant domain and this specification for cross-domain phase ordering. The draft family MUST be reconciled before a stable v0.1 release.

## 24. Decisions established by BRES v0.1

The following decisions are considered foundational for this draft:

1. One logical transaction scheduler per World.
2. One serialized transaction at a time per World.
3. A transaction processes its event queue to exhaustion before ordinary reactive computation.
4. Reducers are serial, pure, and state-owning.
5. Reducers may read only their own staged state, own configuration, and event context.
6. Reducers cannot read derived outputs in v0.1.
7. Compute functions are pure, have declared dependencies, and cannot emit events or effects.
8. Composite reducers and Composite Compute are both supported.
9. Composite boundaries are enforced through explicit routes and observations.
10. The value dependency graph is a DAG across the complete logical World.
11. Compute failures do not by themselves roll back valid state transitions.
12. Reducer/event-phase failures abort the entire transaction.
13. Effects execute only after commit and return through later transactions.
14. Only committed generations are visible to renderers and external readers.
15. Event and computation execution are resource-bounded.

## 25. Deferred topics

The following topics require separate specifications or future revisions:

- Distributed transactions across multiple Runtime hosts.
- CRDT conflict resolution and concurrent replicated state.
- Multi-writer reducer semantics.
- Durable event sourcing and replay guarantees.
- Exactly-once external effect execution (not generally achievable without cooperation from the external system).
- Streaming value ports and backpressure.
- Temporal feedback and Delay Blockies.
- Reducers that consume declared value snapshots.
- Parallel reducer execution.
- Long-running computations and incremental continuations.
- Cross-World transactions.
- Scheduling priorities and real-time execution classes.

---

# Appendix A — Recommended implementation architecture (informative)

The following is an implementation suggestion, not a protocol requirement:

```text
WorldRuntime
│
├── DocumentStore
│   ├── WorldSnapshot
│   └── DocumentRevision
│
├── GraphIndex
│   ├── EventRoutingGraph
│   └── ValueDependencyGraph
│
├── TransactionCoordinator
│   ├── InputValidator
│   ├── StagedState
│   ├── EventQueue
│   ├── ReducerExecutor
│   ├── DirtyTracker
│   ├── ComputeScheduler
│   ├── OutputValidator
│   └── CommitCoordinator
│
├── RuntimeAdapters
│   ├── JavaScriptRuntime
│   └── NativeBlockieRuntime
│
├── EffectExecutor
│   ├── CapabilityPolicy
│   └── EffectOutbox
│
└── Publication
    ├── RendererNotifier
    ├── PersistenceAdapter
    └── SynchronizationAdapter
```

A Rust implementation could represent the transaction as an owned structure containing a base generation, staged state overlay, staged output overlay, FIFO delivery queue, dirty-node set, pending effect list, and staged publication outbox.

Persistent immutable values or copy-on-write maps can reduce cloning costs. The Runtime should not require full World cloning for each transaction.

# Appendix B — Suggested Rust-facing internal interfaces (informative)

```rust
struct TransactionContext {
    transaction_id: TransactionId,
    base_generation: Generation,
    document_revision: DocumentRevision,
    staged_state: StagedState,
    staged_outputs: StagedOutputs,
    event_queue: VecDeque<EventDelivery>,
    dirty_nodes: DirtySet,
    pending_effects: Vec<PendingEffect>,
    publication_outbox: Vec<PublicationRecord>,
}

trait ReducerExecutor {
    fn reduce(
        &mut self,
        owner: BlockieId,
        context: ReducerContext,
    ) -> Result<ReduceResult, ReducerError>;
}

trait ComputeExecutor {
    fn compute(
        &mut self,
        node: ComputeNodeId,
        context: ComputeContext,
    ) -> Result<ComputeOutputs, ComputeError>;
}

trait CommitCoordinator {
    fn commit(
        &mut self,
        transaction: PreparedTransaction,
    ) -> Result<CommittedGeneration, CommitError>;
}
```

The actual Rust types, ownership strategy, async model, and trait boundaries are implementation decisions. The implementation MUST preserve the normative behavior in this document.

# Appendix C — Open questions for the next revision

1. Should a future reducer ABI permit explicitly declared value snapshots, with a well-defined point-in-time consistency model?
2. Should a World transaction support a batch of independent external commands that can be partially accepted, or should the entire batch remain all-or-nothing?
3. Should computation errors be retained as output statuses only, or should the protocol also define a standard error value type usable by downstream Blockies?
4. Should effect retries and dead-letter handling be standardized in a separate Effects Protocol?
5. Should transaction limits be per World, per definition, per actor, or all three?

These questions do not prevent implementation of the v0.1 execution algorithm, but should be resolved before a stable release.

---

**End of Blockies Runtime Execution Specification v0.1.0-draft**
