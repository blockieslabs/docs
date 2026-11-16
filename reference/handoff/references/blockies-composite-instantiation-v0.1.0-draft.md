# Blockies Composite Instantiation Specification

**Specification ID:** BCIS  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Depends on:** Blockies Protocol Specification v0.1.0-draft; Blockies Type System Specification v0.1.0-draft  
**Serialization:** JSON  

---

## 1. Abstract

This specification defines how reusable Composite Blockie Definitions describe internal Blockie structures and how the runtime instantiates those structures into independent, executable hierarchies.

It specifies:

- Composite Definitions and reusable templates.
- Template-local identities and runtime instance identities.
- Instantiation parameters and generic type arguments.
- Child creation and identity allocation.
- State initialization and isolation.
- Internal composition and connections.
- Public interface exposure.
- Nested Composite Blockies.
- Serialization, cloning, deletion, and version migration requirements.
- Validation and atomic instantiation semantics.

The purpose is to make a Composite Blockie behave like a reusable, encapsulated component whose internal Blockies are real instances, not merely visual children.

## 2. Normative language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

- **MUST / MUST NOT:** absolute requirements for conformance.
- **SHOULD / SHOULD NOT:** recommended behavior, with deviations requiring a documented reason.
- **MAY:** optional behavior.

## 3. Scope and relationship to other specifications

This specification extends the Blockies Protocol's Definition, Instance, World, Composition, Connection, and Interface Exposure concepts.

The Blockies Type System (BTS) defines the meaning of types, assignability, generic parameters, and value validation. This specification defines how those types are applied when a Composite Definition is instantiated.

This specification does not define:

- A particular Rust data structure or memory layout.
- A specific CRDT or synchronization algorithm.
- A visual editor for authoring templates.
- A package registry or distribution service.
- Arbitrary executable code inside templates.
- Dynamic runtime mutation of a Composite's internal topology.

Unless otherwise stated, a Composite Instance participates in the ordinary Blockies Runtime and uses the ordinary Blockie port, state, event, and execution rules.

## 4. Terminology

| Term | Definition |
|---|---|
| Composite Definition | An immutable Blockie Definition whose implementation is a template of child Blockies and relationships. |
| Composite Instance | A particular instantiated occurrence of a Composite Definition. |
| Template | The declarative internal structure contained in a Composite Definition. |
| Template Node | A child declaration identified by a template-local ID. |
| Child Instance | A concrete Blockie Instance created from a Template Node. |
| Template-local ID | An identifier unique only within one exact template version. |
| Instance ID | A globally unique identity within a World. |
| Template Parameter | A construction-time value supplied when a Composite is instantiated. |
| Type Argument | A type supplied for a generic parameter. |
| Member Map | A mapping from Template Node IDs to concrete Child Instance IDs. |
| Internal Connection | A connection declared in a template and instantiated between child ports. |
| Exposure | A mapping between a Composite's public port and a port on one of its descendants. |
| Ownership Scope | The Composite Instance that structurally owns a child instance. |
| Materialization | The process of turning a template into concrete instances and relationships. |

## 5. Core design principles

### 5.1 Definitions are blueprints, not live objects

A Composite Definition MUST describe reusable structure. It MUST NOT contain state belonging to a particular runtime instantiation.

### 5.2 Every instantiation is independent

Each instantiation MUST create fresh identities for the Composite Instance and all of its template-created descendants.

Two instantiations of the same definition MUST NOT share mutable child state, runtime caches, pending effects, or instance identities.

### 5.3 Templates are immutable and version-pinned

A Composite Instance MUST reference an exact Composite Definition version and content digest. A published definition MUST NOT be modified in place.

### 5.4 Composition defines ownership

A child instance MUST have exactly one structural parent, except for a World root. A child MUST NOT be owned by two Composite Instances.

### 5.5 Internal implementation is encapsulated

External Blockies MUST interact with a Composite through its declared public ports. They MUST NOT connect directly to private descendant ports.

### 5.6 Reuse means fresh instantiation, not shared state

Instantiating the same template multiple times creates multiple independent structures. A template is not a singleton and does not imply shared children.

---

# Part I — Composite Definitions and Templates

## 6. Definition kinds

A Blockie Definition MUST declare its implementation kind:

- `atomic`: behavior is provided by the definition's logic implementation.
- `composite`: behavior and structure are provided by a template of child Blockies.

An atomic definition MAY declare compute, reduce, and effects according to the Core Protocol.

A composite definition MUST declare a template. In v0.1, a composite definition MUST NOT also declare executable `compute` or `reduce` logic. Its behavior is produced by its children and explicit boundary exposures.

A composite MAY declare presentation metadata for its outer representation.

## 7. Composite Definition structure

A Composite Definition MUST contain:

- A definition ID and version.
- A content digest or immutable package reference.
- A public port interface.
- Zero or more construction-time parameters.
- Zero or more generic type parameters.
- A template containing nodes and relationships.
- A dependency list identifying exact child definition versions.

Conceptual structure:

```text
CompositeDefinition
├── identity
│   ├── id
│   ├── version
│   └── digest
├── kind: composite
├── type_parameters
├── parameters
├── public_ports
├── dependencies
└── template
    ├── nodes
    ├── composition
    ├── connections
    └── exposures
```

The `public_ports` field uses the same port model and type rules as the Core Protocol and Type System Specification.

## 8. Template-local identities

Each Template Node MUST have a `node_id` that is unique within the exact Composite Definition version.

Template Node IDs:

- MUST be stable within a published definition version.
- MUST NOT be treated as runtime Blockie IDs.
- MUST NOT be used to address a child from outside its owning Composite.
- SHOULD remain unchanged across compatible definition revisions when they represent the same logical child.

A template connection and template composition edge MUST also have a stable local ID within the template.

The pair `(composite_instance_id, template_local_id)` identifies a template element within one materialized Composite Instance. The runtime MAY represent this pair internally as a structured key rather than a concatenated string.

## 9. Template nodes

A Template Node declares a child to be created during instantiation.

Each node MUST specify:

- A unique local `node_id`.
- An exact child Definition reference.
- Optional generic type arguments or type-argument bindings.
- Optional configuration initializers.
- Optional state initializers, subject to the rules in Section 16.

Example:

```json
{
  "node_id": "vote-processor",
  "definition": {
    "id": "org.blockies.poll.vote-processor",
    "version": "1.0.0",
    "digest": "sha256:abc123..."
  },
  "type_arguments": {},
  "config": {
    "allow_multiple_votes": {
      "kind": "literal",
      "value": false
    }
  }
}
```

A Template Node MAY reference another Composite Definition. Nested composites are expanded recursively under the rules in Section 21.

## 10. Template expressions

Templates MUST be declarative in v0.1. A template MUST NOT execute arbitrary JavaScript, Rust, or another general-purpose programming language to create child configuration or state.

The v0.1 initializer expression forms are:

### 10.1 Literal

```json
{
  "kind": "literal",
  "value": "Hello"
}
```

The literal value MUST validate against the destination schema after generic type substitution.

### 10.2 Parameter reference

```json
{
  "kind": "parameter",
  "name": "question"
}
```

The referenced parameter MUST exist in the containing Composite Definition. Its type MUST be assignable to the destination field type.

### 10.3 Type argument reference

A template MAY reference a generic type argument when declaring a child port or type argument. This is a type-level reference, not a runtime value expression.

No other initializer expression forms are defined in v0.1.

## 11. Template parameters

A Template Parameter is an immutable construction-time value used to configure the instantiated hierarchy.

A parameter declaration MUST contain:

- A stable ID.
- A BTS type.
- Whether it is required.
- An optional default value.

Example:

```json
{
  "id": "question",
  "type": { "kind": "primitive", "name": "string" },
  "required": true
}
```

Parameters are distinct from runtime input ports:

| Template Parameter | Public Input Port |
|---|---|
| Supplied during instantiation | Supplied or updated during execution |
| Used to construct/configure children | Used to communicate with an existing instance |
| Immutable for the lifetime of the instance in v0.1 | Can change according to normal port semantics |
| Stored as instantiation data | Resolved as a current runtime input |

A parameter MUST be validated when the Composite is instantiated. A missing required parameter MUST cause instantiation to fail.

A parameter default MUST itself validate against the declared type.

Changing a parameter after instantiation is not defined in v0.1. A future reconfiguration operation would need explicit migration semantics for affected child state.

## 12. Generic Composite Definitions

A Composite Definition MAY declare BTS type parameters.

Type arguments MUST be resolved before child instances are materialized. Resolved types MUST be substituted into all affected child definitions, ports, exposures, and connections.

If a generic type cannot be inferred unambiguously from the public interface and supplied arguments, instantiation MUST fail and request an explicit type argument.

Generic type arguments are part of the instance's construction identity and MUST be persisted with the Composite Instance.

---

# Part II — Template Relationships and Encapsulation

## 13. Template composition

Template composition declares the structural parent of each child node.

The reserved parent reference `$self` identifies the Composite Instance being instantiated.

Example:

```json
{
  "id": "layout-main",
  "parent": "$self",
  "child": "question",
  "slot": "header",
  "order": 0
}
```

Every Template Node MUST have exactly one composition parent. Its parent MUST be `$self` or another Template Node whose child definition permits containment.

The template composition graph MUST:

- Be acyclic.
- Make every Template Node reachable from `$self`.
- Contain no duplicate parent-child ownership.
- Respect the child definition's `accepts_children` constraint.

A Composite Definition MUST NOT contain a template node that is structurally orphaned.

## 14. Internal connections

Template connections declare dataflow relationships between ports of template nodes.

Example:

```json
{
  "id": "vote-to-processor",
  "from": {
    "node": "vote-input",
    "port": "on_submit"
  },
  "to": {
    "node": "vote-processor",
    "port": "on_vote"
  }
}
```

Internal connections MUST reference existing Template Nodes and ports declared by their exact child definitions.

All ordinary Core Protocol connection rules apply, including:

- Direction compatibility.
- Value/event kind compatibility.
- BTS type assignability.
- Port cardinality.
- Value dependency cycle validation.

For v0.1, template connections MUST connect nodes within the same Composite Template scope. A nested Composite's private descendants MUST be accessed through that nested Composite's public interface, not by reaching into its internals.

## 15. Public interface exposures

A Composite's public interface is the only supported communication boundary between the Composite and its surrounding World.

An exposure maps one public port to one descendant port.

Supported exposure directions:

- `into_child`: a Composite input is forwarded to a descendant input.
- `out_of_child`: a descendant output is forwarded as a Composite output.

Example:

```json
{
  "id": "expose-results",
  "public_port": "results",
  "direction": "out_of_child",
  "target": {
    "node": "aggregator",
    "port": "results"
  }
}
```

Rules:

1. The public port MUST exist in the Composite Definition.
2. The target node and port MUST exist in the template.
3. The direction MUST be compatible with the public port direction.
4. The communication kind MUST match.
5. The source and destination types MUST be assignable under BTS.
6. An exposure MUST NOT bypass the nested Composite boundary.
7. A public input MUST NOT fan out to multiple internal ports in v0.1 through one exposure. Multiple internal destinations require explicit internal connections or a dedicated fan-out component.
8. A public output MUST identify exactly one internal source in v0.1.

An exposure is a boundary mapping, not a new child instance and not a mutation of the underlying child port.

### 15.1 Value exposure

A value input exposure makes the resolved external value available at the designated internal input. A value output exposure publishes the current value of the designated child output.

### 15.2 Event exposure

An event input exposure forwards each accepted event to the designated internal event input. An event output exposure forwards each event emitted by the designated child output.

Event forwarding MUST preserve the event identity and ordering metadata defined by the Core Runtime, or the host's equivalent event envelope.

## 16. State initialization

Each child instance owns its own model state.

On first instantiation, child state MUST be initialized from the referenced child's definition according to the Core Protocol.

A Template Node MAY declare a state initializer to provide literal or parameter-derived initial values. Such an initializer MUST:

- Be declarative.
- Be evaluated only during instantiation.
- Be validated against the child's state schema.
- Not read another child instance's state.
- Not execute effects or arbitrary code.

If no state initializer is declared, the child definition's initial state MUST be used.

State initialization MUST occur once when creating a new instance. Loading a previously serialized World MUST restore its persisted child states and MUST NOT re-run initializers over those states.

A Composite Instance does not own a shared mutable state store for its descendants. Every child owns its own state. In v0.1, a composite definition MUST NOT declare executable compute/reduce logic or an independent mutable model state. State that conceptually belongs to the composite MUST be represented by a child Blockie.

## 17. State and execution isolation

Two Composite Instances created from the same definition MUST have isolated:

- Child Instance IDs.
- Model state.
- Configuration, except for copied immutable construction values.
- Derived output caches.
- Runtime statuses.
- Pending event queues.
- Pending effects and effect results.
- Local presentation state.

A child MUST NOT access a sibling's or parent's private state by global lookup, memory reference, or undeclared API.

Data MUST cross instance boundaries through typed ports, events, or explicitly authorized host capabilities.

Values crossing ports MUST behave as immutable snapshots. A receiving Blockie MUST NOT mutate the source Blockie's stored value through shared object identity.

A runtime MAY use structural sharing internally for immutable values, provided observable behavior is indistinguishable from value isolation.

---

# Part III — Instantiation and Materialization

## 18. Composite Instance structure

A Composite Instance is an ordinary Blockie Instance whose definition has `kind: composite`.

It MUST persist:

- Its own instance ID.
- Its exact Composite Definition reference and digest.
- Resolved type arguments.
- Supplied parameter values.
- A member map from template-local node IDs to child instance IDs.
- A materialization record sufficient to preserve generated relationship identities.

Conceptual representation:

```json
{
  "id": "poll_001",
  "definition": {
    "id": "org.blockies.poll",
    "version": "1.0.0",
    "digest": "sha256:poll-template..."
  },
  "type_arguments": {},
  "parameters": {
    "question": "What should we discuss next?",
    "options": ["Roadmap", "Architecture", "Business"]
  },
  "composite": {
    "members": {
      "question": "question_01J...",
      "options": "options_01J...",
      "vote-input": "vote_input_01J...",
      "vote-processor": "vote_processor_01J...",
      "vote-store": "vote_store_01J...",
      "aggregator": "aggregator_01J...",
      "chart": "chart_01J..."
    },
    "materialization": {
      "template_digest": "sha256:poll-template...",
      "generation": 1
    }
  }
}
```

The concrete child instances MUST also exist in the World instance registry, each with its own definition reference, configuration, state, and ownership information.

The member map MUST be total: every Template Node MUST map to exactly one concrete child instance. It MUST be injective: two different Template Nodes MUST NOT map to the same child instance.

## 19. Instance identity allocation

The host Runtime MUST allocate a fresh Instance ID for:

- The Composite Instance, unless the caller supplied a valid newly allocated root ID.
- Every Template Node instance.
- Every generated composition relationship and connection that requires a persistent relationship ID.
- Every nested Composite Instance and all of its descendants.

Generated IDs MUST be unique within the World and MUST NOT be derived solely from a mutable display name, layout coordinate, or template path.

A runtime MAY use UUIDv7, ULID, or another collision-resistant ID scheme.

### 19.1 Identity persistence

Once allocated, child IDs MUST be persisted in the Composite Instance's member map and in the World instance registry.

Loading or restoring a World MUST reuse the persisted IDs. It MUST NOT allocate replacement IDs for existing children.

The runtime MUST NOT regenerate child IDs merely because the Composite is moved, renamed, re-rendered, or reloaded.

### 19.2 Template-local identity mapping

The member map is the authoritative mapping from a template-local node to its concrete child instance.

A child instance's identity MUST NOT be computed from its current parent path. This allows a future migration to preserve identity when a node is renamed or repositioned in the template.

## 20. Instantiation algorithm

Instantiation MUST be atomic from the World document's perspective.

A conforming runtime MUST perform the following logical steps:

1. Resolve the exact Composite Definition version and verify its digest.
2. Resolve all exact child definition dependencies.
3. Validate the template structure and required extensions.
4. Validate supplied parameters and defaults.
5. Resolve generic type arguments and substitute them throughout the template.
6. Validate each template node's definition, configuration initializer, state initializer, and type arguments.
7. Allocate a fresh ID for the Composite Instance and every descendant instance.
8. Recursively instantiate nested Composite Definitions.
9. Initialize each atomic child configuration and state.
10. Build the complete member map.
11. Materialize template composition relationships.
12. Materialize internal connections by mapping local node/port references to concrete instance/port references.
13. Materialize public interface exposures.
14. Validate the resulting ownership hierarchy, connection graph, port types, cardinality, and capabilities.
15. Commit the complete structure as one document operation.

If any required step fails, the World MUST remain unchanged. Allocated but uncommitted IDs MAY be discarded.

The runtime MUST NOT expose a partially instantiated Composite to computation, rendering, collaboration, or external commands.

## 21. Nested Composite Blockies

A Template Node MAY reference another Composite Definition.

Nested composites MUST be instantiated recursively. Each nested Composite receives:

- Its own fresh instance ID.
- Its own parameter values and type arguments.
- Its own member map.
- Its own fresh descendant identities.
- Its own isolated descendant state.

The parent template refers to the nested Composite Instance through the nested Composite's public ports. It MUST NOT directly refer to the nested Composite's private child ports.

### 21.1 Recursive definition prohibition

A Composite Definition dependency graph MUST be acyclic in v0.1.

A definition MUST NOT directly or indirectly instantiate itself through its template dependency graph. This prevents unbounded recursive materialization.

Implementations SHOULD enforce configurable limits for maximum nesting depth, total descendants, and total generated relationships.

---

# Part IV — Materialized World Representation

## 22. Canonical World representation

The canonical serialized World MUST contain concrete instance records for all materialized descendants, not just the outer Composite Instance.

The World MUST also preserve:

- Composition relationships.
- Connections.
- Interface exposure information or an equivalent reconstructable representation.
- The member map for each Composite Instance.
- The origin of template-generated structures.

This is a materialized representation: all child instances have real World-level identities and persisted state.

A runtime MAY maintain a more compact internal representation, but serialization and import/export MUST preserve the same observable structure and identities.

## 23. Generated relationship provenance

Relationships generated from a template MUST retain provenance identifying:

- The owning Composite Instance.
- The local relationship ID in the exact template.
- The template digest from which it was materialized.

Conceptual example:

```json
{
  "id": "connection_01J...",
  "from": {
    "blockie": "vote_input_01J...",
    "port": "on_submit"
  },
  "to": {
    "blockie": "vote_processor_01J...",
    "port": "on_vote"
  },
  "origin": {
    "kind": "template",
    "owner": "poll_001",
    "local_id": "vote-to-processor",
    "template_digest": "sha256:poll-template..."
  }
}
```

Generated relationship IDs MUST be stable after persistence. A load operation MUST NOT regenerate them.

A materialized relationship MUST match the corresponding template relationship. A mismatch MUST be treated as document corruption or an unsupported migration, not silently accepted.

## 24. Ownership and scope

Every non-root child created by a Composite Template MUST have an ownership link to its immediate parent Composite Instance or containing child instance.

A child instance MUST belong to exactly one ownership scope.

An external connection MUST target the Composite Instance's public ports, not a private descendant port.

An internal connection MUST be owned by the Composite Template scope in which it is declared.

A connection between two different Composite scopes MUST pass through their respective public interfaces and be represented as a connection at their common visible scope.

The runtime MAY use flattened graph structures internally, but MUST preserve these scope and visibility rules.

## 25. Template edits and internal structure

In v0.1, a materialized Composite Instance's template-generated topology is immutable during ordinary World editing.

Users MAY change child state through normal ports and events, and MAY change permitted instance configuration. They MUST NOT directly add, remove, or rewire private template-generated children or connections while keeping the same Composite Definition reference.

Changing internal structure requires one of:

- Publishing a new Composite Definition version and explicitly migrating instances.
- Creating a new forked Composite Definition.
- Detaching a Composite through an explicitly defined future operation.

This rule ensures that the persisted member map and materialized relationships remain consistent with the exact template.

---

# Part V — Lifecycle Operations

## 26. Instantiate versus clone

Instantiation and cloning are distinct operations.

### 26.1 Instantiate from Definition

`instantiate(definition, arguments)` creates a new Composite Instance from the definition's initial state.

It MUST allocate fresh identities and initialize all descendants from their definition defaults and template initializers.

### 26.2 Clone an existing Composite Instance

Cloning creates a new independent Composite Instance based on an existing instance's exact definition and current structure.

A clone MUST allocate fresh identities for the Composite and every descendant. It MUST NOT reuse the source instance's member IDs, connection IDs, or composition IDs.

Version 0.1 defines two explicit clone modes:

- `reset`: copy construction parameters/configuration, but initialize child state from the template and child definition defaults.
- `copy_state`: copy the source's current persistent child model state into newly created child identities, after validating it against the same pinned definitions.

`reset` SHOULD be the default when no mode is supplied. A runtime MUST NOT ambiguously choose whether to copy mutable state.

Runtime state, derived caches, pending effects, pending event queues, and local view state MUST NOT be copied.

## 27. Deletion

Deleting a Composite Instance MUST recursively delete all descendants it owns.

The deletion operation MUST also remove:

- Its owned composition relationships.
- Its owned internal connections.
- Its interface exposure materializations.
- Its pending runtime work, subject to host cancellation semantics.

External connections to the Composite's public ports MUST be removed or rejected as part of the same atomic document operation.

Deleting a Composite MUST NOT delete unrelated instances that merely exchange data with it.

## 28. Moving and reparenting

Moving a Composite Instance within its parent's permitted layout MUST NOT change any instance identity or internal relationship identity.

Moving a Composite Instance to another valid parent MUST preserve its entire descendant hierarchy and internal connections. The operation MUST validate that the new parent accepts the child and that no containment cycle is introduced.

A child owned by a Composite MUST NOT be moved outside that Composite in v0.1. Extraction/detachment is deferred to a future specification because it requires rules for exposing or rewriting internal connections and state ownership.

## 29. Reset

A host MAY provide a reset operation.

If supported, reset MUST be explicitly invoked and MUST define whether it applies to:

- The Composite's entire descendant tree; or
- A selected descendant subtree.

A full Composite reset MUST preserve all instance and relationship identities while restoring persistent model state and configuration to the declared initialization values. It MUST clear derived caches and transient runtime state. Reset MUST be atomic from the document's perspective.

If a particular child cannot be reset deterministically, the reset operation MUST fail rather than partially reset the Composite.

---

# Part VI — Validation, Errors, and Security

## 30. Definition-time validation

A Composite Definition MUST be rejected if:

- A Template Node ID is duplicated.
- A local relationship ID is duplicated in its relationship category.
- A child Definition reference cannot be resolved to an exact version and digest.
- A child configuration or state initializer is invalid.
- A template parameter is missing, duplicated, or has an invalid type.
- A generic type argument violates its constraints.
- A composition parent or child does not exist.
- A composition cycle or orphan node exists.
- A connection endpoint or port does not exist.
- A connection is type-incompatible or violates cardinality.
- A value dependency cycle exists in the fully expanded template graph.
- An exposure is incompatible, ambiguous, or points outside the permitted subtree.
- The template dependency graph contains recursive Composite Definition inclusion.
- Required capabilities are undeclared or disallowed by the package policy.

## 31. Instantiation-time validation

Before commit, the runtime MUST validate:

- Parameter values and defaults.
- Resolved generic arguments.
- All generated instance IDs for uniqueness.
- The total member map.
- Child configuration and initial state.
- Ownership and composition constraints.
- Internal connection endpoints and type compatibility.
- Public interface exposure mappings.
- The fully expanded value dependency graph.
- Capability requirements and host permissions.
- Runtime resource limits.

## 32. Error model

Implementations SHOULD provide structured errors with a stable code and a path to the failing template element.

Suggested error codes:

| Code | Meaning |
|---|---|
| `composite_definition_not_found` | Exact Composite Definition is unavailable. |
| `composite_digest_mismatch` | Definition content does not match its declared digest. |
| `template_dependency_not_found` | A child definition dependency is unavailable. |
| `template_parameter_missing` | Required construction parameter was not supplied. |
| `template_parameter_type_mismatch` | A parameter value fails BTS validation. |
| `template_type_argument_invalid` | Generic argument is invalid or violates constraints. |
| `template_node_invalid` | A template node is malformed. |
| `template_composition_invalid` | The template hierarchy violates ownership rules. |
| `template_connection_invalid` | An internal connection is invalid. |
| `template_exposure_invalid` | A public interface exposure is invalid. |
| `template_recursive_dependency` | Composite definitions recursively include one another. |
| `composite_resource_limit` | Instantiation exceeds a host resource limit. |
| `composite_materialization_failed` | A descendant could not be instantiated. |
| `composite_state_invalid` | An initialized or copied child state is invalid. |
| `composite_materialization_mismatch` | Persisted materialization disagrees with its pinned template. |

An instantiation error SHOULD identify the composite definition, template node or relationship ID, and relevant validation path.

## 33. Security and capabilities

A Composite Definition MUST declare or make discoverable the capabilities required by its descendants.

The effective capability requirements of a Composite are the union of the requirements of its materialized descendants and any declared host-level requirements.

A Composite MUST NOT grant a child capabilities that the host has not authorized.

A parent Composite MAY restrict descendant capabilities, but MUST NOT expand them beyond host authorization.

A child MUST receive only the ports, events, configuration, and capabilities granted to it. It MUST NOT gain access to sibling state merely because the instances share an owner.

---

# Part VII — Reference Example

## 34. Poll Composite Definition

The following example is illustrative. It shows the shape and relationships; production definitions must include complete BTS schemas and immutable digests for all dependencies.

```json
{
  "protocol": "blockies/0.1",
  "id": "org.blockies.poll",
  "version": "1.0.0",
  "digest": "sha256:poll-template-example",
  "kind": "composite",
  "name": "Poll",

  "type_parameters": [],

  "parameters": [
    {
      "id": "question",
      "type": { "kind": "primitive", "name": "string" },
      "required": true
    },
    {
      "id": "options",
      "type": {
        "kind": "array",
        "items": { "kind": "primitive", "name": "string" }
      },
      "required": true
    }
  ],

  "ports": [
    {
      "id": "results",
      "direction": "output",
      "kind": "value",
      "value_type": {
        "kind": "record",
        "properties": {
          "total": { "kind": "primitive", "name": "integer" },
          "counts": {
            "kind": "array",
            "items": {
              "kind": "record",
              "properties": {
                "option": { "kind": "primitive", "name": "string" },
                "count": { "kind": "primitive", "name": "integer" }
              },
              "required": ["option", "count"],
              "additional_properties": false
            }
          }
        },
        "required": ["total", "counts"],
        "additional_properties": false
      }
    }
  ],

  "dependencies": [
    { "id": "org.blockies.ui.text", "version": "1.0.0", "digest": "sha256:text..." },
    { "id": "org.blockies.poll.options", "version": "1.0.0", "digest": "sha256:options..." },
    { "id": "org.blockies.poll.vote-input", "version": "1.0.0", "digest": "sha256:input..." },
    { "id": "org.blockies.poll.vote-processor", "version": "1.0.0", "digest": "sha256:processor..." },
    { "id": "org.blockies.poll.vote-store", "version": "1.0.0", "digest": "sha256:store..." },
    { "id": "org.blockies.poll.aggregator", "version": "1.0.0", "digest": "sha256:aggregator..." },
    { "id": "org.blockies.ui.bar-chart", "version": "1.0.0", "digest": "sha256:chart..." }
  ],

  "template": {
    "nodes": [
      {
        "node_id": "question",
        "definition": { "id": "org.blockies.ui.text", "version": "1.0.0", "digest": "sha256:text..." },
        "config": {
          "text": { "kind": "parameter", "name": "question" }
        }
      },
      {
        "node_id": "options",
        "definition": { "id": "org.blockies.poll.options", "version": "1.0.0", "digest": "sha256:options..." },
        "config": {
          "items": { "kind": "parameter", "name": "options" }
        }
      },
      {
        "node_id": "vote-input",
        "definition": { "id": "org.blockies.poll.vote-input", "version": "1.0.0", "digest": "sha256:input..." }
      },
      {
        "node_id": "vote-processor",
        "definition": { "id": "org.blockies.poll.vote-processor", "version": "1.0.0", "digest": "sha256:processor..." }
      },
      {
        "node_id": "vote-store",
        "definition": { "id": "org.blockies.poll.vote-store", "version": "1.0.0", "digest": "sha256:store..." }
      },
      {
        "node_id": "aggregator",
        "definition": { "id": "org.blockies.poll.aggregator", "version": "1.0.0", "digest": "sha256:aggregator..." }
      },
      {
        "node_id": "chart",
        "definition": { "id": "org.blockies.ui.bar-chart", "version": "1.0.0", "digest": "sha256:chart..." }
      }
    ],

    "composition": [
      { "id": "layout-question", "parent": "$self", "child": "question", "slot": "header", "order": 0 },
      { "id": "layout-options", "parent": "$self", "child": "options", "slot": "audience", "order": 0 },
      { "id": "layout-vote-input", "parent": "$self", "child": "vote-input", "slot": "audience", "order": 1 },
      { "id": "layout-vote-processor", "parent": "$self", "child": "vote-processor", "slot": "internal", "order": 0 },
      { "id": "layout-vote-store", "parent": "$self", "child": "vote-store", "slot": "internal", "order": 1 },
      { "id": "layout-aggregator", "parent": "$self", "child": "aggregator", "slot": "internal", "order": 2 },
      { "id": "layout-chart", "parent": "$self", "child": "chart", "slot": "results", "order": 0 }
    ],

    "connections": [
      {
        "id": "options-to-input",
        "from": { "node": "options", "port": "items" },
        "to": { "node": "vote-input", "port": "options" }
      },
      {
        "id": "vote-to-processor",
        "from": { "node": "vote-input", "port": "on_submit" },
        "to": { "node": "vote-processor", "port": "on_vote" }
      },
      {
        "id": "accepted-to-store",
        "from": { "node": "vote-processor", "port": "accepted_vote" },
        "to": { "node": "vote-store", "port": "on_vote" }
      },
      {
        "id": "store-to-aggregator",
        "from": { "node": "vote-store", "port": "votes" },
        "to": { "node": "aggregator", "port": "votes" }
      },
      {
        "id": "aggregator-to-chart",
        "from": { "node": "aggregator", "port": "results" },
        "to": { "node": "chart", "port": "dataset" }
      }
    ],

    "exposures": [
      {
        "id": "expose-results",
        "public_port": "results",
        "direction": "out_of_child",
        "target": { "node": "aggregator", "port": "results" }
      }
    ]
  }
}
```

This example deliberately keeps the poll's reusable question and options as construction parameters. Votes, by contrast, are live model state owned by each Vote Store child instance.

An implementation can create two Poll instances with different questions and options. Each receives fresh descendants and an independent Vote Store.

## 35. Example materialized instance

After instantiation, the World contains the Composite Instance and concrete child instances. The exact IDs below are illustrative.

```json
{
  "id": "poll_A",
  "definition": {
    "id": "org.blockies.poll",
    "version": "1.0.0",
    "digest": "sha256:poll-template-example"
  },
  "type_arguments": {},
  "parameters": {
    "question": "What should we discuss next?",
    "options": ["Roadmap", "Architecture", "Business"]
  },
  "composite": {
    "members": {
      "question": "question_A",
      "options": "options_A",
      "vote-input": "vote_input_A",
      "vote-processor": "vote_processor_A",
      "vote-store": "vote_store_A",
      "aggregator": "aggregator_A",
      "chart": "chart_A"
    },
    "materialization": {
      "template_digest": "sha256:poll-template-example",
      "generation": 1
    }
  }
}
```

The World instance registry also contains `question_A`, `options_A`, `vote_input_A`, `vote_processor_A`, `vote_store_A`, `aggregator_A`, and `chart_A`, each with its own state and ownership metadata.

A second Poll instance MUST use different IDs for every descendant and MUST have an independent Vote Store state.

---

# Part VIII — Conformance and Tests

## 36. Composite conformance requirements

An implementation claiming BCIS v0.1 conformance MUST:

1. Parse and validate Composite Definitions.
2. Distinguish template-local IDs from runtime instance IDs.
3. Validate template parameters and generic type arguments.
4. Instantiate every Template Node with a fresh identity.
5. Recursively instantiate nested Composite Definitions.
6. Initialize child state according to the declared rules.
7. Construct a total, injective member map.
8. Materialize composition and internal connections.
9. Validate public interface exposures.
10. Enforce child ownership and state isolation.
11. Prevent external access to private descendant ports.
12. Persist child identities and state across World restoration.
13. Reject invalid or recursive template structures.
14. Commit instantiation atomically.
15. Preserve exact definition versions and digests.

## 37. Required conformance tests

A conforming implementation SHOULD include at least these tests:

| Test | Expected result |
|---|---|
| Instantiate one composite | All declared child instances are created. |
| Instantiate the same template twice | No instance or child IDs are shared. |
| Change state in instance A | Instance B remains unchanged. |
| Restore a serialized World | Existing child IDs are preserved. |
| Instantiate a nested composite | All nested descendants receive fresh IDs. |
| Supply a missing required parameter | Instantiation fails without changing the World. |
| Supply an invalid parameter type | Instantiation fails without changing the World. |
| Use an invalid internal connection | Definition validation fails. |
| Expose an incompatible port | Definition validation fails. |
| Connect externally to a private child port | Connection is rejected. |
| Delete a composite | Its descendants and owned relationships are deleted. |
| Move a composite | Descendant IDs and internal connections remain unchanged. |
| Clone with `reset` | New IDs and initial child state are produced. |
| Clone with `copy_state` | New IDs are produced and persistent state is copied. |
| Modify a persisted generated connection | Materialization validation detects the mismatch. |
| Create recursive composite definitions | Definition validation fails. |

---

# Appendix A — Decisions for v0.1

The following decisions are normative for this draft:

1. A Composite Definition is an immutable, versioned blueprint.
2. A Composite Instance is a normal Blockie Instance with a materialized descendant hierarchy.
3. Template-local IDs are distinct from instance IDs.
4. Each instantiation allocates fresh IDs for all descendants and generated relationships.
5. All descendants are represented as concrete instances in the canonical World.
6. Every child has exactly one structural owner.
7. Each child owns its own state; a Composite does not share a mutable state store with its children.
8. Template expressions are declarative and limited to literals and parameter references in v0.1.
9. Internal connections are declared in the template and materialized for each instance.
10. External consumers interact only through public ports and exposures.
11. Nested composites are recursively instantiated and independently scoped.
12. Composite definition dependency cycles are prohibited.
13. Instantiation is atomic.
14. Template-generated topology is immutable for an existing instance in v0.1.
15. Cloning has explicit `reset` and `copy_state` modes.
16. Deletion recursively removes owned descendants.

# Appendix B — Deferred topics

The following topics require future specifications:

- Dynamic insertion and removal of template children.
- Detaching a child from a Composite.
- Runtime template hot-swapping.
- Parameter mutation and state migration.
- Template inheritance and mixins.
- Shared singleton services and shared data resources.
- Dynamic template generation by AI agents.
- Conditional or repeated template nodes.
- Virtualized or lazily materialized descendants.
- Composite-level transactions spanning external services.
- Collaborative concurrent edits to template structure.

---

**End of Blockies Composite Instantiation Specification v0.1.0-draft**
