---
title: "Blockies — Consolidated Protocol Documentation"
subtitle: "Architecture, specifications, decisions, schemas, validation, and roadmap"
date: "2026-11-02"
version: "0.1.0-draft"
status: "Consolidated working dossier — not frozen"
---

# Blockies — Consolidated Protocol Documentation

**Edition:** 0.1.0-draft  
**Prepared:** 2 November 2026  
**Status:** Consolidated working dossier; the protocol family is **not frozen**.  
**Purpose:** Single reading and working reference containing all six specification drafts, the cross-specification audit, JSON Schema package, semantic-validation requirements, and validator implementation notes.

> **Important status notice:** This document consolidates the current source documents. It does not silently resolve every contradiction or turn proposed recommendations into normative requirements. The six source specifications still contain known inconsistencies identified in the consistency review. The decision register and freeze gates near the beginning of this document are the working guide for resolving them. Until those gates pass, treat all `v0.1.0-draft` documents and schemas as provisional.

## How to use this document

- Read **Part I** first for the architecture, responsibility boundaries, decision register, open questions, and roadmap.
- Read **Part II** for the six full specification drafts. Their original technical content is retained; heading levels are adjusted only to make the combined document navigable.
- Read **Part III** for the canonical JSON Schema package and its examples.
- Read **Part IV** for the Rust validator implementation notes and current verification status.
- Use the linked Markdown and HTML editions as the working documentation. The JSON Schema files embedded in Part III represent the current generated schema baseline, not a claim that every schema/document mismatch has been resolved.

## Document inventory

| ID | Document | Responsibility | Current status |
|---|---|---|---|
| CORE | Blockies Protocol Specification | Base entities, World, identity, ports, connections, state, serialization | Draft |
| BTS | Blockies Type System Specification | Type expressions, primitive/composite types, generics, assignability, validation | Draft |
| BCIS | Composite Instantiation Specification | Templates, child identities, materialization, ownership, lifecycle | Draft |
| BCCS | Composite Computation Specification | Composite value boundaries, observations, output production, computation | Draft |
| BCEFS | Composite Event Flow Specification | Event boundaries, forwarding, handlers, dispatch, ordering | Draft |
| BRES | Runtime Execution Specification | Unified transaction algorithm, event and value phases, effects, commit | Draft |
| AUDIT | Consistency Review | Contradictions, responsibility matrix, change plan, freeze gates | Review baseline |
| SCHEMA | JSON Schema package | Draft 2020-12 structural schemas and examples | Generated draft |
| VALIDATOR | Rust validator | Structural and semantic validation baseline | Compilation unverified |

## Executive summary

Blockies is a reactive, compositional computing environment. A World contains independently identified Blockie instances. Blockies communicate through typed value and event ports. Composite Blockies instantiate isolated child hierarchies and expose controlled public interfaces. Reducers process events and produce staged state transitions. Pure computations stabilize a directed acyclic value-dependency graph. Effects run only after commit and return, when applicable, through later transactions.

The six specifications express a coherent architecture, but they are not yet mutually consistent enough to freeze. The most serious contradictions are Composite behavior ownership, staged versus committed input resolution, Composite boundary routing/fan-out, cross-scope visibility, and canonical serialization. There are also incomplete contracts for the Definition schema, scripting ABI, effect results, event identity at boundaries, document revisions, deterministic equality, and digest computation.

The recommended path is to close those contracts, update all six documents from one canonical schema and ABI, run the Rust validator and conformance corpus, and only then tag the family `v0.1.0` stable.

---

# Part I — Unified architecture, decisions, and roadmap

## 1. Product and architectural intent

Blockies is not defined as an Excel replacement. A spreadsheet is an initial application and validation workload for a more general model: living, composable, reactive components.

A Blockie is an independently identifiable entity that may own state, expose typed interfaces, perform deterministic computation, react to events, and contribute to a larger composition. A World is the executable document containing those entities and their relationships.

The same core model is intended to support:

- Spreadsheet-like workbooks and formula-driven cells.
- Dashboards and interactive data visualizations.
- Presentations with live audience interaction and polls.
- Reusable UI components and interactive applications.
- Later extensions such as AI-agent adapters, animation/personality, web rendering, and physics/simulation.

These future applications are extension targets, not v0.1 requirements.

### 1.1 Product vision captured from the original concept

The product vision behind the protocol is **“a spreadsheet where every cell is alive,”** with an important qualification: Blockies is not intended to be merely an Excel replacement. It should be able to do spreadsheet work while providing a more general compositional model.

The intended properties are:

- Each Blockie has identity and state; other Blockies can react to declared outputs and events.
- Blockies combine into larger Blockies. A cell is one possible presentation/interaction form, not the definition of the underlying entity.
- The spreadsheet is the first recognizable application and a demanding proof of reactive state, dependencies, and editing—not the boundary of the platform.
- Interactive UI is assembled by composing Blockies. A chart can consume a dataset without knowing which Blockie produced it; a button can emit an event without knowing who handles it.
- A hosted presentation World can expose audience input Blockies while a presenter view displays aggregated statistics from the same logical World.
- The World itself is the primary communication artifact: a presentation or visualization communicates through its live components, not only through a separate chat-like output channel.
- Blockies are not intended to become general-purpose autonomous agents by default. External services or agents may participate through explicit adapters, commands, events, and capabilities; their outputs become World inputs or state transitions.
- Personality, mascot identity, and combine animations are presentation/experience features. They must not change computational semantics or type behavior.
- A future physics system, web renderer, or alternate UI surface should be an extension/runtime/renderer built on the same core protocol, not hard-coded into the core execution model.

### 1.2 Product and business choices that remain open

The open-core direction discussed so far is a **proposal**, not a frozen product decision:

- Candidate open components: core protocol/runtime, data format, type system, basic renderer, extension SDK, and self-hosting support.
- Candidate commercial services: managed hosting, collaboration/synchronization, hosted presentations, team administration, analytics, and enterprise controls.
- A user should ideally be able to create and run a World locally and self-host the basic system without depending on the vendor cloud.
- Licensing (permissive, copyleft, source-available, or split licensing), hosting boundaries, marketplace policy, and commercial feature boundaries remain undecided. They require a separate product/licensing decision and should not be embedded into the protocol.

### 1.3 Spreadsheet compatibility strategy

“Does what Excel does” should be translated into measurable, scoped targets rather than a claim of complete Excel compatibility.

Track two different goals:

1. **Spreadsheet capability:** Blockies can perform the selected practical spreadsheet workflows (data entry, formulas, references, ranges, sorting/filtering, formatting, charts, editing, undo/redo, and persistence).
2. **Excel interoperability:** Blockies imports/exports `.xlsx` and reproduces the selected supported formula and workbook semantics with defined behavior.

Before a stable 1.0 spreadsheet release, create a feature matrix, a supported-function list, deterministic formula fixtures, and a real-workbook corpus. OpenFormula is a useful formula-semantics reference; OOXML is a file-format/interoperability reference. Neither one alone defines every behavior of the Excel application. Formula engines and real-world workbook corpora can be used as comparative test inputs, but Blockies must publish its own explicit compatibility target.

These product intentions guide prioritization. They do not add spreadsheet-specific concepts to the Core Protocol.

## 2. Core conceptual model

### 2.1 Blockie Definition and Instance

A **Definition** is a reusable, versioned blueprint. An **Instance** is a concrete occurrence in one World. The Definition declares the state/configuration types, ports, logic, capabilities, presentation contract, and—when Composite—the template and boundary declarations. The Instance owns its identity, configuration, persistent state, generic specialization, and Composite materialization map where applicable.

### 2.2 World

A World is a self-contained executable document. It contains the required pinned Definition references, Instance registry, composition relationships, connections, Composite routes/materialization provenance, and World-level metadata/configuration.

### 2.3 Three different structures

| Structure | Question answered | Meaning |
|---|---|---|
| Composition hierarchy | What belongs inside what? | Parent/child containment and visual/structural organization |
| Value dependency graph | Which calculations depend on which values? | Reactive invalidation and topological computation order |
| Event routing graph | Where can discrete occurrences be delivered? | FIFO event delivery; cycles are possible but bounded |

These structures MUST remain logically separate. Visual containment does not itself create a data dependency or event route.

### 2.4 Blockie conceptual shape

```text
Blockie
├── Identity
├── Definition reference
├── Generic specialization
├── Configuration
├── Model State
├── Input Ports
├── Output Ports
├── Logic
│   ├── Compute
│   └── Reduce
├── Effects / capabilities
├── Presentation contract
└── Metadata
```

Ports and executable contracts are declared by the Definition. Instance data supplies values and specialization; it must not silently redefine a Definition's interface.

## 3. Responsibility boundaries — source of truth

This is the proposed ownership matrix for the specification family. A document may reference another contract, but should not redefine it.

| Concern | Sole normative owner | Other documents may do |
|---|---|---|
| Base entities, identity, World, ports, connection envelope, persistence vocabulary | CORE | Reference the shared concepts |
| Type expressions, value representation, assignability, generic rules, validation | BTS | Refer to BTS type IDs and rules |
| Composite templates, child ID mapping, instantiation, materialization, ownership, clone/reset | BCIS | Declare value/event routes and their materialization keys |
| Value input bindings, internal observations, output exposures, Composite Compute semantics | BCCS | Defer transaction timing to BRES |
| Event bindings, child handlers, event exposures, dispatch routes, event identity/routing | BCEFS | Defer global ordering/commit to BRES |
| Global execution phases, transaction isolation, scheduler ordering, error/commit/effects | BRES | Define local contracts but defer their ordering to BRES |
| JSON document shape | Canonical JSON Schema bundle derived from the above | Must not invent alternate object shapes |
| Cross-reference and semantic rules | Normative prose + semantic validator tests | JSON Schema validates structural shape only |

## 4. Consolidated architectural decisions

The following decisions recur consistently across the drafts and are suitable as the foundation of the protocol. Some still need exact schema wording before they can become frozen requirements.

| ID | Decision | Status before freeze |
|---|---|---|
| D-001 | Blockie identity is stable and independent of position, label, or composition parent. | Consistent foundation |
| D-002 | Definitions are reusable, versioned blueprints; instances have independent identity and state. | Consistent foundation |
| D-003 | Definition references pin an exact version and content digest. | Concept agreed; digest calculation unresolved |
| D-004 | Every World is executable locally without requiring network synchronization. | Consistent foundation |
| D-005 | Configuration, Model State, Derived outputs, View State, and Runtime State are distinct. | Consistent foundation; details need alignment |
| D-006 | Value ports represent current information; event ports represent occurrences. | Consistent foundation |
| D-007 | Ports are typed; connections are directionally validated under BTS assignability. | Consistent foundation |
| D-008 | A value input has at most one effective producer. | Consistent foundation; count bindings and connections together |
| D-009 | Composition and dataflow are separate structures. | Consistent foundation |
| D-010 | Composite children are freshly instantiated, independently identified, and state-isolated. | Consistent foundation |
| D-011 | Composite internals are accessible only through declared boundary contracts. | Consistent foundation; visible-scope rules need exact closure |
| D-012 | Composite Blockies are first-class Blockies and may own state, reducers, and computation. | Recommended resolution; BCIS must be corrected |
| D-013 | Compute is pure and may only read declared context; it cannot emit events or effects. | Consistent foundation; ABI must be unified |
| D-014 | Reduce is pure and returns a complete next state plus declared actions. | Consistent foundation; common ABI must be unified |
| D-015 | Reducers may read own latest staged state, own configuration, and the delivered event; v0.1 reducers do not read connected value inputs. | Proposed v0.1 constraint; ratify explicitly |
| D-016 | Value dependencies form an acyclic graph, including dependencies crossing Composite boundaries. | Consistent foundation |
| D-017 | Events use a logical FIFO queue; event cycles are allowed only under explicit limits. | Consistent foundation; route ordering details need closure |
| D-018 | One logical, single-writer transaction scheduler exists per World in v0.1. | Consistent foundation |
| D-019 | Event processing/reducers happen before value stabilization. | BRES execution model; reconcile older drafts |
| D-020 | Compute reads the staged generation after the event phase; unaffected outputs are inherited from the base committed generation. | Recommended P0 resolution; BTS currently contradicts it |
| D-021 | Composite computation reads only own state/config/inputs plus declared Internal Observations. | Consistent foundation |
| D-022 | One public Composite value output has exactly one producer: either one child output exposure or Composite Compute. | Consistent foundation |
| D-023 | Composite public value inputs may fan out through multiple explicit binding records, each with one target. | Recommended P0 resolution; reconcile BCIS/BCCS |
| D-024 | Effects are collected during reducers, committed to an outbox, and executed after commit. Results return through a later transaction. | Consistent foundation; completion/result schema incomplete |
| D-025 | Renderers and external observers see committed generations, never staged intermediate values. | Consistent foundation |
| D-026 | Canonical v0.1 World serialization materializes every descendant instance and persists member maps/provenance. | Recommended P0 resolution; BCIS/BCCS conflict |
| D-027 | Compact storage is an implementation detail; it must expand to the canonical materialized representation without changing IDs or state. | Recommended resolution |
| D-028 | JSON Schema validates document shape; a separate semantic pass validates type relations and cross-references. | Implemented in package design |
| D-029 | Runtime validates live Compute outputs, event payloads, and reducer results before making them committed. | Required runtime contract |
| D-030 | CRDT and online collaboration are adapters/extensions, not requirements of the local core runtime. | Consistent foundation |
| D-031 | JavaScript is the first scripting adapter, not the protocol's required language. | Consistent foundation |
| D-032 | Presentation is renderer-independent and separate from computation. | Consistent foundation |

## 5. Unresolved decisions and required resolutions

This section collects all known material choices that must be settled. “Recommended resolution” is a proposal, not a claim that the existing draft text has already been amended.

### 5.1 P0 — direct contradictions

| ID | Issue | Recommended resolution |
|---|---|---|
| P0-1 | BCIS forbids Composite Compute, Reduce, and own Model State, while BCCS/BCEFS/BRES require them. | A Composite is a first-class Blockie with ordinary state/logic plus template and boundary contracts. Remove BCIS prohibitions. |
| P0-2 | BTS connected inputs read committed outputs; BRES reads staged outputs after reducers. | BRES is authoritative: Compute resolves inputs against the staged transaction generation. BTS defines types and missing/default/error rules only. |
| P0-3 | Composite value/event input fan-out and route shapes conflict. | Each binding record has exactly one target; multiple records may fan out from one public input. Value target input cardinality remains one effective producer; event fan-out is allowed. Separate value routes from event routes. |
| P0-4 | Core allows arbitrary cross-branch connections; BCIS requires Composite public interfaces across scopes. | Define visible scope. Direct connections may target endpoints visible in the same scope. Crossing a Composite boundary requires public Composite ports. Private descendants cannot be addressed from outside. |
| P0-5 | BCIS requires materialized descendants; BCCS allows compact or materialized canonical serialization. | Canonical v0.1 World is materialized. Every descendant is an Instance record; Composite stores member map and provenance. Compact forms are internal optimizations only. |

### 5.2 P1 — canonical schema and ABI mismatches

1. **One Definition shape:** require `kind: atomic | composite`. Remove or derive `container.accepts_children`; it must not independently contradict `kind`.
2. **BTS is the only protocol type language:** replace raw JSON Schema state/config declarations and string `value_type` examples with BTS Type Expressions. JSON Schema remains a document-shape validator, not the canonical type semantics.
3. **One common ABI:** standardize context-object signatures and identical return fields across CORE/BCCS/BCEFS/BRES. Proposed shape:

   ```typescript
   compute({ state, config, inputs, observed }) => outputs

   reduce({ state, config, event }) => ({
     state,
     dispatch,
     emit,
     effects
   })
   ```

   Atomic Blockies receive `observed: {}` and cannot dispatch to Composite child routes. Composite Compute receives only declared observation aliases. Atomic reducers return an empty `dispatch`; Composite reducers may use only declared dispatch routes. Exact required fields and ABI version must be frozen.

4. **One owner for boundary routes:** BCIS owns template nodes, materialization, mapping and provenance. BCCS owns value routes. BCEFS owns event routes. BRES owns global ordering.
5. **Value output producer rule:** each public value output has exactly one producer—one output exposure OR Composite Compute. Event outputs are channels and may have multiple producers, with deterministic route ordering.
6. **Compute dependency invalidation:** for v0.1, the entire Model State and Configuration objects are dependencies. Any change to either invalidates Compute. Field-level tracking is deferred.
7. **Reducer read set:** explicitly retain own state/config/event only for v0.1, or design a snapshot contract before freeze. Examples must not secretly inspect child or connected values.
8. **Effect result contract:** effect declaration must identify capability, input type, whether a result exists, success type, failure shape, completion event input(s) or fire-and-forget policy, and who owns timeout/retry. Host creates request ID/idempotency key. Effects never mutate state directly.
9. **Event identity and boundary privacy:** immutable Event Envelope (event ID, origin, causation, correlation, creator/emitter) is separate from Delivery/Boundary View (route, destination, visible source, redaction). Forwarding never mutates the immutable envelope; external observers see the Composite boundary, not private child IDs.
10. **Document revision publication:** validate operation against revision N; atomically commit N+1; update graphs; stabilize affected outputs; publish a coherent generation tied to N+1. Renderers must not observe new document structure with stale outputs as coherent.
11. **Compute failures:** the normative algorithm must locally catch traps/throws and output validation failures as computation-local errors; they must not be swallowed by a transaction-wide fatal handler.

### 5.3 P2 — important ambiguities

| ID | Issue | Required decision |
|---|---|---|
| P2-1 | World root model | Prefer synthetic World scope with ordered `roots` array; otherwise specify one mandatory built-in Composite WorldRoot. |
| P2-2 | `container.accepts_children` duplicates Definition `kind`. | Remove it or derive it from `kind`. |
| P2-3 | State initialization/config precedence. | Specify definition initial → template initializer/parameter substitution → instance override precedence and whether merge is deep or replacement. |
| P2-4 | Clone/reset behavior for Composite-owned state. | Specify fresh IDs vs preserved IDs, member-map behavior, and which own/child states reset. |
| P2-5 | Decimal canonicalization. | Set negative-zero normalization, scale/precision limits, canonical decimal string, and arithmetic semantics. |
| P2-6 | Deterministic equality. | Define equality for primitives, records, arrays, decimals, bytes, dates, and output comparison. |
| P2-7 | Named type identity/dependencies. | Pin named type ID/version/digest; define alias resolution and cycle prohibition. |
| P2-8 | Definition/module digest. | Define canonical package bytes, hash input, excluded fields, and digest format. |
| P2-9 | Canonical World field names/route records. | Reconcile `blockies` vs `instances`, `root` vs `roots`, and generated relationship IDs in the one canonical schema. |
| P2-10 | Event route IDs and scopes. | Define globally unique vs per-Composite route IDs and deterministic fan-out order. |
| P2-11 | Event envelope transaction ID through boundaries. | Define logical event identity independently from delivery transaction/delivery ID. |
| P2-12 | Compute output failure granularity. | Decide whether any invalid output fails the whole output bundle or only the individual port. |
| P2-13 | Effect outbox guarantee. | Define durable vs process-lifetime outbox, retries, duplicate delivery, idempotency, and crash recovery. |
| P2-14 | Error code namespace. | Standardize stable codes and distinguish schema, semantic, transaction-fatal, computation-local, effect, and renderer errors. |
| P2-15 | BTS-to-JavaScript mapping. | Define runtime representations for Decimal, Bytes, Date, DateTime, Duration, Integer, Unknown, and tagged errors. |
| P2-16 | Runtime generation numbering. | Define initial generation and exactly when generation increments (including document edits and no-op transactions). |

## 6. Recommended canonical model

This is the consolidation target recommended by the audit. It must be applied consistently to the prose, JSON Schema, validator and examples before freeze.

### 6.1 Definition kinds

- **Atomic Definition:** ordinary state/config, ports, optional Compute, optional Reduce, effects, and presentation. No private template children.
- **Composite Definition:** the same ordinary Blockie contract, plus template, child nodes, internal composition, internal connections, and explicit value/event interfaces.

Do not define Composite as a weaker or separate execution species. It is an ordinary Blockie with a materialized internal implementation.

### 6.2 Composite sections

```text
composite
├── parameters / type_parameters                  (BCIS)
├── template
│   ├── nodes
│   ├── composition
│   └── internal_connections
├── value_interface                                (BCCS)
│   ├── input_bindings
│   ├── observations
│   └── output_exposures
└── event_interface                                (BCEFS)
    ├── input_bindings
    ├── child_handlers
    ├── output_exposures
    └── dispatch_routes
```

Every route record has a stable local ID and exactly one target/source. Route materialization is owned by BCIS; value/event meanings are owned by BCCS/BCEFS.

### 6.3 Common execution ABI

```typescript
compute({ state, config, inputs, observed }) => outputs

reduce({ state, config, event }) => ({
  state,
  dispatch,
  emit,
  effects
})
```

The final field shapes, required empty arrays, error behavior, and ABI identifier still need to be specified exactly. All context and return values use BTS type semantics.

### 6.4 State and invalidation

For v0.1, any Model State or Configuration change invalidates the owning Compute. Reducers read the latest staged own state, own config, and delivered event only. Composite Compute additionally receives the exact declared observation map and public value inputs.

### 6.5 World and connection scope

Prefer World as a synthetic root composition scope with multiple ordered top-level Blockies. A Composite alone owns private descendants. A connection crossing Composite scopes must use the public ports at the relevant visible boundary. Private descendants cannot be addressed from outside their owner.

### 6.6 Canonical persistence

Use materialized World serialization:

- Every materialized descendant is a concrete Instance with stable ID.
- Every Composite persists member map, pinned Definition reference, parameters and type arguments.
- Template-generated relationships persist stable IDs and provenance.
- Derived outputs and runtime statuses are not canonical Model State; they may be stored in a separate runtime snapshot/cache.
- Loading validates materialization against the pinned template and never regenerates existing IDs.

## 7. Full specification family

The six draft specifications are reproduced in full in Part II. They remain the source text being consolidated, not proof that every conflict has already been edited away. Use the decision register and audit above when interpreting any clause that is marked as contradictory or pending.

---

# Part II — Full specification drafts


---

## Part II.01 — Core Protocol Specification


## Blockies Protocol Specification

**Version:** 0.1.0-draft  
**Status:** Proposed  
**Specification type:** Core Protocol  
**Primary implementation language:** Rust (non-normative)  
**Scripting interface:** JavaScript / TypeScript (initial runtime)  
**Serialization:** JSON

---

#### About this document

This document is a **specification of the Blockies Protocol**. The protocol is the underlying set of rules, concepts, contracts, and conventions that allow Blockies implementations to represent and execute a World consistently. This specification describes those rules in a form that can guide independent implementations.

The specification is not itself the runtime or the implementation. It defines the expected structures and observable behavior while leaving implementation choices—such as the Rust graph library, JavaScript engine, CRDT library, and renderer framework—outside the protocol unless explicitly stated.

### 1. Introduction

#### 1.1 Abstract

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

#### 1.2 Design principles

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

#### 1.3 Normative terminology

The words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are used as normative requirements.

- **MUST:** An implementation is required to satisfy this requirement.
- **MUST NOT:** An implementation is prohibited from doing this.
- **SHOULD:** An implementation is expected to satisfy this requirement unless a documented reason justifies otherwise.
- **SHOULD NOT:** An implementation is discouraged from doing this unless a documented reason justifies otherwise.
- **MAY:** An implementation can choose whether to support this behavior.

#### 1.4 Scope

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

### 2. Terminology

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

### 3. Protocol Structure

The protocol defines three primary entities and three relationship types.

#### 3.1 Primary entities

```text
Blockies Protocol
│
├── BlockieDefinition
│
├── BlockieInstance
│
└── World
```

#### 3.2 Relationship entities

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

#### 3.3 Definition versus Instance

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

### 4. Identity and Versioning

#### 4.1 Blockie Instance Identity

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

#### 4.2 Definition Identity

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

#### 4.3 Protocol Version

A World MUST declare the protocol version it uses.

```json
{
  "protocol": "blockies/0.1"
}
```

An implementation MUST reject unsupported major protocol versions.

Unknown optional extensions MAY be ignored.

Unknown required features MUST cause validation failure.

#### 4.4 Executable Module Identity

Executable modules MUST be referenced by a content digest.

Example:

```json
{
  "module": "sha256:abcdef..."
}
```

This ensures that an instance does not silently execute different code because a developer published a newer version.

A definition MUST reference immutable executable module contents.

### 5. Blockie Definition

#### 5.1 Structure

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

#### 5.2 Definition Example

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

#### 5.3 Definition Immutability

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

### 6. Data Types

#### 6.1 Supported Types

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

#### 6.2 Numeric Semantics

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

#### 6.3 Date and Time

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

#### 6.4 Structured Types

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

#### 6.5 Type Compatibility

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

### 7. State Model

#### 7.1 State Categories

The protocol distinguishes five categories.

| Category | Description |
|---|---|
| Configuration | User-defined Blockie configuration |
| Model | Persistent information owned by the Blockie |
| Derived | Calculated values |
| View | Presentation-related information |
| Runtime | Temporary execution information |

#### 7.2 Configuration State

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

#### 7.3 Model State

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

#### 7.4 Derived State

Derived State is produced through computation.

Derived outputs MUST NOT be treated as authoritative persistent model state.

A runtime MAY cache computed outputs.

A cached result MUST be invalidated when any of its declared dependencies change.

#### 7.5 View State

View State contains information specific to presentation.

Examples:

- Selected state.
- Hover state.
- Expanded state.
- Tooltip visibility.
- Cursor position.

View State MAY be local or shared, depending on the application.

View State MUST NOT affect computational results unless explicitly represented through an input or configuration.

#### 7.6 Runtime State

Runtime State includes:

- Execution status.
- Pending tasks.
- Computation errors.
- Dirty flags.
- Execution generation.

Runtime State MUST NOT be included in the canonical serialized World.

#### 7.7 State Ownership

An instance MUST own its Model State.

Another Blockie MUST NOT modify an instance's state directly.

State transitions MUST occur through that instance's declared event inputs and reducer.

Initial state restoration and validated document migration are exceptions.

### 8. Ports

#### 8.1 General

Ports are the formal communication interfaces of a Blockie.

Every port MUST have:

- A stable ID within its definition.
- A direction.
- A communication kind.
- A declared type when applicable.

#### 8.2 Port Directions

The protocol defines:

- `input`
- `output`

An input receives information.

An output exposes information.

#### 8.3 Communication Kinds

The protocol defines two port kinds:

- `value`
- `event`

##### Value ports

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

##### Event ports

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

#### 8.4 Port Cardinality

A value input MUST accept at most one incoming connection in v0.1.

An event input MAY accept multiple incoming connections.

An output MAY connect to multiple compatible inputs.

Multiple value inputs MUST NOT be implicitly aggregated.

Aggregation requires an explicit Blockie or declared aggregation extension.

#### 8.5 Unconnected Inputs

An optional value input MAY declare a default.

If a value input is connected, the connected output takes precedence.

If it is unconnected:

- Its default MUST be supplied when defined.
- An optional input without a default MUST be omitted from the computation input object.
- A required input without a connection or default MUST prevent computation.

The runtime MUST NOT silently substitute zero, an empty string, or another arbitrary value.

### 9. Connections

#### 9.1 Structure

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

#### 9.2 Validation

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

#### 9.3 Connection Independence

Connections MUST be independent of composition relationships.

Two Blockies MAY connect even if they belong to different composition branches.

Moving a Blockie MUST NOT automatically destroy its connections.

Deleting an instance MUST remove or invalidate all references to that instance.

### 10. Composition

#### 10.1 Definition

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

#### 10.2 Composition Relationship

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

#### 10.3 Structural Rules

A World MUST have exactly one root Blockie.

The root MUST NOT have a parent.

Every other Blockie MUST have exactly one parent.

Every Blockie MUST be reachable from the root through composition relationships.

Containment cycles MUST NOT exist.

A composition operation MUST preserve these invariants.

#### 10.4 Composite Blockies

A Composite Blockie is an instance containing one or more child instances.

A Composite Blockie MAY expose ports that delegate to ports belonging to its descendants.

These public interfaces MUST be declared explicitly.

#### 10.5 Interface Exposure

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

### 11. Logic Model

The protocol defines three distinct behavior mechanisms.

#### 11.1 Compute

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

#### 11.2 Reduce

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

#### 11.3 Effects

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

### 12. Execution Model

#### 12.1 General

A World is executed by a Runtime.

A Runtime MUST maintain:

- Current Blockie states.
- Resolved input values.
- Computed output values.
- Value dependency graph.
- Event routing graph.
- Runtime statuses.
- Execution transactions.

#### 12.2 Initialization

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

#### 12.3 Value Dependency Graph

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

#### 12.4 Computation Scheduling

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

#### 12.5 Events

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

#### 12.6 Transaction Semantics

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

#### 12.7 Execution Errors

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

#### 12.8 Execution Limits

A Runtime MUST provide configurable resource limits.

At minimum:

- Maximum events per transaction.
- Maximum event cascade depth.
- Maximum computation execution time.
- Maximum memory allocation per execution.
- Maximum serialized input/output size.

Implementations MUST NOT permit a user-defined Blockie to execute without limits.

### 13. JavaScript Runtime ABI

Version 0.1 defines an initial JavaScript runtime ABI.

This is an implementation interface, not a requirement that all future Blockies implementations use JavaScript.

#### 13.1 Compute ABI

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

#### 13.2 Reducer ABI

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

#### 13.3 Execution Isolation

A JavaScript Runtime MUST provide an isolated execution environment.

User-defined code MUST NOT receive unrestricted access to:

- The host filesystem.
- Network interfaces.
- Other application processes.
- Undeclared Blockie state.
- Internal Runtime memory.

Capabilities MUST be granted explicitly.

### 14. Presentation Model

#### 14.1 General

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

#### 14.2 Renderer Responsibilities

A Renderer is responsible for:

- Converting Blockie information into visual representations.
- Displaying current state and computed outputs.
- Rendering input controls.
- Translating user interactions into protocol commands or events.
- Applying layout information.
- Managing local presentation state.

A Renderer MUST NOT independently modify Blockie model state.

User interactions MUST be translated into authorized protocol operations.

#### 14.3 Renderer Independence

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

### 15. World Serialization

#### 15.1 World Structure

A World MUST contain:

- Protocol version.
- World identity.
- Root Blockie ID.
- Required definition references.
- Blockie instances.
- Composition relationships.
- Connections.
- Interface exposures.

#### 15.2 Example

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

#### 15.3 Serialization Rules

The World MUST be serializable without runtime caches or transient statuses.

Definition references MUST identify exact versions and digests.

An implementation MUST NOT silently replace unavailable definitions with unrelated definitions.

Large binary assets SHOULD be referenced through content-addressed external resources rather than embedded directly into ordinary Blockie state.

The protocol's serialized values MUST NOT contain functions, executable closures, or runtime pointers.

### 16. Persistence and Collaboration

#### 16.1 Local Execution

A conforming Runtime MUST be capable of operating without a network connection.

#### 16.2 Collaboration Compatibility

The document structure MUST support independent synchronization adapters.

The protocol does not mandate a CRDT implementation.

A synchronization adapter MUST preserve:

- Instance identity.
- Composition validity.
- Connection validity.
- Definition references.
- State schema validity.

#### 16.3 Shared and Local Information

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

#### 16.4 Conflict Handling

The protocol does not define a universal conflict-resolution algorithm in v0.1.

A host MUST define how concurrent commands against shared state are accepted and ordered.

A synchronization system MUST NOT assume that successful CRDT merging automatically enforces application-level authorization or business rules.

### 17. Extensions

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

### 18. Versioning and Migration

#### 18.1 Protocol Versioning

Protocol versions follow:

```text
MAJOR.MINOR
```

Major versions indicate incompatible protocol changes.

Minor versions introduce backward-compatible capabilities.

#### 18.2 Definition Versioning

Definitions SHOULD use semantic versioning.

Existing Worlds MUST continue referencing their declared definition version until explicitly migrated.

#### 18.3 Migration

A migration MUST be explicit.

A migration SHOULD specify:

- Source definition version.
- Destination definition version.
- Required state transformation.
- Configuration transformation.
- Port compatibility changes.
- Potential connection changes.

A migration MUST produce a valid instance under the destination schema.

### 19. Security Requirements

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

### 20. Conformance Requirements

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

### Appendix A. Reference Example: Multiply Blockie

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

### Appendix B. Reference Example: Counter Blockie

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

### Appendix C. Deferred Protocol Proposals

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


---

## Part II.02 — Blockies Type System Specification (BTS)


## Blockies Type System Specification

**Specification:** Blockies Type System (BTS)  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Parent specification:** Blockies Protocol v0.1.0-draft  
**Scope:** Type expressions, values, compatibility, generics, and port validation

---

#### 1. Abstract

The Blockies Type System (BTS) defines the values that may exist in a Blockies World and the rules governing how those values move between Blockies.

BTS specifies:

- Primitive and composite types.
- Type declarations and named types.
- Generic type parameters and specialization.
- Type assignability and compatibility.
- Runtime validation of values.
- Validation rules for value ports and event ports.
- Standard type errors.

BTS is language-neutral. It is not defined in terms of TypeScript, Rust, JavaScript, or a particular serialization library. Implementations may use those languages and libraries internally, but their externally observable type behavior MUST follow this specification.

For the portions of the parent Blockies Protocol that concern type declarations and value validation, this specification is normative. In particular, BTS type expressions replace the illustrative raw JSON Schema fragments in the parent draft. JSON Schema MAY be used as an implementation or interchange adapter, but it is not the canonical BTS type language.

#### 2. Normative terminology

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

- **Type expression:** A declaration describing a set of valid values.
- **Value:** A concrete datum carried by a state field or port.
- **Validation:** Determining whether a value conforms to a type expression.
- **Assignability:** Determining whether every value allowed by one type can safely be used where another type is expected.
- **Specialization:** Replacing generic type parameters with concrete types.
- **Type inference:** Determining generic type arguments from declared connections or context.
- **Nullable:** A type that explicitly permits `null`.
- **Optional property/input:** A field or input that may be absent.

#### 3. Design principles

1. Types MUST have the same meaning across conforming implementations.
2. Type declarations MUST be serializable and inspectable without executing user code.
3. Value validation MUST be possible at runtime.
4. A connection MUST be checked directionally: the source output type must be assignable to the target input type.
5. No implicit string parsing or lossy numeric conversion is permitted.
6. Missing values and `null` MUST remain distinct.
7. Values crossing protocol boundaries MUST behave as immutable snapshots.
8. A type system implementation MUST fail closed: an unknown or unsupported type MUST NOT be treated as an unrestricted type.
9. Generics MUST be resolved before a Blockie instance is executed.
10. Type declarations MUST NOT depend on a particular renderer or scripting language.

#### 4. Type expression model

A type expression describes the set of values accepted at a boundary. BTS defines primitive types, composite types, and type references.

A definition MAY declare named types and generic type parameters. Port declarations, state schemas, and configuration schemas MAY refer to these types.

##### 4.1 Canonical type expression forms

The following JSON-like notation is normative in meaning. A production schema MAY use a more compact encoding, provided it preserves these semantics.

Primitive:

```json
{ "kind": "primitive", "name": "string" }
```

Array:

```json
{
  "kind": "array",
  "items": { "kind": "primitive", "name": "number" }
}
```

Record:

```json
{
  "kind": "record",
  "properties": {
    "name": { "kind": "primitive", "name": "string" },
    "age": { "kind": "primitive", "name": "integer" }
  },
  "required": ["name"],
  "additional_properties": false
}
```

Union:

```json
{
  "kind": "union",
  "variants": [
    { "kind": "primitive", "name": "string" },
    { "kind": "primitive", "name": "integer" }
  ]
}
```

Generic parameter:

```json
{ "kind": "parameter", "name": "T" }
```

Named type:

```json
{ "kind": "named", "name": "org.example.Customer" }
```

##### 4.2 Type expression validity

A type expression MUST be structurally valid before it may be used in a Definition.

An implementation MUST reject:

- Unknown primitive names.
- Unknown or out-of-scope type parameters.
- Duplicate record property names.
- Duplicate enum values.
- Empty unions.
- Invalid numeric constraints.
- Invalid recursive references.
- A type expression that uses an unsupported extension without declaring that extension as required.

Implementations SHOULD report the path to the invalid part of the type expression.

#### 5. Primitive types

BTS v0.1 defines the following primitive types.

| Type | Meaning | Wire representation |
|---|---|---|
| `null` | Explicit absence of a value | JSON `null` |
| `boolean` | Logical true or false | JSON boolean |
| `integer` | Signed safe integer | JSON integer number |
| `number` | Finite IEEE 754 binary64 number | JSON number |
| `decimal` | Exact base-10 decimal | Canonical decimal string |
| `string` | Unicode text | JSON string |
| `bytes` | Binary data | Base64url string |
| `date` | Calendar date | `YYYY-MM-DD` string |
| `time` | Time of day without a date or timezone | `HH:mm:ss[.fraction]` string |
| `datetime` | Absolute timestamp/instant | RFC 3339 string with offset |
| `duration` | Time span in milliseconds | Safe integer JSON number |
| `unknown` | A value whose concrete type is not yet known | Any BTS-serializable value |
| `never` | No possible values | No valid wire value |

##### 5.1 `null`

`null` is a concrete value. It is not equivalent to an omitted property, an unresolved input, or a missing output.

A type permits null only when it explicitly includes `null`, normally through a union such as `string | null`.

##### 5.2 `boolean`

A Boolean value MUST be exactly `true` or `false`.

Strings such as `"true"`, numbers such as `1`, and other truthy/falsy values MUST NOT be accepted as Boolean values.

##### 5.3 `integer`

An Integer MUST be a whole number within the JavaScript safe integer range:

`-(2^53 - 1) <= value <= (2^53 - 1)`

An Integer type MAY additionally declare `minimum` and `maximum` inclusive constraints. Both constraints MUST be safe integers, and `minimum` MUST NOT exceed `maximum`.

This limit is chosen so that the integer has the same exact value in common JSON implementations, including JavaScript implementations.

A future extension MAY define wider integer types with explicit wire encodings.

##### 5.4 `number`

A Number MUST be a finite IEEE 754 binary64 value. NaN, positive infinity, and negative infinity are invalid. Negative zero MUST be treated as numerically equal to zero and serialized as `0`.

The JSON representation MUST be a JSON number. Implementations MUST NOT silently accept numeric strings. A Number type MAY additionally declare finite inclusive `minimum` and `maximum` constraints. `minimum` MUST NOT exceed `maximum`.

##### 5.5 `decimal`

Decimal represents exact base-10 quantities and is intended for values such as money.

The wire representation MUST be a string using the restricted decimal syntax matching `^-?(0|[1-9][0-9]*)(\.[0-9]+)?$`. Exponent notation and a leading plus sign MUST NOT be used in v0.1. Negative zero MUST be normalized to `"0"`.

Examples:

```text
"0"
"12"
"12.50"
"-0.25"
```

A Decimal type MAY impose `precision` and `scale` constraints. Precision is the maximum total number of significant decimal digits. Scale is the maximum number of digits after the decimal point.

For example:

```json
{
  "kind": "primitive",
  "name": "decimal",
  "precision": 12,
  "scale": 2
}
```

A value violating the declared precision or scale MUST fail validation. Precision counts all base-10 digits, excluding the sign and decimal point. Scale counts digits after the decimal point. Implementations MUST NOT round or truncate a value during validation.

Implementations MUST preserve trailing fractional zeroes because scale can be meaningful in financial and measurement applications. For example, `"12.50"` MUST NOT be rewritten as `"12.5"` during validation or serialization. Decimal comparison is numeric, while the declared scale remains available as representation metadata.

##### 5.6 `string`

String is a sequence of Unicode scalar values. BTS does not implicitly normalize Unicode text.

A String type MAY specify `min_length` and `max_length`. Length is measured in Unicode scalar values, not UTF-8 bytes or UTF-16 code units. A string containing an unpaired UTF-16 surrogate MUST be rejected because it is not a sequence of Unicode scalar values.

Pattern-based validation is deferred from the core v0.1 type system because regular-expression dialects differ across runtimes. A future extension MAY define a portable pattern dialect. Format-specific string validation MUST use a namespaced, explicitly declared format extension; implementations MUST NOT silently interpret an unknown format.

##### 5.7 `bytes`

Bytes represents arbitrary binary data.

Its JSON wire representation MUST be an unpadded base64url-encoded string without whitespace. Implementations MUST validate the encoding before accepting the value.

##### 5.8 `date`

Date represents a calendar date in the proleptic Gregorian calendar.

The wire representation MUST use `YYYY-MM-DD`, with a four-digit year from `0001` through `9999`, and MUST represent a valid calendar date.

A Date is not a timestamp and MUST NOT be interpreted as midnight UTC.

##### 5.9 `time`

Time represents a time of day without a date or timezone.

The wire representation MUST use `HH:mm:ss` with an optional fractional-second component. Hours MUST be `00` through `23`; minutes and seconds MUST be `00` through `59`. Leap seconds are not supported in v0.1. A Time MUST NOT contain a UTC offset.

##### 5.10 `datetime`

DateTime represents an absolute instant.

The wire representation MUST be an RFC 3339 timestamp containing `Z` or an explicit numeric offset.

Two DateTime values representing the same instant with different offsets are semantically equal as instants. An implementation MAY preserve the original textual offset for display, but comparisons MUST use instant semantics. Leap-second notation is not supported in v0.1.

##### 5.11 `duration`

Duration represents a time span as a signed safe integer number of milliseconds.

Fractional milliseconds are not supported in v0.1.

##### 5.12 `unknown` and `never`

`unknown` is the safe top type. Every valid BTS value is assignable to `unknown`. A value of type `unknown` MUST be narrowed or validated before it is used where a more specific type is required.

`never` is the bottom type. No concrete value validates as `never`. It is useful for representing impossible branches and exhaustive generic logic.

BTS MUST NOT define an unrestricted `any` type. Unlike `unknown`, `any` would allow unvalidated values to bypass type safety.

#### 6. Composite types

##### 6.1 Array

An Array is an ordered sequence of values sharing one element type.

```json
{
  "kind": "array",
  "items": { "kind": "primitive", "name": "number" },
  "min_items": 0,
  "max_items": 1000
}
```

Optional constraints:

- `min_items`
- `max_items`
- `unique_items`

`min_items` MUST NOT exceed `max_items` when both are present.

Every element MUST validate against `items`.

Arrays are immutable snapshots at protocol boundaries. Runtime implementations MAY use mutable internal storage only if mutations are not observable by other Blockies.

##### 6.2 Tuple

A Tuple is a fixed-length ordered sequence whose positions may have different types.

```json
{
  "kind": "tuple",
  "items": [
    { "kind": "primitive", "name": "string" },
    { "kind": "primitive", "name": "integer" }
  ]
}
```

The value MUST have exactly the declared number of elements in v0.1. Optional or variadic tuple elements are deferred.

##### 6.3 Record

A Record is an object with declared properties. If `additional_properties` is omitted, it defaults to `false` (a closed record).

```json
{
  "kind": "record",
  "properties": {
    "id": { "kind": "primitive", "name": "string" },
    "name": { "kind": "primitive", "name": "string" },
    "nickname": { "kind": "primitive", "name": "string" }
  },
  "required": ["id", "name"],
  "additional_properties": false
}
```

Rules:

- Properties listed in `required` MUST exist.
- Properties not listed in `required` MAY be omitted.
- An omitted property is different from a property explicitly set to `null`.
- If a property is present, its value MUST validate against its declared type.
- When `additional_properties` is `false`, undeclared properties MUST be rejected.
- When `additional_properties` is a type expression, every undeclared property value MUST validate against that expression.

Records use structural typing. Their identity does not depend on the order of properties.

##### 6.4 Map

A Map is a collection of string keys mapped to values of one declared type.

```json
{
  "kind": "map",
  "values": { "kind": "primitive", "name": "decimal" }
}
```

The wire representation is a JSON object. Every key MUST be a string and every value MUST validate against the declared value type.

Map keys are not required to be declared in advance.

##### 6.5 Union

A Union represents a value that may conform to one of several alternative types.

```json
{
  "kind": "union",
  "variants": [
    { "kind": "primitive", "name": "string" },
    { "kind": "primitive", "name": "integer" }
  ]
}
```

A value validates against a Union when it validates against at least one variant.

A Union SHOULD use structurally distinguishable alternatives. Tagged/discriminated unions are RECOMMENDED when alternatives may overlap. If more than one variant accepts a value, validation still succeeds; the Runtime MUST NOT infer a specific variant unless the Union is discriminated or the result is otherwise unambiguous.

Example:

```json
{
  "kind": "union",
  "discriminator": "kind",
  "variants": [
    {
      "kind": "record",
      "properties": {
        "kind": { "kind": "literal", "value": "success" },
        "value": { "kind": "primitive", "name": "number" }
      },
      "required": ["kind", "value"],
      "additional_properties": false
    },
    {
      "kind": "record",
      "properties": {
        "kind": { "kind": "literal", "value": "failure" },
        "message": { "kind": "primitive", "name": "string" }
      },
      "required": ["kind", "message"],
      "additional_properties": false
    }
  ]
}
```

##### 6.6 Literal

A Literal type accepts exactly one value. A source Literal is assignable to an identical target Literal; otherwise it is assignable only to a compatible broader type.

```json
{ "kind": "literal", "value": "success" }
```

Literal values MUST be valid BTS scalar values in v0.1. A Literal is assignable to its corresponding primitive type.

##### 6.7 Enum

An Enum is a named finite set of scalar values.

```json
{
  "kind": "enum",
  "base": "string",
  "values": ["draft", "published", "archived"]
}
```

Each value MUST conform to the declared base primitive. Enum values MUST be unique.

An Enum is assignable to its base primitive. A base primitive is not automatically assignable to the Enum. An Enum is assignable to another Enum with the same base when every value in the source Enum is present in the target Enum.

##### 6.8 Named types and aliases

A Definition MAY declare reusable named types.

```json
{
  "types": {
    "CustomerId": {
      "kind": "primitive",
      "name": "string",
      "min_length": 1
    },
    "Customer": {
      "kind": "record",
      "properties": {
        "id": { "kind": "named", "name": "CustomerId" },
        "display_name": { "kind": "primitive", "name": "string" }
      },
      "required": ["id", "display_name"],
      "additional_properties": false
    }
  }
}
```

A named alias resolves to its underlying type for validation and assignability. The name remains available for documentation and tooling.

Recursive named types are deferred from v0.1. Implementations MUST reject recursive type definitions unless a future extension explicitly enables them with defined depth and cycle rules.

##### 6.9 Deferred composite types

The following are not core types in v0.1:

- Function and closure types.
- Stream and observable types.
- Mutable references and pointers.
- Arbitrary class instances.
- Native platform handles.
- Unbounded recursive types.
- Resource references such as file handles or live database connections.

They MAY be introduced by future extensions with explicit serialization and execution semantics.

#### 7. Optionality and nullability

Optionality and nullability are different.

| Declaration | Meaning |
|---|---|
| Required `string` property | Property must exist and contain a string |
| Optional `string` property | Property may be absent; if present, it must be a string |
| Required `string | null` property | Property must exist; it may contain a string or `null` |
| Optional `string | null` property | Property may be absent, a string, or `null` |

Port optionality follows the same distinction:

- `required: true` means the input must resolve from a connection or default.
- A type union containing `null` means the resolved value may be `null`.
- `required: false` means an unconnected input may be omitted.

The runtime MUST NOT convert an omitted input into `null`.

#### 8. Type compatibility and assignability

##### 8.1 Directional rule

A connection from output type `S` to input type `T` is valid only when:

`S is assignable to T`

In other words, every value that the source may legally produce must be accepted by the target.

Compatibility is directional. The fact that `T` is assignable to `S` does not make the connection valid in the opposite direction.

##### 8.2 Core assignability rules

Let `S <: T` mean that `S` is assignable to `T`.

1. A type is assignable to itself.
2. A Literal is assignable to an identical target Literal.
3. An Enum is assignable to a target Enum with the same base when the source value set is a subset of the target value set.
4. `never` is assignable to every type.
5. Every concrete BTS type is assignable to `unknown`.
6. `unknown` is assignable only to `unknown` (and must be narrowed before use as a more specific type).
7. `integer` is assignable to `number`.
8. `number` is not assignable to `integer`.
9. `decimal` is not implicitly assignable to `number` or `integer`.
10. A Literal is assignable to its matching primitive type.
11. An Enum is assignable to its base primitive.
12. A source Union is assignable to a target type only when every source variant is assignable to that target.
13. A source type is assignable to a target Union when it is assignable to at least one target variant.
14. Arrays and Maps are covariant in their element/value type because protocol values are immutable snapshots.
15. Tuples are assignable to arrays when every tuple element is assignable to the array element type.
16. Arrays are not assignable to fixed-length tuples.
17. Records are structurally assignable under the rules below.

##### 8.3 Record assignability

A source Record `S` is assignable to a target Record `T` when:

- Every required property of `T` exists in `S` and is guaranteed to be present.
- For every property declared by `T`, the corresponding source property type is assignable to the target property type when the source property may be present.
- A source property that is optional cannot satisfy a required target property.
- If `T` is closed (`additional_properties: false`), the source MUST NOT be capable of supplying undeclared properties that would be rejected by `T`.
- If `T` allows additional properties of type `U`, every additional source property type MUST be assignable to `U`.

An implementation MUST use the declared required/optional status; it MUST NOT infer that a property is required merely because it appears in `properties`.

##### 8.4 No implicit conversions

The following conversions MUST NOT happen implicitly:

- String to Number or Integer.
- Number to Integer.
- Number or Integer to Decimal.
- Decimal to Number or Integer.
- Date to DateTime.
- DateTime to Date.
- Boolean to Number or String.
- Enum base value to the Enum.

A conversion Blockie or explicitly declared conversion operation is required.

##### 8.5 Type constraints

Refinement constraints such as `minimum`, `maximum`, `min_items`, `max_items`, `min_length`, `max_length`, `precision`, and `scale` are part of the type.

A source refinement is assignable to a target refinement only when the source guarantees the target's constraints. For numeric minimum/maximum constraints, the source range MUST be a subset of the target range. For string and array length constraints, the source length range MUST be a subset of the target range. If the target requires unique array items, the source MUST also guarantee uniqueness. For Decimal, the source precision and scale limits MUST be no less restrictive than the target limits.

Example:

- `integer` is assignable to `number`.
- `number` constrained to `[0, 100]` is assignable to `number` constrained to `[0, 1000]`.
- `number` constrained to `[0, 1000]` is not generally assignable to `number` constrained to `[0, 100]`.

If an implementation cannot prove a refinement relationship statically, it MUST reject the connection or require an explicit runtime validation/conversion Blockie. It MUST NOT assume compatibility.

#### 9. Generic types

##### 9.1 Purpose

Generics allow a Blockie Definition to operate on values of different types without duplicating the Definition.

Examples include:

- Identity Blockie: `T -> T`.
- List Blockie: `Array<T> -> Array<T>`.
- Pair Blockie: `(T, U) -> Pair<T, U>`.
- Filter Blockie: `Array<T> -> Array<T>`.

##### 9.2 Type parameter declaration

A generic Definition MAY declare type parameters.

```json
{
  "type_parameters": [
    {
      "name": "T",
      "constraint": { "kind": "primitive", "name": "unknown" }
    }
  ]
}
```

A type parameter MAY declare:

- `name`: unique identifier within the Definition.
- `constraint`: required upper bound.
- `default`: type used when no explicit or inferred argument is available.

A parameter without a default MUST be resolved before instance validation succeeds.

##### 9.3 Generic use

A generic type parameter is referenced in type expressions:

```json
{ "kind": "parameter", "name": "T" }
```

Example generic Identity Definition:

```json
{
  "id": "org.blockies.core.identity",
  "version": "1.0.0",
  "type_parameters": [
    { "name": "T", "constraint": { "kind": "primitive", "name": "unknown" } }
  ],
  "ports": [
    {
      "id": "input",
      "direction": "input",
      "kind": "value",
      "value_type": { "kind": "parameter", "name": "T" },
      "required": true
    },
    {
      "id": "output",
      "direction": "output",
      "kind": "value",
      "value_type": { "kind": "parameter", "name": "T" }
    }
  ]
}
```

##### 9.4 Instance specialization

A generic instance MAY provide explicit type arguments.

```json
{
  "id": "identity_001",
  "definition": {
    "id": "org.blockies.core.identity",
    "version": "1.0.0"
  },
  "type_arguments": {
    "T": { "kind": "primitive", "name": "string" }
  },
  "config": {},
  "state": {}
}
```

Once specialized, all ports and schemas MUST be evaluated using the substituted types.

##### 9.5 Type inference

A Runtime MAY infer generic arguments from connected ports.

Inference order:

1. Explicit instance type arguments take precedence.
2. Otherwise, infer from statically declared source output types and other available type context.
3. If inference cannot resolve a parameter, use its declared default if one exists.
4. If a required parameter remains unresolved, instance validation MUST fail.

Inference MUST NOT depend on sampling an arbitrary runtime value when a declared source type is available.

If a parameter appears at multiple inference sites, v0.1 inference requires the candidates to resolve to the same normalized type expression. `integer` and `number`, for example, are not treated as identical inference candidates even though `integer` is assignable to `number`. If candidates conflict, inference MUST fail with a generic inference error. The Runtime MUST NOT silently choose `unknown` or widen to a common supertype to hide a conflict. Authors MAY provide an explicit type argument to resolve the ambiguity.

##### 9.6 Constraints

A type argument `A` satisfies a parameter constraint `C` when `A` is assignable to `C`.

Example:

```json
{
  "type_parameters": [
    {
      "name": "T",
      "constraint": { "kind": "primitive", "name": "number" }
    }
  ]
}
```

This permits `integer` and `number` as type arguments, but not `string` or `decimal`.

##### 9.7 Generic variance

Generic parameters declared by user-defined generic Definitions are invariant in v0.1.

Built-in immutable containers have specified variance:

- `Array<T>` is covariant in `T`.
- `Map<T>` is covariant in `T`.
- `Tuple<T1, ...>` is covariant in each element.

User-defined covariance and contravariance annotations are deferred. This restriction avoids unsound connections while the type system is young.

#### 10. Port type declarations

##### 10.1 Value input

```json
{
  "id": "price",
  "direction": "input",
  "kind": "value",
  "value_type": { "kind": "primitive", "name": "decimal" },
  "required": true,
  "default": "0.00"
}
```

The default MUST validate against `value_type`.

##### 10.2 Value output

```json
{
  "id": "total",
  "direction": "output",
  "kind": "value",
  "value_type": { "kind": "primitive", "name": "decimal" }
}
```

A Compute invocation MUST return a value for every declared value output. If no meaningful value exists, the output type MUST explicitly allow `null`, or the computation MUST report an error/unavailable status through the Runtime. Missing output keys MUST be treated as a contract violation.

##### 10.3 Event input

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

##### 10.4 Event output

```json
{
  "id": "vote_accepted",
  "direction": "output",
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

Event payloads use the same type system as value ports. Event compatibility is checked using the same directional assignability rule.

#### 11. Port validation lifecycle

A conforming Runtime MUST validate types at the following boundaries.

##### 11.1 Definition validation

When loading or registering a Definition, the implementation MUST validate:

- Port IDs are unique within the Definition.
- Port directions and kinds are valid.
- Every port has the required type declaration.
- All named types and generic parameters resolve.
- Generic constraints and defaults are valid.
- Input defaults conform to their declared types.
- State and configuration schemas are valid.
- Logic exports and referenced modules are declared.

##### 11.2 Instance validation

When creating or loading an instance, the implementation MUST:

- Resolve the exact Definition version and digest.
- Resolve generic type arguments.
- Substitute type parameters.
- Validate configuration against the specialized configuration schema.
- Validate model state against the specialized state schema.

##### 11.3 Connection validation

When creating or loading a connection, the implementation MUST:

1. Resolve the source and target instances.
2. Resolve their specialized Definitions.
3. Resolve the referenced ports.
4. Verify output-to-input direction.
5. Verify matching communication kinds.
6. Verify source type assignability to target type.
7. Verify input cardinality.

An invalid connection MUST be rejected before the World is executed.

##### 11.4 Input resolution

Before invoking Compute, each input MUST be resolved as follows:

1. If connected, use the current committed value from the source output.
2. Otherwise, if a default exists, use the default.
3. Otherwise, if the input is optional, omit the input key.
4. Otherwise, mark the Blockie as blocked because a required input is unresolved.

A connected source that is in an error or unavailable state MUST NOT silently fall back to the target's default.

Resolved values MUST be validated against the target input type before invocation.

##### 11.5 Compute output validation

After Compute returns, the Runtime MUST:

- Verify that all declared value output keys are present.
- Reject undeclared output keys.
- Validate every returned value against its output type.
- Reject non-serializable values.
- Publish outputs only after successful validation.

A computation that returns an invalid output MUST be marked as a computation error. Invalid output values MUST NOT be propagated.

##### 11.6 Event validation

An event payload MUST be validated against the source event output payload type before emission and against the target event input payload type before delivery.

An invalid event MUST be rejected and MUST NOT invoke a reducer.

##### 11.7 Reducer result validation

After Reduce returns, the Runtime MUST:

- Validate the complete next state against the specialized state schema.
- Validate every emitted event against its declared event output payload type.
- Verify that every requested effect is declared by the Definition.
- Reject undeclared emitted ports and effects.

If validation fails, the originating transaction MUST NOT commit the invalid state transition.

##### 11.8 Value immutability

Values passed into or returned from Blockie logic MUST behave as immutable snapshots.

A Runtime MUST prevent one Blockie's mutation of an input object from changing another Blockie's state or output.

An implementation MAY use copy-on-write, persistent data structures, or other optimizations while preserving this observable behavior.

#### 12. Validation errors

Implementations SHOULD use stable machine-readable error codes.

| Code | Meaning |
|---|---|
| `TYPE_UNKNOWN` | Unknown or unsupported type expression |
| `TYPE_INVALID_SCHEMA` | Malformed type declaration |
| `TYPE_MISMATCH` | Value does not conform to expected type |
| `TYPE_NOT_ASSIGNABLE` | Source type cannot connect to target type |
| `TYPE_CONSTRAINT_VIOLATION` | Value violates a refinement constraint |
| `TYPE_GENERIC_UNRESOLVED` | Generic parameter could not be resolved |
| `TYPE_GENERIC_CONFLICT` | Generic inference produced conflicting constraints |
| `PORT_NOT_FOUND` | Referenced port does not exist |
| `PORT_DIRECTION_INVALID` | Connection direction is invalid |
| `PORT_KIND_MISMATCH` | Value and event ports are incompatible |
| `PORT_CARDINALITY_EXCEEDED` | Input has too many incoming connections |
| `PORT_REQUIRED_UNRESOLVED` | Required input has no connection or default |
| `PORT_OUTPUT_MISSING` | Compute omitted a declared output |
| `PORT_OUTPUT_UNDECLARED` | Compute returned an undeclared output |
| `EVENT_PAYLOAD_INVALID` | Event payload failed validation |
| `STATE_INVALID` | State failed schema validation |
| `CONFIG_INVALID` | Configuration failed schema validation |

An error SHOULD include:

- Error code.
- World ID.
- Blockie instance ID, when applicable.
- Port ID or schema path, when applicable.
- Expected type.
- Actual type or a safe description of the invalid value.

Implementations SHOULD avoid including sensitive payload contents in error messages or logs.

#### 13. Conformance tests

A BTS implementation SHOULD provide automated tests for at least the following cases.

##### 13.1 Primitive validation

| Input | Expected type | Result |
|---|---|---|
| `true` | boolean | Valid |
| `1` | integer | Valid |
| `1.5` | integer | Invalid |
| `1.5` | number | Valid |
| `"1.5"` | number | Invalid |
| `"1.50"` | decimal | Valid |
| `null` | string | Invalid |
| `null` | `string | null` | Valid |
| `"2026-02-30"` | date | Invalid |

##### 13.2 Assignability

| Source | Target | Expected |
|---|---|---|
| integer | number | Assignable |
| number | integer | Not assignable |
| integer | unknown | Assignable |
| unknown | integer | Not assignable |
| `"ready"` literal | string | Assignable |
| `string` | enum(`"ready"`, `"done"`) | Not assignable |
| Array<integer> | Array<number> | Assignable |
| Array<number> | Array<integer> | Not assignable |

##### 13.3 Optionality and nullability

Tests MUST verify that:

- An omitted optional property is accepted.
- An omitted required property is rejected.
- A present `null` is accepted only by a nullable type.
- An optional nullable property accepts omission, `null`, or a valid non-null value.
- An omitted input is not automatically converted to `null`.

##### 13.4 Generic inference

Tests MUST verify that:

- A generic Identity Blockie infers `T = string` from a string-producing connection.
- A generic Identity Blockie infers `T = number` from a number-producing connection.
- An explicit type argument is respected.
- A type argument violating a constraint is rejected.
- Conflicting generic constraints fail rather than silently becoming `unknown`.

##### 13.5 Port validation

Tests MUST verify that:

- An incompatible connection is rejected.
- A missing required input blocks computation.
- A valid default resolves an unconnected input.
- A connected upstream error does not trigger default fallback.
- Invalid Compute outputs are not propagated.
- Invalid event payloads do not reach reducers.
- Invalid reducer state does not commit.

#### 14. Open issues and deferred decisions

The following topics require additional design before a stable release:

1. A fully formal, cross-language regular-expression dialect.
2. Canonical decimal normalization and comparison rules.
3. Recursive named types and recursion limits.
4. Resource-reference types for files, assets, and external resources.
5. Stream and observable types.
6. User-defined generic variance.
7. Generic inference across composite Blockie boundaries.
8. Standardized type guard and runtime narrowing operations.
9. Schema evolution and state migration rules for changed named types.
10. A canonical JSON encoding profile and conformance corpus.

---

#### Appendix A. Example generic List passthrough Blockie

Definition concept:

```text
ListPassthrough<T>

Input:
    items: Array<T>

Output:
    items: Array<T>

Behavior:
    output.items = input.items
```

Its definition can be reused for arrays of strings, numbers, records, or other valid types without changing its logic.

#### Appendix B. Example typed Dataset

```json
{
  "kind": "record",
  "properties": {
    "labels": {
      "kind": "array",
      "items": { "kind": "primitive", "name": "string" }
    },
    "values": {
      "kind": "array",
      "items": { "kind": "primitive", "name": "number" }
    },
    "unit": { "kind": "primitive", "name": "string" }
  },
  "required": ["labels", "values", "unit"],
  "additional_properties": false
}
```

A chart Blockie can accept this Dataset type regardless of whether the data originates from spreadsheet cells, a poll, or another data-processing Blockie.

#### Appendix C. Relationship to other type systems

BTS borrows useful concepts from structural type systems, generic programming, and schema validation systems. It does not claim compatibility with TypeScript's complete type system or with the complete JSON Schema specification.

A TypeScript SDK MAY generate TypeScript types from BTS definitions. Generated TypeScript types are a developer convenience; runtime validation MUST still be performed according to BTS.

A Runtime MAY use JSON Schema or another validator internally, provided that all BTS-specific semantics—including decimal, date/time, assignability, generic specialization, and port validation—are preserved.

---

**End of Blockies Type System Specification v0.1.0-draft**


---

## Part II.03 — Composite Instantiation Specification (BCIS)


## Blockies Composite Instantiation Specification

**Specification ID:** BCIS  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Depends on:** Blockies Protocol Specification v0.1.0-draft; Blockies Type System Specification v0.1.0-draft  
**Serialization:** JSON  

---

#### 1. Abstract

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

#### 2. Normative language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

- **MUST / MUST NOT:** absolute requirements for conformance.
- **SHOULD / SHOULD NOT:** recommended behavior, with deviations requiring a documented reason.
- **MAY:** optional behavior.

#### 3. Scope and relationship to other specifications

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

#### 4. Terminology

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

#### 5. Core design principles

##### 5.1 Definitions are blueprints, not live objects

A Composite Definition MUST describe reusable structure. It MUST NOT contain state belonging to a particular runtime instantiation.

##### 5.2 Every instantiation is independent

Each instantiation MUST create fresh identities for the Composite Instance and all of its template-created descendants.

Two instantiations of the same definition MUST NOT share mutable child state, runtime caches, pending effects, or instance identities.

##### 5.3 Templates are immutable and version-pinned

A Composite Instance MUST reference an exact Composite Definition version and content digest. A published definition MUST NOT be modified in place.

##### 5.4 Composition defines ownership

A child instance MUST have exactly one structural parent, except for a World root. A child MUST NOT be owned by two Composite Instances.

##### 5.5 Internal implementation is encapsulated

External Blockies MUST interact with a Composite through its declared public ports. They MUST NOT connect directly to private descendant ports.

##### 5.6 Reuse means fresh instantiation, not shared state

Instantiating the same template multiple times creates multiple independent structures. A template is not a singleton and does not imply shared children.

---

### Part I — Composite Definitions and Templates

#### 6. Definition kinds

A Blockie Definition MUST declare its implementation kind:

- `atomic`: behavior is provided by the definition's logic implementation.
- `composite`: behavior and structure are provided by a template of child Blockies.

An atomic definition MAY declare compute, reduce, and effects according to the Core Protocol.

A composite definition MUST declare a template. In v0.1, a composite definition MUST NOT also declare executable `compute` or `reduce` logic. Its behavior is produced by its children and explicit boundary exposures.

A composite MAY declare presentation metadata for its outer representation.

#### 7. Composite Definition structure

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

#### 8. Template-local identities

Each Template Node MUST have a `node_id` that is unique within the exact Composite Definition version.

Template Node IDs:

- MUST be stable within a published definition version.
- MUST NOT be treated as runtime Blockie IDs.
- MUST NOT be used to address a child from outside its owning Composite.
- SHOULD remain unchanged across compatible definition revisions when they represent the same logical child.

A template connection and template composition edge MUST also have a stable local ID within the template.

The pair `(composite_instance_id, template_local_id)` identifies a template element within one materialized Composite Instance. The runtime MAY represent this pair internally as a structured key rather than a concatenated string.

#### 9. Template nodes

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

#### 10. Template expressions

Templates MUST be declarative in v0.1. A template MUST NOT execute arbitrary JavaScript, Rust, or another general-purpose programming language to create child configuration or state.

The v0.1 initializer expression forms are:

##### 10.1 Literal

```json
{
  "kind": "literal",
  "value": "Hello"
}
```

The literal value MUST validate against the destination schema after generic type substitution.

##### 10.2 Parameter reference

```json
{
  "kind": "parameter",
  "name": "question"
}
```

The referenced parameter MUST exist in the containing Composite Definition. Its type MUST be assignable to the destination field type.

##### 10.3 Type argument reference

A template MAY reference a generic type argument when declaring a child port or type argument. This is a type-level reference, not a runtime value expression.

No other initializer expression forms are defined in v0.1.

#### 11. Template parameters

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

#### 12. Generic Composite Definitions

A Composite Definition MAY declare BTS type parameters.

Type arguments MUST be resolved before child instances are materialized. Resolved types MUST be substituted into all affected child definitions, ports, exposures, and connections.

If a generic type cannot be inferred unambiguously from the public interface and supplied arguments, instantiation MUST fail and request an explicit type argument.

Generic type arguments are part of the instance's construction identity and MUST be persisted with the Composite Instance.

---

### Part II — Template Relationships and Encapsulation

#### 13. Template composition

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

#### 14. Internal connections

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

#### 15. Public interface exposures

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

##### 15.1 Value exposure

A value input exposure makes the resolved external value available at the designated internal input. A value output exposure publishes the current value of the designated child output.

##### 15.2 Event exposure

An event input exposure forwards each accepted event to the designated internal event input. An event output exposure forwards each event emitted by the designated child output.

Event forwarding MUST preserve the event identity and ordering metadata defined by the Core Runtime, or the host's equivalent event envelope.

#### 16. State initialization

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

#### 17. State and execution isolation

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

### Part III — Instantiation and Materialization

#### 18. Composite Instance structure

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

#### 19. Instance identity allocation

The host Runtime MUST allocate a fresh Instance ID for:

- The Composite Instance, unless the caller supplied a valid newly allocated root ID.
- Every Template Node instance.
- Every generated composition relationship and connection that requires a persistent relationship ID.
- Every nested Composite Instance and all of its descendants.

Generated IDs MUST be unique within the World and MUST NOT be derived solely from a mutable display name, layout coordinate, or template path.

A runtime MAY use UUIDv7, ULID, or another collision-resistant ID scheme.

##### 19.1 Identity persistence

Once allocated, child IDs MUST be persisted in the Composite Instance's member map and in the World instance registry.

Loading or restoring a World MUST reuse the persisted IDs. It MUST NOT allocate replacement IDs for existing children.

The runtime MUST NOT regenerate child IDs merely because the Composite is moved, renamed, re-rendered, or reloaded.

##### 19.2 Template-local identity mapping

The member map is the authoritative mapping from a template-local node to its concrete child instance.

A child instance's identity MUST NOT be computed from its current parent path. This allows a future migration to preserve identity when a node is renamed or repositioned in the template.

#### 20. Instantiation algorithm

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

#### 21. Nested Composite Blockies

A Template Node MAY reference another Composite Definition.

Nested composites MUST be instantiated recursively. Each nested Composite receives:

- Its own fresh instance ID.
- Its own parameter values and type arguments.
- Its own member map.
- Its own fresh descendant identities.
- Its own isolated descendant state.

The parent template refers to the nested Composite Instance through the nested Composite's public ports. It MUST NOT directly refer to the nested Composite's private child ports.

##### 21.1 Recursive definition prohibition

A Composite Definition dependency graph MUST be acyclic in v0.1.

A definition MUST NOT directly or indirectly instantiate itself through its template dependency graph. This prevents unbounded recursive materialization.

Implementations SHOULD enforce configurable limits for maximum nesting depth, total descendants, and total generated relationships.

---

### Part IV — Materialized World Representation

#### 22. Canonical World representation

The canonical serialized World MUST contain concrete instance records for all materialized descendants, not just the outer Composite Instance.

The World MUST also preserve:

- Composition relationships.
- Connections.
- Interface exposure information or an equivalent reconstructable representation.
- The member map for each Composite Instance.
- The origin of template-generated structures.

This is a materialized representation: all child instances have real World-level identities and persisted state.

A runtime MAY maintain a more compact internal representation, but serialization and import/export MUST preserve the same observable structure and identities.

#### 23. Generated relationship provenance

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

#### 24. Ownership and scope

Every non-root child created by a Composite Template MUST have an ownership link to its immediate parent Composite Instance or containing child instance.

A child instance MUST belong to exactly one ownership scope.

An external connection MUST target the Composite Instance's public ports, not a private descendant port.

An internal connection MUST be owned by the Composite Template scope in which it is declared.

A connection between two different Composite scopes MUST pass through their respective public interfaces and be represented as a connection at their common visible scope.

The runtime MAY use flattened graph structures internally, but MUST preserve these scope and visibility rules.

#### 25. Template edits and internal structure

In v0.1, a materialized Composite Instance's template-generated topology is immutable during ordinary World editing.

Users MAY change child state through normal ports and events, and MAY change permitted instance configuration. They MUST NOT directly add, remove, or rewire private template-generated children or connections while keeping the same Composite Definition reference.

Changing internal structure requires one of:

- Publishing a new Composite Definition version and explicitly migrating instances.
- Creating a new forked Composite Definition.
- Detaching a Composite through an explicitly defined future operation.

This rule ensures that the persisted member map and materialized relationships remain consistent with the exact template.

---

### Part V — Lifecycle Operations

#### 26. Instantiate versus clone

Instantiation and cloning are distinct operations.

##### 26.1 Instantiate from Definition

`instantiate(definition, arguments)` creates a new Composite Instance from the definition's initial state.

It MUST allocate fresh identities and initialize all descendants from their definition defaults and template initializers.

##### 26.2 Clone an existing Composite Instance

Cloning creates a new independent Composite Instance based on an existing instance's exact definition and current structure.

A clone MUST allocate fresh identities for the Composite and every descendant. It MUST NOT reuse the source instance's member IDs, connection IDs, or composition IDs.

Version 0.1 defines two explicit clone modes:

- `reset`: copy construction parameters/configuration, but initialize child state from the template and child definition defaults.
- `copy_state`: copy the source's current persistent child model state into newly created child identities, after validating it against the same pinned definitions.

`reset` SHOULD be the default when no mode is supplied. A runtime MUST NOT ambiguously choose whether to copy mutable state.

Runtime state, derived caches, pending effects, pending event queues, and local view state MUST NOT be copied.

#### 27. Deletion

Deleting a Composite Instance MUST recursively delete all descendants it owns.

The deletion operation MUST also remove:

- Its owned composition relationships.
- Its owned internal connections.
- Its interface exposure materializations.
- Its pending runtime work, subject to host cancellation semantics.

External connections to the Composite's public ports MUST be removed or rejected as part of the same atomic document operation.

Deleting a Composite MUST NOT delete unrelated instances that merely exchange data with it.

#### 28. Moving and reparenting

Moving a Composite Instance within its parent's permitted layout MUST NOT change any instance identity or internal relationship identity.

Moving a Composite Instance to another valid parent MUST preserve its entire descendant hierarchy and internal connections. The operation MUST validate that the new parent accepts the child and that no containment cycle is introduced.

A child owned by a Composite MUST NOT be moved outside that Composite in v0.1. Extraction/detachment is deferred to a future specification because it requires rules for exposing or rewriting internal connections and state ownership.

#### 29. Reset

A host MAY provide a reset operation.

If supported, reset MUST be explicitly invoked and MUST define whether it applies to:

- The Composite's entire descendant tree; or
- A selected descendant subtree.

A full Composite reset MUST preserve all instance and relationship identities while restoring persistent model state and configuration to the declared initialization values. It MUST clear derived caches and transient runtime state. Reset MUST be atomic from the document's perspective.

If a particular child cannot be reset deterministically, the reset operation MUST fail rather than partially reset the Composite.

---

### Part VI — Validation, Errors, and Security

#### 30. Definition-time validation

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

#### 31. Instantiation-time validation

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

#### 32. Error model

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

#### 33. Security and capabilities

A Composite Definition MUST declare or make discoverable the capabilities required by its descendants.

The effective capability requirements of a Composite are the union of the requirements of its materialized descendants and any declared host-level requirements.

A Composite MUST NOT grant a child capabilities that the host has not authorized.

A parent Composite MAY restrict descendant capabilities, but MUST NOT expand them beyond host authorization.

A child MUST receive only the ports, events, configuration, and capabilities granted to it. It MUST NOT gain access to sibling state merely because the instances share an owner.

---

### Part VII — Reference Example

#### 34. Poll Composite Definition

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

#### 35. Example materialized instance

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

### Part VIII — Conformance and Tests

#### 36. Composite conformance requirements

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

#### 37. Required conformance tests

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

### Appendix A — Decisions for v0.1

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

### Appendix B — Deferred topics

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


---

## Part II.04 — Composite Computation Specification (BCCS)


## Blockies Composite Computation Specification

**Identifier:** BCCS  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Depends on:** Blockies Protocol Specification v0.1, Blockies Type System Specification v0.1 (BTS), Blockies Composite Instantiation Specification v0.1 (BCIS)  
**Format:** Markdown / JSON examples / JavaScript ABI examples

---

#### 1. Abstract

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

#### 2. Normative language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

- **MUST / MUST NOT:** Absolute requirement or prohibition.
- **SHOULD / SHOULD NOT:** Recommended behavior; deviations require a documented reason.
- **MAY:** Optional behavior.

#### 3. Terminology

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

#### 4. Design principles

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

#### 5. Composite computational model

##### 5.1 Composite as a computational node

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

##### 5.2 Composite computation signature

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

##### 5.3 Own state

A Composite MAY own Model State, Configuration, and reducer logic just like an ordinary Blockie.

Its own state is distinct from all child states. Composite Compute MAY read its own state. It MUST NOT read or write a child's Model State directly.

If a Composite needs to change a child's state, it MUST do so through a declared child event input or another explicitly defined protocol operation. Direct state mutation is prohibited.

#### 6. Three boundary mechanisms

The protocol defines three distinct mechanisms for crossing a Composite boundary.

##### 6.1 Input Binding: parent to child

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

##### 6.2 Internal Observation: child to Composite Compute

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

##### 6.3 Output Exposure: child to parent interface

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

#### 7. Public output production

##### 7.1 Exactly one producer per public output

Every Composite public value output MUST have exactly one producer:

1. An Output Exposure; or
2. Composite Compute.

A public output MUST NOT be both exposed and computed. A public output MUST NOT have two Output Exposures.

A definition MAY mix exposed outputs and computed outputs. For example, `results` may be forwarded directly while `completion_rate` is computed by the Composite.

##### 7.2 Declaring computed outputs

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

##### 7.3 Event outputs

Event outputs are not values and MUST NOT be returned by Composite Compute.

In v0.1, child event outputs MAY be forwarded through explicitly declared event boundary routes, using the event-routing rules of the base Protocol. An event is not an Internal Observation and MUST NOT be sampled as though it were a persistent value.

A Composite reducer MAY process events delivered to the Composite's own event inputs and MAY emit declared Composite event outputs. Any routing from a Composite public event input to a child event input MUST be explicit.

#### 8. Definition structure

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

#### 9. Composite Compute ABI

##### 9.1 Input context

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

##### 9.2 Example

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

##### 9.3 Purity requirements

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

##### 9.4 Output validation

The Runtime MUST validate every returned computed output against its declared public output type using BTS.

Missing declared outputs, extra outputs, invalid values, or execution failures MUST produce a computation error for the Composite generation.

#### 10. Reactive dependency graph

##### 10.1 Logical graph

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

##### 10.2 Dependencies

The Runtime MUST derive the following dependency edges:

- Composite public value input -> each child input targeted by an Input Binding.
- Child value output -> each Internal Observation that references it.
- Internal Observation -> Composite Compute.
- Composite public input, own state, and own configuration -> Composite Compute when those values are used by its declared computation contract.
- Composite public output -> connected consumers in the parent context.

A Composite Compute function's dependencies MUST be limited to its declared inputs, state, configuration, and Internal Observations. Runtime introspection of the JavaScript function MUST NOT be required to discover dependencies.

##### 10.3 Reactive invalidation

When a child output referenced by an Internal Observation changes, the Composite Compute node MUST become dirty.

When a Composite public input changes, all affected Input Bindings MUST be updated and affected child computations MUST become dirty. Composite Compute MUST also become dirty if that public input is part of its computation context.

When the Composite's own state or configuration changes, its Composite Compute MUST become dirty if those values are part of its computation context.

The Runtime SHOULD avoid recomputing unrelated children or unrelated Composite computations.

##### 10.4 Coherent generation

All values supplied to one invocation of Composite Compute MUST belong to the same logically coherent execution generation.

If several child outputs change in one transaction, the Runtime MUST NOT invoke Composite Compute once per intermediate child update and publish those intermediate results as committed outputs. It MUST wait until the affected child computations for that transaction have reached a stable result or error, then evaluate Composite Compute against that generation.

A Runtime MAY perform speculative or parallel evaluation internally, but only coherent committed results may be externally observed.

##### 10.5 Nested Composites

A nested Composite is treated as a child Blockie by its parent.

The parent MAY:

- Bind values to the nested Composite's public inputs.
- Observe the nested Composite's public value outputs.
- Expose a nested Composite's public outputs directly.

The parent MUST NOT traverse into the nested Composite's private template to read its descendants. A nested Composite must explicitly expose any value needed by its parent.

##### 10.6 Cycles

Value dependency cycles MUST be rejected across the complete logical graph, including edges that cross Composite boundaries.

A Composite boundary MUST NOT be used to hide or bypass cycle detection.

Temporal feedback mechanisms, such as a Delay Blockie, MAY be defined by a future extension. They are not implied by Composite computation in v0.1.

#### 11. Execution and transaction semantics

##### 11.1 Transaction sequence

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

##### 11.2 Composite computation failure

A failure in Composite Compute MUST NOT roll back an otherwise valid child state transition solely because the Composite's derived output could not be calculated.

For the failed generation:

- The affected Composite computed outputs MUST be marked as errors.
- The Runtime MUST NOT present their previous values as current successful outputs.
- Downstream consumers MUST receive an upstream error or blocked status according to the base Runtime error model.
- Unaffected direct Output Exposures MAY remain valid if their source child outputs remain valid.

A later successful generation MUST replace the error state with valid output values.

##### 11.3 Child failure

If a child output required by an Internal Observation is unavailable because the child computation failed or is blocked, Composite Compute MUST NOT run using a stale value for that observation.

The Composite's affected computed outputs MUST become blocked or errored with a causal reference to the unavailable observation.

A definition MAY declare an observation as optional only if the type system defines a precise absent-value representation. Optional absence MUST NOT be used to mask a failed child computation. A failed source is an error, not an omitted value.

##### 11.4 Output equality and propagation

The Runtime SHOULD propagate a newly computed output only when its typed value is observably different from the previous committed value.

Equality MUST follow the relevant BTS value semantics, not object identity or JavaScript reference equality.

A Runtime MAY recompute a Composite even when its final output is unchanged. It SHOULD avoid needlessly invalidating downstream consumers when the output value is unchanged.

#### 12. State and encapsulation

##### 12.1 Ownership

A Composite Instance owns:

- Its own Model State.
- Its own configuration.
- Its public interface.
- Its instantiated child hierarchy.

Each child instance owns its own Model State and configuration.

No state object is shared by reference between separate Composite Instances merely because they originate from the same template.

##### 12.2 State isolation between instances

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

##### 12.3 No ambient child lookup

Composite logic MUST NOT use a global registry, guessed ID, template node ID, or other ambient mechanism to retrieve child instances or private data.

Template Node IDs are definition-local references used by the protocol machinery to construct declared bindings and observations. They are not runtime capabilities granted to user code.

##### 12.4 Information leakage

An implementation MUST NOT expose private child state, configuration, runtime errors, or metadata through the Composite public interface unless the Composite Definition explicitly maps that information to a public output or event.

Renderer visibility MUST NOT grant access to private computational data.

#### 13. Serialization and materialization

##### 13.1 Definition serialization

A Composite Definition MUST serialize:

- Its normal Blockie Definition fields.
- Its child template nodes.
- Its internal composition relationships.
- Its internal connections.
- Its Input Bindings.
- Its Internal Observations.
- Its Output Exposures.
- Its Composite Compute module reference and declared output list.

##### 13.2 Instance materialization

When a Composite is instantiated, the implementation MUST materialize:

- The Composite Instance.
- A fresh child Instance ID for each Template Node, including nested descendants.
- Child configuration and initial state according to the Composite Instantiation Specification.
- Concrete internal composition relationships.
- Concrete internal connections.
- Resolved Input Binding targets.
- Resolved Internal Observation sources.
- Resolved Output Exposure sources.

##### 13.3 Persisted provenance

A materialized Composite Instance MUST retain enough provenance to associate each child with its Template Node and the exact Composite Definition version from which it was instantiated.

The concrete instance IDs MUST be persisted. Loading a World MUST restore those IDs and MUST NOT generate replacements.

##### 13.4 Canonical World representation

A World serializer MAY store a materialized child hierarchy directly, or store a canonical Composite Instance plus its stable materialization mapping, provided that restoration produces the same identities, state, relationships, and behavior.

A serializer MUST NOT serialize only a template reference and discard instance state or identity mappings.

#### 14. Validation rules

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

#### 15. Error codes

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

#### 16. Reference execution example: Poll Composite

##### 16.1 Internal structure

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

##### 16.2 Boundary declarations

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

##### 16.3 Composite computation

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

##### 16.4 Expected reactive behavior

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

#### 17. Conformance requirements

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

#### 18. Non-goals and deferred features

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

#### 19. Relationship to other Blockies specifications

This document extends, and does not replace, the following specifications:

- **Blockies Protocol Specification:** Defines World, Blockie, ports, connections, state, events, computation, and execution transactions.
- **Blockies Type System Specification (BTS):** Defines value types, type compatibility, generics, and runtime value validation.
- **Blockies Composite Instantiation Specification (BCIS):** Defines templates, Template Node IDs, child identity generation, materialization, state isolation, and restoration.

If a rule in this document conflicts with the base Protocol, BTS, or BCIS, the specifications MUST be reconciled before a conforming implementation claims full v0.1 support. This document specifically governs Composite computation and boundary semantics.

---

### Appendix A. Recommended implementation model

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

### Appendix B. Minimum conformance tests

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


---

## Part II.05 — Composite Event Flow Specification (BCEFS)


## Blockies Composite Event Flow Specification

**Specification ID:** BCEFS  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Depends on:** Blockies Protocol Specification, Blockies Type System Specification (BTS), Blockies Composite Instantiation Specification (BCIS), Blockies Composite Computation Specification (BCCS)

---

#### About this document

This document defines how event messages travel through Composite Blockies. It specifies event forwarding across composition boundaries, child-to-parent notifications, Composite reducers, parent-to-child event dispatch, deterministic ordering, transaction behavior, and event-flow validation.

It is a companion specification. It does not replace the Core Protocol's event ports, reducers, connections, or transaction model. Where this document gives more specific rules for events involving a Composite, those rules refine the Core Protocol for that case.

The current BCIS draft states that Composite Definitions do not declare reducers. BCCS subsequently permits a Composite to own state and reducer logic. For a consistent v0.1 model, this document adopts the BCCS rule: **a Composite MAY declare its own reducer and Model State**. BCIS Section 6 and any earlier text prohibiting Composite reducers must be updated before the specifications are frozen.

---

### 1. Abstract

A Composite Blockie is an encapsulated computational component composed of child Blockies. It may receive events from its parent, forward events to children, receive notifications from children, react through its own reducer, and expose selected child events through its public interface.

The protocol defines four distinct event operations:

1. **Event forwarding:** An event received at a Composite input is forwarded to one or more declared child event inputs.
2. **Child-to-parent notification:** An event emitted by a child is delivered to a declared private handler on the Composite. The Composite reducer processes that event.
3. **Event exposure:** A child event is forwarded through a Composite public event output without invoking the Composite reducer.
4. **Parent-to-child dispatch:** A Composite reducer creates a new event addressed through a declared dispatch route to a child event input.

These operations MUST be explicit. Events MUST NOT automatically bubble through the composition hierarchy, and a Blockie MUST NOT inspect or mutate another Blockie's private state as a substitute for event communication.

The runtime uses a FIFO delivery queue, stable route ordering, serial reducer execution, transaction-scoped state staging, and bounded event processing. These rules make event behavior deterministic within a conforming local runtime.

### 2. Normative language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

### 3. Terminology

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

### 4. Design principles

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

### 5. Event model

#### 5.1 Event ports

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

#### 5.2 Event envelope

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

#### 5.3 Event identity

An externally accepted event MUST receive an event ID from the authoritative Runtime or host. A caller-supplied identifier MAY be retained as a separate command or idempotency key, but MUST NOT be trusted as the authoritative event ID without host validation.

Forwarding MUST preserve `event_id`, `origin`, `causation_id`, and `correlation_id`.

A reducer-created event MUST receive a new `event_id`. Its `causation_id` MUST reference the event being handled. Its `origin` and `correlation_id` SHOULD be inherited from the triggering event. Its `emitter` MUST identify the Blockie whose reducer created it.

#### 5.4 Event immutability

Event payloads MUST be treated as immutable snapshots. A recipient MUST NOT mutate an envelope or payload in place. A reducer that needs to produce a changed payload MUST create a new event through `emit` or `dispatch`.

### 6. Event routing across Composite boundaries

#### 6.1 Four boundary mechanisms

The Composite protocol defines four event mechanisms. They MUST remain semantically distinct.

| Mechanism | Source | Destination | Creates a new event? | Invokes Composite reducer? |
|---|---|---|---:|---:|
| Input binding / forwarding | Composite public event input | Descendant event input | No | Only if the public input is also handled by its reducer |
| Child event handler / notification | Descendant event output | Composite private reducer handler | No | Yes |
| Event exposure | Descendant event output | Composite public event output | No | No |
| Child event dispatch | Composite reducer | Descendant event input | Yes | The child reducer may be invoked |

A Composite Definition MUST declare each route explicitly.

#### 6.2 Parent-to-child event forwarding

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

#### 6.3 Child-to-parent notification

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

#### 6.4 Event exposure

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

#### 6.5 Parent-to-child event dispatch

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

### 7. Reducers and event handling

#### 7.1 Reducer ownership

A reducer changes only the Model State of the Blockie that owns that reducer.

When an event reaches an atomic Blockie event input, that Blockie's reducer MAY handle it.

When an event reaches a Composite public event input, the Composite reducer MAY handle it, and declared input bindings MAY forward it to descendants.

When a child event reaches a Composite private handler, the owning Composite reducer handles it.

A Composite reducer MUST NOT directly read or mutate child Model State. It may use the event payload delivered to its handler and its own Model State, configuration, and explicitly declared capabilities.

#### 7.2 Reducer input contract

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

#### 7.3 Reducer purity

A reducer MUST be pure with respect to its arguments and declared runtime contract:

- It MUST NOT mutate the supplied state, configuration, or event.
- It MUST NOT access another Blockie's state.
- It MUST NOT enqueue events through hidden runtime APIs.
- It MUST NOT perform network or filesystem operations.
- It MUST return the complete next state.
- It MUST return events and dispatch requests as data in its result.

The Runtime validates the returned state, emitted events, dispatch requests, and effects before committing them.

#### 7.4 Reducer state visibility within a transaction

Reducer executions are serial within a World transaction.

When a reducer succeeds, its staged next state becomes the current staged state for that Blockie. A later reducer invocation for the same Blockie in the same transaction MUST receive that latest staged state, not the previously committed state.

No staged state becomes externally visible until the transaction commits.

#### 7.5 Composite Model State

A Composite MAY own Model State and a reducer independently of its children. This state is isolated from child state.

If a child event causes the Composite to update its own state, the Composite reducer performs that transition. If the Composite must cause a child to react, it uses a declared dispatch route or an existing declared input binding. It MUST NOT mutate child state directly.

### 8. Event ordering and delivery

#### 8.1 Single logical FIFO queue

A Runtime MUST process event deliveries through one logical FIFO queue per World transaction.

Implementations MAY use internal data structures or worker threads, but observable reducer invocation and event delivery order MUST be equivalent to serial FIFO processing.

Reducers MUST NOT execute concurrently within the same World transaction in v0.1.

#### 8.2 Initial event order

If a transaction accepts multiple initial events, the Runtime MUST enqueue them in the order supplied by the authoritative caller or host command batch.

If concurrent callers submit events, the host MUST establish a single deterministic acceptance order before transaction processing. Wall-clock timestamp order MUST NOT be used as an implicit conflict-resolution rule.

#### 8.3 Fan-out order

When one event output has multiple destinations, the Runtime MUST enqueue deliveries in ascending `route_id` order using bytewise UTF-8 lexical ordering.

All event routes participating in fan-out MUST have unique IDs within their routing scope. This includes ordinary event connections, Composite event handlers, event exposures, and other explicit forwarding routes.

For an event delivered to a Composite input that has both a local reducer and one or more input bindings, the Runtime MUST:

1. Invoke the local reducer first, if the input ID is listed in `logic.reduce.handled_inputs`.
2. Enqueue the reducer's `dispatch` requests in the order returned.
3. Enqueue the reducer's `emit` events in the order returned.
4. Enqueue event-binding deliveries in ascending binding route ID order.

This order is normative for v0.1. If no local reducer handles the input, only the applicable binding deliveries are enqueued.

#### 8.4 Fan-out from event outputs

When a logical event is emitted from an event output, the Runtime MUST collect all applicable destinations from the following route kinds:

- Ordinary event Connections.
- Composite child-to-parent event handler routes.
- Composite event exposure routes.

The Runtime MUST enqueue those deliveries in ascending `route_id` order. Each destination receives the same logical event ID and payload, with destination-specific delivery metadata. A reducer handler is a queued destination; it is not invoked inline while the source output is being processed.

An event output with no destinations MAY be treated as an unobserved event. An event input with no reducer, forwarding binding, or explicit ignore policy MUST be rejected as unhandled.

#### 8.5 Reducer-generated action order

For each successful reducer invocation:

1. `dispatch` entries MUST be processed in array order.
2. `emit` entries MUST be processed in array order after all `dispatch` entries.
3. Each newly created event's destinations MUST be enqueued in ascending route ID order.
4. `effects` MUST be recorded for post-commit execution and MUST NOT enter the event queue during the current transaction.

The Runtime MUST validate all action entries before commit. An invalid dispatch or emitted event causes the transaction to fail.

#### 8.6 Forwarding and FIFO behavior

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

#### 8.7 Nested Composite ordering

An event entering a nested Composite follows the same rules at each boundary. The nested Composite's own reducer and input bindings are processed when its input delivery is dequeued.

No special priority is granted to ancestors or descendants. Event ordering follows queue insertion order and declared route ordering.

#### 8.8 Delivery semantics

Within one successfully committed transaction, each scheduled delivery MUST be processed at most once.

The protocol does not promise exactly-once processing across process crashes, storage failures, or network retries. Durable replay and cross-process idempotency require a separate persistence or collaboration specification.

Hosts SHOULD support idempotency keys for externally submitted commands when duplicate submission is possible.

### 9. Event cycles and execution limits

#### 9.1 Forwarding-only cycles

A forwarding-only cycle is a cycle in which an event can circulate through connections, input bindings, event handlers, or event exposures without invoking a reducer that creates a new event.

A Composite Definition or World MUST NOT contain a forwarding-only event cycle.

The Runtime MUST detect such cycles during validation where the event routing graph is statically knowable.

The Runtime SHOULD also track route traversal for each logical event and reject a repeated route traversal as a runtime safety check.

#### 9.2 Reducer-mediated cycles

A cycle that passes through a reducer and creates a new event is permitted. The reducer-created event has a new event ID and a causation link to the event that triggered it.

Such cycles MUST be bounded by transaction limits.

#### 9.3 Required limits

A Runtime MUST enforce configurable limits for at least:

- Maximum event deliveries per transaction.
- Maximum reducer invocations per transaction.
- Maximum forwarding hops per logical event.
- Maximum causal event depth.
- Maximum payload size.
- Maximum reducer execution time and memory.

Exceeding a limit MUST fail the transaction without committing staged Model State or publishing staged events.

### 10. Transaction semantics

#### 10.1 Event transaction lifecycle

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

#### 10.2 Atomicity

A reducer failure, invalid reducer result, invalid dispatch, invalid emitted event, or event limit failure MUST abort the originating transaction. No staged Model State changes or staged event outputs from that transaction may be committed.

A computation failure follows the Core Protocol and BCCS behavior: it marks the affected computed output as an error but does not by itself roll back an otherwise valid reducer transaction. Downstream computations MUST NOT silently consume stale values as current values.

#### 10.3 Parent and child state transitions

A child reducer and its parent Composite reducer may both execute within the same transaction.

Each reducer changes only its own Blockie's staged state. Their invocation order is the event queue order. The parent reducer MUST use the child event payload rather than reading child state.

After the event queue is drained, reactive computations run against the final staged state generation. Composite Compute can then consume its declared Internal Observations according to BCCS.

#### 10.4 Event visibility

Staged event outputs MUST NOT be published to external consumers until the transaction commits.

Internal event deliveries within the transaction are visible to the Runtime's staged execution process only.

### 11. Errors

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

### 12. Serialization and materialization

#### 12.1 Definition-time event declarations

Composite Definitions MUST serialize the following event declarations when applicable:

- Public event inputs and outputs.
- Event input bindings.
- Child event handler routes.
- Event output exposures.
- Child dispatch routes.
- Private reducer handler declarations and payload types.

These declarations MUST use stable IDs within the exact Definition version.

#### 12.2 Instance materialization

When a Composite is instantiated, every template-local event route MUST be materialized with a stable provenance reference to:

- The owning Composite instance ID.
- The Composite Definition ID and version.
- The template-local route ID.
- The materialized source and destination instance IDs.

Materialization MUST NOT create new public routes that bypass nested Composite boundaries.

#### 12.3 Persistence

Pending event queues, in-flight deliveries, route traces, and staged transaction state MUST NOT be serialized as canonical World document state.

A host MAY maintain a separate durable event log or command journal, but that is outside this specification.

### 13. Security and encapsulation

1. A child MUST NOT address its parent reducer through arbitrary instance lookup. It can only emit through declared event output ports.
2. A parent MUST NOT subscribe to private descendant event ports inside a nested Composite.
3. A Composite reducer MUST NOT receive direct references to child instances, child state objects, or private runtime objects.
4. A dispatch route MUST identify a declared child event input, not an arbitrary child ID supplied by user code.
5. Public event exposure MUST redact private descendant topology from external consumers unless the public payload explicitly includes relevant information.
6. Event payloads crossing a boundary MUST be validated against the receiving contract.
7. Capabilities and authorization MUST be checked by the Runtime or authoritative host, not by the Renderer alone.

### 14. Reference example: Poll Composite

#### 14.1 Structure

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

#### 14.2 Route and reducer declarations

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

#### 14.3 Composite reducer

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

#### 14.4 Expected event flow

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

### 15. Validation requirements

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

### 16. Conformance requirements

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

### 17. Required conformance tests

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

### 18. Decisions for v0.1

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

### 19. Deferred topics

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

### 20. Relationship to other specifications

- **Blockies Protocol Specification:** Defines event ports, ordinary connections, reducers, effects, and transactions.
- **Blockies Type System Specification (BTS):** Defines event payload types and runtime value validation.
- **Blockies Composite Instantiation Specification (BCIS):** Defines template nodes, materialized child instances, and structural ownership.
- **Blockies Composite Computation Specification (BCCS):** Defines Composite state, reducers, Composite Compute, internal observations, and value-output behavior.

This document specializes event behavior for Composites. It also resolves the earlier BCIS draft's prohibition on Composite reducers in favor of BCCS's model in which a Composite may own state and a reducer. The specifications should be reconciled before any of them are declared stable.

---

### Appendix A — Implementation guidance (informative)

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

### Appendix B — Event lifecycle summary

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


---

## Part II.06 — Runtime Execution Specification (BRES)


## Blockies Runtime Execution Specification

**Document ID:** BRES  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Normative dependencies:** Blockies Protocol v0.1, Blockies Type System (BTS) v0.1, Blockies Composite Instantiation (BCIS) v0.1, Blockies Composite Computation (BCCS) v0.1, Blockies Composite Event Flow (BCEFS) v0.1  
**Serialization:** JSON-compatible protocol values  
**Reference implementation direction:** Rust core with pluggable execution adapters (non-normative)

---

#### About this document

This document specifies the unified execution algorithm for a Blockies World. It combines state transitions, event routing, value dependency evaluation, Composite computation, transaction handling, and post-commit effects into one runtime model.

This is a companion specification. It does not replace the Core Protocol, BTS, BCIS, BCCS, or BCEFS. Where those documents define individual contracts, this document defines their ordering and coordination during execution.

This document is a draft. Its rules should be treated as proposed normative behavior until the companion specifications are reconciled and the v0.1 family is frozen.

#### 1. Abstract

A Blockies Runtime executes a World as a reactive system of independently identifiable Blockie instances. A World contains persistent Model State, typed ports, event routes, value dependencies, composition hierarchies, and Composite boundaries.

The Runtime MUST coordinate these mechanisms through one logical transaction scheduler per World.

The v0.1 execution model has two principal internal phases:

1. **Event phase:** process accepted event deliveries serially through a FIFO queue. Reducers produce staged state transitions, further event actions, and effect requests.
2. **Value phase:** after the event queue is empty, stabilize the affected reactive value graph. Atomic Blockie computations and Composite computations execute in dependency order against the staged state generation.

If both phases succeed according to their respective failure rules, the Runtime commits the staged Model State, output statuses, and externally publishable event/effect records as one coherent generation. It then publishes the committed generation and executes authorized effects.

Effects never execute inside a reducer or computation. An effect result enters the World as a new event in a later transaction.

#### 2. Normative terminology

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are used normatively.

- **MUST / MUST NOT:** absolute requirement or prohibition.
- **SHOULD / SHOULD NOT:** recommended behavior; deviations require a documented reason.
- **MAY:** optional behavior.

#### 3. Scope

##### 3.1 In scope

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

##### 3.2 Out of scope

This specification does not define:

- A particular thread pool, async executor, graph library, or Rust crate.
- A particular JavaScript engine or sandbox implementation.
- The wire protocol for network synchronization.
- A CRDT algorithm or distributed transaction protocol.
- A universal persistence database or file format beyond companion Protocol requirements.
- Renderer layout, animation, or user-interface behavior.
- The semantics of future streaming, temporal-feedback, or parallel distributed computation extensions.

#### 4. Terminology

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

#### 5. Core execution principles

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

#### 6. Runtime model

##### 6.1 Runtime ownership

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

##### 6.2 Document revision and runtime generation

The Runtime MUST distinguish:

- **Document revision:** a version of the World structure, including instances, definitions, connections, composition, configuration, and other document-level data.
- **Runtime generation:** a successfully committed version of Model State and computed outputs for a particular document revision.

A runtime transaction MUST record the document revision against which it was evaluated. If the document changes while a transaction is being prepared, the transaction MUST either be aborted and retried against the new revision or be serialized before the document operation. It MUST NOT commit against a structurally different World without revalidation.

A document edit (for example, adding a Blockie, moving a child, changing a connection, or changing configuration) is a document operation, not an ordinary Model State event. Document operations MUST be validated and committed atomically by the document layer. After a structural or computation-relevant configuration change, the Runtime MUST rebuild or incrementally update affected graphs and mark affected computations dirty before accepting ordinary runtime transactions.

##### 6.3 Committed and staged snapshots

The Runtime MUST distinguish two views:

- **Committed snapshot:** immutable to the active transaction and visible to renderers and external readers.
- **Staged snapshot:** transaction-local view containing successful reducer state transitions and the outputs computed during the transaction's value phase.

Reducer invocations within a transaction MUST read the latest staged state for their owning Blockie. They MUST NOT mutate the committed snapshot.

Compute invocations MUST read the final staged Model State after the event phase has drained, along with the staged configuration and resolved value inputs for the transaction's document revision.

No staged data may be published as committed before commit.

##### 6.4 Runtime node statuses

The Runtime SHOULD expose statuses at least equivalent to:

- `ready`: a valid output is available for the current committed generation.
- `dirty`: recomputation is required for the staged generation.
- `running`: a computation is currently executing.
- `blocked`: computation cannot run because a required input is absent or an upstream output is unavailable.
- `error`: the node's own reducer/computation or output validation failed.
- `suspended`: execution is intentionally unavailable, for example because a required definition or capability is unavailable.

Statuses are Runtime metadata and MUST NOT be confused with Blockie Model State.

#### 7. Logical graphs

##### 7.1 Two graph families

A World contains two logically separate routing systems:

1. **Event graph:** describes where discrete event deliveries may go.
2. **Value dependency graph:** describes which computations depend on which values.

They MUST NOT be collapsed into one undifferentiated graph because their semantics differ. Event graph cycles may exist under limits; value dependency cycles are prohibited in v0.1.

##### 7.2 Event graph

The event graph includes:

- Ordinary event connections.
- Composite parent-to-child input bindings.
- Child-to-parent private handler routes.
- Event exposures.
- Declared Composite dispatch routes.

Each event route MUST have a stable unique route ID within its routing scope. Route IDs are used for deterministic fan-out ordering.

The Runtime MUST validate event routing endpoints and payload compatibility before execution. A statically knowable forwarding-only cycle MUST be rejected.

##### 7.3 Value dependency graph

The logical value graph includes dependency edges from:

- Source Blockie output to connected target input.
- Composite public input to each child input targeted by an Input Binding.
- Child output to each Internal Observation.
- Internal Observation to its owning Composite Compute node.
- Composite public input, own Model State, and configuration to Composite Compute when declared as dependencies.
- Child output to a Composite public output through an Output Exposure.
- Composite public output to connected consumers in its parent scope.

The Runtime MAY implement this as one flattened graph or as nested graphs with equivalent behavior. It MUST preserve Composite encapsulation and the dependency semantics of BCCS.

##### 7.4 Acyclicity

The complete logical value dependency graph MUST be acyclic, including edges that cross Composite boundaries. A Composite boundary MUST NOT conceal a cycle.

A future temporal or delay extension MAY introduce explicit prior-generation dependencies. Such dependencies are not ordinary same-generation value edges and are outside v0.1.

##### 7.5 Stable scheduling order

For a set of ready computations whose dependencies are satisfied, the Runtime MUST use a stable deterministic tie-breaker. Unless a future profile specifies another order, the tie-breaker MUST be ascending Blockie instance ID using bytewise UTF-8 lexical ordering. A Composite Compute node is ordered after all dirty computations that feed its declared observations or inputs.

Implementations MAY execute independent pure computations in parallel, provided their externally observable results and error selection are equivalent to the specified stable serial order. Reducers MUST NOT execute concurrently within one World transaction in v0.1.

#### 8. Transaction input and acceptance

##### 8.1 Transaction initiation

A runtime transaction MAY be initiated by:

- One external event accepted at a declared event input.
- An ordered batch of external events accepted by the host.
- An effect completion or failure represented as a declared event.
- A host command explicitly normalized to a declared event input.
- A trusted system event, such as a timer tick, delivered through a declared event input.

A host command MUST NOT bypass the event/reducer state-transition model to write Model State directly. A command that changes Model State MUST be normalized to a declared event delivery or use a separately specified privileged document operation where the change is structural rather than application state.

##### 8.2 Initial event ordering

If a transaction contains multiple initial events, the Runtime MUST preserve the acceptance order established by the authoritative host. Concurrent callers MUST be serialized by the host before transaction processing. Wall-clock timestamps MUST NOT be used as an implicit ordering or conflict-resolution mechanism.

##### 8.3 Validation before staging

Before creating a staged transaction, the Runtime MUST validate:

1. The target World and document revision.
2. The destination instance and event input/route.
3. The caller's authority to submit the command/event.
4. The event payload against BTS.
5. Any declared deduplication or idempotency policy.
6. Transaction-level resource constraints that can be checked before execution.

An invalid initial input MUST be rejected without creating a state-changing transaction.

##### 8.4 Event envelope

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

#### 9. Unified transaction state machine

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

#### 10. Normative transaction algorithm

##### 10.1 Overview

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

##### 10.2 Pseudocode

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

#### 11. Event phase

##### 11.1 Single FIFO queue

A Runtime MUST process event deliveries through one logical FIFO queue per World transaction. Reducer invocation order MUST be equivalent to serial FIFO processing.

A Runtime MAY use multiple internal queues only if their combined behavior is observationally equivalent to the single FIFO queue.

##### 11.2 Delivery processing

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

##### 11.3 Reducer ownership and visibility

A reducer MUST change only the Model State of its owning Blockie.

A child reducer cannot write its parent's state. A Composite reducer cannot write a child's state. A Composite reducer MUST use a child event payload delivered to a declared private handler if it needs to react to a child occurrence.

A reducer MAY read:

- Its own latest staged Model State.
- Its own immutable configuration.
- The current immutable event envelope and validated payload.
- Runtime-provided metadata explicitly included in the reducer ABI.

A reducer MUST NOT read computed outputs, arbitrary connected values, child state, parent state, or ambient World data in v0.1. If a state transition depends on a value, that value MUST be included in the accepted event payload or a future reducer-input extension must define the semantics explicitly.

##### 11.4 Staged state visibility

When a reducer succeeds, its returned complete next state becomes the current staged state for that Blockie immediately. A later reducer invocation for the same Blockie in the same transaction MUST receive this latest staged state.

The staged state remains invisible to renderers and other external readers until commit.

##### 11.5 Reducer result

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

##### 11.6 Action ordering

For each successful reducer invocation, actions MUST be handled in this order:

1. Validate the full reducer result.
2. Stage the reducer's next state.
3. Enqueue `dispatch` requests in returned array order.
4. Enqueue `emit` requests in returned array order, expanding each event's destinations in ascending route ID order.
5. Record `effects` in returned array order for the post-commit effect outbox.
6. If the destination is a Composite public event input, enqueue that input's declared child Input Binding deliveries in route ID order, preserving the logical event ID. Handler and exposure routes are expanded from emitted event output ports, not from an unrelated incoming delivery.

Effect requests MUST NOT enter the event queue in the current transaction.

For a Composite public event input with both a local reducer and one or more Input Bindings, the Composite reducer is processed first. Its dispatches and emitted-output destinations are enqueued before the binding deliveries. The binding deliveries are then enqueued in ascending binding route ID order. This ordering is normative and MUST agree with BCEFS §8.3.

##### 11.7 Forwarding versus dispatch

- **Forwarding** preserves the logical event ID and causal metadata. It creates a new delivery record, not a new logical event.
- **Dispatch** creates a new logical event with a new event ID and a `causation_id` referencing the event currently being handled.
- **Emission** creates a new logical event from a reducer output port, with the same new-event identity rules as dispatch.

Forwarding MUST NOT invoke a child reducer inline. Dispatch and emission destinations MUST be queued.

##### 11.8 Child-to-parent notifications

A child event routed to a Composite private handler is an ordinary FIFO delivery whose reducer owner is the Composite. The Composite reducer receives the declared handler ID and payload. It does not receive a mutable child reference or implicit child state access.

##### 11.9 Event-output destinations

When a reducer emits an event on an output port, the Runtime MUST resolve all declared routes for that output, including ordinary event Connections, Composite child-to-parent handler routes, and Composite event exposures. The Runtime MUST enqueue internal World deliveries in ascending route ID order using bytewise UTF-8 lexical ordering.

A delivery that targets a Composite private handler invokes the owning Composite reducer when that delivery is later dequeued. A delivery through an event exposure continues through the Composite's public event output routes, preserving the logical event identity while using boundary-safe source metadata.

Event routes whose destinations are inside the same World are processed during the event phase. Destinations outside the World or Runtime MUST be written to a post-commit publication outbox and MUST NOT be delivered externally before commit.

##### 11.10 Event ordering and limits

The Runtime MUST enforce at least:

- Maximum event deliveries per transaction.
- Maximum reducer invocations per transaction.
- Maximum forwarding hops per logical event.
- Maximum causal event depth.
- Maximum event payload size.
- Maximum reducer execution time and memory.

A forwarding-only cycle MUST be rejected at validation when statically knowable. A reducer-mediated event cycle MAY execute but MUST be bounded by the limits above.

Exceeding a limit MUST abort the transaction without committing staged Model State or publishing staged events/effects.

#### 12. Value phase: reactive stabilization

##### 12.1 Start condition

The value phase begins only after the event queue is empty. All successful reducer state transitions from the event phase are then visible in the staged snapshot.

The Runtime MUST NOT interleave ordinary Compute invocations between reducer deliveries in v0.1. This guarantees that reducers do not observe a mixture of old and new derived values.

##### 12.2 Dirty-node discovery

The Runtime MUST mark computations dirty when any declared dependency changes. Dirty dependencies include:

- A Blockie's Model State field used by its Compute function.
- A configuration field declared as a Compute dependency.
- A resolved value input.
- A Composite public input used by Composite Compute.
- A child output referenced by an Internal Observation.
- A child output referenced by an Output Exposure.
- A nested Composite public output used by its parent.

The Runtime SHOULD use dependency indexes to avoid invalidating unrelated computations.

##### 12.3 Input resolution

Before invoking a Compute function, each value input MUST be resolved according to BTS:

1. If connected, use the current staged source output.
2. Otherwise, use a declared default if present.
3. Otherwise, omit an optional input.
4. Otherwise, mark the computation `blocked` because a required input is unresolved.

A connected source in `error`, `blocked`, or unavailable state MUST NOT silently fall back to a default. The target MUST receive a causal blocked/error status for that input.

##### 12.4 Atomic Blockie Compute

A dirty atomic Blockie Compute MUST receive only its declared:

- Latest staged own Model State.
- Immutable configuration.
- Resolved typed value inputs.

It MUST NOT read arbitrary Blockie instances, invoke reducers, emit events, or perform effects.

The Runtime MUST validate every returned output against the declared output port type using BTS. Missing required outputs, undeclared output keys, non-serializable values, and invalid types MUST produce a computation error for that node.

##### 12.5 Composite Compute

A Composite Compute is a computation node owned by the Composite instance. It executes only after all dirty child computations that feed its declared inputs or Internal Observations have reached a valid result or an explicit error/blocked status.

Its context MAY contain:

- The Composite's own latest staged Model State.
- The Composite's immutable configuration.
- Resolved public value inputs.
- Declared Internal Observations of descendant outputs.

It MUST NOT receive arbitrary child state, child configuration, private runtime data, or an ambient child lookup API.

A child failure that makes a required Internal Observation unavailable MUST block the affected Composite Compute. The Runtime MUST NOT use the prior generation's stale child output as if it were current.

A Composite with both direct Output Exposures and computed public outputs MUST evaluate each according to its declared producer. A public value output MUST have exactly one producer: either an exposure or Composite Compute.

##### 12.6 Nested Composites

A nested Composite is treated as a child node in its parent's logical value graph. Its internal graph is stabilized before any parent computation that depends on its public output.

The parent MUST consume only the nested Composite's public value outputs. It MUST NOT traverse into private descendants.

The Runtime MAY flatten nested graphs internally, but MUST preserve the boundary semantics and dependency ordering.

##### 12.7 Stable topological evaluation

The Runtime MUST evaluate dirty computation nodes in topological order. If multiple nodes are ready, it MUST use the stable tie-breaker in §7.5.

Since the value dependency graph is acyclic, one topological pass is sufficient when dependencies and input values are correctly indexed. If evaluation reveals a previously undeclared dependency, the Runtime MUST reject that behavior rather than silently modify the graph during Compute.

##### 12.8 Output comparison and propagation

After successful output validation, the Runtime MUST compare the new typed value with the staged prior output according to BTS value equality, not object identity or JavaScript reference equality.

If the value is observably unchanged, the Runtime MAY retain the previous immutable representation and SHOULD avoid invalidating downstream consumers solely because the computation ran again.

If the value or its validity status changes, downstream value consumers MUST be marked dirty or blocked as appropriate.

##### 12.9 No event emission from Compute

Compute functions MUST NOT emit events in v0.1. A computed value change propagates through value dependencies only.

If an application needs an occurrence derived from a computation, it MUST use an explicitly defined future threshold/transition Blockie or another declared mechanism that converts a value condition into an event. A Runtime MUST NOT invent implicit change events for every computed output.

#### 13. Composite scheduling and boundary coordination

##### 13.1 Composite as a logical node and execution scope

A Composite participates in its parent's graph as one public Blockie node while owning a private internal execution scope. The Runtime MUST coordinate both views as one World transaction.

##### 13.2 Value boundary processing

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

##### 13.3 Event boundary processing

Event boundary operations occur during the event phase, not the value phase:

- Parent-to-child event forwarding creates FIFO deliveries.
- Child-to-parent notifications create FIFO deliveries to private Composite handlers.
- Event exposure creates deliveries to applicable parent-scope event routes.
- Composite reducer dispatch creates new child-targeted events.

Each nested boundary uses the same queue and deterministic route ordering. There is no special recursive or ancestor-first call stack.

##### 13.4 Composite state

A Composite MAY own Model State and a reducer independently of its children. Its reducer is invoked by public event inputs explicitly listed as handled or by declared private child-event handlers.

Composite reducers follow the same serial staging and validation rules as atomic reducers. They MUST NOT modify descendant state directly.

#### 14. Errors and failure semantics

##### 14.1 Two failure classes

The Runtime MUST distinguish:

1. **Transaction-fatal failures:** invalidate the event/state transition transaction and require abort.
2. **Computation-local failures:** invalidate affected derived outputs but do not, by themselves, roll back valid Model State transitions.

##### 14.2 Transaction-fatal failures

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

##### 14.3 Computation-local failures

The following SHOULD be represented as node-local error/blocked statuses and MUST NOT alone abort an otherwise valid state transaction:

- Compute function throws or traps.
- Compute exceeds its local execution budget, provided the Runtime remains healthy.
- A Compute result violates its output type.
- A required input is missing.
- An upstream computed output is errored or blocked.
- A Composite Compute fails or has a required unavailable observation.

The failed node's output MUST NOT be presented as a current successful value. Stale previous values MUST NOT be silently propagated as current. Unaffected branches MAY still commit successfully.

##### 14.4 Error representation

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

##### 14.5 Recovery

A later transaction that changes the failed node's dependencies MAY cause it to become dirty and recompute. When the computation succeeds, the Runtime MUST replace the prior error status with the new valid output status in the committed generation.

#### 15. Effects and the post-commit model

##### 15.1 Effect collection

Reducers MAY return effect requests. Effects MUST be declared in the owning Definition and authorized by the Runtime's capability policy.

The Runtime MUST validate effect IDs, input payloads, capability grants, and effect-specific limits before the transaction can commit.

Effects MUST NOT execute during event processing, Compute, or before commit.

##### 15.2 Effect outbox

Validated effect requests MUST be recorded in a transactionally committed effect outbox, or an equivalent mechanism that prevents an aborted transaction's effects from running.

Each effect request SHOULD receive a stable request ID and idempotency key. The request MUST record its originating transaction and Blockie instance.

##### 15.3 Effect execution

After commit, the host Effect Executor performs authorized requests. Effect execution is outside the deterministic World transaction.

The protocol does not promise exactly-once execution across crashes or network retries. A host SHOULD provide retry and deduplication behavior and MUST document its delivery guarantees.

##### 15.4 Effect results

An effect completion or failure MUST NOT mutate Blockie state directly. The host MUST convert the result into a validated event delivered to a declared event input in a subsequent transaction.

The event SHOULD include the effect request ID, success/failure status, and typed result or structured error. If no result handler is declared, the host MAY retain the result as an operational diagnostic, but MUST NOT silently write it into Model State.

##### 15.5 Effect isolation

An effect executor MUST enforce declared capabilities. A Blockie MUST NOT gain network, filesystem, database, or AI access merely because another Blockie has that capability.

#### 16. Commit and publication

##### 16.1 Commit contents

A successful transaction MUST atomically commit, as one logical generation:

- All staged Model State changes.
- The output values and output validity statuses produced by stabilization.
- The new runtime generation identifier.
- Any committed event outbox records intended for external consumers.
- The validated pending effect outbox records.
- Transaction metadata required for recovery or audit.

Transient queue entries, reducer call stacks, dirty flags, and temporary computation contexts MUST NOT become canonical World Model State.

##### 16.2 Commit semantics

The Runtime MUST ensure that external readers cannot observe a mixture of old and new committed values from one transaction. A renderer or subscriber MUST observe either the prior committed generation or the complete new committed generation.

If durable persistence is enabled, the host SHOULD use a write-ahead log, atomic snapshot replacement, database transaction, or equivalent mechanism to recover the commit boundary after a crash.

##### 16.3 Publication order

After commit, the Runtime MUST:

1. Make the new generation available to local readers/renderers.
2. Publish committed document/runtime change notifications.
3. Publish externally routed event outbox records.
4. Hand committed effects to the Effect Executor.

The host MAY perform these independent post-commit actions concurrently, but MUST preserve per-channel ordering and idempotency requirements.

No notification or effect request from an aborted transaction may be published or executed.

##### 16.4 Rendering

Renderers MUST consume committed snapshots. They MUST NOT read staged transaction state or invoke Blockie reducers/compute functions themselves.

User interaction from a renderer MUST be converted into an authorized command or event and submitted back to the Runtime.

#### 17. Concurrency and determinism

##### 17.1 Transactions per World

In v0.1, one World Runtime MUST serialize transactions. It MUST NOT expose overlapping uncommitted transactions for the same World.

An implementation MAY process transactions for different Worlds concurrently.

##### 17.2 Parallel computation

Independent pure Compute nodes MAY execute in parallel. Their results MUST be staged and made visible only after all required nodes in the affected dependency closure have reached a valid result or error status.

If parallel execution would cause observable nondeterminism in errors or outputs, the Runtime MUST use the stable serial order instead.

##### 17.3 Reducer execution

Reducers MUST execute serially within a World transaction. A later reducer invocation for the same Blockie sees the latest staged state produced by earlier reducer invocations in that transaction.

##### 17.4 Sources of nondeterminism

Compute and Reduce MUST NOT access ambient wall-clock time, unseeded randomness, network, filesystem, process state, or arbitrary shared mutable memory.

Time, randomness, and external information MUST enter through explicit typed inputs or effect-result events.

##### 17.5 Cross-client determinism

A host-authoritative Runtime is the v0.1 reference model for online execution. This specification does not require every audience client to independently execute the same World. If multiple replicas execute a World independently, they MUST use equivalent definitions, module digests, type semantics, and deterministic inputs; distributed agreement is outside this specification.

#### 18. Execution limits

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

#### 19. Initialization and first generation

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

#### 20. Reference execution example: interactive Poll

##### 20.1 Structure

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

##### 20.2 Incoming vote

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

##### 20.3 Value stabilization

After the queue drains:

1. The Vote Collection's `votes` output becomes dirty because its Model State changed.
2. The Aggregator recomputes counts, total votes, and unique voters.
3. The Poll's Internal Observations resolve from those outputs.
4. Poll Composite Compute calculates `completion_rate` using `unique_voters` and the public `expected_audience` input.
5. The Poll public outputs are updated in the staged generation.
6. Any parent-level chart or statistics Blockies depending on Poll outputs become dirty and recompute.

##### 20.4 Commit

The Runtime commits all successful state transitions and the stabilized outputs as one generation. The presenter renderer sees the new vote count and chart together, not an intermediate state.

If the Aggregator fails, the accepted vote state may still commit, but the affected Poll outputs become error/blocked for that generation. The Runtime MUST NOT display the old total as if it represented the new vote collection.

##### 20.5 Effects

If the Poll also requests an audit-log or notification effect, the request is committed to the effect outbox. The host executes it after commit. Its result, if relevant to the World, is submitted as a new event in a subsequent transaction.

#### 21. Conformance requirements

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

#### 22. Required conformance tests

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

#### 23. Relationship to companion specifications

| Specification | Responsibility | BRES integration |
|---|---|---|
| Blockies Protocol | Core World, Blockie, port, and execution contracts | Defines entities and foundational behavior. |
| BTS | Type expressions, assignability, and value validation | Validates all state, ports, events, and outputs. |
| BCIS | Composite templates and instance materialization | Supplies concrete child instances and internal routes. |
| BCCS | Composite Compute and Internal Observations | Supplies Composite computation nodes and value dependencies. |
| BCEFS | Composite event forwarding, handlers, exposure, and ordering | Supplies event routes and reducer delivery semantics. |
| BRES | Unified Runtime execution | Defines the combined transaction algorithm and phase ordering. |

If an implementation encounters an ambiguity between companion drafts, it SHOULD follow the more specific companion contract for the relevant domain and this specification for cross-domain phase ordering. The draft family MUST be reconciled before a stable v0.1 release.

#### 24. Decisions established by BRES v0.1

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

#### 25. Deferred topics

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

### Appendix A — Recommended implementation architecture (informative)

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

### Appendix B — Suggested Rust-facing internal interfaces (informative)

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

### Appendix C — Open questions for the next revision

1. Should a future reducer ABI permit explicitly declared value snapshots, with a well-defined point-in-time consistency model?
2. Should a World transaction support a batch of independent external commands that can be partially accepted, or should the entire batch remain all-or-nothing?
3. Should computation errors be retained as output statuses only, or should the protocol also define a standard error value type usable by downstream Blockies?
4. Should effect retries and dead-letter handling be standardized in a separate Effects Protocol?
5. Should transaction limits be per World, per definition, per actor, or all three?

These questions do not prevent implementation of the v0.1 execution algorithm, but should be resolved before a stable release.

---

**End of Blockies Runtime Execution Specification v0.1.0-draft**


---

# Part III — Consistency audit and freeze plan


## Blockies v0.1 Specification Family — Consistency Review

**Review date:** 2026-11-01  
**Documents reviewed:** Core Protocol, BTS, BCIS, BCCS, BCEFS, BRES  
**Review status:** Draft audit; no specification is frozen

---

#### 1. Executive summary

The six drafts describe a coherent direction for Blockies: a World contains independently identified Blockies; Blockies communicate through typed value and event ports; Composites materialize isolated child hierarchies; reducers process events; pure computations stabilize a reactive value graph; and effects run after commit.

The architecture is promising, but the specification family is **not ready to freeze as v0.1**. The main problem is not a lack of features. It is that several documents currently define the same contract differently, and some later documents explicitly override earlier rules without updating the earlier normative text.

The most important blockers are:

1. **Composite behavior is contradictory.** BCIS prohibits Composite Compute, Composite Reduce, and Composite-owned Model State. BCCS and BCEFS require all three to be possible.
2. **The canonical Definition and ABI schemas are inconsistent.** The Core Protocol examples use raw JSON Schema fragments and string type names, while BTS defines a different canonical type-expression format. Compute and reducer signatures also differ between documents.
3. **Input resolution disagrees about which generation is read.** BTS says a connected Compute input reads the committed source output; BRES says it reads the staged source output after reducers have run.
4. **Composite boundary routes overlap.** BCIS, BCCS, and BCEFS each define parts of bindings and exposures, with a fan-out disagreement and duplicated route concepts.
5. **Connection visibility is inconsistent.** The Core Protocol permits connections across composition branches without a visibility restriction; BCIS requires connections crossing Composite scopes to use public interfaces.
6. **Canonical World serialization is not settled.** BCIS requires materialized descendant records; BCCS allows an alternative compact canonical representation.
7. **The Runtime depends on contracts that are not yet fully declared.** In particular: compute dependency invalidation, effect result routing, document-operation publication, and deterministic value equality.

The recommendation is to resolve these contracts, update the six documents from one canonical schema, and create shared machine-readable conformance fixtures before calling anything `v0.1.0` stable.

#### 2. What is already consistent and worth preserving

The following ideas are repeated consistently enough to become the foundation of the frozen family:

- Blockie identity is independent of visual position.
- A Definition is a reusable, versioned blueprint; an Instance owns its own identity and state.
- Values and events are different communication kinds.
- Ports are typed, and connections are validated directionally.
- A reducer changes only the Model State of its owning Blockie.
- Compute is pure and cannot perform effects or emit events.
- Composite internals are encapsulated behind explicit public interfaces.
- Child instances created from a Composite template have fresh identities and isolated state.
- The same value dependency graph must be acyclic even when edges cross Composite boundaries.
- Events are delivered through a logical FIFO queue, not recursive calls.
- Effects execute after commit and their results return through a later transaction.
- Renderers see committed generations, not partially staged state.

These are strong architectural invariants. The work before freeze is primarily to make their schema and execution details agree.

---

#### 3. P0 — Direct contradictions that must be resolved

##### P0.1 Composite Definitions are forbidden from owning behavior in BCIS

**Conflicting clauses:**

- BCIS §6: a Composite Definition MUST NOT declare executable `compute` or `reduce` logic.
- BCIS §16: a Composite MUST NOT declare executable compute/reduce logic or independent mutable Model State.
- BCCS §5.1 and §5.3: a Composite MAY own Model State and reducer logic, and has Composite Compute.
- BCEFS §7: a Composite reducer handles public event inputs and private child-event handlers.
- BRES §13 and §24: Composite reducers and Composite Compute are part of the unified runtime.

BCEFS already calls out the BCIS contradiction, but merely documenting the conflict does not resolve it.

**Required change:** Update BCIS §6 and §16. A Composite is a first-class Blockie Instance and MAY own its own configuration, Model State, reducer, and Compute function. Its child template is an additional implementation structure, not a replacement for the ordinary Blockie contract.

The resulting model should be:

- Atomic Definition: ordinary ports, state/configuration, optional Compute, optional Reduce, optional effects.
- Composite Definition: the same ordinary Blockie contract, plus a template and explicit boundary declarations.
- Composite Compute may read only own state/configuration/public inputs and declared Internal Observations.
- Composite Reduce may read only own staged state/configuration and the delivered event context; it cannot inspect child state.

**Documents to change:** BCIS, Core Protocol, BCCS, BCEFS, BRES examples and conformance tests.

##### P0.2 Connected input resolution uses committed values in BTS and staged values in BRES

**Conflicting clauses:**

- BTS §11.4: a connected Compute input uses the current *committed* value from its source output.
- BRES §6.3, §10, and §12.3: Compute uses the staged generation after event processing, and connected inputs resolve from the *staged* source output.

These are observably different. If an event updates a source Blockie's Model State and its Compute output changes in the same transaction, a downstream Blockie must not calculate against the previous committed output.

**Required change:** BTS §11.4 should define type validation and fallback rules, but defer generation selection to BRES. BRES owns runtime timing. The normative rule should be: during value stabilization, a connected input resolves from the current transaction's staged output snapshot; an unaffected source output in that snapshot is inherited from the base committed generation. A connected source in error/blocked/unavailable status never falls back to the input default.

**Documents to change:** BTS §11.4; keep BRES §12.3 as the execution authority.

##### P0.3 Composite input fan-out is not consistently defined

**Conflicting/overlapping clauses:**

- BCIS §15 says an exposure maps one public port to one descendant port and prohibits a public input from fanning out through one exposure; multiple destinations require another mechanism.
- BCCS §6.1 explicitly allows one public input to bind to multiple child inputs.
- BCEFS §6.2 allows a public event input to have multiple child event bindings.

This may be reconcilable if every binding record has exactly one destination, but the current documents do not establish one canonical rule or schema.

**Required change:** A Composite public input MAY fan out through multiple explicit, individually identified binding records. Each binding record MUST have exactly one target. Each target value input MUST still have at most one effective producer. Event input bindings may have multiple destinations. Define separate value and event binding schemas, or define one route union with a required `kind` discriminator. Do not call all of these objects generically `exposure`.

**Documents to change:** BCIS §15, BCCS §6.1 and definition example, BCEFS schema and examples.

##### P0.4 Cross-scope connection rules contradict the Core Protocol

**Conflicting clauses:**

- Core Protocol §9.3 says two Blockies MAY connect even when they belong to different composition branches.
- BCIS §24 says a connection crossing different Composite scopes MUST pass through their respective public interfaces and be represented at their common visible scope.

The Core Protocol sentence can be read as allowing a connection from a private descendant in one Composite directly into a private descendant in another Composite, bypassing both interfaces.

**Required change:** Define *visible scope*. Ordinary connections may link endpoints visible in the same scope. A connection between separate Composite scopes MUST connect the Composites' public ports at their nearest common visible scope. A connection MUST NOT address a private descendant from outside its owning Composite. Update Core Protocol §9.3 and BCIS §24 to use identical wording.

**Documents to change:** Core Protocol §9.3–9.4; BCIS §24; BCCS/BCEFS nested-boundary rules.

##### P0.5 Canonical serialization of Composite instances has two alternatives

**Conflicting clauses:**

- BCIS §22 says canonical serialized Worlds MUST contain concrete instance records for all materialized descendants.
- BCCS §13.4 says a serializer MAY store either the materialized child hierarchy or a canonical Composite Instance plus its materialization mapping.

These are different canonical formats and have different validation, migration, and recovery requirements.

**Required change:** For v0.1, choose one canonical document representation. Recommended: materialized representation. Every descendant is a concrete record in the World instance registry; the Composite Instance additionally persists its member map and template provenance. A compact template-only storage form MAY be an implementation-specific storage optimization, but it MUST expand to the canonical materialized representation before validation/execution/export and MUST preserve exactly the same IDs and state.

**Documents to change:** BCIS §22; BCCS §13.4; Core Protocol §15.

---

#### 4. P1 — Canonical schema and ABI mismatches

##### P1.1 Definition schema has no single canonical shape

The Core Protocol's Definition example has no `kind` discriminator and uses `container.accepts_children`. BCIS requires `kind: atomic|composite`. BCCS adds a `composite` object and a nested `logic.compute` object. BCEFS adds `logic.reduce.handled_inputs`, private `event_handlers`, and dispatch routes. The Core Protocol still shows a flatter `logic` structure.

**Required change:** Publish one canonical Definition schema in the Core Protocol and have companion specs extend it by defining semantics, not by inventing parallel root-level shapes.

Recommended common shape:

```json
{
  "protocol": "blockies/0.1",
  "id": "org.example.poll",
  "version": "1.0.0",
  "digest": "sha256:...",
  "kind": "composite",
  "state": { "type": {}, "initial": {} },
  "config": { "type": {}, "defaults": {} },
  "ports": [],
  "logic": {
    "runtime": "blockies.javascript/1",
    "module": "sha256:...",
    "compute": { "export": "compute", "outputs": [] },
    "reduce": { "export": "reduce", "handled_inputs": [] }
  },
  "effects": [],
  "composite": {
    "parameters": [],
    "type_parameters": [],
    "template": {},
    "value_interface": {},
    "event_interface": {}
  }
}
```

This is a proposed organization, not a final schema. The important requirement is one schema and one authoritative meaning for every field. `kind` should distinguish atomic from composite. Remove or derive `container.accepts_children`; otherwise an atomic definition may appear to own children without being a Composite.

##### P1.2 The canonical BTS type encoding is not used throughout the Core Protocol

The Core Protocol Definition and Multiply examples use `"value_type": "number"` and raw JSON Schema-shaped `state.schema` / `config.schema` objects. BTS §1 says its recursive `kind`-based Type Expressions are canonical and supersede those JSON Schema fragments.

**Required change:** Replace all Core Protocol and appendix examples with BTS Type Expressions. Define `state.type` and `config.type` (or keep `schema`, but explicitly require BTS TypeExpr). Make it impossible to confuse JSON Schema with the canonical protocol type language.

##### P1.3 Compute and reducer ABIs disagree

The Core Protocol has positional conceptual signatures (`compute(state, config, inputs)` and `reduce(state, config, event)`) and context-object examples. BCEFS declares the context-object reducer ABI and adds `dispatch`. BRES defines context-object contexts and its own reducer result shape. BCCS adds `observed` to Composite Compute.

**Required change:** Declare one ABI in the Core Protocol:

```typescript
compute({ state, config, inputs, observed }) => outputs
reduce({ state, config, event }) => {
  state,
  dispatch,
  emit,
  effects
}
```

For atomic Blockies, `observed` is always `{}`. For Composites it contains only declared observation aliases. Atomic reducers MUST return no dispatch requests; Composite reducers MAY return only declared dispatch routes. The field names, required empty arrays, error behavior, and ABI version must be identical in every document.

##### P1.4 BCIS, BCCS, and BCEFS overlap in boundary-route declarations

- BCIS defines generic `exposures` for inputs/outputs, including events.
- BCCS defines `input_bindings`, `observations`, and `output_exposures` for values.
- BCEFS defines event input bindings, private handler routes, event exposures, and child dispatch routes.

This creates multiple names and owners for closely related data structures. BCIS also appears to treat an exposure as a one-to-one mapping, while BCCS models fan-out with multiple binding records.

**Required change:** Establish one ownership model:

- BCIS owns the template graph, Template Node IDs, materialization, member maps, ownership, and provenance. It defines how all template-local routes become concrete instance routes.
- BCCS exclusively owns value-boundary semantics: value input bindings, Internal Observations, value output exposures, and computed public outputs.
- BCEFS exclusively owns event-boundary semantics: event input bindings, private child-event handler routes, event output exposures, and reducer dispatch routes.
- BRES exclusively owns cross-domain ordering and transaction execution.

BCIS should not restate value/event route behavior in a generic `exposures` contract. It should reference BCCS/BCEFS and specify materialization/provenance for their declarations.

##### P1.5 Directly exposed outputs and computed outputs need one producer contract

BCCS §7.1 correctly requires exactly one producer for each public **value** output: one child Output Exposure or Composite Compute. Keep this rule, but make it explicit that it applies only to value outputs. Event outputs are message channels and may have multiple internal event producers/exposures plus Composite reducer emissions, with deterministic routing order.

Also remove duplicated `value_type` from Internal Observation records, or make it a required assertion exactly equal to the source port's specialized BTS type. The source port should be the canonical type authority; repeating it risks drift.

##### P1.6 Compute dependency invalidation is underspecified

BRES §12.2 speaks of state fields used by Compute and configuration fields declared as dependencies. However, the Compute ABI gives the function the full `state` and `config` objects, and no `state_dependencies` / `config_dependencies` declaration is defined. A Runtime cannot safely discover field reads by inspecting arbitrary JavaScript.

**Required change:** For v0.1, use the simple conservative rule: the entire Model State object and entire configuration object are dependencies of Compute. Any change to either invalidates that Blockie's Compute. A later optimization may add declared field/path dependencies, but it must not change results.

##### P1.7 Reducers deliberately cannot read value inputs; confirm this is the intended v0.1 limitation

BRES §11.3 forbids reducers from reading computed outputs or arbitrary connected values. This preserves the phase order (all reducers first, value stabilization second), but it means a reducer cannot make a decision based on a connected live value unless that information is copied into its own state/configuration or included in the event payload.

The Poll example must be designed accordingly: the Vote Processor must own the allowed options in its own state/configuration or receive the validation-relevant information in the event. It cannot secretly read an Options Blockie's current output.

**Required decision:** Either explicitly freeze this restriction for v0.1 and add tests/examples that obey it, or design a separate reducer-input snapshot contract before freeze. Do not leave the restriction implicit.

##### P1.8 Effect declarations do not define the complete result contract

Core Protocol and BRES define effect IDs, capabilities, requests, outbox handling, and post-commit execution. BRES also requires effect results to return as events to declared event inputs, but the Definition schema does not specify the success result type, failure type, or which event input receives each result.

**Required change:** Each effect declaration should specify at least:

- Effect ID and capability.
- Input BTS type.
- Whether it produces a result.
- Success-result BTS type and failure-error representation, when applicable.
- Declared completion event input(s), or an explicit fire-and-forget policy.
- Timeout/retry policy ownership (host-level or definition-level).

The host creates the effect request ID/idempotency key. Effect results MUST NOT mutate state directly. If a result is consumed by the World, its mapping to a declared event input must be unambiguous.

##### P1.9 Event identity and public-boundary redaction need one precise representation

BCEFS says forwarding preserves event identity and immutable event metadata. It also says a public Composite boundary presents the Composite as the visible source and hides private descendant IDs. These can coexist only if event identity metadata is separated from per-delivery/per-boundary presentation metadata.

**Required change:** Keep immutable event fields (event ID, origin, causal event ID, correlation ID, original creator/emitter) unchanged. Put route, destination, visible boundary source, and redaction data in a separate Delivery/Boundary View. External consumers see the Composite's public output as the source but do not receive private descendant identifiers. Never mutate the immutable logical event envelope while forwarding.

##### P1.10 Document revision changes and runtime generations need a complete publication rule

BRES §6.2 treats configuration/structure edits as document operations, not runtime events, and says affected computations become dirty before ordinary runtime transactions resume. It does not fully specify when the updated document and its recalculated outputs become visible together.

**Required change:** Define a document-operation commit protocol: validate operation against document revision N; atomically commit document revision N+1; rebuild/update graphs; stabilize all computations affected by the document edit; publish one coherent runtime generation associated with N+1. Alternatively, define a temporary `initializing/stabilizing` state in which renderers cannot observe mismatched document/output generations. A runtime transaction MUST never use new connections/config with stale outputs from the old revision as if coherent.

##### P1.11 The normative Runtime pseudocode must catch Compute failures locally

BRES §10 pseudocode places the full transaction inside a broad `try/catch`, while §14.3 says a Compute throw/trap or output-validation failure is computation-local and MUST NOT abort an otherwise valid state transaction. The pseudocode handles a returned invalid result, but does not explicitly show a local exception/trap boundary around `invoke_compute`. An implementation could incorrectly let a thrown Compute failure reach the transaction-fatal catch.

**Required change:** Wrap each Compute invocation in a node-local error boundary. A Compute throw, trap, timeout, or invalid output bundle MUST stage that compute node as `error`, invalidate its outputs for this generation, block affected descendants, and continue stabilizing independent branches. Only host/runtime-fatal failures should reach the transaction-wide abort path. Add a conformance test where Compute throws after a valid reducer state update and verify that the state commits while the computed output is error.

---

#### 5. P2 — Important ambiguities and incomplete contracts

##### P2.1 World root model

Core Protocol §10.3 requires exactly one root Blockie, and every other Blockie must be beneath it. But BCIS distinguishes `atomic` and `composite` definitions and only a Composite has a template. The root therefore needs a special status that is not currently specified: can it be an atomic container, or must every World use a built-in Composite root?

**Recommendation:** Make the World itself the synthetic root composition scope and allow one or more top-level Blockies. Every non-top-level Blockie has exactly one Composite owner. A future UI may choose to create a root Canvas/Page Composite, but the protocol should not require a fake root Blockie. If retaining one root Blockie is preferred, explicitly require it to use a built-in Composite root definition and define that definition.

##### P2.2 `container.accepts_children` duplicates `kind`

The Core Protocol uses `container.accepts_children`; BCIS uses `kind: atomic|composite`. These can disagree. Remove `accepts_children` or define it as derived: only a Composite can own a template hierarchy in v0.1. Visual grouping/layout should not create structural ownership independently of Composite semantics.

##### P2.3 State initialization and configuration precedence

BCIS permits definition initial state, template state initializers, parameters, and configuration initializers, but does not fully define whether template initializers replace or merge with definition defaults. The precedence for definition defaults, template initializers, instance config, and supplied parameters must be deterministic.

**Recommendation:** Define initializers as complete typed values or specify an exact merge algorithm. Avoid informal recursive merging. A simple v0.1 rule is: if no template initializer is present, use the child Definition's complete initial value; if present, it supplies the complete replacement value. Template parameters are immutable construction data and are not automatically runtime inputs.

##### P2.4 Clone and reset semantics need to include Composite-owned state

BCIS clone modes discuss child state; BCIS §16 currently denies Composite-owned state, while BCCS permits it. Once BCIS is corrected, `copy_state` and `reset` must say whether they copy/reset the Composite instance's own state and configuration as well as descendants. Reset's relation to BRES document operations versus runtime transactions also needs to be stated.

##### P2.5 Decimal canonicalization is internally inconsistent

BTS §5.5 says negative zero is normalized to `"0"`, while §5.5 also requires preserving trailing fractional zeroes (for example `"12.50"` must remain `"12.50"`). It also calls precision the number of significant digits but defines it as counting all digits. These rules need one mathematical definition.

**Required change:** Define whether `"-0.00"` canonicalizes to `"0.00"` (preserving scale) or `"0"` (discarding scale). Define precision as either total coefficient digits or significant digits, with examples including `0.001`, `0.010`, and `100.00`. Also define protocol value equality separately from numeric comparison: should `"12.50"` and `"12.5"` trigger downstream presentation updates even though they are numerically equal?

##### P2.6 Deterministic value equality is not fully defined

BCCS and BRES rely on BTS equality to decide whether to propagate output changes, but BTS does not fully specify equality for every type. Define structural equality for records/arrays/maps, instant equality for DateTime, numeric vs representation equality for Decimal, and equality behavior for negative zero and normalized strings. This affects caching and reactive invalidation.

##### P2.7 Named type identity and dependencies need pinning

BTS named types use a name such as `org.example.Customer`, but do not fully specify whether the name is local to a Definition, globally registered, or independently versioned. If named types can be external, their exact version/digest must be pinned. If they are local, the resolution scope must be stated.

##### P2.8 Definition and module digests need a canonical hashing rule

Core/BCIS require immutable content digests, but do not define exactly which bytes are hashed or how JSON is canonicalized. Decide whether the digest covers the canonical Definition document, the executable module, the complete package manifest/assets, or multiple separately named digests. The same package must hash identically across implementations.

##### P2.9 Canonical World field names and materialized route records

The Core Protocol uses `instances`; older examples use `blockies`; BCIS materializes descendants; BCCS sometimes uses compact storage wording. Freeze one World schema and define exactly where materialized boundary route records live. Instance map key and embedded `id` should be required to match.

##### P2.10 Event route scopes and IDs

BCEFS requires stable route IDs and sorting, but “unique within routing scope” needs a precise scope definition. Define whether IDs are unique within a Composite Definition's event interface, within one materialized Composite Instance, or globally in a World. The sort must operate over the complete destination set for a given emitted event after route expansion.

##### P2.11 Event envelope `transaction_id` across boundaries

The event envelope includes a transaction ID, while events may be published externally and later accepted by another World/Runtime. Define whether a cross-World delivery creates a new logical event and transaction with a causation/correlation link, or whether the original envelope is retained. Cross-World semantics can be explicitly deferred, but local v0.1 behavior must be clear.

##### P2.12 Atomic compute output failure granularity

BTS requires every declared value output to be returned. BRES marks a computation node as error when computation/output validation fails. State explicitly whether one invalid output invalidates the entire output bundle for that Compute invocation (recommended for v0.1), while unrelated direct Composite Output Exposures remain independently valid.

##### P2.13 Effect guarantees and outbox durability

BRES correctly avoids promising exactly-once execution, but a host's minimum effect-outbox durability and ordering guarantees should be explicit. In-memory-only execution can lose a committed effect after a crash. Decide whether durable handoff is required for a conforming persistent host or whether BRES defines only process-lifetime semantics.

##### P2.14 Error code namespace

BTS uses uppercase codes such as `TYPE_MISMATCH`; Composite and Runtime specs use lowercase snake case. Adopt one stable namespace format, for example `bts.type_mismatch`, `composite.output_unproduced`, `runtime.event_delivery_limit_exceeded`. Error codes are protocol surface and should not vary by implementation.

##### P2.15 BTS wire types need a JavaScript ABI mapping

BTS defines wire representations (for example Decimal as a canonical decimal string, DateTime as an RFC 3339 string, and Bytes as base64url), while the first runtime profile executes JavaScript. The ABI does not yet state the exact JavaScript values users receive or the supported operations/helpers for Decimal and other non-native types. A Decimal arrives as a string unless the ABI specifies a wrapper; ordinary JavaScript multiplication on that string would not implement exact decimal arithmetic.

**Required change:** Define a normative JS ABI mapping table. The safest v0.1 default is to expose the same immutable JSON-compatible representation as the wire format and provide versioned SDK helpers for Decimal arithmetic, Date/DateTime parsing, and Bytes. Do not silently convert Decimal to Number or pass host-specific class instances across the ABI.

##### P2.16 Runtime generation numbering needs a precise increment rule

BRES distinguishes document revision and runtime generation, but does not fully state whether every successful transaction increments the generation when the resulting Model State and outputs are unchanged (for example, a no-op reducer that still emits an external event or requests an effect). Nor does it state whether document stabilization creates a generation independently of event transactions.

**Required change:** Define generation as a monotonically increasing identifier for each successful committed runtime transaction, including successful transactions whose state/output values are unchanged but whose committed outboxes or transaction metadata change. Aborted transactions do not consume a committed generation. Define separately how document revisions establish or trigger runtime generations.

---

#### 6. Responsibility boundaries — proposed source of truth

The six documents should not each redefine the same execution behavior. Assign authority as follows:

| Document | Sole normative responsibility | Must defer to |
|---|---|---|
| Core Protocol | World/Definition/Instance base schema, identity, state categories, ports, connections, core Compute/Reduce/effect contracts, serialization envelope, versioning/security | BTS for types; BRES for transaction order; companions for Composite details |
| BTS | Type expressions, wire value semantics, assignability, generic rules, validation, value equality | Core Protocol for where types are used; BRES for when input snapshots are resolved |
| BCIS | Composite templates, Template Node IDs, parameters, materialization, member maps, child identity/state isolation, ownership, clone/reset/migration | BCCS for value boundaries; BCEFS for event boundaries; BRES for execution |
| BCCS | Value input bindings, Internal Observations, value output exposures, Composite Compute contract, Composite value dependencies | BTS for types; BCIS for template scope/materialization; BRES for scheduling/transactions |
| BCEFS | Event envelope, event routes, forwarding, child handlers, event exposure, dispatch, reducer event-context semantics, route ordering | BTS for payload types; BCIS for materialized scope; BRES for transaction phase ordering |
| BRES | Unified transaction state machine, event/value phase ordering, staging, stabilization, errors, commit/publication, effects, deterministic scheduling | All others for domain-specific object contracts |

**Cross-document rule:** A companion specification may define the meaning and validation of its own objects, but MUST NOT define an alternative global transaction algorithm. BRES is the sole authority for phase ordering and atomic commit semantics.

---

#### 7. Recommended consolidated protocol model

##### 7.1 Definition kinds

Add a required `kind` discriminator: `atomic` or `composite`.

- Atomic: no template; may declare Compute/Reduce/effects.
- Composite: has a template; may ALSO declare its own Model State, Compute, Reduce, and effects. Its descendants remain independently state-owning Blockies.

`container.accepts_children` should be removed or derived from `kind`. Do not allow an atomic definition to contain private template children in v0.1.

##### 7.2 Composite sections

Use one root `composite` object with distinct subcontracts:

```text
composite
├── parameters / type_parameters       (BCIS)
├── template
│   ├── nodes
│   ├── composition
│   └── internal_connections
├── value_interface                    (BCCS)
│   ├── input_bindings
│   ├── observations
│   └── output_exposures
└── event_interface                    (BCEFS)
    ├── input_bindings
    ├── child_handlers
    ├── output_exposures
    └── dispatch_routes
```

Each route record has one target/source and a stable local ID. Multiple value input bindings may share one public input, but one child value input still has only one effective producer. Value output producers remain exactly one per public value output. Event outputs may have multiple declared internal producers.

##### 7.3 Common execution ABI

Use a single context-object ABI throughout the family:

```typescript
compute({ state, config, inputs, observed }) => outputs

reduce({ state, config, event }) => ({
  state,
  dispatch,
  emit,
  effects
})
```

For atomic Blockies, `observed` is `{}` and `dispatch` is empty. For Composites, `observed` contains only BCCS aliases and `dispatch` can reference only BCEFS routes. All values use BTS serialization/type semantics.

##### 7.4 State and dependency invalidation

For v0.1, treat the entire `state` and `config` objects passed to Compute as dependencies. Any change to either invalidates that Compute. This avoids relying on JavaScript read-tracking or an undeclared field-dependency system.

Reducers read only their own latest staged state, own configuration, and the event payload. Explicitly retain this as a v0.1 limitation unless a separate reducer-input snapshot design is approved.

##### 7.5 World/connection scope

Prefer the World as a synthetic root composition scope, with an ordered set of top-level Blockies. A Composite is the only ordinary Blockie that owns private descendants. Connections may target only Blockies visible in the same scope; crossing Composite boundaries requires public input/output ports. If a single root Blockie is retained instead, define a mandatory built-in Composite WorldRoot and its lifecycle.

##### 7.6 Canonical persistence

Use materialized World serialization for v0.1:

- Every materialized Blockie has a concrete instance record and stable ID.
- Every Composite persists its member map, pinned Definition digest, parameters, and type arguments.
- Template-generated relationships persist stable IDs and provenance.
- Derived outputs/runtime generations may be stored in a separate runtime snapshot/cache, but are not canonical Model State in the World document.
- Loading validates materialization against the pinned template and never regenerates existing IDs.

---

#### 8. Required document-by-document edit plan

##### Core Protocol

1. Add `kind: atomic|composite` to Definition schema.
2. Replace raw JSON Schema examples and string-valued `value_type` examples with BTS Type Expressions.
3. Replace positional Compute/Reduce signatures with the common context-object ABI.
4. Add `dispatch` to reducer result for Composite reducers; explicitly state it is unavailable to atomic reducers.
5. Define `effects` declarations and result contracts.
6. Remove or derive `container.accepts_children`.
7. Restrict connections by visible composition scope.
8. Reconcile the World root model and canonical World field names.
9. Make Core transaction text high-level and defer detailed phase ordering to BRES.

##### BTS

1. Change connected Compute input resolution from committed to staged generation, or defer generation semantics to BRES.
2. Clarify Decimal negative-zero normalization and precision/scale definitions.
3. Define deterministic value equality used by BCCS/BRES.
4. Clarify named type resolution and versioning.
5. Standardize BTS error-code namespace.
6. Ensure all Core examples use BTS Type Expressions.

##### BCIS

1. Remove the prohibition on Composite Compute, Reduce, and own Model State.
2. Require Composite state/configuration under the same base Blockie rules as atomic instances.
3. Own only template definition, child instantiation, identity mapping, materialization, ownership, provenance, clone/reset, and migrations.
4. Remove generic value/event `exposures` semantics; reference BCCS and BCEFS route structures.
5. Harmonize value input fan-out with BCCS.
6. Make all instance/definition refs carry exact pinned definition identity/digest.
7. Choose materialized canonical serialization and align BCCS §13.4.
8. Define initializer replacement/merge precedence and clone/reset behavior for Composite-owned state.

##### BCCS

1. Keep Composite-owned state and Composite Compute.
2. Keep exactly one producer per public value output.
3. Make Input Binding value-only; move event binding to BCEFS.
4. Use source port type as canonical observation type, or require a matching assertion.
5. Remove or defer its transaction algorithm to BRES; retain only value-boundary computation semantics.
6. Align canonical serialization with BCIS.
7. State whole-state/config dependency invalidation for v0.1 unless field paths are explicitly declared.

##### BCEFS

1. Keep four event mechanisms and Composite reducer behavior.
2. Use the common reducer ABI from Core/BRES.
3. Define event route ID uniqueness scope and ordering precisely.
4. Separate immutable event envelope identity from delivery/boundary-visible metadata.
5. Keep its event-specific contracts, but defer global event/value phase ordering and commit semantics to BRES.
6. Define the exact handler declaration and effect-result event mapping in the canonical Definition schema.

##### BRES

1. Be the only normative source for transaction phase ordering and global scheduling.
2. Align its pseudocode with the final canonical ABI/schema.
3. State that value input resolution uses staged outputs after event processing.
4. Define how document operations produce a new document revision and coherent runtime generation.
5. Define publication of external event outputs and effect outbox records.
6. Specify compute output-bundle failure granularity.
7. Define minimum persistence guarantees for the effect outbox, or explicitly scope conformance to process-lifetime execution.
8. Keep cross-client/distributed concurrency out of v0.1.

---

#### 9. Freeze gates

Do not mark v0.1 stable until all of the following pass.

##### Gate A — Contract closure

- [ ] Composite can own Model State, Reduce, and Compute consistently in every document.
- [ ] One Definition schema and one Instance schema are normative.
- [ ] One Compute ABI and one Reduce ABI are normative.
- [ ] BTS is the only canonical type representation.
- [ ] All Composite value and event routes have one canonical schema and owner.
- [ ] Input fan-out and per-target cardinality rules are explicit.
- [ ] Connection visibility across Composite scopes is explicit.
- [ ] World root model is settled.
- [ ] Canonical materialized serialization is settled.

##### Gate B — Runtime semantics

- [ ] Reducer read set is settled (own state/config/event only, or an explicit value snapshot extension).
- [ ] Event FIFO ordering and action order agree in BCEFS and BRES.
- [ ] Event envelope and boundary redaction are compatible.
- [ ] Value input resolution uses one defined generation.
- [ ] Compute dependency invalidation is implementable without runtime code introspection.
- [ ] Error and blocked propagation are precise.
- [ ] Effects have typed result/failure routing.
- [ ] Document edits and runtime generations cannot be observed inconsistently.

##### Gate C — Portable serialization and conformance

- [ ] Definition, Instance, World, TypeExpr, Connection, Composition, and route schemas have machine-readable schemas.
- [ ] Definition/package digest calculation is deterministic and specified.
- [ ] Stable error-code namespaces are defined.
- [ ] Shared conformance fixtures define input World, accepted events, expected reducer order, expected staged/committed state, outputs/statuses, effects, and errors.
- [ ] At least two independent implementations (or one implementation plus a deliberately separate reference interpreter) can pass the same fixtures.

---

#### 10. Suggested v0.1 scope reductions

To keep v0.1 implementable, explicitly defer these rather than leaving them half-specified:

- Distributed or multi-writer transactions.
- CRDT conflict-resolution semantics.
- Reducers reading connected value inputs (unless a snapshot contract is designed now).
- Streaming ports and backpressure.
- Temporal feedback/Delay semantics.
- Dynamic mutation of private Composite topology.
- Cross-World transactions and event delivery guarantees.
- User-defined generic variance.
- Recursive type definitions.
- General-purpose effect workflows with long-running resumable state machines.

A small precise protocol is better than a broad protocol with ambiguous behavior.

---

#### 11. Final recommendation

**Current status: do not freeze v0.1 yet.**

The drafts are substantially aligned at the conceptual level, but they still contain normative contradictions and incomplete wire/runtime contracts. The most efficient next step is not to add another subsystem specification. It is to perform one consolidation pass:

1. Adopt the responsibility matrix in §6.
2. Apply the P0 fixes in §3.
3. Publish a canonical Definition/Instance/World/route schema and ABI.
4. Apply the P1 and P2 edits document by document.
5. Generate an integrated conformance corpus from the Poll, Counter, Multiply, nested Composite, and failure examples.
6. Re-run the same audit against the revised set.

When those gates pass, the family can be tagged as `v0.1.0` and implementation can begin against a stable contract rather than against six partially overlapping drafts.


---

# Part IV — Canonical JSON Schema package


## 1. Package status and interpretation

The current schema package uses JSON Schema Draft 2020-12. It provides structural validation entry points and examples for Definitions, Instances, Worlds, connections, Composite templates/interfaces, ports, and BTS Type Expressions.

**Important:** the schema package is a generated draft baseline. The consistency audit identifies mismatches between the schemas and prose specifications. It must be regenerated or amended after the canonical field names, Definition shape, ABI, root model, Composite routes, and BTS type encoding are frozen. Passing JSON Schema validation does not imply semantic validity or cross-reference validity.

## 2. Package files


### PACKAGE.json

```json
{
  "name": "blockies-v0.1-json-schemas",
  "version": "0.1.0-draft",
  "json_schema_dialect": "https://json-schema.org/draft/2020-12/schema",
  "canonical_schema_id": "urn:blockies:schemas:v0.1.0:canonical",
  "root_schema": "blockies-v0.1.schema.json",
  "status": "draft"
}
```


### SCHEMAS.json

```json
{
  "dialect": "https://json-schema.org/draft/2020-12/schema",
  "canonical_schema": "../blockies-v0.1.schema.json",
  "canonical_schema_id": "urn:blockies:schemas:v0.1.0:canonical",
  "entry_points": {
    "definition": "schemas/definition.schema.json",
    "instance": "schemas/instance.schema.json",
    "world": "schemas/world.schema.json",
    "connection": "schemas/connection.schema.json",
    "composition": "schemas/composition.schema.json",
    "composite_interface": "schemas/composite-interface.schema.json",
    "composite_template": "schemas/composite-template.schema.json",
    "type_expression": "schemas/type-expression.schema.json",
    "port": "schemas/port.schema.json"
  }
}
```


## 3. Schema package README


## Blockies v0.1 canonical JSON Schemas (draft)

This package is a canonical JSON Schema Draft 2020-12 bundle for the Blockies v0.1 draft family. It incorporates the proposed consistency-review resolutions: `kind` discriminator (`atomic` / `composite`), BTS type-expression encoding, a synthetic World root represented by `roots`, materialized Composite descendants, one Composite boundary model, and pinned definition references.

> **Status: draft, not frozen.** These schemas are an implementation aid and a proposed canonical wire shape. They do not by themselves settle every protocol semantic or cross-document invariant.

#### Files

- `blockies-v0.1.schema.json`: self-contained canonical schema bundle. Root schema validates a World; reusable entities are in `$defs`.
- `schemas/*.schema.json`: focused entry points referencing the canonical bundle by its URN. Register the root `blockies-v0.1.schema.json` under `urn:blockies:schemas:v0.1.0:canonical` in an offline validator. The bundle is intentionally stored only once to avoid duplicate schema IDs.
- `examples/`: illustrative Definition, Instance, Connection, and World documents.

#### Canonical schema entry points

The bundle exposes these fragments: `#/$defs/Definition`, `Instance`, `World`, `Connection`, `Composition`, `CompositeInterface`, `CompositeTemplate`, `TypeExpression`, and `Port`. The wrappers in `schemas/` reference those fragments.

#### Validate with Python

Install `jsonschema` and `referencing`, then register the bundle locally:

```python
import json
from pathlib import Path
from referencing import Registry, Resource
from jsonschema import Draft202012Validator

root = Path(__file__).parent
canonical = json.loads((root / "blockies-v0.1.schema.json").read_text())
registry = Registry().with_resource(
    canonical["$id"], Resource.from_contents(canonical)
)

world = json.loads((root / "examples/world.json").read_text())
Draft202012Validator(canonical, registry=registry).validate(world)

definition_schema = json.loads((root / "schemas/definition.schema.json").read_text())
definition = json.loads((root / "examples/atomic-number.definition.json").read_text())
Draft202012Validator(definition_schema, registry=registry).validate(definition)
```

The package includes a `validate_examples.py` script with offline validation and explicit semantic checks for the supplied examples.

#### Important: JSON Schema versus semantic validation

JSON Schema validates the shape and local constraints of an individual JSON document. It cannot, by itself, enforce all Blockies invariants that require looking up other records or resolving exact Definition versions. A conforming Blockies validator MUST additionally perform semantic validation, including at least:

1. Definition reference resolution by exact `(id, version, digest)`.
2. Instance object-key equality with `instance.id`.
3. Composite instance `members` totality/injectivity against the pinned template.
4. Every root/child exists exactly once; composition is acyclic and all instances are reachable.
5. Every connection endpoint resolves to a port in the pinned Definition.
6. Connection kind, direction, type assignability, cardinality, and visible-scope checks.
7. Composite route endpoints, handlers, ports, and public interface direction/type compatibility.
8. Exactly one producer for every Composite public value output: either one exposure or Composite Compute, never both.
9. Unique IDs within the required scope (ports, nodes, connections, routes, parameters, handlers).
10. Template materialization and relationship provenance are consistent with the pinned template digest.
11. State, config, parameter, and initializer values validate against BTS types after generic substitution.
12. Definition and module digests match the canonical bytes under a separately specified hashing algorithm.

These checks are listed in `SEMANTIC_VALIDATION.md`.

#### Canonical data model choices made here

- `Definition.kind` is required and is `atomic` or `composite`.
- Atomic and Composite Definitions share the same base fields, including optional Compute and Reduce logic and their own state/configuration. A Composite additionally has `composite`.
- Public ports live in `Definition.ports`; Composite boundaries are grouped under `composite.value_interface` and `composite.event_interface`.
- Composite input bindings are explicit one-target routes. A public input may fan out through multiple records. A child value input still has at most one effective producer.
- Internal observations do not duplicate their source port type; the source Definition is the type authority.
- Event child handlers declare their accepted payload type; each source event output must be assignable to it.
- A World is a synthetic root scope. Its top-level Blockies are listed in `roots`; no artificial root Blockie is required.
- Composite descendants are materialized as ordinary records in `World.instances`; `members` maps template node IDs to their stable instance IDs.
- Generated composition/connection/route IDs are persisted in the Composite instance's `materialization.relationship_ids`. Generated world relationships carry `origin` provenance.
- Effect declarations include request type and success/failure event input IDs. The target ports must be event inputs with compatible payloads.

#### Important draft caveats

- The schema constrains the lexical form of digests but does not define canonical serialization/hash bytes.
- The schema cannot validate data values against a dynamically resolved BTS type expression; use the BTS semantic validator.
- `extensions` and layout data are syntactically open maps; extension-specific schemas must validate their contents.
- A `Definition` is immutable and its digest must cover its canonical definition package; the exact package hashing procedure remains a freeze gate.
- Effect delivery durability/idempotency and distributed collaboration remain runtime/host contracts, not JSON Schema concerns.

#### Suggested package layout

Keep the canonical schema bundle as the single source of truth. Do not manually duplicate `$defs` into independent schema files. Add wrappers or generated schema entry points from this bundle.


## 4. Semantic validation contract


## Blockies v0.1 semantic validation checklist

JSON Schema validation is necessary but insufficient. An implementation claiming Core Protocol conformance MUST run these checks after shape validation and after resolving exact Definition references.

#### Definitions

- `Definition.kind == atomic` MUST NOT contain `composite`; `kind == composite` MUST contain it (schema enforced).
- Port IDs MUST be unique within a Definition.
- Type parameter names and named type names MUST be unique in their scopes.
- Every type parameter reference MUST resolve; every named type reference MUST resolve; recursive aliases are prohibited in v0.1.
- Every `logic.compute.outputs` ID MUST identify a value output port.
- Every effect success/failure event ID MUST identify an event input port; request/result capabilities must be authorized by the host.
- Definition dependencies and template child references MUST resolve by exact ID, version, and digest.

#### Instances and materialization

- `World.instances[key].id` MUST equal `key`.
- An instance MUST reference a pinned Definition.
- `instance.composite` MUST exist exactly when the referenced Definition has `kind == composite`.
- Atomic instances MUST NOT carry `composite` data.
- Composite `members` MUST be total over template nodes and injective. Every member ID MUST resolve to one instance and no member may be reused by another template node.
- Child definition refs, generic arguments, parameter values, config initializers, and state initializers MUST match the pinned template.
- `materialization.template_digest` MUST equal the pinned Composite Definition's template digest.
- Every generated relationship ID MUST resolve to exactly one relationship of the expected kind and provenance.
- Loading MUST reuse persisted IDs; it MUST NOT reallocate child or relationship IDs.

#### World and composition

- Every instance MUST appear exactly once either in `roots` or as a composition child.
- Every root MUST exist and MUST NOT have a parent.
- Every composition parent and child MUST exist; parent/child pairs MUST be unique.
- Composition MUST be acyclic and every instance MUST be reachable from exactly one World root.
- A parent must be a Composite instance whose Definition permits template containment; ordinary instances cannot own arbitrary child instances. (For v0.1, template ownership is the only supported containment mechanism.)

#### Connections

- Every endpoint instance and port MUST exist in the pinned Definition.
- `kind` MUST match both endpoint port kinds. Source MUST be output; target MUST be input.
- Value output type MUST be assignable to target value input type under BTS.
- Event output payload type MUST be assignable to target event input payload type under BTS.
- A value input MUST have at most one effective producer, counting both ordinary connections and Composite input bindings.
- Direct connections MUST obey visible-scope rules: connections crossing Composite boundaries use public Composite ports; private descendants cannot be addressed from outside their Composite scope.
- The complete flattened value dependency graph, including bindings, observations, exposures, and Composite Compute nodes, MUST be acyclic.

#### Composite interfaces

- Value input bindings MUST originate at public value input ports and target descendant value input ports in the Composite's own template scope. Multiple binding records may fan out from one public input.
- Event input bindings MUST originate at public event input ports and target descendant event input ports in the Composite's own template scope.
- Internal observations MUST reference descendant value output ports, not state/config/private runtime data. Their alias IDs MUST be unique.
- Value output exposures MUST reference descendant value outputs and public value outputs. Each public value output MUST have exactly one producer: one output exposure OR Composite Compute.
- Event handlers MUST have unique IDs. Child handler routes MUST reference child event outputs and declared handler IDs, and source payloads must be assignable to handler payload types.
- Event output exposures MUST reference child event outputs and public event outputs. Multiple child event producers may expose to one public event output, subject to deterministic route ordering.
- Dispatch routes MUST target descendant event inputs in the Composite's own template scope.
- Parent/child nested Composite boundaries MUST be respected; outer Composites may target only the nested Composite's public ports.

#### Runtime-bound values

- Initial state, configuration defaults, parameters, and template initializers MUST validate against their resolved BTS Type Expressions after generic substitution.
- Compute output values MUST validate against the declared output Type Expressions.
- Event payloads MUST validate against receiving event input or private handler Type Expressions.
- Reducer next state MUST validate against the owning instance's state schema.
- Missing, null, and empty values MUST retain their BTS distinctions.


## 5. Complete JSON Schema sources


The following are the machine-readable schema sources distributed in the bundle. They are included verbatim as JSON code blocks.


### `blockies-v0.1.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:canonical",
  "title": "Blockies Protocol v0.1 canonical schemas",
  "description": "Canonical JSON Schema Draft 2020-12 bundle for Blockies v0.1. Cross-record and BTS semantic constraints are specified separately.",
  "$ref": "#/$defs/World",
  "$defs": {
    "Identifier": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "TemplateNodeId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^[A-Za-z][A-Za-z0-9._-]*$"
    },
    "Version": {
      "type": "string",
      "pattern": "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$"
    },
    "Digest": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "JsonValue": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "boolean"
        },
        {
          "type": "number"
        },
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "$ref": "#/$defs/JsonValue"
          }
        },
        {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/JsonValue"
          }
        }
      ]
    },
    "DefinitionRef": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "version": {
          "$ref": "#/$defs/Version"
        },
        "digest": {
          "$ref": "#/$defs/Digest"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "version",
        "digest"
      ]
    },
    "Endpoint": {
      "type": "object",
      "properties": {
        "blockie": {
          "$ref": "#/$defs/Identifier"
        },
        "port": {
          "$ref": "#/$defs/Identifier"
        }
      },
      "additionalProperties": false,
      "required": [
        "blockie",
        "port"
      ]
    },
    "TemplateEndpoint": {
      "type": "object",
      "properties": {
        "node": {
          "$ref": "#/$defs/TemplateNodeId"
        },
        "port": {
          "$ref": "#/$defs/Identifier"
        }
      },
      "additionalProperties": false,
      "required": [
        "node",
        "port"
      ]
    },
    "PrimitiveType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "primitive"
        },
        "name": {
          "enum": [
            "null",
            "boolean",
            "integer",
            "number",
            "decimal",
            "string",
            "bytes",
            "date",
            "time",
            "datetime",
            "duration",
            "unknown",
            "never"
          ]
        },
        "minimum": {
          "type": "number"
        },
        "maximum": {
          "type": "number"
        },
        "precision": {
          "type": "integer",
          "minimum": 1
        },
        "scale": {
          "type": "integer",
          "minimum": 0
        },
        "min_length": {
          "type": "integer",
          "minimum": 0
        },
        "max_length": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "kind",
        "name"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "name": {
                "const": "integer"
              }
            },
            "required": [
              "name"
            ]
          },
          "then": {
            "properties": {
              "minimum": {
                "type": "integer"
              },
              "maximum": {
                "type": "integer"
              },
              "precision": false,
              "scale": false,
              "min_length": false,
              "max_length": false
            }
          }
        },
        {
          "if": {
            "properties": {
              "name": {
                "const": "number"
              }
            },
            "required": [
              "name"
            ]
          },
          "then": {
            "properties": {
              "precision": false,
              "scale": false,
              "min_length": false,
              "max_length": false
            }
          }
        },
        {
          "if": {
            "properties": {
              "name": {
                "const": "decimal"
              }
            },
            "required": [
              "name"
            ]
          },
          "then": {
            "properties": {
              "minimum": false,
              "maximum": false,
              "min_length": false,
              "max_length": false
            }
          }
        },
        {
          "if": {
            "properties": {
              "name": {
                "const": "string"
              }
            },
            "required": [
              "name"
            ]
          },
          "then": {
            "properties": {
              "minimum": false,
              "maximum": false,
              "precision": false,
              "scale": false
            }
          }
        }
      ]
    },
    "ArrayType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "array"
        },
        "items": {
          "$ref": "#/$defs/TypeExpression"
        },
        "min_items": {
          "type": "integer",
          "minimum": 0
        },
        "max_items": {
          "type": "integer",
          "minimum": 0
        },
        "unique_items": {
          "type": "boolean"
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "items"
      ],
      "allOf": [
        {
          "if": {
            "required": [
              "min_items",
              "max_items"
            ]
          },
          "then": {
            "properties": {
              "max_items": {
                "minimum": 0
              }
            }
          }
        }
      ]
    },
    "TupleType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "tuple"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/TypeExpression"
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "items"
      ]
    },
    "RecordType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "record"
        },
        "properties": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/TypeExpression"
          }
        },
        "required": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "uniqueItems": true
        },
        "additional_properties": {
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/$defs/TypeExpression"
            }
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "properties"
      ]
    },
    "MapType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "map"
        },
        "values": {
          "$ref": "#/$defs/TypeExpression"
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "values"
      ]
    },
    "UnionType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "union"
        },
        "variants": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/TypeExpression"
          }
        },
        "discriminator": {
          "type": "string",
          "minLength": 1
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "variants"
      ]
    },
    "LiteralType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "literal"
        },
        "value": {
          "type": [
            "string",
            "number",
            "integer",
            "boolean",
            "null"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "value"
      ]
    },
    "EnumType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "enum"
        },
        "base": {
          "enum": [
            "string",
            "integer"
          ]
        },
        "values": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "type": [
              "string",
              "integer"
            ]
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "base",
        "values"
      ]
    },
    "ParameterType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "parameter"
        },
        "name": {
          "$ref": "#/$defs/Identifier"
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "name"
      ]
    },
    "NamedType": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "named"
        },
        "name": {
          "$ref": "#/$defs/Identifier"
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "name"
      ]
    },
    "TypeExpression": {
      "oneOf": [
        {
          "$ref": "#/$defs/PrimitiveType"
        },
        {
          "$ref": "#/$defs/ArrayType"
        },
        {
          "$ref": "#/$defs/TupleType"
        },
        {
          "$ref": "#/$defs/RecordType"
        },
        {
          "$ref": "#/$defs/MapType"
        },
        {
          "$ref": "#/$defs/UnionType"
        },
        {
          "$ref": "#/$defs/LiteralType"
        },
        {
          "$ref": "#/$defs/EnumType"
        },
        {
          "$ref": "#/$defs/ParameterType"
        },
        {
          "$ref": "#/$defs/NamedType"
        }
      ]
    },
    "TypeParameter": {
      "type": "object",
      "properties": {
        "name": {
          "$ref": "#/$defs/Identifier"
        },
        "constraint": {
          "$ref": "#/$defs/TypeExpression"
        },
        "default": {
          "$ref": "#/$defs/TypeExpression"
        }
      },
      "additionalProperties": false,
      "required": [
        "name"
      ]
    },
    "ValueInputPort": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "direction": {
          "const": "input"
        },
        "kind": {
          "const": "value"
        },
        "value_type": {
          "$ref": "#/$defs/TypeExpression"
        },
        "required": {
          "type": "boolean"
        },
        "default": {
          "$ref": "#/$defs/JsonValue"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "direction",
        "kind",
        "value_type",
        "required"
      ]
    },
    "ValueOutputPort": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "direction": {
          "const": "output"
        },
        "kind": {
          "const": "value"
        },
        "value_type": {
          "$ref": "#/$defs/TypeExpression"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "direction",
        "kind",
        "value_type"
      ]
    },
    "EventInputPort": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "direction": {
          "const": "input"
        },
        "kind": {
          "const": "event"
        },
        "payload_type": {
          "$ref": "#/$defs/TypeExpression"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "direction",
        "kind",
        "payload_type"
      ]
    },
    "EventOutputPort": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "direction": {
          "const": "output"
        },
        "kind": {
          "const": "event"
        },
        "payload_type": {
          "$ref": "#/$defs/TypeExpression"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "direction",
        "kind",
        "payload_type"
      ]
    },
    "Port": {
      "oneOf": [
        {
          "$ref": "#/$defs/ValueInputPort"
        },
        {
          "$ref": "#/$defs/ValueOutputPort"
        },
        {
          "$ref": "#/$defs/EventInputPort"
        },
        {
          "$ref": "#/$defs/EventOutputPort"
        }
      ]
    },
    "ModuleExport": {
      "type": "object",
      "properties": {
        "runtime": {
          "type": "string",
          "minLength": 1
        },
        "module_digest": {
          "$ref": "#/$defs/Digest"
        },
        "export": {
          "type": "string",
          "minLength": 1
        }
      },
      "additionalProperties": false,
      "required": [
        "runtime",
        "module_digest",
        "export"
      ]
    },
    "ComputeLogic": {
      "type": "object",
      "properties": {
        "runtime": {
          "type": "string",
          "minLength": 1
        },
        "module_digest": {
          "$ref": "#/$defs/Digest"
        },
        "export": {
          "type": "string",
          "minLength": 1
        },
        "outputs": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Identifier"
          },
          "uniqueItems": true
        }
      },
      "additionalProperties": false,
      "required": [
        "runtime",
        "module_digest",
        "export",
        "outputs"
      ]
    },
    "ReduceLogic": {
      "$ref": "#/$defs/ModuleExport"
    },
    "Logic": {
      "type": "object",
      "properties": {
        "compute": {
          "$ref": "#/$defs/ComputeLogic"
        },
        "reduce": {
          "$ref": "#/$defs/ReduceLogic"
        }
      },
      "additionalProperties": false,
      "required": []
    },
    "EffectDeclaration": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "capability": {
          "type": "string",
          "minLength": 1
        },
        "request_type": {
          "$ref": "#/$defs/TypeExpression"
        },
        "success_event": {
          "$ref": "#/$defs/Identifier"
        },
        "failure_event": {
          "$ref": "#/$defs/Identifier"
        },
        "idempotency": {
          "enum": [
            "required",
            "recommended",
            "none"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "capability",
        "request_type",
        "success_event",
        "failure_event"
      ]
    },
    "Presentation": {
      "type": "object",
      "properties": {
        "renderer": {
          "type": "string",
          "minLength": 1
        },
        "version": {
          "$ref": "#/$defs/Version"
        },
        "props": {
          "type": "object"
        }
      },
      "additionalProperties": false,
      "required": [
        "renderer",
        "version"
      ]
    },
    "DefinitionState": {
      "type": "object",
      "properties": {
        "schema": {
          "$ref": "#/$defs/RecordType"
        },
        "initial": {
          "type": "object"
        }
      },
      "additionalProperties": false,
      "required": [
        "schema",
        "initial"
      ]
    },
    "DefinitionConfig": {
      "type": "object",
      "properties": {
        "schema": {
          "$ref": "#/$defs/RecordType"
        },
        "defaults": {
          "type": "object"
        }
      },
      "additionalProperties": false,
      "required": [
        "schema",
        "defaults"
      ]
    },
    "Definition": {
      "type": "object",
      "properties": {
        "protocol": {
          "const": "blockies/0.1"
        },
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "version": {
          "$ref": "#/$defs/Version"
        },
        "kind": {
          "enum": [
            "atomic",
            "composite"
          ]
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string"
        },
        "type_parameters": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/TypeParameter"
          },
          "uniqueItems": true
        },
        "types": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/TypeExpression"
          }
        },
        "state": {
          "$ref": "#/$defs/DefinitionState"
        },
        "config": {
          "$ref": "#/$defs/DefinitionConfig"
        },
        "ports": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Port"
          }
        },
        "logic": {
          "$ref": "#/$defs/Logic"
        },
        "effects": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EffectDeclaration"
          }
        },
        "presentation": {
          "$ref": "#/$defs/Presentation"
        },
        "dependencies": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/DefinitionRef"
          }
        },
        "composite": {
          "$ref": "#/$defs/CompositeDefinitionBody"
        },
        "extensions": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "required": [
        "protocol",
        "id",
        "version",
        "kind",
        "name",
        "state",
        "config",
        "ports",
        "logic"
      ],
      "additionalProperties": false,
      "allOf": [
        {
          "if": {
            "properties": {
              "kind": {
                "const": "composite"
              }
            },
            "required": [
              "kind"
            ]
          },
          "then": {
            "required": [
              "composite"
            ]
          },
          "else": {
            "not": {
              "required": [
                "composite"
              ]
            }
          }
        }
      ]
    },
    "TemplateExpression": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "literal"
            },
            "value": {
              "$ref": "#/$defs/JsonValue"
            }
          },
          "additionalProperties": false,
          "required": [
            "kind",
            "value"
          ]
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "parameter"
            },
            "name": {
              "$ref": "#/$defs/Identifier"
            }
          },
          "additionalProperties": false,
          "required": [
            "kind",
            "name"
          ]
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "type_argument"
            },
            "name": {
              "$ref": "#/$defs/Identifier"
            }
          },
          "additionalProperties": false,
          "required": [
            "kind",
            "name"
          ]
        }
      ]
    },
    "TemplateParameter": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "type": {
          "$ref": "#/$defs/TypeExpression"
        },
        "required": {
          "type": "boolean"
        },
        "default": {
          "$ref": "#/$defs/JsonValue"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "type",
        "required"
      ]
    },
    "TemplateNode": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/TemplateNodeId"
        },
        "definition": {
          "$ref": "#/$defs/DefinitionRef"
        },
        "type_arguments": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/TypeExpression"
          }
        },
        "config": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/TemplateExpression"
          }
        },
        "state": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/TemplateExpression"
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "definition"
      ]
    },
    "TemplateComposition": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "parent": {
          "oneOf": [
            {
              "const": "$self"
            },
            {
              "$ref": "#/$defs/TemplateNodeId"
            }
          ]
        },
        "child": {
          "$ref": "#/$defs/TemplateNodeId"
        },
        "slot": {
          "type": "string"
        },
        "order": {
          "type": "integer",
          "minimum": 0
        },
        "layout": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "parent",
        "child"
      ]
    },
    "TemplateConnection": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "kind": {
          "enum": [
            "value",
            "event"
          ]
        },
        "from": {
          "$ref": "#/$defs/TemplateEndpoint"
        },
        "to": {
          "$ref": "#/$defs/TemplateEndpoint"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "kind",
        "from",
        "to"
      ]
    },
    "CompositeTemplate": {
      "type": "object",
      "properties": {
        "nodes": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/TemplateNode"
          }
        },
        "composition": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/TemplateComposition"
          }
        },
        "connections": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/TemplateConnection"
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "nodes",
        "composition",
        "connections"
      ]
    },
    "BoundaryValueInputBinding": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "public_port": {
          "$ref": "#/$defs/Identifier"
        },
        "target": {
          "$ref": "#/$defs/TemplateEndpoint"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "public_port",
        "target"
      ]
    },
    "InternalObservation": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "source": {
          "$ref": "#/$defs/TemplateEndpoint"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "source"
      ]
    },
    "ValueOutputExposure": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "source": {
          "$ref": "#/$defs/TemplateEndpoint"
        },
        "public_port": {
          "$ref": "#/$defs/Identifier"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "source",
        "public_port"
      ]
    },
    "ValueInterface": {
      "type": "object",
      "properties": {
        "input_bindings": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/BoundaryValueInputBinding"
          }
        },
        "observations": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/InternalObservation"
          }
        },
        "output_exposures": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ValueOutputExposure"
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "input_bindings",
        "observations",
        "output_exposures"
      ]
    },
    "BoundaryEventInputBinding": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "public_port": {
          "$ref": "#/$defs/Identifier"
        },
        "target": {
          "$ref": "#/$defs/TemplateEndpoint"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "public_port",
        "target"
      ]
    },
    "EventHandler": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "payload_type": {
          "$ref": "#/$defs/TypeExpression"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "payload_type"
      ]
    },
    "ChildEventHandlerRoute": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "source": {
          "$ref": "#/$defs/TemplateEndpoint"
        },
        "handler": {
          "$ref": "#/$defs/Identifier"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "source",
        "handler"
      ]
    },
    "EventOutputExposure": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "source": {
          "$ref": "#/$defs/TemplateEndpoint"
        },
        "public_port": {
          "$ref": "#/$defs/Identifier"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "source",
        "public_port"
      ]
    },
    "EventDispatchRoute": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "target": {
          "$ref": "#/$defs/TemplateEndpoint"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "target"
      ]
    },
    "EventInterface": {
      "type": "object",
      "properties": {
        "input_bindings": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/BoundaryEventInputBinding"
          }
        },
        "handlers": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EventHandler"
          }
        },
        "child_handlers": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ChildEventHandlerRoute"
          }
        },
        "output_exposures": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EventOutputExposure"
          }
        },
        "dispatch_routes": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/EventDispatchRoute"
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "input_bindings",
        "handlers",
        "child_handlers",
        "output_exposures",
        "dispatch_routes"
      ]
    },
    "CompositeInterface": {
      "type": "object",
      "properties": {
        "value_interface": {
          "$ref": "#/$defs/ValueInterface"
        },
        "event_interface": {
          "$ref": "#/$defs/EventInterface"
        }
      },
      "additionalProperties": false,
      "required": [
        "value_interface",
        "event_interface"
      ]
    },
    "CompositeDefinitionBody": {
      "type": "object",
      "properties": {
        "parameters": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/TemplateParameter"
          }
        },
        "template": {
          "$ref": "#/$defs/CompositeTemplate"
        },
        "value_interface": {
          "$ref": "#/$defs/ValueInterface"
        },
        "event_interface": {
          "$ref": "#/$defs/EventInterface"
        }
      },
      "additionalProperties": false,
      "required": [
        "parameters",
        "template",
        "value_interface",
        "event_interface"
      ]
    },
    "RelationshipIdMap": {
      "type": "object",
      "propertyNames": {
        "$ref": "#/$defs/Identifier"
      },
      "additionalProperties": {
        "$ref": "#/$defs/Identifier"
      }
    },
    "CompositeMaterialization": {
      "type": "object",
      "properties": {
        "template_digest": {
          "$ref": "#/$defs/Digest"
        },
        "generation": {
          "type": "integer",
          "minimum": 1
        },
        "relationship_ids": {
          "type": "object",
          "properties": {
            "composition": {
              "$ref": "#/$defs/RelationshipIdMap"
            },
            "connections": {
              "$ref": "#/$defs/RelationshipIdMap"
            },
            "routes": {
              "$ref": "#/$defs/RelationshipIdMap"
            }
          },
          "additionalProperties": false,
          "required": [
            "composition",
            "connections",
            "routes"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "template_digest",
        "generation",
        "relationship_ids"
      ]
    },
    "CompositeInstanceData": {
      "type": "object",
      "properties": {
        "members": {
          "type": "object",
          "propertyNames": {
            "$ref": "#/$defs/TemplateNodeId"
          },
          "additionalProperties": {
            "$ref": "#/$defs/Identifier"
          }
        },
        "materialization": {
          "$ref": "#/$defs/CompositeMaterialization"
        }
      },
      "additionalProperties": false,
      "required": [
        "members",
        "materialization"
      ]
    },
    "Instance": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "definition": {
          "$ref": "#/$defs/DefinitionRef"
        },
        "type_arguments": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/TypeExpression"
          }
        },
        "parameters": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/JsonValue"
          }
        },
        "config": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/JsonValue"
          }
        },
        "state": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/JsonValue"
          }
        },
        "composite": {
          "$ref": "#/$defs/CompositeInstanceData"
        },
        "metadata": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "definition",
        "config",
        "state"
      ]
    },
    "RelationshipOrigin": {
      "type": "object",
      "properties": {
        "kind": {
          "const": "template"
        },
        "owner": {
          "$ref": "#/$defs/Identifier"
        },
        "local_id": {
          "$ref": "#/$defs/Identifier"
        },
        "template_digest": {
          "$ref": "#/$defs/Digest"
        }
      },
      "additionalProperties": false,
      "required": [
        "kind",
        "owner",
        "local_id",
        "template_digest"
      ]
    },
    "Connection": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "kind": {
          "enum": [
            "value",
            "event"
          ]
        },
        "from": {
          "$ref": "#/$defs/Endpoint"
        },
        "to": {
          "$ref": "#/$defs/Endpoint"
        },
        "origin": {
          "$ref": "#/$defs/RelationshipOrigin"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "kind",
        "from",
        "to"
      ]
    },
    "Composition": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "parent": {
          "$ref": "#/$defs/Identifier"
        },
        "child": {
          "$ref": "#/$defs/Identifier"
        },
        "slot": {
          "type": "string"
        },
        "order": {
          "type": "integer",
          "minimum": 0
        },
        "layout": {
          "type": "object",
          "additionalProperties": true
        },
        "origin": {
          "$ref": "#/$defs/RelationshipOrigin"
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "parent",
        "child"
      ]
    },
    "DependencyRef": {
      "$ref": "#/$defs/DefinitionRef"
    },
    "World": {
      "type": "object",
      "properties": {
        "protocol": {
          "const": "blockies/0.1"
        },
        "id": {
          "$ref": "#/$defs/Identifier"
        },
        "document_revision": {
          "type": "integer",
          "minimum": 0
        },
        "roots": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Identifier"
          },
          "uniqueItems": true
        },
        "dependencies": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/DependencyRef"
          }
        },
        "instances": {
          "type": "object",
          "propertyNames": {
            "$ref": "#/$defs/Identifier"
          },
          "additionalProperties": {
            "$ref": "#/$defs/Instance"
          }
        },
        "composition": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Composition"
          }
        },
        "connections": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Connection"
          }
        },
        "metadata": {
          "type": "object",
          "additionalProperties": true
        },
        "extensions": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "additionalProperties": false,
      "required": [
        "protocol",
        "id",
        "roots",
        "dependencies",
        "instances",
        "composition",
        "connections"
      ]
    }
  }
}
```


### `schemas/composite-interface.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:composite-interface",
  "title": "Blockies v0.1 CompositeInterface schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/CompositeInterface"
}
```


### `schemas/composite-template.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:composite-template",
  "title": "Blockies v0.1 CompositeTemplate schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/CompositeTemplate"
}
```


### `schemas/composition.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:composition",
  "title": "Blockies v0.1 Composition schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/Composition"
}
```


### `schemas/connection.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:connection",
  "title": "Blockies v0.1 Connection schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/Connection"
}
```


### `schemas/definition.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:definition",
  "title": "Blockies v0.1 Definition schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/Definition"
}
```


### `schemas/instance.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:instance",
  "title": "Blockies v0.1 Instance schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/Instance"
}
```


### `schemas/port.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:port",
  "title": "Blockies v0.1 Port schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/Port"
}
```


### `schemas/type-expression.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:type-expression",
  "title": "Blockies v0.1 TypeExpression schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/TypeExpression"
}
```


### `schemas/world.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:blockies:schemas:v0.1.0:world",
  "title": "Blockies v0.1 World schema entry point",
  "$ref": "urn:blockies:schemas:v0.1.0:canonical#/$defs/World"
}
```



## 6. Schema package examples and fixtures


### `examples/atomic-dataset.definition.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "org.blockies.core.dataset",
  "version": "1.0.0",
  "kind": "atomic",
  "name": "Dataset",
  "state": {
    "schema": {
      "kind": "record",
      "properties": {
        "count": {
          "kind": "primitive",
          "name": "integer"
        },
        "dataset": {
          "kind": "array",
          "items": {
            "kind": "record",
            "properties": {
              "option_id": {
                "kind": "primitive",
                "name": "string"
              },
              "count": {
                "kind": "primitive",
                "name": "integer"
              }
            },
            "required": [
              "option_id",
              "count"
            ],
            "additional_properties": false
          }
        }
      },
      "required": [
        "count",
        "dataset"
      ],
      "additional_properties": false
    },
    "initial": {
      "count": 0,
      "dataset": []
    }
  },
  "config": {
    "schema": {
      "kind": "record",
      "properties": {},
      "required": [],
      "additional_properties": false
    },
    "defaults": {}
  },
  "ports": [
    {
      "id": "count",
      "direction": "output",
      "kind": "value",
      "value_type": {
        "kind": "primitive",
        "name": "integer"
      }
    },
    {
      "id": "dataset",
      "direction": "output",
      "kind": "value",
      "value_type": {
        "kind": "array",
        "items": {
          "kind": "record",
          "properties": {
            "option_id": {
              "kind": "primitive",
              "name": "string"
            },
            "count": {
              "kind": "primitive",
              "name": "integer"
            }
          },
          "required": [
            "option_id",
            "count"
          ],
          "additional_properties": false
        }
      }
    }
  ],
  "logic": {
    "compute": {
      "runtime": "blockies.javascript/1",
      "module_digest": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      "export": "compute",
      "outputs": [
        "count",
        "dataset"
      ]
    }
  }
}
```


### `examples/atomic-instance.json`

```json
{
  "id": "number_a",
  "definition": {
    "id": "org.blockies.core.number",
    "version": "1.0.0",
    "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
  },
  "config": {
    "label": "A"
  },
  "state": {
    "value": 10
  }
}
```


### `examples/atomic-multiply.definition.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "org.blockies.core.multiply",
  "version": "1.0.0",
  "kind": "atomic",
  "name": "Multiply",
  "state": {
    "schema": {
      "kind": "record",
      "properties": {},
      "required": [],
      "additional_properties": false
    },
    "initial": {}
  },
  "config": {
    "schema": {
      "kind": "record",
      "properties": {},
      "required": [],
      "additional_properties": false
    },
    "defaults": {}
  },
  "ports": [
    {
      "id": "a",
      "direction": "input",
      "kind": "value",
      "value_type": {
        "kind": "primitive",
        "name": "number"
      },
      "required": true
    },
    {
      "id": "b",
      "direction": "input",
      "kind": "value",
      "value_type": {
        "kind": "primitive",
        "name": "number"
      },
      "required": true
    },
    {
      "id": "result",
      "direction": "output",
      "kind": "value",
      "value_type": {
        "kind": "primitive",
        "name": "number"
      }
    }
  ],
  "logic": {
    "compute": {
      "runtime": "blockies.javascript/1",
      "module_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "export": "compute",
      "outputs": [
        "result"
      ]
    }
  }
}
```


### `examples/atomic-number.definition.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "org.blockies.core.number",
  "version": "1.0.0",
  "kind": "atomic",
  "name": "Number",
  "state": {
    "schema": {
      "kind": "record",
      "properties": {
        "value": {
          "kind": "primitive",
          "name": "number"
        }
      },
      "required": [
        "value"
      ],
      "additional_properties": false
    },
    "initial": {
      "value": 0
    }
  },
  "config": {
    "schema": {
      "kind": "record",
      "properties": {
        "label": {
          "kind": "primitive",
          "name": "string"
        }
      },
      "required": [],
      "additional_properties": false
    },
    "defaults": {
      "label": "Number"
    }
  },
  "ports": [
    {
      "id": "value",
      "direction": "output",
      "kind": "value",
      "value_type": {
        "kind": "primitive",
        "name": "number"
      }
    }
  ],
  "logic": {
    "compute": {
      "runtime": "blockies.javascript/1",
      "module_digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "export": "compute",
      "outputs": [
        "value"
      ]
    }
  },
  "dependencies": []
}
```


### `examples/atomic-options.definition.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "org.blockies.core.options",
  "version": "1.0.0",
  "kind": "atomic",
  "name": "Options",
  "state": {
    "schema": {
      "kind": "record",
      "properties": {},
      "required": [],
      "additional_properties": false
    },
    "initial": {}
  },
  "config": {
    "schema": {
      "kind": "record",
      "properties": {
        "items": {
          "kind": "array",
          "items": {
            "kind": "primitive",
            "name": "string"
          }
        }
      },
      "required": [
        "items"
      ],
      "additional_properties": false
    },
    "defaults": {
      "items": []
    }
  },
  "ports": [],
  "logic": {}
}
```


### `examples/atomic-text.definition.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "org.blockies.core.text",
  "version": "1.0.0",
  "kind": "atomic",
  "name": "Text",
  "state": {
    "schema": {
      "kind": "record",
      "properties": {},
      "required": [],
      "additional_properties": false
    },
    "initial": {}
  },
  "config": {
    "schema": {
      "kind": "record",
      "properties": {
        "text": {
          "kind": "primitive",
          "name": "string"
        }
      },
      "required": [
        "text"
      ],
      "additional_properties": false
    },
    "defaults": {
      "text": ""
    }
  },
  "ports": [],
  "logic": {}
}
```


### `examples/composite-instance.json`

```json
{
  "id": "poll_instance",
  "definition": {
    "id": "org.example.poll",
    "version": "1.0.0",
    "digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
  },
  "parameters": {
    "question": "What next?",
    "options": [
      "Roadmap",
      "Architecture"
    ]
  },
  "config": {
    "allow_multiple_votes": false
  },
  "state": {
    "accepted_count": 0
  },
  "composite": {
    "members": {
      "question": "poll_question",
      "options": "poll_options",
      "results": "poll_results"
    },
    "materialization": {
      "template_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
      "generation": 1,
      "relationship_ids": {
        "composition": {
          "c-question": "rel-poll-001",
          "c-options": "rel-poll-002",
          "c-results": "rel-poll-003"
        },
        "connections": {},
        "routes": {
          "accepted_count": "route-poll-001",
          "expose_results": "route-poll-002"
        }
      }
    }
  }
}
```


### `examples/composite-interface.json`

```json
{
  "value_interface": {
    "input_bindings": [],
    "observations": [
      {
        "id": "accepted_count",
        "source": {
          "node": "results",
          "port": "count"
        }
      }
    ],
    "output_exposures": [
      {
        "id": "expose_results",
        "source": {
          "node": "results",
          "port": "dataset"
        },
        "public_port": "results"
      }
    ]
  },
  "event_interface": {
    "input_bindings": [],
    "handlers": [],
    "child_handlers": [],
    "output_exposures": [],
    "dispatch_routes": []
  }
}
```


### `examples/composite-poll.definition.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "org.example.poll",
  "version": "1.0.0",
  "kind": "composite",
  "name": "Poll",
  "state": {
    "schema": {
      "kind": "record",
      "properties": {
        "accepted_count": {
          "kind": "primitive",
          "name": "integer"
        }
      },
      "required": [
        "accepted_count"
      ],
      "additional_properties": false
    },
    "initial": {
      "accepted_count": 0
    }
  },
  "config": {
    "schema": {
      "kind": "record",
      "properties": {
        "allow_multiple_votes": {
          "kind": "primitive",
          "name": "boolean"
        }
      },
      "required": [],
      "additional_properties": false
    },
    "defaults": {
      "allow_multiple_votes": false
    }
  },
  "ports": [
    {
      "id": "expected_audience",
      "direction": "input",
      "kind": "value",
      "value_type": {
        "kind": "primitive",
        "name": "integer"
      },
      "required": true
    },
    {
      "id": "on_vote",
      "direction": "input",
      "kind": "event",
      "payload_type": {
        "kind": "record",
        "properties": {
          "option_id": {
            "kind": "primitive",
            "name": "string"
          }
        },
        "required": [
          "option_id"
        ],
        "additional_properties": false
      }
    },
    {
      "id": "results",
      "direction": "output",
      "kind": "value",
      "value_type": {
        "kind": "array",
        "items": {
          "kind": "record",
          "properties": {
            "option_id": {
              "kind": "primitive",
              "name": "string"
            },
            "count": {
              "kind": "primitive",
              "name": "integer"
            }
          },
          "required": [
            "option_id",
            "count"
          ],
          "additional_properties": false
        }
      }
    },
    {
      "id": "completion_rate",
      "direction": "output",
      "kind": "value",
      "value_type": {
        "kind": "primitive",
        "name": "number"
      }
    },
    {
      "id": "vote_accepted",
      "direction": "output",
      "kind": "event",
      "payload_type": {
        "kind": "record",
        "properties": {
          "option_id": {
            "kind": "primitive",
            "name": "string"
          }
        },
        "required": [
          "option_id"
        ],
        "additional_properties": false
      }
    }
  ],
  "logic": {
    "compute": {
      "runtime": "blockies.javascript/1",
      "module_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "export": "compute",
      "outputs": [
        "completion_rate"
      ]
    },
    "reduce": {
      "runtime": "blockies.javascript/1",
      "module_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "export": "reduce"
    }
  },
  "composite": {
    "parameters": [
      {
        "id": "question",
        "type": {
          "kind": "primitive",
          "name": "string"
        },
        "required": true
      },
      {
        "id": "options",
        "type": {
          "kind": "array",
          "items": {
            "kind": "primitive",
            "name": "string"
          }
        },
        "required": true
      }
    ],
    "template": {
      "nodes": [
        {
          "id": "question",
          "definition": {
            "id": "org.blockies.core.text",
            "version": "1.0.0",
            "digest": "sha256:4444444444444444444444444444444444444444444444444444444444444444"
          },
          "config": {
            "text": {
              "kind": "parameter",
              "name": "question"
            }
          },
          "state": {}
        },
        {
          "id": "options",
          "definition": {
            "id": "org.blockies.core.options",
            "version": "1.0.0",
            "digest": "sha256:6666666666666666666666666666666666666666666666666666666666666666"
          },
          "config": {
            "items": {
              "kind": "parameter",
              "name": "options"
            }
          },
          "state": {}
        },
        {
          "id": "results",
          "definition": {
            "id": "org.blockies.core.dataset",
            "version": "1.0.0",
            "digest": "sha256:5555555555555555555555555555555555555555555555555555555555555555"
          },
          "config": {},
          "state": {}
        }
      ],
      "composition": [
        {
          "id": "c-question",
          "parent": "$self",
          "child": "question",
          "slot": "header",
          "order": 0
        },
        {
          "id": "c-options",
          "parent": "$self",
          "child": "options",
          "slot": "body",
          "order": 1
        },
        {
          "id": "c-results",
          "parent": "$self",
          "child": "results",
          "slot": "results",
          "order": 2
        }
      ],
      "connections": []
    },
    "value_interface": {
      "input_bindings": [],
      "observations": [
        {
          "id": "accepted_count",
          "source": {
            "node": "results",
            "port": "count"
          }
        }
      ],
      "output_exposures": [
        {
          "id": "expose_results",
          "source": {
            "node": "results",
            "port": "dataset"
          },
          "public_port": "results"
        }
      ]
    },
    "event_interface": {
      "input_bindings": [],
      "handlers": [],
      "child_handlers": [],
      "output_exposures": [],
      "dispatch_routes": []
    }
  },
  "dependencies": [
    {
      "id": "org.blockies.core.text",
      "version": "1.0.0",
      "digest": "sha256:4444444444444444444444444444444444444444444444444444444444444444"
    },
    {
      "id": "org.blockies.core.options",
      "version": "1.0.0",
      "digest": "sha256:6666666666666666666666666666666666666666666666666666666666666666"
    },
    {
      "id": "org.blockies.core.dataset",
      "version": "1.0.0",
      "digest": "sha256:5555555555555555555555555555555555555555555555555555555555555555"
    }
  ]
}
```


### `examples/connection.json`

```json
{
  "id": "conn-multiply-a",
  "kind": "value",
  "from": {
    "blockie": "number_a",
    "port": "value"
  },
  "to": {
    "blockie": "multiply_001",
    "port": "a"
  }
}
```


### `examples/world.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "world-demo",
  "document_revision": 1,
  "roots": [
    "multiply_001",
    "poll_instance"
  ],
  "dependencies": [
    {
      "id": "org.blockies.core.number",
      "version": "1.0.0",
      "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
    },
    {
      "id": "org.blockies.core.multiply",
      "version": "1.0.0",
      "digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
    },
    {
      "id": "org.example.poll",
      "version": "1.0.0",
      "digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
    },
    {
      "id": "org.blockies.core.text",
      "version": "1.0.0",
      "digest": "sha256:4444444444444444444444444444444444444444444444444444444444444444"
    },
    {
      "id": "org.blockies.core.options",
      "version": "1.0.0",
      "digest": "sha256:6666666666666666666666666666666666666666666666666666666666666666"
    },
    {
      "id": "org.blockies.core.dataset",
      "version": "1.0.0",
      "digest": "sha256:5555555555555555555555555555555555555555555555555555555555555555"
    }
  ],
  "instances": {
    "number_a": {
      "id": "number_a",
      "definition": {
        "id": "org.blockies.core.number",
        "version": "1.0.0",
        "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
      },
      "config": {
        "label": "A"
      },
      "state": {
        "value": 10
      }
    },
    "number_b": {
      "id": "number_b",
      "definition": {
        "id": "org.blockies.core.number",
        "version": "1.0.0",
        "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
      },
      "config": {
        "label": "B"
      },
      "state": {
        "value": 20
      }
    },
    "multiply_001": {
      "id": "multiply_001",
      "definition": {
        "id": "org.blockies.core.multiply",
        "version": "1.0.0",
        "digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
      },
      "config": {},
      "state": {}
    },
    "poll_instance": {
      "id": "poll_instance",
      "definition": {
        "id": "org.example.poll",
        "version": "1.0.0",
        "digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
      },
      "parameters": {
        "question": "What next?",
        "options": [
          "Roadmap",
          "Architecture"
        ]
      },
      "config": {
        "allow_multiple_votes": false
      },
      "state": {
        "accepted_count": 0
      },
      "composite": {
        "members": {
          "question": "poll_question",
          "options": "poll_options",
          "results": "poll_results"
        },
        "materialization": {
          "template_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
          "generation": 1,
          "relationship_ids": {
            "composition": {
              "c-question": "rel-poll-001",
              "c-options": "rel-poll-002",
              "c-results": "rel-poll-003"
            },
            "connections": {},
            "routes": {
              "accepted_count": "route-poll-001",
              "expose_results": "route-poll-002"
            }
          }
        }
      }
    },
    "poll_question": {
      "id": "poll_question",
      "definition": {
        "id": "org.blockies.core.text",
        "version": "1.0.0",
        "digest": "sha256:4444444444444444444444444444444444444444444444444444444444444444"
      },
      "config": {
        "text": "What next?"
      },
      "state": {}
    },
    "poll_options": {
      "id": "poll_options",
      "definition": {
        "id": "org.blockies.core.options",
        "version": "1.0.0",
        "digest": "sha256:6666666666666666666666666666666666666666666666666666666666666666"
      },
      "config": {
        "items": [
          "Roadmap",
          "Architecture"
        ]
      },
      "state": {}
    },
    "poll_results": {
      "id": "poll_results",
      "definition": {
        "id": "org.blockies.core.dataset",
        "version": "1.0.0",
        "digest": "sha256:5555555555555555555555555555555555555555555555555555555555555555"
      },
      "config": {},
      "state": {
        "count": 0,
        "dataset": []
      }
    }
  },
  "composition": [
    {
      "id": "rel-poll-001",
      "parent": "poll_instance",
      "child": "poll_question",
      "slot": "header",
      "order": 0,
      "origin": {
        "kind": "template",
        "owner": "poll_instance",
        "local_id": "c-question",
        "template_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
      }
    },
    {
      "id": "rel-poll-002",
      "parent": "poll_instance",
      "child": "poll_options",
      "slot": "body",
      "order": 1,
      "origin": {
        "kind": "template",
        "owner": "poll_instance",
        "local_id": "c-options",
        "template_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
      }
    },
    {
      "id": "rel-poll-003",
      "parent": "poll_instance",
      "child": "poll_results",
      "slot": "results",
      "order": 2,
      "origin": {
        "kind": "template",
        "owner": "poll_instance",
        "local_id": "c-results",
        "template_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
      }
    }
  ],
  "connections": [
    {
      "id": "conn-multiply-a",
      "kind": "value",
      "from": {
        "blockie": "number_a",
        "port": "value"
      },
      "to": {
        "blockie": "multiply_001",
        "port": "a"
      }
    },
    {
      "id": "conn-multiply-b",
      "kind": "value",
      "from": {
        "blockie": "number_b",
        "port": "value"
      },
      "to": {
        "blockie": "multiply_001",
        "port": "b"
      }
    }
  ]
}
```


### `tests/valid/valid-minimal-world.json`

```json
{
  "protocol": "blockies/0.1",
  "id": "empty-world",
  "roots": [],
  "dependencies": [],
  "instances": {},
  "composition": [],
  "connections": []
}
```


### `tests/invalid/invalid-unknown-protocol.json`

```json
{
  "protocol": "blockies/9.9",
  "id": "bad",
  "roots": [],
  "dependencies": [],
  "instances": {},
  "composition": [],
  "connections": []
}
```



---

# Part V — Rust validator implementation status


## 1. Role of the validator

The validator is a reference implementation baseline for static document validation. It is not the Blockies Runtime and must not be treated as proof that a World can be executed correctly. It has two passes:

1. JSON Schema Draft 2020-12 validation for document shape.
2. Semantic validation for BTS type expressions and values, generic specialization, package/Definition resolution, port compatibility, Composite templates and interfaces, materialization, ownership, and dependency-graph constraints.

The runtime must still validate live events, reducer results, effects, and Compute outputs during execution.

## 2. Current implementation status

- A Rust crate and CLI baseline exists under `blockies-validator/`.
- Source modules include `lib.rs`, `types.rs`, `semantic.rs`, and `main.rs`.
- Examples cover atomic Definitions, Composite Poll, Instances, Connections, a manifest, and a World.
- Unit/integration test source is included.
- The authoring environment did not provide `cargo` or `rustc`; compilation and Rust tests were therefore **not verified**.
- JSON Schema and bundled example-shape checks were reported as passing with Python `jsonschema` 4.26.0.
- Definition digests are accepted from manifest metadata and compared lexically/exactly; package bytes are not re-hashed because canonical package-byte hashing is not standardized.

## 3. Immediate implementation steps

1. Run `cargo fmt --check`, `cargo test`, and `cargo clippy --all-targets --all-features -- -D warnings` on a machine with the Rust toolchain.
2. Fix compilation and test failures before adding features.
3. Compare implementation checks against the freeze gates; do not let validator behavior silently become the protocol definition.
4. Add negative fixtures for every semantic rule, not only valid examples.
5. Align the schema and Rust parser from one canonical BTS TypeExpr representation.
6. Add deterministic diagnostics with stable error-code namespaces and JSON Pointer-style paths.
7. Add property-based tests for type assignability, graph cycles, composite member maps, and route materialization.
8. Add integration fixtures that compare expected reducer delivery order, staged state, outputs, statuses, effects, and commit generation.

## 4. Validator command reference

```bash
cargo test

cargo run -- validate-world \
  --world examples/world.json \
  --manifest examples/definitions.manifest.json \
  --schema schemas/blockies-v0.1.schema.json

cargo run -- validate-world \
  --world examples/world.json \
  --manifest examples/definitions.manifest.json \
  --json

cargo run -- validate-definition \
  --definition examples/composite-poll.definition.json \
  --manifest examples/definitions.manifest.json
```

The draft CLI uses exit code `0` for valid, `1` for document validation errors, and `2` for I/O, JSON, or schema compilation failures. Confirm this behavior with actual CLI tests after compilation.

## 5. Known validator limitations

- Digest verification: digest strings are validated and matched against manifest metadata but not recomputed from package bytes.
- Symbolic generic forwarding into nested Composite templates needs a formal substitution rule.
- Nested Composite template construction parameters are not fully represented in the current schema.
- Materialized route IDs have uniqueness/coverage checks but no separate World route registry contract.
- Dispatch route-to-handler/emitted-event association needs further protocol clarification.
- Compute dependency granularity is conservatively whole-state/whole-config in the intended v0.1 baseline; schema declarations do not yet represent field-level dependencies.
- Runtime values require live validation beyond document validation.
- Effect capability authorization, durable outbox semantics, retries, and idempotency remain host/runtime concerns requiring exact contracts.
- Datetime parsing does not normalize timestamps or validate timezone database rules.

## 6. Validator README (source)


## Blockies Validator (v0.1 draft)

A Rust library and CLI for validating Blockies Protocol v0.1 draft Worlds and Definitions.

Validation runs in two passes:

1. **JSON Schema Draft 2020-12** shape validation against `schemas/blockies-v0.1.schema.json`.
2. **Semantic validation** for BTS type expressions and values, generic specialization, Definition package resolution, ports, connections, Composite templates/interfaces/materialization, World ownership, and the flattened value dependency graph.

> **Status:** implementation baseline for the current draft schemas. It is not a declaration that the protocol is frozen. The package hashing procedure is not standardized yet, so Definition digests are accepted as manifest metadata and matched exactly; package bytes are not re-hashed.
>
> **Verification status:** all bundled JSON examples have been checked against the canonical Draft 2020-12 schema using Python `jsonschema` 4.26.0. Rust unit and integration tests are included, but were not executable in the authoring environment because `cargo` and `rustc` were unavailable. Run `cargo test` with the Rust toolchain before relying on this crate in production; compilation and Rust test results remain unverified here.

#### Requirements

- Rust 1.75+
- Cargo

#### Layout

```text
blockies-validator/
├── Cargo.toml
├── schemas/blockies-v0.1.schema.json
├── examples/
│   ├── definitions.manifest.json
│   ├── *.definition.json
│   └── world.json
├── src/
│   ├── lib.rs
│   ├── main.rs
│   ├── semantic.rs
│   └── types.rs
└── tests/validation.rs
```

#### Run

```bash
cargo test

cargo run -- validate-world \
  --world examples/world.json \
  --manifest examples/definitions.manifest.json \
  --schema schemas/blockies-v0.1.schema.json

cargo run -- validate-world \
  --world examples/world.json \
  --manifest examples/definitions.manifest.json \
  --json

cargo run -- validate-definition \
  --definition examples/composite-poll.definition.json \
  --manifest examples/definitions.manifest.json
```

Exit codes: `0` valid, `1` document validation errors, `2` I/O, JSON, or schema compilation failure.

#### Definition package manifest

The canonical Definition document does not contain a digest. The manifest maps a Definition's `(id, version)` to the digest referenced by a World:

```json
{
  "packages": [
    {
      "file": "atomic-number.definition.json",
      "digest": "sha256:<64 lowercase hexadecimal characters>"
    }
  ]
}
```

Paths are relative to the manifest directory. Absolute paths, parent-directory traversal, and symlinks resolving outside that directory are rejected. In this draft the digest is trusted metadata. The validator checks lexical form and exact reference equality, but does not verify the digest against package bytes because canonical package serialization and hashing have not been frozen.

#### Library API

```rust
use blockies_validator::{
    BlockiesValidator, DefinitionPackage, SemanticOptions,
};
use serde_json::Value;

let validator = BlockiesValidator::from_schema_file(
    "schemas/blockies-v0.1.schema.json",
)?;
let world: Value = serde_json::from_str(
    &std::fs::read_to_string("examples/world.json")?
)?;
let definition: Value = serde_json::from_str(
    &std::fs::read_to_string("examples/atomic-number.definition.json")?
)?;
let packages = vec![DefinitionPackage::new(
    "sha256:<64 lowercase hexadecimal characters>",
    definition,
)];
let report = validator.validate_world(
    &world,
    &packages,
    SemanticOptions::strict(),
);
if !report.is_valid() {
    for issue in report.diagnostics {
        eprintln!("{} {}: {}", issue.code, issue.path, issue.message);
    }
}
# Ok::<(), Box<dyn std::error::Error>>(())
```

#### Implemented semantic checks

- BTS primitive values, arrays, tuples, records, maps, unions, literals, enums, named aliases, and type parameters.
- Integer-to-number widening; no implicit string/decimal coercions.
- Structural record assignability and collection compatibility.
- Generic type arguments, defaults, and constraints for concrete instance specialization.
- Definition state/config initial values and instance state/config values.
- Definition dependencies and exact `(id, version, digest)` resolution.
- Compute output ports and effect result event ports.
- Template child references, type arguments, initializer expressions, composition, and sibling-only internal connections.
- Composite value input bindings, observations, output exposures, event input bindings, child handlers, event output exposures, and dispatch targets.
- Instance key/ID equality; Composite members totality/injectivity; exact materialization relationship IDs and provenance.
- World roots, single ownership, composition acyclicity/reachability, direct-connection visibility, port compatibility, and value-input cardinality.
- Flattened value dependency cycle detection, including Composite input bindings, observations, and output exposures.

#### Known v0.1 draft limitations

1. **Digest verification:** digests are validated lexically and matched exactly, but are not recomputed from package bytes.
2. **Symbolic generic forwarding:** concrete generic instances are supported. A nested generic template forwarding a parent type parameter into a child generic Definition needs a formal substitution rule before full support.
3. **Nested Composite template parameters:** the current `TemplateNode` schema has no field for supplying a nested Composite's construction parameters. This is a schema-level gap; the validator does not invent a field.
4. **Materialized routes:** route IDs are checked for total key coverage and uniqueness, but there is no standalone World route registry to resolve route IDs to objects.
5. **Dispatch semantics:** dispatch targets are checked, but the current schema does not associate an individual dispatch route with a specific handler/emitted event. This needs a protocol clarification.
6. **Compute dependency granularity:** any state/config change is assumed to invalidate the owning Blockie's compute outputs. Field-level dependency declarations are not represented.
7. **Runtime values:** this is a document validator. It checks declared type contracts and persisted values; a runtime must also validate live compute outputs, event payloads, and reducer results before commit.
8. **Effects:** declaration and result-port references are checked. Host capability authorization, durable outbox delivery, retries, and idempotency are runtime/host responsibilities.
9. **Datetime profile:** the BTS checks RFC 3339-like syntax and calendar/time ranges; it does not normalize timestamps or perform timezone database validation.

#### Why two passes?

JSON Schema validates document shape. It cannot resolve Definition references, check whether a connected port exists in the pinned Definition, perform BTS assignability, or validate that a Composite member map matches a materialized child hierarchy. Those checks live in the semantic pass by design.

#### Verification status

Before using this crate:

```bash
cargo test
cargo run -- validate-world --world examples/world.json --manifest examples/definitions.manifest.json
```

The authoring container used for this draft did not have `cargo` or `rustc`, so no Rust compilation, unit-test, or integration-test result is claimed. The JSON Schema bundle and all supplied example document shapes were independently checked with Python `jsonschema` 4.26.0. Rust test execution remains a required follow-up.


---

# Part VI — Decisions to make and next steps

## 1. Recommended work sequence

The sequence below is dependency-ordered. Do not start implementing the full runtime before the contracts it relies on are stable.

### Milestone 0 — Ratify the architecture baseline

- [ ] Accept the responsibility matrix in Part I §3.
- [ ] Confirm that Composite is a first-class Blockie with its own Model State, optional Reduce, and optional Compute.
- [ ] Confirm the three separate graph models: composition, value dependency, event routing.
- [ ] Confirm single-writer transactions per World for v0.1.
- [ ] Confirm reducers cannot read connected value inputs in v0.1, or explicitly design a reducer input snapshot before freeze.
- [ ] Confirm staged-generation input resolution for Compute.
- [ ] Confirm local execution does not require CRDT/network infrastructure.

### Milestone 1 — Close P0 contract conflicts

- [ ] Update BCIS to remove Composite behavior/state prohibitions.
- [ ] Update BTS to defer generation timing to BRES and use staged outputs during value stabilization.
- [ ] Define one value binding schema and one event binding schema; each route has one target and a stable local ID.
- [ ] Specify fan-out: multiple explicit bindings per public input; one effective producer per value input.
- [ ] Define visible scopes and forbid private-descendant cross-scope connections.
- [ ] Choose materialized World serialization as canonical and align BCIS/BCCS/CORE.

### Milestone 2 — Canonical schema and ABI

- [ ] Publish one canonical Definition schema with `kind: atomic | composite`.
- [ ] Remove/derive `container.accepts_children`.
- [ ] Use BTS Type Expressions for state, config, ports, event payloads, observations, and outputs.
- [ ] Define the common Compute ABI including `observed` (empty for atomic Blockies).
- [ ] Define the common Reduce result ABI including `state`, `dispatch`, `emit`, and `effects` (with exact required/empty semantics).
- [ ] Define effect input, success, failure, completion-event, fire-and-forget, timeout, retry, and idempotency contracts.
- [ ] Define immutable event envelope versus per-delivery/boundary metadata.
- [ ] Define output failure granularity and error code namespaces.

### Milestone 3 — Close P2 serialization and determinism

- [ ] Choose World synthetic root with ordered `roots`, or define a mandatory built-in WorldRoot Blockie.
- [ ] Define configuration/state initialization precedence and merge behavior.
- [ ] Define clone, reset, delete, and reparent semantics for Composite-owned and child state.
- [ ] Define canonical Decimal syntax, scale/precision limits, and negative-zero normalization.
- [ ] Define deterministic value equality for all BTS types.
- [ ] Pin named types by ID/version/digest and define alias-cycle rules.
- [ ] Define canonical package serialization and digest calculation.
- [ ] Define event route ID uniqueness and ordering scopes.
- [ ] Define transaction/correlation IDs at event boundaries.
- [ ] Define document-revision/runtime-generation publication and increment rules.
- [ ] Define durable or process-lifetime outbox guarantees.
- [ ] Define BTS-to-JavaScript wire/runtime mappings.

### Milestone 4 — Regenerate schemas and validator

- [ ] Regenerate JSON Schema from the ratified canonical definitions, rather than hand-maintaining divergent shapes.
- [ ] Ensure component schema fragments and bundle root all reference one set of `$defs` and anchors.
- [ ] Update every example to the canonical names and ABI.
- [ ] Compile and test the Rust validator.
- [ ] Add all semantic checks from the semantic validation contract.
- [ ] Add negative fixtures for invalid ports, generic constraints, wrong definition digests, ownership violations, scope violations, duplicate producers, cycles, malformed event routes, and invalid Composite materialization.
- [ ] Add property-based tests for BTS assignability and graph validation.

### Milestone 5 — Integrated conformance corpus

- [ ] Multiply: initial values, changed input, dependency invalidation, deterministic output.
- [ ] Counter: event delivery, reducer state transition, output recomputation.
- [ ] Poll: child event → Composite handler/reducer → staged state → value stabilization → exposed outputs.
- [ ] Nested Composite: forwarding, observations, dispatch, and public boundary visibility.
- [ ] Failure: reducer abort, Compute-local failure, blocked descendants, effect failure/result transaction.
- [ ] Document edit: connection/config change, graph rebuild, coherent generation publication.
- [ ] Run the same JSON fixtures and expected traces against the Rust validator and a separate reference interpreter/runtime test harness.

### Milestone 6 — Freeze and implementation

- [ ] Complete all freeze gates below.
- [ ] Remove contradictory normative clauses from every source specification.
- [ ] Publish one final schema package and conformance corpus.
- [ ] Tag the family `v0.1.0` only after the requirements pass.
- [ ] Begin the Rust runtime implementation against the frozen contracts.

## 2. Freeze gates

### Gate A — Contract closure

- [ ] Composite can own Model State, Reduce, and Compute consistently everywhere.
- [ ] One Definition schema and one Instance schema are normative.
- [ ] One Compute ABI and one Reduce ABI are normative.
- [ ] BTS is the only canonical type representation.
- [ ] All Composite value/event routes have one canonical schema and owner.
- [ ] Input fan-out and per-target cardinality are explicit.
- [ ] Connection visibility across Composite scopes is explicit.
- [ ] World root model is settled.
- [ ] Canonical materialized serialization is settled.

### Gate B — Runtime semantics

- [ ] Reducer read set is settled.
- [ ] Event FIFO ordering and action ordering agree in BCEFS and BRES.
- [ ] Event envelope and boundary redaction are compatible.
- [ ] Value input resolution uses one defined generation.
- [ ] Compute invalidation is implementable without JavaScript read introspection.
- [ ] Error and blocked propagation are precise.
- [ ] Effects have typed result/failure routing and a defined outbox guarantee.
- [ ] Document edits and runtime generations cannot be observed inconsistently.
- [ ] Runtime pseudocode handles Compute traps locally.

### Gate C — Portable serialization and conformance

- [ ] Definition, Instance, World, TypeExpr, Connection, Composition, and route schemas are machine-readable.
- [ ] Definition/package digest calculation is deterministic and specified.
- [ ] Stable error-code namespaces are defined.
- [ ] Shared conformance fixtures define input World, accepted events, expected reducer order, expected staged/committed state, outputs/statuses, effects, and errors.
- [ ] Rust compilation, tests, formatting, and linting pass.
- [ ] A separate reference interpreter or second implementation can pass the same fixtures.

## 3. Explicit v0.1 deferrals

To keep v0.1 implementable, explicitly defer:

- Distributed or multi-writer transactions.
- CRDT conflict-resolution semantics.
- Reducers reading connected value inputs (unless a snapshot contract is designed and added).
- Streaming ports and backpressure.
- Temporal feedback/Delay semantics.
- Dynamic mutation of private Composite topology.
- Cross-World transactions and delivery guarantees.
- User-defined generic variance beyond the defined v0.1 rules.
- Recursive type definitions.
- General-purpose long-running resumable effect workflows.
- Physics, AI-agent orchestration, personality/animation systems, and web rendering as core requirements.

## 4. Release policy

The current collection is `v0.1.0-draft`. Do not describe it as a frozen or fully conformant protocol. A release candidate should be produced only after the six documents, JSON Schemas, validator, and conformance corpus agree. The stable tag `v0.1.0` should be reserved for a contract-closed and tested release.

---

# Appendix — Source artifacts included in this edition

This consolidation includes the full text of:

1. `blockies-protocol-spec-v0.1.0-draft.md`
2. `blockies-type-system-v0.1.0-draft.md`
3. `blockies-composite-instantiation-v0.1.0-draft.md`
4. `blockies-composite-computation-spec-v0.1.0-draft.md`
5. `blockies-composite-event-flow-spec-v0.1.0-draft.md`
6. `blockies-runtime-execution-spec-v0.1.0-draft.md`
7. `blockies-v0.1-specification-consistency-review.md`
8. JSON Schema package README and semantic-validation contract
9. Complete JSON Schema bundle and its component schemas
10. Schema examples and valid/invalid fixtures
11. Rust validator README and implementation status

Implementation source code is not duplicated into this documentation edition; it remains in the separate `blockies-validator` project package. The validator README and known limitations are included above.
