# Blockies Composite Computation Specification

**Identifier:** BCCS  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Depends on:** Blockies Protocol Specification v0.1, Blockies Type System Specification v0.1 (BTS), Blockies Composite Instantiation Specification v0.1 (BCIS)  
**Format:** Markdown / JSON examples / JavaScript ABI examples

---

## 1. Abstract

This specification defines how a Composite Blockie performs computation using outputs produced by its child Blockies while preserving encapsulation and the reactive execution semantics of a Blockies World.

A Composite Blockie is both:

1. A container that owns a hierarchical composition of child Blockies; and
2. A computational node that exposes a public interface to its parent World.

The Composite's internal children are implementation details. Other Blockies MUST interact with the Composite through its declared public ports. The Composite's own computation MAY consume selected child outputs, but only through explicitly declared **Internal Observations**.

This specification defines:

- Composite-level computation.
- Public input bindings.
- Internal Observations of child outputs.
- Direct output exposures and computed public outputs.
- Dependency graph construction across composition boundaries.
- Reactive invalidation and scheduling.
- Error propagation and transaction behavior.
- Encapsulation and access restrictions.
- Serialization and conformance requirements.

The specification does not define a particular Rust implementation, JavaScript engine, renderer, or CRDT implementation.

## 2. Normative language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

- **MUST / MUST NOT:** Absolute requirement or prohibition.
- **SHOULD / SHOULD NOT:** Recommended behavior; deviations require a documented reason.
- **MAY:** Optional behavior.

## 3. Terminology

| Term | Definition |
|---|---|
| Composite Definition | A reusable Blockie Definition that declares a child template and a public interface. |
| Composite Instance | An instance of a Composite Definition in a World. |
| Template Node | A stable, definition-local identifier for a child position in a Composite template. |
| Child Instance | A concrete Blockie instance materialized from a Template Node. |
| Public Input | An input port exposed by the Composite to its parent context. |
| Public Output | An output port exposed by the Composite to its parent context. |
| Input Binding | A declared route from a Composite public input to one or more child inputs. |
| Internal Observation | A named, read-only dependency on a child value output, available to the Composite's compute function. |
| Output Exposure | A direct mapping from a child output to a Composite public output. |
| Composite Compute | A pure computation performed by the Composite itself, using its own inputs, state, configuration, and declared Internal Observations. |
| Composition Scope | The set of child instances owned by a Composite Instance, including descendants. |
| Execution Generation | A committed or staged view of World values used to ensure coherent reactive evaluation. |

## 4. Design principles

A conforming implementation MUST preserve these principles:

1. **Encapsulation:** A Composite exposes only its declared public interface.
2. **Explicit dependencies:** Every child output read by Composite Compute MUST be declared as an Internal Observation.
3. **No arbitrary child access:** Composite logic MUST NOT inspect arbitrary descendant state, configuration, ports, metadata, or runtime internals.
4. **Pure computation:** Composite Compute MUST follow the same purity rules as ordinary Blockie Compute.
5. **Reactive composition:** Changes to observed child outputs MUST invalidate the Composite computation.
6. **Hierarchical transparency:** A Composite participates in its parent context as one Blockie with one public interface.
7. **Consistent execution:** Composite outputs MUST represent a coherent input and observation generation, not a mixture of partially committed child values.
8. **Explicit boundary behavior:** Input forwarding, child-output observation, and direct output exposure are separate mechanisms.
9. **Stable identity:** Template Node IDs identify blueprint positions; instantiated children have their own persistent instance IDs.
10. **Renderer independence:** Composite computation MUST NOT depend on a specific presentation or renderer.

## 5. Composite computational model

### 5.1 Composite as a computational node

A Composite Instance MUST have the same externally observable characteristics as an ordinary Blockie:

- Stable instance identity.
- A version-pinned Definition reference.
- Configuration and Model State, when declared.
- Typed public input and output ports.
- Optional event ports.
- Optional reducer logic.
- A computation contract.

A Composite Definition additionally declares its child template and boundary mappings.

The Composite's own Compute function is called **Composite Compute**. It is not a separate runtime or an independently scheduled application. It is one computation node in the enclosing World's logical dependency graph.

### 5.2 Composite computation signature

The conceptual signature is:

```text
compute(
    state,
    config,
    inputs,
    observed
) -> computed_outputs
```

Where:

- `state` is the Composite Instance's own read-only Model State.
- `config` is the Composite Instance's own read-only configuration.
- `inputs` contains resolved public value inputs.
- `observed` contains only the child outputs declared by Internal Observations.
- `computed_outputs` contains the Composite's declared computed public outputs.

Composite Compute MUST be pure. It MUST NOT mutate child instances or the Composite's own Model State. It MUST NOT dispatch events or execute effects. State transitions and effects remain governed by the base Blockies Protocol.

### 5.3 Own state

A Composite MAY own Model State, Configuration, and reducer logic just like an ordinary Blockie.

Its own state is distinct from all child states. Composite Compute MAY read its own state. It MUST NOT read or write a child's Model State directly.

If a Composite needs to change a child's state, it MUST do so through a declared child event input or another explicitly defined protocol operation. Direct state mutation is prohibited.

## 6. Three boundary mechanisms

The protocol defines three distinct mechanisms for crossing a Composite boundary.

### 6.1 Input Binding: parent to child

An Input Binding routes a Composite public input to a child input.

Example:

```json
{
  "id": "bind_expected_audience",
  "public_port": "expected_audience",
  "target": {
    "node": "vote_aggregator",
    "port": "expected_audience"
  }
}
```

A public input MAY bind to multiple child inputs. This is intentional fan-out.

A child input MUST have no more than one effective value producer. It MUST NOT simultaneously receive a value from an Input Binding, an internal Connection, and a default-producing rule where those sources conflict.

Input Bindings MUST preserve the declared type contract. The Composite public input type MUST be assignable to the target child input type according to BTS.

Input Bindings MAY target value inputs or event inputs. Value bindings provide the current resolved value. Event bindings forward each event occurrence according to event delivery semantics.

### 6.2 Internal Observation: child to Composite Compute

An Internal Observation declares a child value output that Composite Compute is allowed to read.

Example:

```json
{
  "id": "unique_voters",
  "source": {
    "node": "vote_aggregator",
    "port": "unique_voters"
  },
  "value_type": {
    "kind": "primitive",
    "name": "integer"
  }
}
```

The `id` becomes the key under `observed` supplied to Composite Compute.

Internal Observations MUST:

- Refer to an existing Template Node.
- Refer to an output port of kind `value`.
- Have a declared or inferable type.
- Be unique within the Composite Definition.
- Be treated as read-only snapshots.
- Create an explicit reactive dependency from the referenced child output to Composite Compute.

An Internal Observation MUST NOT reference:

- A child Model State field.
- A child Configuration field.
- A child input port.
- A child runtime status or cache.
- A private JavaScript object or runtime pointer.
- An undeclared descendant reached through arbitrary lookup.

A Composite MAY observe a descendant that is not an immediate child only if that descendant is a Template Node in the Composite's own template scope and the observation is explicitly declared. Implementations MUST NOT permit traversal into a nested Composite's private scope. To observe a value inside a nested Composite, the nested Composite MUST expose it through its own public output.

An observation alias MUST NOT be interpreted as a public output. It is available only to the Composite's own computation.

### 6.3 Output Exposure: child to parent interface

An Output Exposure forwards a child output directly as a Composite public output without executing Composite Compute for that output.

Example:

```json
{
  "id": "expose_results",
  "source": {
    "node": "vote_aggregator",
    "port": "results"
  },
  "public_port": "results"
}
```

Output Exposures are appropriate when the Composite simply re-exports a child's value.

The child output type MUST be assignable to the Composite public output type. The exposure MUST be one-to-one for the destination public output.

Output Exposures MUST NOT be used to aggregate or transform values. Transformation or aggregation MUST use Composite Compute.

## 7. Public output production

### 7.1 Exactly one producer per public output

Every Composite public value output MUST have exactly one producer:

1. An Output Exposure; or
2. Composite Compute.

A public output MUST NOT be both exposed and computed. A public output MUST NOT have two Output Exposures.

A definition MAY mix exposed outputs and computed outputs. For example, `results` may be forwarded directly while `completion_rate` is computed by the Composite.

### 7.2 Declaring computed outputs

A Composite Definition MUST declare which public outputs are produced by Composite Compute.

Example:

```json
{
  "logic": {
    "compute": {
      "runtime": "blockies.javascript/1",
      "module": "sha256:example",
      "export": "compute",
      "outputs": ["completion_rate", "summary"]
    }
  }
}
```

The `outputs` list MUST contain only public value output port IDs. Each listed output MUST have no Output Exposure.

The Compute function MUST return every listed output and MUST NOT return undeclared outputs. Each result MUST validate against its public port type.

A Composite MAY have no compute function if all of its public value outputs are directly exposed. A Composite MAY have a compute function with no child observations if it only calculates from its own state, configuration, and public inputs.

### 7.3 Event outputs

Event outputs are not values and MUST NOT be returned by Composite Compute.

In v0.1, child event outputs MAY be forwarded through explicitly declared event boundary routes, using the event-routing rules of the base Protocol. An event is not an Internal Observation and MUST NOT be sampled as though it were a persistent value.

A Composite reducer MAY process events delivered to the Composite's own event inputs and MAY emit declared Composite event outputs. Any routing from a Composite public event input to a child event input MUST be explicit.

## 8. Definition structure

A Composite Definition MUST extend the ordinary Blockie Definition with a `composite` section.

Illustrative structure:

```json
{
  "protocol": "blockies/0.1",
  "id": "org.example.poll",
  "version": "1.0.0",
  "name": "Poll",

  "ports": [
    {
      "id": "expected_audience",
      "direction": "input",
      "kind": "value",
      "value_type": { "kind": "primitive", "name": "integer" },
      "required": true
    },
    {
      "id": "results",
      "direction": "output",
      "kind": "value",
      "value_type": { "kind": "array", "items": { "kind": "record", "properties": {} } }
    },
    {
      "id": "total_votes",
      "direction": "output",
      "kind": "value",
      "value_type": { "kind": "primitive", "name": "integer" }
    },
    {
      "id": "completion_rate",
      "direction": "output",
      "kind": "value",
      "value_type": { "kind": "primitive", "name": "number" }
    }
  ],

  "composite": {
    "template": {
      "nodes": [
        { "id": "options", "definition": { "id": "org.example.poll-options", "version": "1.0.0" } },
        { "id": "vote_store", "definition": { "id": "org.example.vote-store", "version": "1.0.0" } },
        { "id": "vote_aggregator", "definition": { "id": "org.example.vote-aggregator", "version": "1.0.0" } }
      ],
      "composition": [],
      "connections": []
    },

    "input_bindings": [
      {
        "id": "bind_expected_audience",
        "public_port": "expected_audience",
        "target": { "node": "vote_aggregator", "port": "expected_audience" }
      }
    ],

    "observations": [
      {
        "id": "unique_voters",
        "source": { "node": "vote_aggregator", "port": "unique_voters" },
        "value_type": { "kind": "primitive", "name": "integer" }
      }
    ],

    "output_exposures": [
      {
        "id": "expose_results",
        "source": { "node": "vote_aggregator", "port": "results" },
        "public_port": "results"
      },
      {
        "id": "expose_total_votes",
        "source": { "node": "vote_aggregator", "port": "total_votes" },
        "public_port": "total_votes"
      }
    ]
  },

  "logic": {
    "compute": {
      "runtime": "blockies.javascript/1",
      "module": "sha256:example",
      "export": "compute",
      "outputs": ["completion_rate"]
    }
  }
}
```

This example is illustrative. A production schema MUST apply the exact BTS type encoding and the base Protocol's complete Definition schema.

## 9. Composite Compute ABI

### 9.1 Input context

The Composite Compute function receives a read-only context:

```typescript
 type CompositeComputeContext<State, Config, Inputs, Observed> = {
   state: Readonly<State>;
   config: Readonly<Config>;
   inputs: Readonly<Inputs>;
   observed: Readonly<Observed>;
 };
```

For ordinary non-composite Blockies, `observed` is an empty object or is absent according to the selected runtime ABI profile. For Composite Blockies, it contains exactly the declared observation aliases whose values are available for the current execution generation.

The ABI MUST NOT expose child instance IDs as a mechanism for looking up arbitrary children. The `observed` object is a projection of declared values, not a handle to child instances.

### 9.2 Example

```javascript
export function compute({ inputs, observed }) {
  const expected = inputs.expected_audience;
  const actual = observed.unique_voters;

  return {
    completion_rate: expected === 0
      ? 0
      : (actual / expected) * 100
  };
}
```

### 9.3 Purity requirements

Composite Compute MUST:

- Be deterministic for the same state, configuration, public inputs, observed values, and module version.
- Treat the context and nested values as immutable.
- Return values only for its declared computed outputs.
- Avoid direct access to the host environment.
- Avoid reading time, randomness, network, filesystem, or process-global mutable state unless such information is explicitly passed as an input value.

Composite Compute MUST NOT:

- Read child state directly.
- Read undeclared child outputs.
- Create or delete child instances.
- Modify child configuration or state.
- Modify the World document.
- Dispatch events.
- Execute effects.
- Access private renderer state.

### 9.4 Output validation

The Runtime MUST validate every returned computed output against its declared public output type using BTS.

Missing declared outputs, extra outputs, invalid values, or execution failures MUST produce a computation error for the Composite generation.

## 10. Reactive dependency graph

### 10.1 Logical graph

A Composite participates in the reactive graph as one public node in its parent context. Internally, its children and Composite Compute form a subgraph.

The Runtime MAY implement a single flattened graph internally, but it MUST preserve the observable hierarchical semantics defined here.

The logical flow is:

```text
Parent value input
       |
       v
Composite input binding
       |
       v
Child input(s)
       |
       v
Internal child computation graph
       |
       v
Observed child output(s)
       |
       v
Composite Compute
       |
       v
Composite public computed output(s)
       |
       v
Parent World consumers
```

### 10.2 Dependencies

The Runtime MUST derive the following dependency edges:

- Composite public value input -> each child input targeted by an Input Binding.
- Child value output -> each Internal Observation that references it.
- Internal Observation -> Composite Compute.
- Composite public input, own state, and own configuration -> Composite Compute when those values are used by its declared computation contract.
- Composite public output -> connected consumers in the parent context.

A Composite Compute function's dependencies MUST be limited to its declared inputs, state, configuration, and Internal Observations. Runtime introspection of the JavaScript function MUST NOT be required to discover dependencies.

### 10.3 Reactive invalidation

When a child output referenced by an Internal Observation changes, the Composite Compute node MUST become dirty.

When a Composite public input changes, all affected Input Bindings MUST be updated and affected child computations MUST become dirty. Composite Compute MUST also become dirty if that public input is part of its computation context.

When the Composite's own state or configuration changes, its Composite Compute MUST become dirty if those values are part of its computation context.

The Runtime SHOULD avoid recomputing unrelated children or unrelated Composite computations.

### 10.4 Coherent generation

All values supplied to one invocation of Composite Compute MUST belong to the same logically coherent execution generation.

If several child outputs change in one transaction, the Runtime MUST NOT invoke Composite Compute once per intermediate child update and publish those intermediate results as committed outputs. It MUST wait until the affected child computations for that transaction have reached a stable result or error, then evaluate Composite Compute against that generation.

A Runtime MAY perform speculative or parallel evaluation internally, but only coherent committed results may be externally observed.

### 10.5 Nested Composites

A nested Composite is treated as a child Blockie by its parent.

The parent MAY:

- Bind values to the nested Composite's public inputs.
- Observe the nested Composite's public value outputs.
- Expose a nested Composite's public outputs directly.

The parent MUST NOT traverse into the nested Composite's private template to read its descendants. A nested Composite must explicitly expose any value needed by its parent.

### 10.6 Cycles

Value dependency cycles MUST be rejected across the complete logical graph, including edges that cross Composite boundaries.

A Composite boundary MUST NOT be used to hide or bypass cycle detection.

Temporal feedback mechanisms, such as a Delay Blockie, MAY be defined by a future extension. They are not implied by Composite computation in v0.1.

## 11. Execution and transaction semantics

### 11.1 Transaction sequence

For a transaction that changes a Composite input or one of its descendants, the Runtime MUST:

1. Validate the incoming command or event.
2. Create a staged transaction generation.
3. Apply valid state transitions.
4. Resolve Composite Input Bindings affected by the change.
5. Mark affected child computations dirty.
6. Evaluate affected children in dependency order.
7. Resolve Internal Observations from the staged child outputs.
8. Execute affected Composite Compute functions after their dependencies are stable.
9. Validate Composite computed outputs.
10. Propagate Composite public output changes to parent consumers.
11. Continue affected parent computations until the graph reaches a stable state or an error boundary.
12. Commit the resulting state and output generation.
13. Publish the committed generation to renderers and persistence.
14. Execute authorized effects according to the base Protocol's post-commit effect rules.

The Runtime MUST NOT publish intermediate staged values as committed values.

### 11.2 Composite computation failure

A failure in Composite Compute MUST NOT roll back an otherwise valid child state transition solely because the Composite's derived output could not be calculated.

For the failed generation:

- The affected Composite computed outputs MUST be marked as errors.
- The Runtime MUST NOT present their previous values as current successful outputs.
- Downstream consumers MUST receive an upstream error or blocked status according to the base Runtime error model.
- Unaffected direct Output Exposures MAY remain valid if their source child outputs remain valid.

A later successful generation MUST replace the error state with valid output values.

### 11.3 Child failure

If a child output required by an Internal Observation is unavailable because the child computation failed or is blocked, Composite Compute MUST NOT run using a stale value for that observation.

The Composite's affected computed outputs MUST become blocked or errored with a causal reference to the unavailable observation.

A definition MAY declare an observation as optional only if the type system defines a precise absent-value representation. Optional absence MUST NOT be used to mask a failed child computation. A failed source is an error, not an omitted value.

### 11.4 Output equality and propagation

The Runtime SHOULD propagate a newly computed output only when its typed value is observably different from the previous committed value.

Equality MUST follow the relevant BTS value semantics, not object identity or JavaScript reference equality.

A Runtime MAY recompute a Composite even when its final output is unchanged. It SHOULD avoid needlessly invalidating downstream consumers when the output value is unchanged.

## 12. State and encapsulation

### 12.1 Ownership

A Composite Instance owns:

- Its own Model State.
- Its own configuration.
- Its public interface.
- Its instantiated child hierarchy.

Each child instance owns its own Model State and configuration.

No state object is shared by reference between separate Composite Instances merely because they originate from the same template.

### 12.2 State isolation between instances

Two instances of the same Composite Definition MUST have independent child instance identities and independent mutable state.

For example:

```text
Poll Instance A
  Vote Store A: [vote-1, vote-2]

Poll Instance B
  Vote Store B: [vote-3]
```

Changing Vote Store A MUST NOT modify Vote Store B.

Immutable definition assets and immutable code modules MAY be shared by the Runtime.

### 12.3 No ambient child lookup

Composite logic MUST NOT use a global registry, guessed ID, template node ID, or other ambient mechanism to retrieve child instances or private data.

Template Node IDs are definition-local references used by the protocol machinery to construct declared bindings and observations. They are not runtime capabilities granted to user code.

### 12.4 Information leakage

An implementation MUST NOT expose private child state, configuration, runtime errors, or metadata through the Composite public interface unless the Composite Definition explicitly maps that information to a public output or event.

Renderer visibility MUST NOT grant access to private computational data.

## 13. Serialization and materialization

### 13.1 Definition serialization

A Composite Definition MUST serialize:

- Its normal Blockie Definition fields.
- Its child template nodes.
- Its internal composition relationships.
- Its internal connections.
- Its Input Bindings.
- Its Internal Observations.
- Its Output Exposures.
- Its Composite Compute module reference and declared output list.

### 13.2 Instance materialization

When a Composite is instantiated, the implementation MUST materialize:

- The Composite Instance.
- A fresh child Instance ID for each Template Node, including nested descendants.
- Child configuration and initial state according to the Composite Instantiation Specification.
- Concrete internal composition relationships.
- Concrete internal connections.
- Resolved Input Binding targets.
- Resolved Internal Observation sources.
- Resolved Output Exposure sources.

### 13.3 Persisted provenance

A materialized Composite Instance MUST retain enough provenance to associate each child with its Template Node and the exact Composite Definition version from which it was instantiated.

The concrete instance IDs MUST be persisted. Loading a World MUST restore those IDs and MUST NOT generate replacements.

### 13.4 Canonical World representation

A World serializer MAY store a materialized child hierarchy directly, or store a canonical Composite Instance plus its stable materialization mapping, provided that restoration produces the same identities, state, relationships, and behavior.

A serializer MUST NOT serialize only a template reference and discard instance state or identity mappings.

## 14. Validation rules

A Composite Definition is invalid if any of the following is true:

1. An Input Binding references a nonexistent public input.
2. An Input Binding references a nonexistent Template Node or child input port.
3. An Input Binding has incompatible port direction, kind, or type.
4. Two value producers target the same child value input.
5. An Internal Observation references a nonexistent Template Node.
6. An Internal Observation references a non-output or non-value port.
7. Two Internal Observations use the same alias.
8. An Internal Observation declares a type incompatible with its source output.
9. An Output Exposure references a nonexistent child output or public output.
10. An Output Exposure has incompatible type or port kind.
11. A public value output has no producer.
12. A public value output has more than one producer.
13. A computed output is not declared in the Composite Compute output list.
14. A compute output list contains an undeclared or non-value public port.
15. The complete value dependency graph contains a cycle.
16. A nested Composite boundary is traversed into without using its public interface.
17. The Composite attempts to expose or access child runtime internals through the protocol.

A conforming implementation MUST report a structured validation error identifying the offending definition element.

## 15. Error codes

Implementations SHOULD support the following error codes or equivalent stable identifiers:

| Code | Meaning |
|---|---|
| `composite_binding_target_missing` | Input Binding target does not exist. |
| `composite_binding_type_mismatch` | Public input cannot be assigned to child input. |
| `composite_observation_source_missing` | Observation source does not exist. |
| `composite_observation_not_value_output` | Observation source is not a value output. |
| `composite_observation_type_mismatch` | Observation type does not match source output. |
| `composite_output_unproduced` | Public output has no producer. |
| `composite_output_multiple_producers` | Public output has more than one producer. |
| `composite_compute_missing_output` | Compute did not return a declared output. |
| `composite_compute_extra_output` | Compute returned an undeclared output. |
| `composite_compute_output_invalid` | Computed value failed BTS validation. |
| `composite_observation_unavailable` | Required observed value is unavailable. |
| `composite_private_scope_access` | Logic attempted an undeclared private child access. |
| `composite_dependency_cycle` | A value cycle crosses or exists within a Composite. |

## 16. Reference execution example: Poll Composite

### 16.1 Internal structure

```text
Poll
├── Options
├── Vote Store
└── Vote Aggregator
```

The Vote Aggregator exposes:

- `results: Dataset`
- `total_votes: Integer`
- `unique_voters: Integer`

The Composite exposes:

- Input: `expected_audience: Integer`
- Output: `results: Dataset`
- Output: `total_votes: Integer`
- Output: `completion_rate: Number`

### 16.2 Boundary declarations

```json
{
  "input_bindings": [
    {
      "id": "bind_audience",
      "public_port": "expected_audience",
      "target": {
        "node": "vote_aggregator",
        "port": "expected_audience"
      }
    }
  ],
  "observations": [
    {
      "id": "unique_voters",
      "source": {
        "node": "vote_aggregator",
        "port": "unique_voters"
      },
      "value_type": {
        "kind": "primitive",
        "name": "integer"
      }
    }
  ],
  "output_exposures": [
    {
      "id": "expose_results",
      "source": {
        "node": "vote_aggregator",
        "port": "results"
      },
      "public_port": "results"
    },
    {
      "id": "expose_total_votes",
      "source": {
        "node": "vote_aggregator",
        "port": "total_votes"
      },
      "public_port": "total_votes"
    }
  ]
}
```

### 16.3 Composite computation

```javascript
export function compute({ inputs, observed }) {
  const expected = inputs.expected_audience;
  const actual = observed.unique_voters;

  return {
    completion_rate: expected === 0
      ? 0
      : (actual / expected) * 100
  };
}
```

### 16.4 Expected reactive behavior

Given:

```text
expected_audience = 100
unique_voters = 25
```

The Composite produces:

```text
completion_rate = 25
```

When a new accepted vote causes `unique_voters` to become 26, the following occurs:

1. Vote Store processes the accepted vote.
2. Vote Aggregator recalculates its outputs.
3. The `unique_voters` observation becomes dirty.
4. Poll Composite Compute becomes dirty.
5. Poll computes `completion_rate = 26`.
6. The Composite publishes the new output.
7. Parent consumers of `completion_rate` are invalidated.

The parent World does not need to know that Vote Store or Vote Aggregator exists.

## 17. Conformance requirements

An implementation claiming support for BCCS v0.1 MUST:

1. Treat a Composite as a Blockie with its own public interface and optional computation.
2. Support explicit Input Bindings.
3. Support explicit Internal Observations of child value outputs.
4. Support direct Output Exposures.
5. Require exactly one producer for every public value output.
6. Validate all boundary types using BTS.
7. Execute Composite Compute as a pure computation.
8. Prevent arbitrary access to private child state and runtime internals.
9. Track observation dependencies for reactive invalidation.
10. Evaluate against coherent execution generations.
11. Propagate computation errors without publishing stale outputs as current.
12. Detect value dependency cycles across Composite boundaries.
13. Preserve child identities and provenance across serialization and restoration.
14. Support nested Composite instances through their public interfaces.

## 18. Non-goals and deferred features

The following are explicitly deferred:

- Dynamic child creation or deletion during normal computation.
- Arbitrary child-state queries.
- Composite Compute that mutates children.
- Event aggregation as a value observation.
- Streaming and asynchronous observation values.
- Temporal feedback across Composite boundaries.
- Distributed computation of one Composite across multiple hosts.
- Automatic exposure of all child outputs.
- Reflection over private child definitions.

These features require separate semantics and MUST NOT be inferred from this specification.

## 19. Relationship to other Blockies specifications

This document extends, and does not replace, the following specifications:

- **Blockies Protocol Specification:** Defines World, Blockie, ports, connections, state, events, computation, and execution transactions.
- **Blockies Type System Specification (BTS):** Defines value types, type compatibility, generics, and runtime value validation.
- **Blockies Composite Instantiation Specification (BCIS):** Defines templates, Template Node IDs, child identity generation, materialization, state isolation, and restoration.

If a rule in this document conflicts with the base Protocol, BTS, or BCIS, the specifications MUST be reconciled before a conforming implementation claims full v0.1 support. This document specifically governs Composite computation and boundary semantics.

---

# Appendix A. Recommended implementation model

The following is informative, not normative.

A Rust runtime can model a Composite as a graph scope with a boundary node:

```text
CompositeScope
├── InstanceId
├── DefinitionRef
├── ChildInstances
├── InternalGraph
├── InputBindings
├── Observations
├── OutputExposures
└── ComputeNode
```

The runtime may flatten nested scopes into an internal execution graph for scheduling, while retaining scope metadata for validation, access control, diagnostics, and serialization.

The compute adapter should receive an immutable projection rather than references to child runtime objects:

```rust
struct CompositeComputeInput<State, Config, Inputs, Observed> {
    state: State,
    config: Config,
    inputs: Inputs,
    observed: Observed,
}
```

The runtime—not user code—resolves Template Node IDs to concrete child instances and extracts the declared output values.

# Appendix B. Minimum conformance tests

A conformance suite SHOULD include at least these tests:

1. A Composite computes an output from one observed child output.
2. A Composite combines two or more observed child outputs.
3. An unobserved child output cannot be read by Composite Compute.
4. A Composite cannot read a child's Model State through the scripting ABI.
5. A child output change invalidates Composite Compute.
6. Multiple child changes in one transaction cause one coherent Composite result, not visible intermediate outputs.
7. A direct Output Exposure does not require Composite Compute.
8. A Composite can mix directly exposed and computed public outputs.
9. A computed public output cannot also have an Output Exposure.
10. A child computation error blocks dependent Composite computation rather than supplying a stale value.
11. A Composite computation error does not erase a valid child state transition.
12. A parent can observe a nested Composite's public output but cannot traverse its private descendants.
13. A dependency cycle crossing a Composite boundary is rejected.
14. Serialization and restoration preserve Composite outputs and child identities.
15. Two instances of the same Composite Definition compute independently and do not share mutable child state.

---

**End of Blockies Composite Computation Specification v0.1.0-draft**
