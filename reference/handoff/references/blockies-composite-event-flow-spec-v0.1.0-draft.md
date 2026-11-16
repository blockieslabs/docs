# Blockies Composite Event Flow Specification

**Specification ID:** BCEFS  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Depends on:** Blockies Protocol Specification, Blockies Type System Specification (BTS), Blockies Composite Instantiation Specification (BCIS), Blockies Composite Computation Specification (BCCS)

---

## About this document

This document defines how event messages travel through Composite Blockies. It specifies event forwarding across composition boundaries, child-to-parent notifications, Composite reducers, parent-to-child event dispatch, deterministic ordering, transaction behavior, and event-flow validation.

It is a companion specification. It does not replace the Core Protocol's event ports, reducers, connections, or transaction model. Where this document gives more specific rules for events involving a Composite, those rules refine the Core Protocol for that case.

The current BCIS draft states that Composite Definitions do not declare reducers. BCCS subsequently permits a Composite to own state and reducer logic. For a consistent v0.1 model, this document adopts the BCCS rule: **a Composite MAY declare its own reducer and Model State**. BCIS Section 6 and any earlier text prohibiting Composite reducers must be updated before the specifications are frozen.

---

# 1. Abstract

A Composite Blockie is an encapsulated computational component composed of child Blockies. It may receive events from its parent, forward events to children, receive notifications from children, react through its own reducer, and expose selected child events through its public interface.

The protocol defines four distinct event operations:

1. **Event forwarding:** An event received at a Composite input is forwarded to one or more declared child event inputs.
2. **Child-to-parent notification:** An event emitted by a child is delivered to a declared private handler on the Composite. The Composite reducer processes that event.
3. **Event exposure:** A child event is forwarded through a Composite public event output without invoking the Composite reducer.
4. **Parent-to-child dispatch:** A Composite reducer creates a new event addressed through a declared dispatch route to a child event input.

These operations MUST be explicit. Events MUST NOT automatically bubble through the composition hierarchy, and a Blockie MUST NOT inspect or mutate another Blockie's private state as a substitute for event communication.

The runtime uses a FIFO delivery queue, stable route ordering, serial reducer execution, transaction-scoped state staging, and bounded event processing. These rules make event behavior deterministic within a conforming local runtime.

# 2. Normative language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

# 3. Terminology

| Term | Definition |
|---|---|
| Event | A discrete message representing an occurrence. |
| Event envelope | The protocol metadata and typed payload carried by an event. |
| Delivery | One attempt to deliver an event envelope to a particular event input or reducer handler. |
| Event route | A declared path that forwards an event from a source to a destination. |
| Forwarding | Passing the same event envelope across a declared route without creating a new event. |
| Notification | Delivery of a child event to a Composite-owned reducer handler. |
| Event exposure | Forwarding a child event through a Composite public event output. |
| Dispatch | Creation of a new event by a Composite reducer and delivery through a declared child dispatch route. |
| Reducer | A pure state-transition function invoked for an event delivery. |
| Route ID | A stable identifier for a declared event route within its World or Composite Definition. |
| Transaction | A bounded unit in which event deliveries and state transitions are staged and committed atomically. |
| Causation | The relationship between a newly emitted event and the event that caused its creation. |

# 4. Design principles

1. **No implicit bubbling.** A child event reaches its parent only through an explicit event handler route or event exposure.
2. **No private-state access.** A reducer receives its own state, configuration, and event. It does not receive child state or runtime objects.
3. **Forwarding preserves identity.** Forwarding an event does not create a new event ID.
4. **Dispatch creates identity.** A reducer-generated event is a new event with a causal link to the triggering event.
5. **Reducers own state transitions.** An event can change only the state of the Blockie whose reducer handles it.
6. **FIFO delivery.** Event deliveries are processed through a single logical FIFO queue per World transaction.
7. **Stable fan-out.** Multiple routes from one event source are scheduled in a deterministic order.
8. **Explicit boundaries.** Crossing a Composite boundary requires a declared binding, handler, exposure, or dispatch route.
9. **Bounded processing.** Event loops and unbounded cascades MUST be detected or stopped by runtime limits.
10. **Effects occur after commit.** External operations are not executed by reducers and do not participate in the in-memory event queue as synchronous side effects.

# 5. Event model

## 5.1 Event ports

An event port MUST declare:

- A stable port ID within its Definition.
- A direction: `input` or `output`.
- A kind of `event`.
- A payload type defined using BTS.

Example:

```json
{
  "id": "on_vote",
  "direction": "input",
  "kind": "event",
  "payload_type": {
    "kind": "record",
    "properties": {
      "option_id": { "kind": "primitive", "name": "string" }
    },
    "required": ["option_id"],
    "additional_properties": false
  }
}
```

An event port carries occurrences, not persistent values. An event MUST NOT be represented as a value port containing a Boolean that remains true after the occurrence.

## 5.2 Event envelope

The Runtime MUST represent each event using an envelope equivalent to the following logical structure:

```json
{
  "event_id": "evt_01J...",
  "transaction_id": "tx_01J...",
  "origin": {
    "kind": "actor",
    "id": "actor_123"
  },
  "emitter": {
    "kind": "blockie",
    "id": "button_001"
  },
  "causation_id": null,
  "correlation_id": "poll_session_001",
  "payload": {
    "option_id": "option_a"
  }
}
```

The fields have the following semantics:

| Field | Meaning |
|---|---|
| `event_id` | Unique identity of this logical event. |
| `transaction_id` | Transaction in which the event is being processed. |
| `origin` | Original actor or system that initiated the causal chain. |
| `emitter` | Blockie or host component that most recently created this logical event. |
| `causation_id` | Event ID that directly caused this event to be created; null for an externally originated event. |
| `correlation_id` | Optional identifier grouping related events into a larger operation. |
| `payload` | Immutable event data, validated against the receiving port's payload type. |

The destination port is delivery metadata and MUST NOT be treated as part of the immutable event identity. A forwarded delivery may carry a different destination port while retaining the same `event_id`.

The Runtime MAY maintain additional private delivery metadata, including a transaction-local delivery sequence, route trace, forwarding-hop count, and internal source endpoint. Such metadata is not automatically exposed to user scripts or across a public Composite boundary.

Wall-clock timestamps MUST NOT determine event ordering. A timestamp MAY be included as ordinary payload or diagnostic metadata, but it is not a substitute for queue order or causation metadata.

## 5.3 Event identity

An externally accepted event MUST receive an event ID from the authoritative Runtime or host. A caller-supplied identifier MAY be retained as a separate command or idempotency key, but MUST NOT be trusted as the authoritative event ID without host validation.

Forwarding MUST preserve `event_id`, `origin`, `causation_id`, and `correlation_id`.

A reducer-created event MUST receive a new `event_id`. Its `causation_id` MUST reference the event being handled. Its `origin` and `correlation_id` SHOULD be inherited from the triggering event. Its `emitter` MUST identify the Blockie whose reducer created it.

## 5.4 Event immutability

Event payloads MUST be treated as immutable snapshots. A recipient MUST NOT mutate an envelope or payload in place. A reducer that needs to produce a changed payload MUST create a new event through `emit` or `dispatch`.

# 6. Event routing across Composite boundaries

## 6.1 Four boundary mechanisms

The Composite protocol defines four event mechanisms. They MUST remain semantically distinct.

| Mechanism | Source | Destination | Creates a new event? | Invokes Composite reducer? |
|---|---|---|---:|---:|
| Input binding / forwarding | Composite public event input | Descendant event input | No | Only if the public input is also handled by its reducer |
| Child event handler / notification | Descendant event output | Composite private reducer handler | No | Yes |
| Event exposure | Descendant event output | Composite public event output | No | No |
| Child event dispatch | Composite reducer | Descendant event input | Yes | The child reducer may be invoked |

A Composite Definition MUST declare each route explicitly.

## 6.2 Parent-to-child event forwarding

An event input binding routes an event received by a Composite public event input to a child event input.

Example:

```json
{
  "id": "forward_reset_to_vote_store",
  "source": { "public_port": "on_reset" },
  "target": { "node": "vote_store", "port": "reset" },
  "kind": "event"
}
```

Rules:

1. The source MUST be a public Composite event input.
2. The target MUST be an event input belonging to a descendant in the Composite's own template scope.
3. Payload types MUST be compatible under BTS.
4. Forwarding MUST preserve the logical event identity and causal metadata.
5. The forwarded delivery MUST be enqueued; it MUST NOT invoke the child reducer recursively on the current call stack.
6. A Composite public event input MAY have multiple event input bindings. Each binding represents an explicit fan-out destination.
7. A public event input MAY also be handled by the Composite's own reducer. These are separate destinations of the incoming occurrence.

Input bindings MUST NOT target private ports inside a nested Composite. A nested Composite MUST expose an event input for an outer Composite to forward an event into it.

## 6.3 Child-to-parent notification

A child event handler route delivers an event emitted by a descendant to a private handler on the owning Composite.

Example:

```json
{
  "id": "handle_accepted_vote",
  "source": { "node": "vote_processor", "port": "accepted" },
  "handler": "on_child_vote_accepted",
  "payload_type": {
    "kind": "record",
    "properties": {
      "participant_id": { "kind": "primitive", "name": "string" },
      "option_id": { "kind": "primitive", "name": "string" }
    },
    "required": ["participant_id", "option_id"],
    "additional_properties": false
  }
}
```

The `handler` identifies a private reducer handler declared by the Composite Definition. It is not a public event input and MUST NOT be connectable from outside the Composite.

When the route is taken:

- The same logical event is delivered to the Composite reducer.
- The reducer sees the handler ID as its receiving event port/handler.
- The event payload and event identity are preserved.
- The Runtime MAY provide a scoped source alias identifying the declaring template node, but MUST NOT expose private runtime pointers or child state.

The notification route's source MUST be a descendant in the Composite's own template scope. Its destination is the owning Composite's declared private reducer handler. A parent MUST NOT subscribe directly to a nested Composite's private child output. The nested Composite must expose an event through its public interface first. The source output payload type MUST be assignable to the private handler's declared payload type under BTS.

A child event does not automatically notify its parent. If no handler or exposure is declared, the event remains within the child's local event-routing scope.

## 6.4 Event exposure

An event exposure forwards a descendant's event output to a public event output of the Composite.

Example:

```json
{
  "id": "expose_vote_accepted",
  "source": { "node": "vote_processor", "port": "accepted" },
  "public_port": "on_vote_accepted"
}
```

Rules:

1. The source MUST be a descendant event output in the Composite's own template scope.
2. The destination MUST be a public Composite event output.
3. Payload types MUST be compatible under BTS.
4. Exposure MUST preserve the logical event ID and causal metadata.
5. Exposure MUST NOT invoke the Composite reducer by itself.
6. A Composite MAY both handle and expose the same child event through two separately declared routes.
7. A public event output MAY have multiple outgoing connections in the enclosing World.

At a public boundary, private child identity and route details MUST be redacted from external consumers unless explicitly included in the declared public payload. The internal event envelope retains its origin and causation identity. The Runtime MUST expose a boundary-safe event view in which the publicly visible source is the Composite instance and its public output port; it MUST NOT expose a private descendant ID merely because that descendant originated the event.

## 6.5 Parent-to-child event dispatch

A Composite reducer MAY intentionally create a new event for a child through a declared dispatch route. This is different from forwarding an incoming event.

Example route declaration:

```json
{
  "id": "reset_vote_store",
  "target": { "node": "vote_store", "port": "reset" },
  "payload_type": {
    "kind": "record",
    "properties": {},
    "required": [],
    "additional_properties": false
  }
}
```

Reducer result:

```javascript
export function reduce({ state, config, event }) {
  if (event.port === "on_reset_requested") {
    return {
      state: { ...state, reset_count: state.reset_count + 1 },
      dispatch: [
        { route: "reset_vote_store", payload: {} }
      ],
      emit: [],
      effects: []
    };
  }

  return { state, dispatch: [], emit: [], effects: [] };
}
```

Rules:

- A dispatch route MUST be declared by the Composite Definition.
- A reducer MUST refer to a dispatch route by its declared route ID, not by an arbitrary child instance ID.
- The route target MUST be a descendant event input in the Composite's own template scope.
- The dispatch payload MUST satisfy the route payload type and target input payload type.
- Each dispatch MUST create a new event ID.
- The new event's `causation_id` MUST be the event ID currently being handled.
- Dispatches MUST be appended to the transaction FIFO queue; they MUST NOT synchronously invoke the child reducer.

An atomic Blockie MUST NOT use Composite child dispatch routes because it has no owned template scope. It MAY emit events through its declared output ports as defined by the Core Protocol.

# 7. Reducers and event handling

## 7.1 Reducer ownership

A reducer changes only the Model State of the Blockie that owns that reducer.

When an event reaches an atomic Blockie event input, that Blockie's reducer MAY handle it.

When an event reaches a Composite public event input, the Composite reducer MAY handle it, and declared input bindings MAY forward it to descendants.

When a child event reaches a Composite private handler, the owning Composite reducer handles it.

A Composite reducer MUST NOT directly read or mutate child Model State. It may use the event payload delivered to its handler and its own Model State, configuration, and explicitly declared capabilities.

## 7.2 Reducer input contract

The canonical conceptual ABI is:

```typescript
type EventContext = {
  port: string;                 // public input port or private handler ID
  payload: unknown;             // validated against the receiving route
  event_id: string;
  origin: EventOrigin;
  emitter: EventEmitter;
  causation_id: string | null;
  correlation_id?: string;
};

type ReduceResult<State> = {
  state: State;
  dispatch: Array<{ route: string; payload: unknown }>;
  emit: Array<{ port: string; payload: unknown }>;
  effects: Array<{ effect: string; input: unknown }>;
};

function reduce(context: {
  state: Readonly<State>;
  config: Readonly<Config>;
  event: Readonly<EventContext>;
}): ReduceResult<State>;
```

The `dispatch` field is available to Composite reducers only. Atomic reducers MUST return an empty `dispatch` array or omit it if the host ABI defines omission as empty.

For a public event input, the reducer is invoked only when that input ID is listed in `logic.reduce.handled_inputs`. A private handler is invoked when an `event_handlers` route targets its declared handler ID. A Composite Definition MUST NOT declare a handler ID that has no corresponding reducer implementation.

For compatibility with earlier Core Protocol drafts, `emit` and `effects` retain their existing meanings. The context-object form above is the canonical v0.1 ABI and should replace inconsistent positional and object-destructuring examples in earlier drafts.

## 7.3 Reducer purity

A reducer MUST be pure with respect to its arguments and declared runtime contract:

- It MUST NOT mutate the supplied state, configuration, or event.
- It MUST NOT access another Blockie's state.
- It MUST NOT enqueue events through hidden runtime APIs.
- It MUST NOT perform network or filesystem operations.
- It MUST return the complete next state.
- It MUST return events and dispatch requests as data in its result.

The Runtime validates the returned state, emitted events, dispatch requests, and effects before committing them.

## 7.4 Reducer state visibility within a transaction

Reducer executions are serial within a World transaction.

When a reducer succeeds, its staged next state becomes the current staged state for that Blockie. A later reducer invocation for the same Blockie in the same transaction MUST receive that latest staged state, not the previously committed state.

No staged state becomes externally visible until the transaction commits.

## 7.5 Composite Model State

A Composite MAY own Model State and a reducer independently of its children. This state is isolated from child state.

If a child event causes the Composite to update its own state, the Composite reducer performs that transition. If the Composite must cause a child to react, it uses a declared dispatch route or an existing declared input binding. It MUST NOT mutate child state directly.

# 8. Event ordering and delivery

## 8.1 Single logical FIFO queue

A Runtime MUST process event deliveries through one logical FIFO queue per World transaction.

Implementations MAY use internal data structures or worker threads, but observable reducer invocation and event delivery order MUST be equivalent to serial FIFO processing.

Reducers MUST NOT execute concurrently within the same World transaction in v0.1.

## 8.2 Initial event order

If a transaction accepts multiple initial events, the Runtime MUST enqueue them in the order supplied by the authoritative caller or host command batch.

If concurrent callers submit events, the host MUST establish a single deterministic acceptance order before transaction processing. Wall-clock timestamp order MUST NOT be used as an implicit conflict-resolution rule.

## 8.3 Fan-out order

When one event output has multiple destinations, the Runtime MUST enqueue deliveries in ascending `route_id` order using bytewise UTF-8 lexical ordering.

All event routes participating in fan-out MUST have unique IDs within their routing scope. This includes ordinary event connections, Composite event handlers, event exposures, and other explicit forwarding routes.

For an event delivered to a Composite input that has both a local reducer and one or more input bindings, the Runtime MUST:

1. Invoke the local reducer first, if the input ID is listed in `logic.reduce.handled_inputs`.
2. Enqueue the reducer's `dispatch` requests in the order returned.
3. Enqueue the reducer's `emit` events in the order returned.
4. Enqueue event-binding deliveries in ascending binding route ID order.

This order is normative for v0.1. If no local reducer handles the input, only the applicable binding deliveries are enqueued.

## 8.4 Fan-out from event outputs

When a logical event is emitted from an event output, the Runtime MUST collect all applicable destinations from the following route kinds:

- Ordinary event Connections.
- Composite child-to-parent event handler routes.
- Composite event exposure routes.

The Runtime MUST enqueue those deliveries in ascending `route_id` order. Each destination receives the same logical event ID and payload, with destination-specific delivery metadata. A reducer handler is a queued destination; it is not invoked inline while the source output is being processed.

An event output with no destinations MAY be treated as an unobserved event. An event input with no reducer, forwarding binding, or explicit ignore policy MUST be rejected as unhandled.

## 8.5 Reducer-generated action order

For each successful reducer invocation:

1. `dispatch` entries MUST be processed in array order.
2. `emit` entries MUST be processed in array order after all `dispatch` entries.
3. Each newly created event's destinations MUST be enqueued in ascending route ID order.
4. `effects` MUST be recorded for post-commit execution and MUST NOT enter the event queue during the current transaction.

The Runtime MUST validate all action entries before commit. An invalid dispatch or emitted event causes the transaction to fail.

## 8.6 Forwarding and FIFO behavior

Forwarding a logical event across one or more boundaries preserves its event ID. Each forwarding step creates a new delivery record and appends it to the queue; it does not recursively invoke a destination reducer.

This produces breadth-first queue behavior rather than depth-first call-stack behavior.

Example:

```text
Event E reaches Composite input P.
P forwards E to Child A and Child B.

Queue after forwarding:
  1. E -> Child A
  2. E -> Child B

Child A handles E and emits E1.
Child B handles E.
E1 is processed after the already queued Child B delivery.
```

The Runtime MUST NOT synchronously recurse through nested Composite forwarding routes.

## 8.7 Nested Composite ordering

An event entering a nested Composite follows the same rules at each boundary. The nested Composite's own reducer and input bindings are processed when its input delivery is dequeued.

No special priority is granted to ancestors or descendants. Event ordering follows queue insertion order and declared route ordering.

## 8.8 Delivery semantics

Within one successfully committed transaction, each scheduled delivery MUST be processed at most once.

The protocol does not promise exactly-once processing across process crashes, storage failures, or network retries. Durable replay and cross-process idempotency require a separate persistence or collaboration specification.

Hosts SHOULD support idempotency keys for externally submitted commands when duplicate submission is possible.

# 9. Event cycles and execution limits

## 9.1 Forwarding-only cycles

A forwarding-only cycle is a cycle in which an event can circulate through connections, input bindings, event handlers, or event exposures without invoking a reducer that creates a new event.

A Composite Definition or World MUST NOT contain a forwarding-only event cycle.

The Runtime MUST detect such cycles during validation where the event routing graph is statically knowable.

The Runtime SHOULD also track route traversal for each logical event and reject a repeated route traversal as a runtime safety check.

## 9.2 Reducer-mediated cycles

A cycle that passes through a reducer and creates a new event is permitted. The reducer-created event has a new event ID and a causation link to the event that triggered it.

Such cycles MUST be bounded by transaction limits.

## 9.3 Required limits

A Runtime MUST enforce configurable limits for at least:

- Maximum event deliveries per transaction.
- Maximum reducer invocations per transaction.
- Maximum forwarding hops per logical event.
- Maximum causal event depth.
- Maximum payload size.
- Maximum reducer execution time and memory.

Exceeding a limit MUST fail the transaction without committing staged Model State or publishing staged events.

# 10. Transaction semantics

## 10.1 Event transaction lifecycle

A transaction involving events MUST follow this logical sequence:

1. Accept the initiating command or external event.
2. Assign a transaction ID and authoritative event IDs.
3. Validate initial event ports and payloads.
4. Create a staged state view from the last committed World generation.
5. Enqueue initial event deliveries in acceptance order.
6. Process deliveries serially using FIFO ordering.
7. Invoke reducers and validate each returned state transition.
8. Enqueue dispatches, emitted events, and declared forwarding deliveries according to this specification.
9. Continue until the event queue is empty or a transaction limit is exceeded.
10. Recompute dirty value dependencies, including affected Composite computations, against the staged state generation.
11. Validate computed outputs and Composite outputs.
12. Commit staged Model State and derived output generation atomically.
13. Publish committed event outputs and state/output changes to renderers and synchronization adapters.
14. Execute authorized effects after commit.

Effects MUST NOT run before commit. An effect result MUST enter the World as a new event in a subsequent transaction.

## 10.2 Atomicity

A reducer failure, invalid reducer result, invalid dispatch, invalid emitted event, or event limit failure MUST abort the originating transaction. No staged Model State changes or staged event outputs from that transaction may be committed.

A computation failure follows the Core Protocol and BCCS behavior: it marks the affected computed output as an error but does not by itself roll back an otherwise valid reducer transaction. Downstream computations MUST NOT silently consume stale values as current values.

## 10.3 Parent and child state transitions

A child reducer and its parent Composite reducer may both execute within the same transaction.

Each reducer changes only its own Blockie's staged state. Their invocation order is the event queue order. The parent reducer MUST use the child event payload rather than reading child state.

After the event queue is drained, reactive computations run against the final staged state generation. Composite Compute can then consume its declared Internal Observations according to BCCS.

## 10.4 Event visibility

Staged event outputs MUST NOT be published to external consumers until the transaction commits.

Internal event deliveries within the transaction are visible to the Runtime's staged execution process only.

# 11. Errors

The Runtime SHOULD use structured error codes, including:

| Code | Meaning |
|---|---|
| `event_port_not_found` | Event port does not exist. |
| `event_payload_invalid` | Event payload fails BTS validation. |
| `event_route_invalid` | Event route refers to an invalid endpoint. |
| `event_handler_not_found` | Composite private reducer handler is not declared. |
| `event_exposure_invalid` | Event exposure is invalid or type-incompatible. |
| `event_dispatch_route_not_found` | Reducer referenced an undeclared child dispatch route. |
| `event_dispatch_invalid` | Dispatch payload or destination is invalid. |
| `event_forwarding_cycle` | A forwarding-only cycle was detected. |
| `event_delivery_limit_exceeded` | Transaction delivery limit was exceeded. |
| `event_causal_depth_exceeded` | Causal event depth limit was exceeded. |
| `reducer_failed` | Reducer execution failed. |
| `reducer_result_invalid` | Reducer returned invalid state or actions. |
| `event_unhandled` | Event reached an input with no declared handler or forwarding behavior. |

An invalid external event MUST be rejected before processing. An invalid internally generated event MUST fail the current transaction.

A Definition MUST NOT silently discard an event delivered to an input unless it explicitly declares an ignore policy for that input. The default behavior for an unhandled event input is rejection.

# 12. Serialization and materialization

## 12.1 Definition-time event declarations

Composite Definitions MUST serialize the following event declarations when applicable:

- Public event inputs and outputs.
- Event input bindings.
- Child event handler routes.
- Event output exposures.
- Child dispatch routes.
- Private reducer handler declarations and payload types.

These declarations MUST use stable IDs within the exact Definition version.

## 12.2 Instance materialization

When a Composite is instantiated, every template-local event route MUST be materialized with a stable provenance reference to:

- The owning Composite instance ID.
- The Composite Definition ID and version.
- The template-local route ID.
- The materialized source and destination instance IDs.

Materialization MUST NOT create new public routes that bypass nested Composite boundaries.

## 12.3 Persistence

Pending event queues, in-flight deliveries, route traces, and staged transaction state MUST NOT be serialized as canonical World document state.

A host MAY maintain a separate durable event log or command journal, but that is outside this specification.

# 13. Security and encapsulation

1. A child MUST NOT address its parent reducer through arbitrary instance lookup. It can only emit through declared event output ports.
2. A parent MUST NOT subscribe to private descendant event ports inside a nested Composite.
3. A Composite reducer MUST NOT receive direct references to child instances, child state objects, or private runtime objects.
4. A dispatch route MUST identify a declared child event input, not an arbitrary child ID supplied by user code.
5. Public event exposure MUST redact private descendant topology from external consumers unless the public payload explicitly includes relevant information.
6. Event payloads crossing a boundary MUST be validated against the receiving contract.
7. Capabilities and authorization MUST be checked by the Runtime or authoritative host, not by the Renderer alone.

# 14. Reference example: Poll Composite

## 14.1 Structure

```text
Poll Composite
│
├── Public event inputs
│   ├── submit_vote
│   └── reset
│
├── Children
│   ├── vote_processor
│   ├── vote_store
│   └── vote_aggregator
│
├── Child event handlers
│   └── on_vote_accepted
│
├── Event exposures
│   └── on_vote_accepted (public)
│
├── Child dispatch routes
│   └── reset_vote_store
│
└── Public value outputs
    ├── total_votes
    └── results
```

## 14.2 Route and reducer declarations

The Composite declares a private handler for accepted votes and a public reducer input for reset requests:

```json
{
  "logic": {
    "reduce": {
      "runtime": "blockies.javascript/1",
      "module": "sha256:poll-composite",
      "export": "reduce",
      "handled_inputs": ["reset_requested"],
      "handlers": [
        { "id": "on_vote_accepted", "payload_type": {
          "kind": "record",
          "properties": {
            "participant_id": { "kind": "primitive", "name": "string" },
            "option_id": { "kind": "primitive", "name": "string" }
          },
          "required": ["participant_id", "option_id"],
          "additional_properties": false
        }}
      ]
    }
  }
}
```

The event boundary routes are then declared as follows:

```json
{
  "event_bindings": [
    {
      "id": "forward_submit_vote",
      "source": { "public_port": "submit_vote" },
      "target": { "node": "vote_processor", "port": "submit" }
    }
  ],
  "event_handlers": [
    {
      "id": "handle_vote_accepted",
      "source": { "node": "vote_processor", "port": "accepted" },
      "handler": "on_vote_accepted",
      "payload_type": {
        "kind": "record",
        "properties": {
          "participant_id": { "kind": "primitive", "name": "string" },
          "option_id": { "kind": "primitive", "name": "string" }
        },
        "required": ["participant_id", "option_id"],
        "additional_properties": false
      }
    }
  ],
  "event_exposures": [
    {
      "id": "expose_vote_accepted",
      "source": { "node": "vote_processor", "port": "accepted" },
      "public_port": "on_vote_accepted"
    }
  ],
  "dispatch_routes": [
    {
      "id": "reset_vote_store",
      "target": { "node": "vote_store", "port": "reset" },
      "payload_type": {
        "kind": "record",
        "properties": {},
        "required": [],
        "additional_properties": false
      }
    }
  ]
}
```

## 14.3 Composite reducer

```javascript
export function reduce({ state, config, event }) {
  switch (event.port) {
    case "on_vote_accepted":
      return {
        state: {
          ...state,
          accepted_votes: state.accepted_votes + 1
        },
        dispatch: [],
        emit: [
          {
            port: "vote_count_changed",
            payload: {
              accepted_votes: state.accepted_votes + 1
            }
          }
        ],
        effects: []
      };

    case "reset_requested":
      return {
        state: {
          ...state,
          accepted_votes: 0
        },
        dispatch: [
          { route: "reset_vote_store", payload: {} }
        ],
        emit: [],
        effects: []
      };

    default:
      throw new Error(`Unsupported event: ${event.port}`);
  }
}
```

The event handler `on_vote_accepted` is private to the Composite. `vote_count_changed` is a public event output. The dispatch route `reset_vote_store` is a declared capability to send a new event to one child input.

## 14.4 Expected event flow

For an external `submit_vote` event:

1. The host submits the event to the Poll's public input.
2. The Poll's `forward_submit_vote` binding forwards the same event to `vote_processor.submit`.
3. The Vote Processor reducer validates the submission and updates only its own state.
4. The Vote Processor emits a new `accepted` event if the vote is accepted.
5. The new event is routed to the Poll's private `on_vote_accepted` handler and, independently, through the public `on_vote_accepted` exposure.
6. The Poll reducer updates only the Poll's own `accepted_votes` state and emits `vote_count_changed`.
7. The Runtime drains the event queue, recomputes dirty value dependencies, and commits the transaction.
8. External consumers receive committed public event outputs. They do not receive the private child event route or child identity.

For a `reset_requested` event handled by the Poll:

1. The Poll reducer sets its own staged counter to zero.
2. It returns a dispatch request referencing `reset_vote_store`.
3. The Runtime creates a new event with a new event ID and `causation_id` equal to the reset request event ID.
4. The new event is queued for `vote_store.reset`.
5. The Vote Store reducer handles the new event and changes only its own state.
6. The transaction completes and commits both state transitions together.

# 15. Validation requirements

A conforming Composite Definition validator MUST verify:

- Every route ID is unique within its declared scope.
- Every source and destination exists.
- Event routes connect event-compatible endpoints.
- Every payload schema is valid under BTS.
- Event handlers target declared private reducer handlers.
- Event exposures target public Composite event outputs.
- Input bindings target descendants in the Composite's own template scope.
- Dispatch routes target descendants in the Composite's own template scope.
- Nested Composite private ports are not addressed directly.
- No forwarding-only event cycle exists.
- Every event input has a reducer handler, explicit forwarding behavior, or an explicit ignore policy.

A conforming Runtime MUST validate every actual event payload and every reducer-produced action before commit.

# 16. Conformance requirements

An implementation claiming conformance to this specification MUST:

1. Represent events using unique logical event identities.
2. Preserve event identity across forwarding routes.
3. Create new event identities for reducer dispatches and emitted events.
4. Support explicit parent-to-child event bindings.
5. Support explicit child-to-parent reducer notifications.
6. Support direct child-event exposure through Composite public outputs.
7. Support Composite reducer dispatch through declared child routes.
8. Enforce reducer ownership and child-state isolation.
9. Process event deliveries in FIFO order.
10. Use stable route ordering for fan-out.
11. Serialize reducer execution within a World transaction.
12. Stage and commit state transitions atomically.
13. Enforce forwarding-cycle validation and runtime execution limits.
14. Keep pending event queues and in-flight deliveries out of canonical World serialization.
15. Preserve Composite encapsulation across nested boundaries.

# 17. Required conformance tests

A conformance suite MUST include at least the following tests:

| Test | Expected result |
|---|---|
| Public Composite event input forwards to one child | Same event ID reaches child input. |
| Public input forwards to two children | Both deliveries are enqueued in route ID order. |
| Child event reaches parent handler | Parent reducer runs with the declared private handler ID. |
| Child event is exposed publicly | Same logical event is published through Composite output after commit. |
| Child event is both handled and exposed | Both declared routes run; reducer and exposure remain separate. |
| Parent reducer dispatches to child | Child receives a new event ID with causation pointing to the triggering event. |
| Parent reducer attempts arbitrary child lookup | Access is denied or unavailable. |
| Nested child tries to reach grandparent directly | Validation rejects the undeclared boundary crossing. |
| Two events reach the same reducer | Reducer calls follow FIFO delivery order. |
| One event fans out to multiple routes | Route ID ordering is deterministic. |
| Reducer emits another event | New event is appended to the FIFO queue, not recursively executed. |
| Forwarding-only cycle exists | Definition or World validation fails. |
| Reducer-mediated event loop exceeds limit | Transaction aborts without partial commit. |
| Reducer fails after an earlier staged state change | Entire transaction rolls back. |
| Effect is requested by reducer | Effect executes only after successful commit. |
| World is serialized during no transaction | Pending queues are absent from canonical document. |

# 18. Decisions for v0.1

The following decisions are normative for this draft:

1. Events are immutable messages with stable logical identities.
2. Forwarding preserves event identity; reducer-created events receive new identities.
3. Parent-to-child forwarding uses explicit input bindings.
4. Child-to-parent notification uses explicit private reducer handler routes.
5. Direct child event publication uses explicit event exposures.
6. Parent-to-child commands generated by a Composite reducer use explicit dispatch routes.
7. No event automatically bubbles through the composition tree.
8. Reducers modify only their owner's state.
9. Reducer execution is serial within a World transaction.
10. Event delivery uses a FIFO queue and stable route ordering.
11. Forwarding-only cycles are invalid; reducer-mediated cycles are bounded by runtime limits.
12. All staged state changes and event outputs commit atomically.
13. Effects execute after commit and return through later transactions.

# 19. Deferred topics

The following are outside v0.1:

- Durable event sourcing and event-log retention.
- Exactly-once delivery across process crashes.
- Distributed event ordering across multiple hosts.
- Event prioritization and priority queues.
- Event cancellation after enqueue.
- Event coalescing or debouncing.
- Time-based scheduling and delayed events.
- Streaming ports and backpressure.
- Event schema evolution and long-term replay migrations.
- Cross-World event routing.
- General-purpose pub/sub topics.

These features require separate semantics and MUST NOT be inferred from this specification.

# 20. Relationship to other specifications

- **Blockies Protocol Specification:** Defines event ports, ordinary connections, reducers, effects, and transactions.
- **Blockies Type System Specification (BTS):** Defines event payload types and runtime value validation.
- **Blockies Composite Instantiation Specification (BCIS):** Defines template nodes, materialized child instances, and structural ownership.
- **Blockies Composite Computation Specification (BCCS):** Defines Composite state, reducers, Composite Compute, internal observations, and value-output behavior.

This document specializes event behavior for Composites. It also resolves the earlier BCIS draft's prohibition on Composite reducers in favor of BCCS's model in which a Composite may own state and a reducer. The specifications should be reconciled before any of them are declared stable.

---

# Appendix A — Implementation guidance (informative)

A Rust implementation can model the scheduler queue as a sequence of delivery records:

```rust
struct EventDelivery {
    envelope: EventEnvelope,
    destination: EventDestination,
    route_id: Option<RouteId>,
    delivery_sequence: u64,
}
```

A destination can be an ordinary event input or a private Composite reducer handler. The runtime should resolve the destination and validate the payload before invoking the reducer.

The scheduler should avoid recursive calls between Composite runtimes. A single World scheduler with scoped route resolution is simpler to reason about and makes nested Composite ordering easier to test.

# Appendix B — Event lifecycle summary

```text
External command / event
          |
          v
    Public event input
          |
          +------> Composite reducer (optional)
          |
          +------> Declared child input bindings
                         |
                         v
                    Child reducer
                         |
                         +------> Internal event connection
                         |
                         +------> Parent private handler
                         |              |
                         |              v
                         |       Composite reducer
                         |              |
                         |              +----> New child dispatch event
                         |              |
                         |              +----> New public event
                         |
                         +------> Composite event exposure
                                        |
                                        v
                                Enclosing World consumers
```

Forwarded events preserve identity. Events emitted or dispatched by reducers receive new identities. All deliveries are processed through the transaction's FIFO queue.

---

**End of Blockies Composite Event Flow Specification v0.1.0-draft**
