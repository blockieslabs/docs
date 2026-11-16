# Blockies v0.1 Integrated Conformance Test Suite

**Suite ID:** `blockies-conformance/0.1`  
**Status:** Draft; test design baseline  
**Target:** Blockies Protocol v0.1 draft family  
**Schema dialect:** JSON Schema Draft 2020-12  
**Companion package:** `blockies-v0.1-conformance-suite.zip`

---

## 1. Purpose

This suite defines how an implementation demonstrates conformance across the complete Blockies v0.1 system. The current catalog contains **163 test cases: 118 normative candidates and 45 blocked by unresolved decisions**. The exact catalog is authoritative; this prose explains the contract and coverage. It is not merely a collection of unit tests. It verifies that the six specifications behave as one coherent contract:

1. Core Protocol and canonical document schemas.
2. Blockies Type System (BTS).
3. Composite Blockie instantiation (BCIS).
4. Composite computation (BCCS).
5. Composite event flow (BCEFS).
6. Runtime execution (BRES).

The suite covers structural validation, semantic validation, executable behavior, deterministic traces, transaction outcomes, and expected committed snapshots.

A passing schema test does not imply semantic or runtime conformance. Each layer is tested independently and then through integrated scenarios.

## 2. Conformance levels

An implementation reports results separately for these levels:

| Level | Meaning | Required capabilities |
|---|---|---|
| `schema` | Canonical JSON document shape | Draft 2020-12 validation for Definitions, Instances, Worlds, Connections, Composition and Composite interfaces |
| `validator` | Document and BTS semantics | Cross-reference, type, template materialization, ownership, scope and graph validation |
| `runtime` | Local execution | Reducers, events, staged state, reactive computation, Composites, transactions, effects and deterministic snapshots |
| `full-core` | Combined core conformance | All applicable schema, validator and runtime tests |

An implementation MUST NOT report `full-core` based only on JSON Schema validation.

## 3. Test status

Every test has one of three statuses:

- `normative`: expected behavior is specified sufficiently to test now, subject to the draft's overall non-frozen status.
- `blocked-by-decision`: a required protocol/schema contract is missing or contradictory. The test is included to prevent the gap from being forgotten, but MUST NOT be used to fail an implementation until the decision is resolved and the suite is updated.
- `informational`: characterization or performance test without a normative pass/fail threshold.

A release candidate cannot be frozen while any P0/P1 blocked case remains unresolved.

### 3.1 Current catalog inventory

| Category | Cases |
|---|---:|
| `schema` | 13 |
| `semantic` | 21 |
| `bts.value` | 36 |
| `bts.assignability` | 23 |
| `bts.generic` | 5 |
| `composite.instantiation` | 10 |
| `runtime.determinism` | 6 |
| `runtime.events` | 8 |
| `composite.computation` | 10 |
| `runtime.transactions` | 12 |
| `runtime.effects` | 6 |
| `runtime.errors` | 2 |
| `composite.events` | 11 |

**Status:** 118 normative candidates; 45 blocked by decisions. Category totals include blocked cases; schema fixture count is separately 12.

**Status:** 118 normative candidates; 45 blocked by decisions.

## 4. Package layout

```text
blockies-v0.1-conformance/
├── README.md
├── CONFORMANCE_SPEC.md
├── schemas/
│   ├── blockies-v0.1.schema.json
│   └── conformance-case.schema.json
├── cases/
│   └── catalog.json
├── fixtures/
│   ├── schema/
│   │   ├── valid/
│   │   ├── invalid/
│   │   └── cases.json
│   ├── types/
│   │   ├── value-validation.json
│   │   ├── assignability.json
│   │   └── generics.json
│   ├── composite/
│   │   └── materialization-vectors.json
│   ├── runtime/
│   │   └── golden-vectors.json
│   └── expected/
│       └── runtime-golden-results.json
└── support/
    └── SEMANTIC_VALIDATION.md
```

The canonical schema is copied into the package unchanged. `conformance-case.schema.json` describes the suite's metadata format; it is not part of the Blockies wire protocol.

## 5. Test harness contract

A conforming test adapter MUST provide these logical operations:

```text
validate_schema(document, schema_ref) -> VALID | INVALID + diagnostics
validate_definition(definition, package_manifest) -> report
validate_world(world, package_manifest) -> report
validate_value(value, type_expression, type_scope) -> VALID | INVALID + diagnostic
is_assignable(source_type, target_type, type_scope) -> bool
instantiate(world, composite_instance, parameters, type_arguments) -> result
restore(world_snapshot) -> runtime
submit_transaction(world_id, ordered_initial_deliveries) -> transaction_result
read_committed_snapshot(world_id) -> snapshot
read_committed_trace(world_id, transaction_id) -> trace
read_effect_outbox(world_id, transaction_id) -> ordered requests
complete_effect(effect_request_id, success_or_failure) -> later transaction
```

The test adapter may compile test scenarios into ordinary Definitions and Worlds. The scenario vectors in this package are a runner-neutral description of the required behavior, not alternative Blockies document formats. A production implementation MUST exercise its real canonical schema, semantic validator, scheduler, and runtime paths rather than hard-code the expected answers.

### 5.1 Deterministic trace events

The harness SHOULD expose normalized trace events. At minimum:

- `transaction.accepted`
- `event.dequeue`
- `reducer.invoke`
- `state.stage`
- `event.enqueue`
- `compute.invoke`
- `output.stage`
- `effect.outbox.append`
- `transaction.commit`
- `generation.publish`
- `effect.execute`
- `transaction.abort`

Trace metadata MUST exclude wall-clock timestamps, thread IDs, memory addresses, and other nondeterministic implementation details. Event IDs, route IDs, Blockie IDs, transaction IDs, generation numbers, and sequence numbers SHOULD be retained.

### 5.2 Comparison rules

- JSON object key order is ignored.
- Array order is significant unless the case explicitly specifies set comparison.
- Event and reducer order MUST match exactly.
- Computation order MUST match the stable scheduler order where execution order is observable. Independent pure computations MAY execute in parallel only if their normalized trace and errors are observationally equivalent to the serial reference order.
- Numeric comparison follows BTS semantics. Decimal values compare numerically while preserving the specified wire scale in state serialization.
- No wall-clock timing value is used in a normative expected result.
- Error tests compare stable diagnostic class/code and path; human-readable message wording is not compared.

## 6. Global test invariants

Every full-core implementation MUST satisfy these invariants:

1. Definitions are immutable and version-pinned.
2. Every Instance ID is stable and independent of position.
3. Composite instantiation creates fresh descendant and relationship IDs.
4. Every materialized child has one owner and isolated Model State.
5. Ports are resolved against the exact pinned Definition.
6. Source output type is assignable to target input type.
7. Missing, null, empty, zero and false remain distinct.
8. Reducers modify only their owning Blockie's staged Model State.
9. Events are queued; forwarding never recursively invokes reducers.
10. Value dependencies form an acyclic graph, including Composite boundary edges.
11. Compute functions are pure and read the staged generation for the transaction's value phase.
12. The event phase drains before value stabilization begins.
13. Renderers observe only committed generations.
14. Reducer/result validation failures abort atomically.
15. Compute-node failures are local: the transaction can commit valid state while the node is in error and descendants are blocked.
16. Effects execute only after the originating transaction commits.
17. Effect results enter a later transaction through declared event inputs.
18. Identical accepted inputs against identical document/module versions produce equivalent committed outputs and deterministic event order.

## 7. Schema conformance tests

### 7.1 Positive schema fixtures

| ID | Fixture | Schema fragment | Expected |
|---|---|---|---|
| SCH-001 | `definition-minimal.json` | `#/$defs/Definition` | Valid |
| SCH-002 | `instance-minimal.json` | `#/$defs/Instance` | Valid |
| SCH-003 | `world-minimal.json` | `#/$defs/World` | Valid |
| SCH-004 | `connection-minimal.json` | `#/$defs/Connection` | Valid |
| SCH-005 | `composite-interface-empty.json` | `#/$defs/CompositeInterface` | Valid |

### 7.2 Negative schema fixtures

| ID | Fixture | Expected failure |
|---|---|---|
| SCH-101 | `world-unsupported-version.json` | `protocol` constant mismatch |
| SCH-102 | `world-missing-roots.json` | Required property missing |
| SCH-103 | `world-malformed-digest.json` | Digest lexical form invalid |
| SCH-104 | `definition-invalid-port.json` | Port discriminator/direction invalid |

The schema runner MUST validate the selected `$defs` fragment using the canonical schema's local registry. It MUST NOT fetch remote network resources during conformance testing.

## 8. Semantic and cross-reference tests

| ID | Test | Expected result |
|---|---|---|
| SEM-001 | World instance map key differs from `Instance.id` | Reject |
| SEM-002 | Definition reference has unknown ID, version or digest | Reject |
| SEM-003 | Instance appears as both root and child, or has multiple owners | Reject |
| SEM-004 | Composition cycle | Reject |
| SEM-005 | Instance is unreachable from every root | Reject |
| SEM-006 | Connection endpoint or port does not resolve | Reject |
| SEM-007 | Direction or value/event kind mismatch | Reject |
| SEM-008 | External connection addresses private Composite descendant | Reject |
| SEM-009 | Flattened value dependency cycle | Reject |
| SEM-010 | More than one effective producer for a value input | Reject |
| SEM-011 | Member/relationship provenance disagrees with template | Reject |
| SEM-012 | Effect result port is missing or is not an event input | Reject |
| SEM-013 | Duplicate Definition port ID | Reject |
| SEM-014 | Unresolved/out-of-scope Type Parameter | Reject |
| SEM-015 | Atomic Definition declares Composite body | Reject |
| SEM-016 | Compute output is not a declared value output | Reject |
| SEM-017 | Composite public value output has zero or multiple producers | Reject |
| SEM-018 | Template child Definition reference is not pinned/resolvable | Reject |
| SEM-019 | Template parameter/config/state initializer violates specialized BTS type | Reject |
| SEM-020 | Duplicate boundary route ID in a scope | Reject |

Diagnostics SHOULD use stable identifiers and JSON Pointer-like paths. Message prose is implementation-defined.

## 9. BTS type conformance

The machine-readable value (35), assignability (23), and generic (5) vectors are in `fixtures/types/`.

### 9.1 Value validation

The suite covers:

- Boolean exactness; no truthy/falsy coercion.
- Safe integer boundaries.
- Finite Number values; no numeric strings, NaN or infinity.
- Decimal lexical form, precision and scale.
- Date calendar validity and DateTime timezone requirements.
- Array cardinality and item validation.
- Record required/optional properties and closed records.
- Union, Literal, Enum, Unknown and Never.
- Missing versus null.

### 9.2 Assignability

The suite covers:

- Integer-to-Number widening only.
- Decimal isolation from binary floating-point Number.
- Literal-to-primitive assignability.
- Enum subset-to-superset directionality.
- Covariant immutable Arrays and Maps.
- Tuple-to-Array compatibility and Array-to-Tuple rejection.
- Structural Record assignability, optionality, and additional properties.
- Unknown as a safe top type and Never as a bottom type.
- Refinement constraints (range, length, precision, scale, uniqueness).

A connection MUST be accepted exactly when its source output type is assignable to its target input type after generic specialization.

### 9.3 Generics

Tests MUST cover:

- Explicit type arguments.
- Inference from one connection site.
- Conflicting inference candidates (must fail; must not silently widen to Unknown).
- Type parameter constraints.
- Defaults.
- Generic specialization before executing an instance.
- Generic types crossing Composite boundaries.

The final item is currently a blocked decision because symbolic parent-parameter forwarding into nested Composite template nodes is not fully specified.

## 10. Composite conformance

### 10.1 Instantiation and identity

| ID | Scenario | Expected |
|---|---|---|
| CMP-001 | Instantiate one definition twice | Distinct Composite IDs and distinct corresponding child IDs |
| CMP-002 | Serialize then restore | Reuse all child and relationship IDs; do not rerun initializers |
| CMP-003 | Remove/duplicate/add a member mapping outside template | Reject materialization |
| CMP-004 | Clone with `reset` | Fresh IDs, template/definition initial state, no copied runtime state |
| CMP-005 | Clone with `copy_state` | Fresh IDs, copy Model State only, no caches/effects/queues |
| CMP-006 | Connect through nested Composite public ports | Accept; private descendant bypass rejected |
| CMP-007 | Child initialization fails halfway | Atomic failure; no partial World mutation |

### 10.2 State isolation

Two instances of the same Composite Definition MUST have independent child state. A transaction modifying a child owned by Composite A MUST NOT change corresponding child state in Composite B.

State isolation tests SHOULD mutate nested arrays and records, not merely replace top-level scalar values, to detect accidental shared mutable references.

### 10.3 Composite computation

Tests MUST cover:

- Internal Observation reads a declared descendant value output only.
- Parent Composite Compute is invalidated when any observed output changes.
- Composite Compute runs after its dirty observation producers.
- Public value output has exactly one producer: one Output Exposure OR Composite Compute.
- Composite Compute cannot inspect child state/configuration directly.
- Nested Composite exposes public outputs without leaking private child IDs.
- A failed child output blocks dependent Composite Compute; independent Composite branches continue.

### 10.4 Composite events

Tests MUST cover:

- Parent public event input forwarding to one and multiple child event inputs.
- Forwarding preserves logical event ID and causation metadata.
- Child event can notify its owning Composite only through a declared private handler.
- The Composite reducer updates only Composite-owned state.
- Composite dispatch creates a new event ID with the triggering event as `causation_id`.
- Child event exposure publishes a boundary-safe public event source.
- One child event may be both handled privately and exposed publicly through separately declared routes.
- Nested Composites obey every boundary and do not allow direct private-child addressing.

## 11. Runtime event-ordering tests

### 11.1 Initial events

Given initial events `[E1, E2, E3]` in host acceptance order, reducers MUST be invoked in `E1, E2, E3` order.

### 11.2 Fan-out

Given routes `route-z`, `route-a`, `route-m`, deliveries MUST be enqueued in this order:

```text
route-a
route-m
route-z
```

Every forwarding destination receives the same logical event ID.

### 11.3 Reducer-generated actions

For one successful reducer result:

1. Stage the returned state.
2. Enqueue `dispatch` entries in array order.
3. Enqueue `emit` entries in array order; fan-out per output is sorted by route ID.
4. Record effects for the post-commit outbox.
5. For a Composite public input, enqueue input-binding forwards in route ID order.

Effects MUST NOT be delivered in the current event queue.

### 11.4 Breadth-first forwarding

A forwarded event is appended to the queue. It MUST NOT call a downstream reducer inline. If E1 is already queued when E0's reducer emits E2, E1 MUST be processed before E2.

### 11.5 Cycles and limits

- Statically detectable forwarding-only cycles MUST be rejected at validation.
- Reducer-mediated cycles MAY execute but MUST be bounded.
- Exceeding event delivery, reducer invocation, forwarding-hop, causal-depth, payload-size or execution-time limits MUST abort without commit or publication.

## 12. Transaction and reactive execution tests

### 12.1 State staging

Multiple deliveries to the same Blockie in one transaction MUST cause each later reducer to observe the latest staged state from earlier reducers.

### 12.2 Event phase before value phase

No Compute invocation may occur until the FIFO event queue is empty. All affected Compute nodes then read the final staged Model State and staged output generation.

### 12.3 Value propagation

The `RT-VALUE-001` golden vector verifies:

```text
A = 2
B = 3
Multiply = A * B = 6

Transaction: set A = 7

Committed generation 1:
A = 7
B = 3
Multiply = 21
```

The expected normalized execution order is reducer for A, then A's Compute, then Multiply's Compute, then commit and publication.

### 12.4 Computation errors

A Compute throw/trap, timeout, or invalid output bundle MUST be node-local under the proposed BRES rule:

- The owning node output status becomes `error` for the new generation.
- Descendants requiring that output become `blocked` or otherwise explicitly unavailable.
- Independent computation branches continue.
- Valid reducer state transitions still commit.

This behavior is a freeze gate until BRES's local Compute exception boundary is made explicit in normative pseudocode.

### 12.5 Reducer errors and transaction abort

If any reducer result is invalid, the entire transaction MUST abort. No staged state, computed outputs, emitted events, external publication, or effects may be committed.

### 12.6 No intermediate publication

Renderers and external observers MUST see either the old committed generation or the new committed generation. They MUST NOT see a staged mixture.

### 12.7 Deterministic computation order

Among equally ready computation nodes, use ascending Blockie instance ID with bytewise UTF-8 lexical ordering. Composite Compute runs after all dirty producers feeding its observations or inputs.

## 13. Effects tests

### 13.1 Post-commit execution

An effect request created by a reducer is added to a transactionally committed outbox. It MUST NOT execute before the originating generation commits and is published.

### 13.2 Result delivery

An effect success/failure result MUST be represented as a new event delivery to a declared event input in a later transaction. It MUST NOT directly mutate Blockie Model State.

### 13.3 Failure and retry

The suite SHOULD include host crash/restart and duplicate completion tests after the effect durability contract is finalized. These tests are currently blocked because outbox durability and idempotency-key semantics are not fully specified.

## 14. Runtime error and resource-limit tests

The suite MUST exercise:

- Invalid initial event payload: reject before transaction staging.
- Reducer throws: abort transaction.
- Reducer returns invalid state: abort transaction.
- Reducer returns undeclared event/dispatch/effect: abort transaction.
- Compute throws or returns invalid output: local node error, transaction may commit.
- Required input unavailable: node blocked, no default fallback for connected upstream error.
- Event queue limit exceeded: abort.
- Reducer invocation limit exceeded: abort.
- Forwarding hop/depth exceeded: abort.
- Memory/time limit exceeded: classify according to reducer-fatal or compute-local failure policy.

## 15. Test case metadata and golden vectors

`cases/catalog.json` is the machine-readable index. `schemas/conformance-case.schema.json` validates case metadata. Scenario vectors are in `fixtures/runtime/golden-vectors.json`; BTS vectors are in `fixtures/types/`; schema fixtures are in `fixtures/schema/`.

The runtime vectors describe logical programs and stimuli. A runner adapter MUST compile them to ordinary Blockies definitions and Worlds. The scenario DSL is test harness data and MUST NOT be treated as a protocol wire format.

## 16. Test execution and reports

A run report SHOULD include:

```json
{
  "suite": "blockies-conformance/0.1",
  "implementation": "blockies-runtime-rust",
  "implementation_version": "0.1.0-dev",
  "protocol_version": "blockies/0.1",
  "results": {
    "passed": 0,
    "failed": 0,
    "blocked": 0,
    "skipped": 0
  },
  "cases": [
    {
      "id": "RT-VALUE-001",
      "status": "passed",
      "duration_ms": 0,
      "diagnostics": []
    }
  ]
}
```

Allowed result statuses: `passed`, `failed`, `blocked`, `skipped`. A blocked test is not a pass.

CI MUST fail a conformance job when any applicable normative case fails. CI SHOULD separately report blocked cases. It MUST NOT silently skip a required case because a capability is unsupported; it should report `blocked` or `failed` according to the suite's declared status.

## 17. Freeze blockers discovered by the suite design

These decisions must be resolved before the suite itself becomes normative:

| ID | Missing or conflicting contract | Required action |
|---|---|---|
| PENDING-001 | `logic.reduce.handled_inputs` appears in BRES/BCEFS but is absent from canonical `ReduceLogic` JSON Schema | Add a canonical handler declaration to schema and ABI |
| PENDING-002 | Effect result payload types and success/failure event mapping are incomplete | Define complete effect result contract |
| PENDING-003 | Nested Composite template construction parameters have no canonical TemplateNode field | Extend schema and BCIS |
| PENDING-004 | BCIS still forbids Composite-owned state/reducer/compute | Reconcile BCIS with BCCS/BCEFS and canonical schema |
| PENDING-005 | Atomic reducer handled-input mapping is missing | Same resolution as PENDING-001 |
| PENDING-006 | Document edit -> graph rebuild -> output stabilization -> publication not fully formalized | Define document-operation commit lifecycle |
| PENDING-007 | Definition/package canonical bytes and digest calculation are unspecified | Define canonicalization and hashing before trusting digest verification |
| PENDING-008 | Compute throw/trap/output-validation failure is not fully caught locally in normative BRES pseudocode | Add local compute error boundary and golden vector |
| PENDING-009 | Value equality used for change propagation is underspecified | Define BTS-aware equality per type |
| PENDING-010 | Reducer ABI differs in event port/handler and envelope/payload representation | Publish one canonical ABI |
| PENDING-011 | Template-expression evaluation semantics are incomplete | Define allowed context, stage and error behavior |
| PENDING-012 | Multi-producer public event output ordering across nested exposures is incomplete | Define route expansion ordering |
| PENDING-013 | Effect outbox durability/retry/idempotency and crash recovery are incomplete | Define host/runtime contract |
| PENDING-014 | Compute dependency granularity: whole state/config invalidation vs declared field dependencies | Choose conservative whole-object invalidation for v0.1 or add declarations |
| PENDING-015 | Materialized Composite route registry and relationship provenance resolution | Define one canonical route/relationship model |
| PENDING-016 | Missing/null/default/connected input resolution priority | Publish one normative resolution matrix |
| PENDING-017 | Value equality for propagation suppression | Define BTS-aware equality, including Decimal and DateTime |
| PENDING-018 | Duplicate event delivery/replay semantics | Define deduplication and idempotent replay rules |

The suite design also confirms that the following choices should be explicitly accepted for v0.1: reducers cannot read arbitrary connected value inputs; one logical FIFO queue orders reducer deliveries; the entire Model State/config object conservatively invalidates its Compute outputs; and Compute errors are local while reducer contract failures abort the transaction.

## 18. Recommended implementation sequence

1. Resolve PENDING-001/005 and PENDING-010: canonical reducer handler mapping and ABI.
2. Resolve PENDING-004: Composite behavior in BCIS.
3. Resolve PENDING-003/011: nested Composite parameters and template expression evaluation.
4. Resolve PENDING-002/013: effect request/result and outbox lifecycle.
5. Resolve PENDING-008/009: Compute local failure and value equality semantics.
6. Resolve PENDING-006: document operation lifecycle.
7. Resolve PENDING-007: canonical Definition package hashing.
8. Build a reference conformance adapter over the canonical JSON Schema and semantic validator.
9. Implement the deterministic local Runtime and pass runtime golden vectors.
10. Add collaboration tests only after local transaction semantics are stable.

## 19. Release gate for v0.1

Do not freeze v0.1 until:

- All P0/P1 consistency-review issues are resolved in the source specifications.
- The canonical JSON Schema is regenerated from the agreed contracts.
- The suite's blocked tests are either resolved or explicitly moved to a future extension with documented rationale.
- Every normative schema and BTS vector passes.
- Every normative semantic and Composite fixture passes.
- Every normative runtime trace and golden committed snapshot passes on the reference runtime.
- Two independent implementations, if available, produce equivalent results for the same golden vectors.
- The conformance report records exact protocol, definition, module, and suite versions.

**Freeze criterion:** no unresolved normative ambiguity may be left to individual Runtime implementations.

---

## Appendix A. Canonical example outputs

### A.1 Multiply

Initial values `A = 2`, `B = 3`; computed `result = 6`. After a `set(A, 7)` event and value stabilization, the committed generation contains `A = 7`, `B = 3`, `result = 21`.

### A.2 Counter FIFO

Initial `seen = []`. Deliver `first`, then `second` in one transaction. The committed state is `seen = ["first", "second"]`.

### A.3 Composite isolation

Two instances start with child counter states `0` and `0`. Increment the child belonging to Composite A. Commit produces A's child `1` and B's child `0`.

### A.4 Compute-local failure

A reducer updates source state from `1` to `5`. Source Compute throws. The transaction commits generation 1 with source Model State `5`, source output status `error`, dependent output status `blocked`, and independent branch output still `ready` with value `9`.

### A.5 Effect lifecycle

Transaction 1 processes `refresh`, commits generation 1 and an effect outbox entry. Only after publication does the host execute the effect. Its completion is delivered as an event in transaction 2, which commits generation 2 with the returned data.

---

*End of Blockies v0.1 Integrated Conformance Test Suite.*
