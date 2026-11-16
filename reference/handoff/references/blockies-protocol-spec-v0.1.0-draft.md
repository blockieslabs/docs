# Blockies Protocol Specification

**Version:** 0.1.0-draft  
**Status:** Proposed  
**Specification type:** Core Protocol  
**Primary implementation language:** Rust (non-normative)  
**Scripting interface:** JavaScript / TypeScript (initial runtime)  
**Serialization:** JSON

---

## About this document

This document is a **specification of the Blockies Protocol**. The protocol is the underlying set of rules, concepts, contracts, and conventions that allow Blockies implementations to represent and execute a World consistently. This specification describes those rules in a form that can guide independent implementations.

The specification is not itself the runtime or the implementation. It defines the expected structures and observable behavior while leaving implementation choices—such as the Rust graph library, JavaScript engine, CRDT library, and renderer framework—outside the protocol unless explicitly stated.

# 1. Introduction

## 1.1 Abstract

Blockies is a reactive, compositional computing environment.

The fundamental unit of Blockies is the **Blockie**: an independently identifiable entity that owns state, exposes typed interfaces, performs computation, reacts to events, and contributes to a larger composition.

A collection of Blockies forms a **World**.

A World is a serializable, executable structure consisting of Blockie instances, their relationships, and their configuration.

The Blockies Protocol defines:

- Blockie definitions and instances.
- Identity and state representation.
- Typed input and output ports.
- Computation and state transitions.
- Event propagation.
- Blockie composition.
- Data connections.
- Runtime execution semantics.
- Presentation interfaces.
- Extensibility and versioning.

The protocol is designed to support multiple applications, including spreadsheets, dashboards, presentations, interactive applications, and visual simulations.

## 1.2 Design principles

The protocol follows these principles:

1. **Identity is independent of position.** A Blockie retains its identity when moved or rearranged.
2. **State is explicit.** Persistent information belongs to a Blockie and follows a declared schema.
3. **Communication is explicit.** Blockies communicate through typed ports and declared connections.
4. **Computation is reactive.** Changes propagate through a dependency graph.
5. **Composition is hierarchical.** Blockies can contain other Blockies.
6. **Composition and dataflow are independent.** Visual containment does not imply data dependency.
7. **Presentation is replaceable.** A Blockie's computational behavior does not depend on its renderer.
8. **Execution is controlled.** Computation, state transitions, and external effects have separate contracts.
9. **Collaboration is optional.** A World can execute locally without a network connection.
10. **The protocol is language-neutral.** JavaScript is an implementation choice, not a protocol requirement.

## 1.3 Normative terminology

The words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are used as normative requirements.

- **MUST:** An implementation is required to satisfy this requirement.
- **MUST NOT:** An implementation is prohibited from doing this.
- **SHOULD:** An implementation is expected to satisfy this requirement unless a documented reason justifies otherwise.
- **SHOULD NOT:** An implementation is discouraged from doing this unless a documented reason justifies otherwise.
- **MAY:** An implementation can choose whether to support this behavior.

## 1.4 Scope

This specification defines the core document and execution protocol.

The following are outside the scope of v0.1:

- Network synchronization implementation.
- CRDT algorithms.
- Cloud hosting.
- User authentication.
- AI agent frameworks.
- Physics engines.
- Specific graphical interfaces.
- Specific spreadsheet formula dialects.
- Specific UI frameworks.
- Package registries and distribution infrastructure.

These may be introduced through future specifications.

# 2. Terminology

| Term | Definition |
|---|---|
| Blockie | An identifiable, stateful computational entity. |
| Definition | A reusable specification describing a Blockie's behavior and interface. |
| Instance | A particular occurrence of a Blockie Definition in a World. |
| World | A complete collection of Blockie instances and their relationships. |
| Port | A typed communication interface exposed by a Blockie. |
| Connection | A directed relationship between two ports. |
| Composition | A hierarchical containment relationship. |
| Composite Blockie | A Blockie whose composition contains other Blockies. |
| State | Information owned by a Blockie. |
| Derived State | Information calculated from other information. |
| Event | A discrete occurrence delivered to a Blockie. |
| Reducer | A function that calculates a new state from an existing state and an event. |
| Compute | A pure function that calculates outputs. |
| Effect | An explicitly authorized external operation. |
| Runtime | An implementation responsible for executing a World. |
| Renderer | An implementation responsible for visually representing a World. |

# 3. Protocol Structure

The protocol defines three primary entities and three relationship types.

## 3.1 Primary entities

```text
Blockies Protocol
│
├── BlockieDefinition
│
├── BlockieInstance
│
└── World
```

## 3.2 Relationship entities

```text
World
│
├── Composition
│
├── Connection
│
└── Interface Exposure
```

These relationships MUST be stored independently of Blockie identity.

## 3.3 Definition versus Instance

A Blockie Definition specifies a reusable type.

A Blockie Instance represents an occurrence of that type.

For example:

```text
Definition:
    Number Blockie

Instances:
    number_001
    number_002
    number_003
```

Each instance MUST have independent identity and state.

An instance MUST reference an exact definition version.

An instance MUST NOT redefine the ports or computational contract of its referenced definition.

Instance-specific presentation settings SHOULD be represented through configuration rather than modification of the definition.

# 4. Identity and Versioning

## 4.1 Blockie Instance Identity

Every Blockie instance MUST have a unique ID within its World.

IDs MUST:

- Be stable throughout the lifetime of the instance.
- Be independent of spatial position.
- Be independent of display name.
- Remain unchanged when the instance is moved.
- Remain unchanged when its parent changes.

The protocol treats IDs as opaque strings.

UUIDv7 or ULID are RECOMMENDED implementation choices.

The protocol does not require a specific ID generation algorithm.

Example:

```json
{
  "id": "01JXYZ123456789"
}
```

## 4.2 Definition Identity

Every Blockie Definition MUST have:

- A namespaced identifier.
- A version.

Example:

```json
{
  "id": "org.blockies.core.number",
  "version": "1.0.0"
}
```

Definition IDs MUST NOT be reused for unrelated Blockie types.

Definition versions SHOULD follow semantic versioning.

## 4.3 Protocol Version

A World MUST declare the protocol version it uses.

```json
{
  "protocol": "blockies/0.1"
}
```

An implementation MUST reject unsupported major protocol versions.

Unknown optional extensions MAY be ignored.

Unknown required features MUST cause validation failure.

## 4.4 Executable Module Identity

Executable modules MUST be referenced by a content digest.

Example:

```json
{
  "module": "sha256:abcdef..."
}
```

This ensures that an instance does not silently execute different code because a developer published a newer version.

A definition MUST reference immutable executable module contents.

# 5. Blockie Definition

## 5.1 Structure

A Blockie Definition MUST describe the following:

```text
BlockieDefinition
│
├── Identity
│   ├── ID
│   └── Version
│
├── Description
│
├── Configuration Schema
│
├── State Schema
│
├── Ports
│   ├── Inputs
│   └── Outputs
│
├── Logic
│   ├── Compute
│   └── Reduce
│
├── Effects
│
└── Presentation
```

Some sections MAY be omitted when not applicable.

## 5.2 Definition Example

```json
{
  "protocol": "blockies/0.1",

  "id": "org.blockies.core.multiply",
  "version": "1.0.0",

  "name": "Multiply",
  "description": "Multiplies two numbers.",

  "container": {
    "accepts_children": false
  },

  "state": {
    "schema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    },
    "initial": {}
  },

  "config": {
    "schema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    },
    "defaults": {}
  },

  "ports": [
    {
      "id": "a",
      "direction": "input",
      "kind": "value",
      "value_type": "number",
      "required": true
    },
    {
      "id": "b",
      "direction": "input",
      "kind": "value",
      "value_type": "number",
      "required": true
    },
    {
      "id": "result",
      "direction": "output",
      "kind": "value",
      "value_type": "number"
    }
  ],

  "logic": {
    "runtime": "blockies.javascript/1",
    "module": "sha256:abcdef...",
    "compute": "compute"
  },

  "presentation": {
    "renderer": "org.blockies.ui.number",
    "version": "1.0.0",
    "props": {}
  }
}
```

## 5.3 Definition Immutability

A published Blockie Definition MUST be immutable.

Changes to any of the following SHOULD result in a new definition version:

- State schema.
- Configuration schema.
- Input or output ports.
- Computation semantics.
- State transition semantics.
- External capabilities.
- Composition contract.

A new version MUST NOT silently change the behavior of an existing World.

# 6. Data Types

## 6.1 Supported Types

The initial protocol supports the following types:

| Type | Description | Wire representation |
|---|---|---|
| null | No value | `null` |
| boolean | Boolean | `true`, `false` |
| integer | Signed safe integer | JSON number |
| number | Floating-point number | JSON number |
| decimal | Exact decimal | Decimal string |
| string | Text | JSON string |
| date | Calendar date | `YYYY-MM-DD` |
| datetime | Timestamp | RFC 3339 string |
| duration | Duration in milliseconds | Integer |
| array | Ordered collection | JSON array |
| object | Structured value | JSON object |
| enum | One of predefined values | JSON primitive |

## 6.2 Numeric Semantics

Integer values MUST fall within the JavaScript safe integer range:

```text
-(2^53 - 1) through +(2^53 - 1)
```

Number values MUST be finite IEEE 754 binary64 values.

NaN and positive or negative infinity MUST NOT be serialized.

Decimal values MUST be represented as strings to preserve exact decimal precision.

Example:

```json
{
  "price": "150000.25"
}
```

## 6.3 Date and Time

Date values MUST use ISO calendar dates.

Datetime values MUST include a timezone offset.

Example:

```json
{
  "date": "2026-11-01",
  "created_at": "2026-11-01T10:30:00+07:00"
}
```

Durations MUST be expressed in milliseconds.

## 6.4 Structured Types

Arrays and objects MUST declare their nested types.

Example:

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "price": {
      "type": "decimal"
    },
    "active": {
      "type": "boolean"
    }
  },
  "required": [
    "name",
    "price"
  ],
  "additionalProperties": false
}
```

An implementation MUST distinguish:

- Missing properties.
- Null values.
- Empty strings.
- Empty arrays.
- Numeric zero.

## 6.5 Type Compatibility

Connections MUST be type-compatible.

Version 0.1 permits:

1. Exact type compatibility.
2. Integer-to-number widening.

Other implicit conversions MUST NOT occur.

For example:

```text
Integer → Number       Valid
Number → Integer       Invalid
String → Number        Invalid
Decimal → Number       Invalid
```

A conversion MUST be explicit, normally through a conversion Blockie.

# 7. State Model

## 7.1 State Categories

The protocol distinguishes five categories.

| Category | Description |
|---|---|
| Configuration | User-defined Blockie configuration |
| Model | Persistent information owned by the Blockie |
| Derived | Calculated values |
| View | Presentation-related information |
| Runtime | Temporary execution information |

## 7.2 Configuration State

Configuration describes how a Blockie is configured.

Example:

```json
{
  "label": "Revenue",
  "currency": "IDR",
  "decimal_places": 0
}
```

Configuration MUST be validated against the definition's configuration schema.

Configuration changes MUST trigger dependency invalidation when they affect computation.

## 7.3 Model State

Model State contains persistent information belonging to an instance.

Example:

```json
{
  "value": 150000
}
```

Every instance MUST have state conforming to its definition's state schema.

An instance's initial state MUST be derived from its definition's initial state, unless an explicit valid instance state is supplied.

After initialization, persistent state changes MUST happen through validated state transitions.

## 7.4 Derived State

Derived State is produced through computation.

Derived outputs MUST NOT be treated as authoritative persistent model state.

A runtime MAY cache computed outputs.

A cached result MUST be invalidated when any of its declared dependencies change.

## 7.5 View State

View State contains information specific to presentation.

Examples:

- Selected state.
- Hover state.
- Expanded state.
- Tooltip visibility.
- Cursor position.

View State MAY be local or shared, depending on the application.

View State MUST NOT affect computational results unless explicitly represented through an input or configuration.

## 7.6 Runtime State

Runtime State includes:

- Execution status.
- Pending tasks.
- Computation errors.
- Dirty flags.
- Execution generation.

Runtime State MUST NOT be included in the canonical serialized World.

## 7.7 State Ownership

An instance MUST own its Model State.

Another Blockie MUST NOT modify an instance's state directly.

State transitions MUST occur through that instance's declared event inputs and reducer.

Initial state restoration and validated document migration are exceptions.

# 8. Ports

## 8.1 General

Ports are the formal communication interfaces of a Blockie.

Every port MUST have:

- A stable ID within its definition.
- A direction.
- A communication kind.
- A declared type when applicable.

## 8.2 Port Directions

The protocol defines:

- `input`
- `output`

An input receives information.

An output exposes information.

## 8.3 Communication Kinds

The protocol defines two port kinds:

- `value`
- `event`

### Value ports

A value port represents the latest available information.

Example:

```json
{
  "id": "price",
  "direction": "input",
  "kind": "value",
  "value_type": "decimal",
  "required": true
}
```

Value ports participate in the reactive dependency graph.

### Event ports

An event port represents an occurrence.

Example:

```json
{
  "id": "on_click",
  "direction": "output",
  "kind": "event",
  "payload_type": {
    "type": "object",
    "properties": {}
  }
}
```

Events are discrete messages, not persistent Boolean values.

## 8.4 Port Cardinality

A value input MUST accept at most one incoming connection in v0.1.

An event input MAY accept multiple incoming connections.

An output MAY connect to multiple compatible inputs.

Multiple value inputs MUST NOT be implicitly aggregated.

Aggregation requires an explicit Blockie or declared aggregation extension.

## 8.5 Unconnected Inputs

An optional value input MAY declare a default.

If a value input is connected, the connected output takes precedence.

If it is unconnected:

- Its default MUST be supplied when defined.
- An optional input without a default MUST be omitted from the computation input object.
- A required input without a connection or default MUST prevent computation.

The runtime MUST NOT silently substitute zero, an empty string, or another arbitrary value.

# 9. Connections

## 9.1 Structure

A Connection establishes a directed relationship between an output port and an input port.

```json
{
  "id": "connection_001",

  "from": {
    "blockie": "number_001",
    "port": "value"
  },

  "to": {
    "blockie": "multiply_001",
    "port": "a"
  }
}
```

## 9.2 Validation

An implementation MUST validate:

1. Source instance existence.
2. Target instance existence.
3. Source port existence.
4. Target port existence.
5. Direction compatibility.
6. Communication kind compatibility.
7. Value type compatibility.
8. Port cardinality.

Invalid connections MUST be rejected.

## 9.3 Connection Independence

Connections MUST be independent of composition relationships.

Two Blockies MAY connect even if they belong to different composition branches.

Moving a Blockie MUST NOT automatically destroy its connections.

Deleting an instance MUST remove or invalidate all references to that instance.

# 10. Composition

## 10.1 Definition

Composition describes the structural containment of Blockies.

A Blockie Definition MAY declare:

```json
{
  "container": {
    "accepts_children": true
  }
}
```

An instance whose definition does not accept children MUST NOT be used as a composition parent.

## 10.2 Composition Relationship

```json
{
  "id": "composition_001",

  "parent": "dashboard_001",
  "child": "chart_001",

  "slot": "main_content",
  "order": 0,

  "layout": {
    "blockies.grid": {
      "row": 1,
      "column": 2,
      "column_span": 2
    }
  }
}
```

Layout properties are renderer-specific extension data.

## 10.3 Structural Rules

A World MUST have exactly one root Blockie.

The root MUST NOT have a parent.

Every other Blockie MUST have exactly one parent.

Every Blockie MUST be reachable from the root through composition relationships.

Containment cycles MUST NOT exist.

A composition operation MUST preserve these invariants.

## 10.4 Composite Blockies

A Composite Blockie is an instance containing one or more child instances.

A Composite Blockie MAY expose ports that delegate to ports belonging to its descendants.

These public interfaces MUST be declared explicitly.

## 10.5 Interface Exposure

An interface exposure maps a Composite Blockie's public port to a descendant's port.

Example:

```json
{
  "id": "exposure_001",

  "container": "poll_001",

  "public_port": "results",

  "target": {
    "blockie": "aggregator_001",
    "port": "results"
  },

  "direction": "child_to_parent"
}
```

Supported directions:

- `parent_to_child`: Public input forwarded to a descendant input.
- `child_to_parent`: Descendant output exposed as a public output.

The exposed ports MUST have compatible communication kinds and types.

The target MUST belong to the container's composition subtree.

Exposures MUST NOT create ambiguous routing or violate port cardinality.

# 11. Logic Model

The protocol defines three distinct behavior mechanisms.

## 11.1 Compute

Compute calculates outputs from the current state, configuration, and resolved inputs.

Its conceptual signature is:

```text
compute(state, config, inputs) → outputs
```

Compute MUST be pure.

Compute MUST NOT:

- Modify persistent state.
- Emit events.
- Perform network requests.
- Access the filesystem.
- Read undeclared Blockies.
- Use unrestricted external resources.

For identical inputs, state, configuration, and implementation version, compute MUST produce equivalent outputs.

Example:

```javascript
export function compute({ state, config, inputs }) {
  return {
    result: inputs.a * inputs.b
  };
}
```

The returned object MUST contain exactly the declared output ports.

Each output MUST conform to its declared type.

## 11.2 Reduce

Reduce calculates state transitions from incoming events.

Its conceptual signature is:

```text
reduce(state, config, event)
    → { state, emit, effects }
```

The reducer MUST be pure.

It MUST return the complete next state.

Example:

```javascript
export function reduce(state, config, event) {
  switch (event.port) {
    case "increment":
      return {
        state: {
          count: state.count + 1
        },
        emit: [],
        effects: []
      };

    case "reset":
      return {
        state: {
          count: 0
        },
        emit: [],
        effects: []
      };

    default:
      throw new Error("Unsupported event");
  }
}
```

The resulting state MUST conform to the declared state schema.

A reducer MUST NOT mutate its received state object.

## 11.3 Effects

Effects represent operations outside the deterministic computational environment.

Examples:

- Network requests.
- AI model requests.
- Database operations.
- External integrations.

A Blockie MUST explicitly declare the capabilities it requires.

Example:

```json
{
  "effects": [
    {
      "id": "fetch_weather",
      "capability": "network.weather.read"
    }
  ]
}
```

A reducer MAY request a declared effect.

An effect MUST NOT execute directly inside `compute()` or `reduce()`.

The runtime MUST validate effect permissions.

Effect requests MUST be recorded as pending work and executed only after the originating transaction commits.

Effect results MUST return through an explicit event in a subsequent transaction.

External effect execution is not guaranteed to be exactly once. Hosts SHOULD use idempotency keys and deduplication.

# 12. Execution Model

## 12.1 General

A World is executed by a Runtime.

A Runtime MUST maintain:

- Current Blockie states.
- Resolved input values.
- Computed output values.
- Value dependency graph.
- Event routing graph.
- Runtime statuses.
- Execution transactions.

## 12.2 Initialization

When loading a World, the Runtime MUST:

1. Validate the protocol version.
2. Resolve all required definitions.
3. Validate instance schemas.
4. Validate composition relationships.
5. Validate connections.
6. Validate interface exposures.
7. Construct the dependency graph.
8. Reject invalid value dependency cycles.
9. Initialize computed outputs.

## 12.3 Value Dependency Graph

A value connection establishes a dependency.

Example:

```text
[A] ──┐
     ├──> [Multiply] ──> [Result]
[B] ──┘
```

A value dependency graph MUST be acyclic in v0.1.

The Runtime MUST evaluate Blockies in dependency order.

If a Blockie changes, the Runtime SHOULD recalculate only affected descendants.

## 12.4 Computation Scheduling

The Runtime MUST:

- Track dirty Blockies.
- Resolve their current inputs.
- Detect missing required inputs.
- Evaluate ready Blockies.
- Validate returned outputs.
- Propagate changed values.

When multiple Blockies are ready simultaneously, execution order MUST be stable.

The protocol recommends ordering by Blockie ID as a deterministic tie-breaker.

Implementations MAY parallelize independent computations if doing so preserves the protocol's observable semantics.

## 12.5 Events

Events are dispatched to declared event input ports.

An event MUST contain:

```json
{
  "port": "increment",
  "payload": {}
}
```

The Runtime MUST:

1. Validate the event port.
2. Validate its payload.
3. Invoke the receiving reducer.
4. Validate the resulting state.
5. Route emitted events to connected event inputs.

Event routing MUST use FIFO queue semantics.

When an event is connected to multiple destinations, the Runtime MUST use a stable delivery order based on connection ID.

Event graph cycles MAY exist.

However, a Runtime MUST enforce execution limits to prevent infinite event cascades.

## 12.6 Transaction Semantics

The Runtime MUST process state transitions through transactions.

A transaction consists of:

```text
1. Receive command/event
2. Validate command and permissions
3. Create staged state
4. Process event queue
5. Execute reducers
6. Collect generated events and effects
7. Identify dirty computations
8. Evaluate affected Blockies
9. Validate resulting outputs
10. Commit state and outputs
11. Publish changes
12. Execute pending effects
```

State and computed outputs MUST become visible as one coherent committed generation.

Intermediate staged changes MUST NOT be exposed to the renderer as committed data.

A reducer failure MUST abort the originating transaction without committing staged persistent state changes.

A computation failure MUST NOT roll back an otherwise valid state transition.

Instead, the failed Blockie's outputs MUST be marked as errors.

## 12.7 Execution Errors

Runtime errors MUST have structured representations.

Example:

```json
{
  "code": "division_by_zero",
  "message": "Cannot divide by zero",
  "source": {
    "blockie": "divide_001",
    "port": "result"
  }
}
```

A computation failure MUST invalidate the failed Blockie's outputs for the current generation.

Downstream Blockies MUST NOT silently use stale values as though they were current.

Runtime statuses SHOULD include:

- `ready`
- `dirty`
- `running`
- `blocked`
- `error`
- `suspended`

These statuses are runtime information and MUST NOT be treated as persistent model state.

## 12.8 Execution Limits

A Runtime MUST provide configurable resource limits.

At minimum:

- Maximum events per transaction.
- Maximum event cascade depth.
- Maximum computation execution time.
- Maximum memory allocation per execution.
- Maximum serialized input/output size.

Implementations MUST NOT permit a user-defined Blockie to execute without limits.

# 13. JavaScript Runtime ABI

Version 0.1 defines an initial JavaScript runtime ABI.

This is an implementation interface, not a requirement that all future Blockies implementations use JavaScript.

## 13.1 Compute ABI

```typescript
type ComputeContext<State, Config, Inputs> = {
  state: Readonly<State>;
  config: Readonly<Config>;
  inputs: Readonly<Inputs>;
};

type ComputeResult<Outputs> = Outputs;

function compute(
  context: ComputeContext<State, Config, Inputs>
): ComputeResult<Outputs>;
```

## 13.2 Reducer ABI

```typescript
type Event = {
  port: string;
  payload: unknown;
};

type EmittedEvent = {
  port: string;
  payload: unknown;
};

type EffectRequest = {
  effect: string;
  input: unknown;
};

type ReduceResult<State> = {
  state: State;
  emit: EmittedEvent[];
  effects: EffectRequest[];
};

function reduce(
  context: {
    state: Readonly<State>;
    config: Readonly<Config>;
    event: Readonly<Event>;
  }
): ReduceResult<State>;
```

## 13.3 Execution Isolation

A JavaScript Runtime MUST provide an isolated execution environment.

User-defined code MUST NOT receive unrestricted access to:

- The host filesystem.
- Network interfaces.
- Other application processes.
- Undeclared Blockie state.
- Internal Runtime memory.

Capabilities MUST be granted explicitly.

# 14. Presentation Model

## 14.1 General

Presentation describes how a Blockie is visually represented.

Presentation MUST remain separate from computational behavior.

A Definition MAY declare:

```json
{
  "presentation": {
    "renderer": "org.blockies.ui.number",
    "version": "1.0.0",
    "props": {
      "alignment": "right",
      "editable": true
    }
  }
}
```

## 14.2 Renderer Responsibilities

A Renderer is responsible for:

- Converting Blockie information into visual representations.
- Displaying current state and computed outputs.
- Rendering input controls.
- Translating user interactions into protocol commands or events.
- Applying layout information.
- Managing local presentation state.

A Renderer MUST NOT independently modify Blockie model state.

User interactions MUST be translated into authorized protocol operations.

## 14.3 Renderer Independence

The same Blockie MAY be represented by multiple Renderers.

For example:

```text
Number Blockie
│
├── Spreadsheet Renderer
├── Dashboard Renderer
├── Presentation Renderer
└── 2D World Renderer
```

Unsupported renderers MUST NOT prevent the underlying World from being loaded and inspected.

# 15. World Serialization

## 15.1 World Structure

A World MUST contain:

- Protocol version.
- World identity.
- Root Blockie ID.
- Required definition references.
- Blockie instances.
- Composition relationships.
- Connections.
- Interface exposures.

## 15.2 Example

```json
{
  "protocol": "blockies/0.1",

  "id": "world_001",

  "root": "dashboard_001",

  "dependencies": [
    {
      "id": "org.blockies.core.number",
      "version": "1.0.0",
      "digest": "sha256:111..."
    },
    {
      "id": "org.blockies.core.multiply",
      "version": "1.0.0",
      "digest": "sha256:222..."
    }
  ],

  "instances": {
    "dashboard_001": {
      "id": "dashboard_001",
      "definition": {
        "id": "org.blockies.core.container",
        "version": "1.0.0",
        "digest": "sha256:333..."
      },
      "config": {},
      "state": {}
    },

    "number_001": {
      "id": "number_001",
      "definition": {
        "id": "org.blockies.core.number",
        "version": "1.0.0",
        "digest": "sha256:111..."
      },
      "config": {
        "label": "A"
      },
      "state": {
        "value": 100
      }
    }
  },

  "composition": [
    {
      "id": "composition_001",
      "parent": "dashboard_001",
      "child": "number_001",
      "slot": "main",
      "order": 0
    }
  ],

  "connections": [],

  "exposures": []
}
```

## 15.3 Serialization Rules

The World MUST be serializable without runtime caches or transient statuses.

Definition references MUST identify exact versions and digests.

An implementation MUST NOT silently replace unavailable definitions with unrelated definitions.

Large binary assets SHOULD be referenced through content-addressed external resources rather than embedded directly into ordinary Blockie state.

The protocol's serialized values MUST NOT contain functions, executable closures, or runtime pointers.

# 16. Persistence and Collaboration

## 16.1 Local Execution

A conforming Runtime MUST be capable of operating without a network connection.

## 16.2 Collaboration Compatibility

The document structure MUST support independent synchronization adapters.

The protocol does not mandate a CRDT implementation.

A synchronization adapter MUST preserve:

- Instance identity.
- Composition validity.
- Connection validity.
- Definition references.
- State schema validity.

## 16.3 Shared and Local Information

Implementations SHOULD distinguish shared persistent information from local presentation information.

At minimum:

| Information | Default treatment |
|---|---|
| Instance identity | Shared |
| Configuration | Shared |
| Model state | Shared document state |
| Composition | Shared |
| Connections | Shared |
| Derived outputs | Locally recomputed |
| Runtime state | Local |
| Local view state | Local |

## 16.4 Conflict Handling

The protocol does not define a universal conflict-resolution algorithm in v0.1.

A host MUST define how concurrent commands against shared state are accepted and ordered.

A synchronization system MUST NOT assume that successful CRDT merging automatically enforces application-level authorization or business rules.

# 17. Extensions

The protocol MUST allow future functionality without requiring changes to the fundamental Blockie structure.

Extensions SHOULD use namespaced identifiers.

Examples:

```text
org.blockies.physics
org.blockies.ai
org.blockies.web
org.blockies.animation
org.blockies.spreadsheet
```

Extensions MAY introduce:

- Specialized types.
- Additional renderers.
- Additional runtime adapters.
- Specialized scheduling behavior.
- Additional effect capabilities.
- New presentation mechanisms.

An extension MUST declare its required protocol features and compatibility.

Unknown required extensions MUST result in a clear compatibility error.

# 18. Versioning and Migration

## 18.1 Protocol Versioning

Protocol versions follow:

```text
MAJOR.MINOR
```

Major versions indicate incompatible protocol changes.

Minor versions introduce backward-compatible capabilities.

## 18.2 Definition Versioning

Definitions SHOULD use semantic versioning.

Existing Worlds MUST continue referencing their declared definition version until explicitly migrated.

## 18.3 Migration

A migration MUST be explicit.

A migration SHOULD specify:

- Source definition version.
- Destination definition version.
- Required state transformation.
- Configuration transformation.
- Port compatibility changes.
- Potential connection changes.

A migration MUST produce a valid instance under the destination schema.

# 19. Security Requirements

A Runtime MUST treat external Blockie definitions and scripts as untrusted.

It MUST enforce:

- Schema validation.
- Permission checks.
- Script isolation.
- Execution limits.
- Effect authorization.
- Resource limits.
- Definition integrity.

A Blockie MUST NOT be able to access another Blockie's private state through an undeclared mechanism.

A Renderer MUST NOT be considered an authorization boundary.

Sensitive operations MUST be enforced by the Runtime or the authoritative host.

# 20. Conformance Requirements

An implementation claiming Blockies Protocol v0.1 conformance MUST:

1. Parse and validate a v0.1 World.
2. Resolve and validate Blockie Definitions.
3. Instantiate Blockie instances with independent identities and state.
4. Validate all declared ports and connections.
5. Maintain a valid composition hierarchy.
6. Reject invalid value dependency cycles.
7. Execute pure computations.
8. Apply reducer-based state transitions.
9. Deliver events deterministically within a transaction.
10. Validate outputs and resulting state.
11. Propagate dependency changes.
12. Represent execution errors without crashing the entire World.
13. Serialize and restore a World.
14. Preserve Blockie identities across structural changes.
15. Enforce declared capabilities and execution limits.

An implementation MAY claim partial conformance to a separately defined renderer or scripting profile, but MUST NOT claim full core conformance if any of these mandatory requirements are missing.

# Appendix A. Reference Example: Multiply Blockie

Definition:

```json
{
  "protocol": "blockies/0.1",

  "id": "org.blockies.core.multiply",
  "version": "1.0.0",

  "name": "Multiply",

  "container": {
    "accepts_children": false
  },

  "state": {
    "schema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    },
    "initial": {}
  },

  "config": {
    "schema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    },
    "defaults": {}
  },

  "ports": [
    {
      "id": "a",
      "direction": "input",
      "kind": "value",
      "value_type": "number",
      "required": true
    },
    {
      "id": "b",
      "direction": "input",
      "kind": "value",
      "value_type": "number",
      "required": true
    },
    {
      "id": "result",
      "direction": "output",
      "kind": "value",
      "value_type": "number"
    }
  ],

  "logic": {
    "runtime": "blockies.javascript/1",
    "module": "sha256:example",
    "compute": "compute"
  }
}
```

Logic:

```javascript
export function compute({ inputs }) {
  return {
    result: inputs.a * inputs.b
  };
}
```

Expected behavior:

```text
Input A = 100
Input B = 2

Compute:

100 * 2

Output:

200
```

Changing Input A to 50 MUST cause the Multiply Blockie to recalculate, producing 100.

# Appendix B. Reference Example: Counter Blockie

Definition concept:

```text
Counter
│
├── State
│   └── count: Integer
│
├── Event Inputs
│   ├── increment
│   ├── decrement
│   └── reset
│
└── Value Outputs
    └── count
```

Reducer:

```javascript
export function reduce({ state, event }) {
  switch (event.port) {
    case "increment":
      return {
        state: {
          count: state.count + 1
        },
        emit: [],
        effects: []
      };

    case "decrement":
      return {
        state: {
          count: state.count - 1
        },
        emit: [],
        effects: []
      };

    case "reset":
      return {
        state: {
          count: 0
        },
        emit: [],
        effects: []
      };

    default:
      throw new Error("Unknown event");
  }
}
```

Compute:

```javascript
export function compute({ state }) {
  return {
    count: state.count
  };
}
```

The Counter demonstrates the distinction between:

- Persistent Model State.
- Discrete Events.
- State Transitions.
- Computed Outputs.

# Appendix C. Deferred Protocol Proposals

The following features are intentionally deferred.

| Feature | Potential specification |
|---|---|
| CRDT synchronization | Collaboration Protocol |
| Concurrent state semantics | State Synchronization Protocol |
| Physics simulation | Simulation Extension |
| AI agents | Agent Interaction Protocol |
| Web rendering | Web Renderer Specification |
| Spreadsheet formulas | Spreadsheet Extension |
| Animation and personality | Presentation Extension |
| Module distribution | Blockie Package Specification |
| Streaming data | Stream Processing Extension |
| Temporal feedback | Temporal Execution Extension |

---

**End of Blockies Protocol Specification v0.1.0-draft**
