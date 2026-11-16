# Blockies v0.1 Specification Family — Consistency Review

**Review date:** 2026-11-01  
**Documents reviewed:** Core Protocol, BTS, BCIS, BCCS, BCEFS, BRES  
**Review status:** Draft audit; no specification is frozen

---

## 1. Executive summary

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

## 2. What is already consistent and worth preserving

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

## 3. P0 — Direct contradictions that must be resolved

### P0.1 Composite Definitions are forbidden from owning behavior in BCIS

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

### P0.2 Connected input resolution uses committed values in BTS and staged values in BRES

**Conflicting clauses:**

- BTS §11.4: a connected Compute input uses the current *committed* value from its source output.
- BRES §6.3, §10, and §12.3: Compute uses the staged generation after event processing, and connected inputs resolve from the *staged* source output.

These are observably different. If an event updates a source Blockie's Model State and its Compute output changes in the same transaction, a downstream Blockie must not calculate against the previous committed output.

**Required change:** BTS §11.4 should define type validation and fallback rules, but defer generation selection to BRES. BRES owns runtime timing. The normative rule should be: during value stabilization, a connected input resolves from the current transaction's staged output snapshot; an unaffected source output in that snapshot is inherited from the base committed generation. A connected source in error/blocked/unavailable status never falls back to the input default.

**Documents to change:** BTS §11.4; keep BRES §12.3 as the execution authority.

### P0.3 Composite input fan-out is not consistently defined

**Conflicting/overlapping clauses:**

- BCIS §15 says an exposure maps one public port to one descendant port and prohibits a public input from fanning out through one exposure; multiple destinations require another mechanism.
- BCCS §6.1 explicitly allows one public input to bind to multiple child inputs.
- BCEFS §6.2 allows a public event input to have multiple child event bindings.

This may be reconcilable if every binding record has exactly one destination, but the current documents do not establish one canonical rule or schema.

**Required change:** A Composite public input MAY fan out through multiple explicit, individually identified binding records. Each binding record MUST have exactly one target. Each target value input MUST still have at most one effective producer. Event input bindings may have multiple destinations. Define separate value and event binding schemas, or define one route union with a required `kind` discriminator. Do not call all of these objects generically `exposure`.

**Documents to change:** BCIS §15, BCCS §6.1 and definition example, BCEFS schema and examples.

### P0.4 Cross-scope connection rules contradict the Core Protocol

**Conflicting clauses:**

- Core Protocol §9.3 says two Blockies MAY connect even when they belong to different composition branches.
- BCIS §24 says a connection crossing different Composite scopes MUST pass through their respective public interfaces and be represented at their common visible scope.

The Core Protocol sentence can be read as allowing a connection from a private descendant in one Composite directly into a private descendant in another Composite, bypassing both interfaces.

**Required change:** Define *visible scope*. Ordinary connections may link endpoints visible in the same scope. A connection between separate Composite scopes MUST connect the Composites' public ports at their nearest common visible scope. A connection MUST NOT address a private descendant from outside its owning Composite. Update Core Protocol §9.3 and BCIS §24 to use identical wording.

**Documents to change:** Core Protocol §9.3–9.4; BCIS §24; BCCS/BCEFS nested-boundary rules.

### P0.5 Canonical serialization of Composite instances has two alternatives

**Conflicting clauses:**

- BCIS §22 says canonical serialized Worlds MUST contain concrete instance records for all materialized descendants.
- BCCS §13.4 says a serializer MAY store either the materialized child hierarchy or a canonical Composite Instance plus its materialization mapping.

These are different canonical formats and have different validation, migration, and recovery requirements.

**Required change:** For v0.1, choose one canonical document representation. Recommended: materialized representation. Every descendant is a concrete record in the World instance registry; the Composite Instance additionally persists its member map and template provenance. A compact template-only storage form MAY be an implementation-specific storage optimization, but it MUST expand to the canonical materialized representation before validation/execution/export and MUST preserve exactly the same IDs and state.

**Documents to change:** BCIS §22; BCCS §13.4; Core Protocol §15.

---

## 4. P1 — Canonical schema and ABI mismatches

### P1.1 Definition schema has no single canonical shape

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

### P1.2 The canonical BTS type encoding is not used throughout the Core Protocol

The Core Protocol Definition and Multiply examples use `"value_type": "number"` and raw JSON Schema-shaped `state.schema` / `config.schema` objects. BTS §1 says its recursive `kind`-based Type Expressions are canonical and supersede those JSON Schema fragments.

**Required change:** Replace all Core Protocol and appendix examples with BTS Type Expressions. Define `state.type` and `config.type` (or keep `schema`, but explicitly require BTS TypeExpr). Make it impossible to confuse JSON Schema with the canonical protocol type language.

### P1.3 Compute and reducer ABIs disagree

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

### P1.4 BCIS, BCCS, and BCEFS overlap in boundary-route declarations

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

### P1.5 Directly exposed outputs and computed outputs need one producer contract

BCCS §7.1 correctly requires exactly one producer for each public **value** output: one child Output Exposure or Composite Compute. Keep this rule, but make it explicit that it applies only to value outputs. Event outputs are message channels and may have multiple internal event producers/exposures plus Composite reducer emissions, with deterministic routing order.

Also remove duplicated `value_type` from Internal Observation records, or make it a required assertion exactly equal to the source port's specialized BTS type. The source port should be the canonical type authority; repeating it risks drift.

### P1.6 Compute dependency invalidation is underspecified

BRES §12.2 speaks of state fields used by Compute and configuration fields declared as dependencies. However, the Compute ABI gives the function the full `state` and `config` objects, and no `state_dependencies` / `config_dependencies` declaration is defined. A Runtime cannot safely discover field reads by inspecting arbitrary JavaScript.

**Required change:** For v0.1, use the simple conservative rule: the entire Model State object and entire configuration object are dependencies of Compute. Any change to either invalidates that Blockie's Compute. A later optimization may add declared field/path dependencies, but it must not change results.

### P1.7 Reducers deliberately cannot read value inputs; confirm this is the intended v0.1 limitation

BRES §11.3 forbids reducers from reading computed outputs or arbitrary connected values. This preserves the phase order (all reducers first, value stabilization second), but it means a reducer cannot make a decision based on a connected live value unless that information is copied into its own state/configuration or included in the event payload.

The Poll example must be designed accordingly: the Vote Processor must own the allowed options in its own state/configuration or receive the validation-relevant information in the event. It cannot secretly read an Options Blockie's current output.

**Required decision:** Either explicitly freeze this restriction for v0.1 and add tests/examples that obey it, or design a separate reducer-input snapshot contract before freeze. Do not leave the restriction implicit.

### P1.8 Effect declarations do not define the complete result contract

Core Protocol and BRES define effect IDs, capabilities, requests, outbox handling, and post-commit execution. BRES also requires effect results to return as events to declared event inputs, but the Definition schema does not specify the success result type, failure type, or which event input receives each result.

**Required change:** Each effect declaration should specify at least:

- Effect ID and capability.
- Input BTS type.
- Whether it produces a result.
- Success-result BTS type and failure-error representation, when applicable.
- Declared completion event input(s), or an explicit fire-and-forget policy.
- Timeout/retry policy ownership (host-level or definition-level).

The host creates the effect request ID/idempotency key. Effect results MUST NOT mutate state directly. If a result is consumed by the World, its mapping to a declared event input must be unambiguous.

### P1.9 Event identity and public-boundary redaction need one precise representation

BCEFS says forwarding preserves event identity and immutable event metadata. It also says a public Composite boundary presents the Composite as the visible source and hides private descendant IDs. These can coexist only if event identity metadata is separated from per-delivery/per-boundary presentation metadata.

**Required change:** Keep immutable event fields (event ID, origin, causal event ID, correlation ID, original creator/emitter) unchanged. Put route, destination, visible boundary source, and redaction data in a separate Delivery/Boundary View. External consumers see the Composite's public output as the source but do not receive private descendant identifiers. Never mutate the immutable logical event envelope while forwarding.

### P1.10 Document revision changes and runtime generations need a complete publication rule

BRES §6.2 treats configuration/structure edits as document operations, not runtime events, and says affected computations become dirty before ordinary runtime transactions resume. It does not fully specify when the updated document and its recalculated outputs become visible together.

**Required change:** Define a document-operation commit protocol: validate operation against document revision N; atomically commit document revision N+1; rebuild/update graphs; stabilize all computations affected by the document edit; publish one coherent runtime generation associated with N+1. Alternatively, define a temporary `initializing/stabilizing` state in which renderers cannot observe mismatched document/output generations. A runtime transaction MUST never use new connections/config with stale outputs from the old revision as if coherent.

### P1.11 The normative Runtime pseudocode must catch Compute failures locally

BRES §10 pseudocode places the full transaction inside a broad `try/catch`, while §14.3 says a Compute throw/trap or output-validation failure is computation-local and MUST NOT abort an otherwise valid state transaction. The pseudocode handles a returned invalid result, but does not explicitly show a local exception/trap boundary around `invoke_compute`. An implementation could incorrectly let a thrown Compute failure reach the transaction-fatal catch.

**Required change:** Wrap each Compute invocation in a node-local error boundary. A Compute throw, trap, timeout, or invalid output bundle MUST stage that compute node as `error`, invalidate its outputs for this generation, block affected descendants, and continue stabilizing independent branches. Only host/runtime-fatal failures should reach the transaction-wide abort path. Add a conformance test where Compute throws after a valid reducer state update and verify that the state commits while the computed output is error.

---

## 5. P2 — Important ambiguities and incomplete contracts

### P2.1 World root model

Core Protocol §10.3 requires exactly one root Blockie, and every other Blockie must be beneath it. But BCIS distinguishes `atomic` and `composite` definitions and only a Composite has a template. The root therefore needs a special status that is not currently specified: can it be an atomic container, or must every World use a built-in Composite root?

**Recommendation:** Make the World itself the synthetic root composition scope and allow one or more top-level Blockies. Every non-top-level Blockie has exactly one Composite owner. A future UI may choose to create a root Canvas/Page Composite, but the protocol should not require a fake root Blockie. If retaining one root Blockie is preferred, explicitly require it to use a built-in Composite root definition and define that definition.

### P2.2 `container.accepts_children` duplicates `kind`

The Core Protocol uses `container.accepts_children`; BCIS uses `kind: atomic|composite`. These can disagree. Remove `accepts_children` or define it as derived: only a Composite can own a template hierarchy in v0.1. Visual grouping/layout should not create structural ownership independently of Composite semantics.

### P2.3 State initialization and configuration precedence

BCIS permits definition initial state, template state initializers, parameters, and configuration initializers, but does not fully define whether template initializers replace or merge with definition defaults. The precedence for definition defaults, template initializers, instance config, and supplied parameters must be deterministic.

**Recommendation:** Define initializers as complete typed values or specify an exact merge algorithm. Avoid informal recursive merging. A simple v0.1 rule is: if no template initializer is present, use the child Definition's complete initial value; if present, it supplies the complete replacement value. Template parameters are immutable construction data and are not automatically runtime inputs.

### P2.4 Clone and reset semantics need to include Composite-owned state

BCIS clone modes discuss child state; BCIS §16 currently denies Composite-owned state, while BCCS permits it. Once BCIS is corrected, `copy_state` and `reset` must say whether they copy/reset the Composite instance's own state and configuration as well as descendants. Reset's relation to BRES document operations versus runtime transactions also needs to be stated.

### P2.5 Decimal canonicalization is internally inconsistent

BTS §5.5 says negative zero is normalized to `"0"`, while §5.5 also requires preserving trailing fractional zeroes (for example `"12.50"` must remain `"12.50"`). It also calls precision the number of significant digits but defines it as counting all digits. These rules need one mathematical definition.

**Required change:** Define whether `"-0.00"` canonicalizes to `"0.00"` (preserving scale) or `"0"` (discarding scale). Define precision as either total coefficient digits or significant digits, with examples including `0.001`, `0.010`, and `100.00`. Also define protocol value equality separately from numeric comparison: should `"12.50"` and `"12.5"` trigger downstream presentation updates even though they are numerically equal?

### P2.6 Deterministic value equality is not fully defined

BCCS and BRES rely on BTS equality to decide whether to propagate output changes, but BTS does not fully specify equality for every type. Define structural equality for records/arrays/maps, instant equality for DateTime, numeric vs representation equality for Decimal, and equality behavior for negative zero and normalized strings. This affects caching and reactive invalidation.

### P2.7 Named type identity and dependencies need pinning

BTS named types use a name such as `org.example.Customer`, but do not fully specify whether the name is local to a Definition, globally registered, or independently versioned. If named types can be external, their exact version/digest must be pinned. If they are local, the resolution scope must be stated.

### P2.8 Definition and module digests need a canonical hashing rule

Core/BCIS require immutable content digests, but do not define exactly which bytes are hashed or how JSON is canonicalized. Decide whether the digest covers the canonical Definition document, the executable module, the complete package manifest/assets, or multiple separately named digests. The same package must hash identically across implementations.

### P2.9 Canonical World field names and materialized route records

The Core Protocol uses `instances`; older examples use `blockies`; BCIS materializes descendants; BCCS sometimes uses compact storage wording. Freeze one World schema and define exactly where materialized boundary route records live. Instance map key and embedded `id` should be required to match.

### P2.10 Event route scopes and IDs

BCEFS requires stable route IDs and sorting, but “unique within routing scope” needs a precise scope definition. Define whether IDs are unique within a Composite Definition's event interface, within one materialized Composite Instance, or globally in a World. The sort must operate over the complete destination set for a given emitted event after route expansion.

### P2.11 Event envelope `transaction_id` across boundaries

The event envelope includes a transaction ID, while events may be published externally and later accepted by another World/Runtime. Define whether a cross-World delivery creates a new logical event and transaction with a causation/correlation link, or whether the original envelope is retained. Cross-World semantics can be explicitly deferred, but local v0.1 behavior must be clear.

### P2.12 Atomic compute output failure granularity

BTS requires every declared value output to be returned. BRES marks a computation node as error when computation/output validation fails. State explicitly whether one invalid output invalidates the entire output bundle for that Compute invocation (recommended for v0.1), while unrelated direct Composite Output Exposures remain independently valid.

### P2.13 Effect guarantees and outbox durability

BRES correctly avoids promising exactly-once execution, but a host's minimum effect-outbox durability and ordering guarantees should be explicit. In-memory-only execution can lose a committed effect after a crash. Decide whether durable handoff is required for a conforming persistent host or whether BRES defines only process-lifetime semantics.

### P2.14 Error code namespace

BTS uses uppercase codes such as `TYPE_MISMATCH`; Composite and Runtime specs use lowercase snake case. Adopt one stable namespace format, for example `bts.type_mismatch`, `composite.output_unproduced`, `runtime.event_delivery_limit_exceeded`. Error codes are protocol surface and should not vary by implementation.

### P2.15 BTS wire types need a JavaScript ABI mapping

BTS defines wire representations (for example Decimal as a canonical decimal string, DateTime as an RFC 3339 string, and Bytes as base64url), while the first runtime profile executes JavaScript. The ABI does not yet state the exact JavaScript values users receive or the supported operations/helpers for Decimal and other non-native types. A Decimal arrives as a string unless the ABI specifies a wrapper; ordinary JavaScript multiplication on that string would not implement exact decimal arithmetic.

**Required change:** Define a normative JS ABI mapping table. The safest v0.1 default is to expose the same immutable JSON-compatible representation as the wire format and provide versioned SDK helpers for Decimal arithmetic, Date/DateTime parsing, and Bytes. Do not silently convert Decimal to Number or pass host-specific class instances across the ABI.

### P2.16 Runtime generation numbering needs a precise increment rule

BRES distinguishes document revision and runtime generation, but does not fully state whether every successful transaction increments the generation when the resulting Model State and outputs are unchanged (for example, a no-op reducer that still emits an external event or requests an effect). Nor does it state whether document stabilization creates a generation independently of event transactions.

**Required change:** Define generation as a monotonically increasing identifier for each successful committed runtime transaction, including successful transactions whose state/output values are unchanged but whose committed outboxes or transaction metadata change. Aborted transactions do not consume a committed generation. Define separately how document revisions establish or trigger runtime generations.

---

## 6. Responsibility boundaries — proposed source of truth

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

## 7. Recommended consolidated protocol model

### 7.1 Definition kinds

Add a required `kind` discriminator: `atomic` or `composite`.

- Atomic: no template; may declare Compute/Reduce/effects.
- Composite: has a template; may ALSO declare its own Model State, Compute, Reduce, and effects. Its descendants remain independently state-owning Blockies.

`container.accepts_children` should be removed or derived from `kind`. Do not allow an atomic definition to contain private template children in v0.1.

### 7.2 Composite sections

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

### 7.3 Common execution ABI

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

### 7.4 State and dependency invalidation

For v0.1, treat the entire `state` and `config` objects passed to Compute as dependencies. Any change to either invalidates that Compute. This avoids relying on JavaScript read-tracking or an undeclared field-dependency system.

Reducers read only their own latest staged state, own configuration, and the event payload. Explicitly retain this as a v0.1 limitation unless a separate reducer-input snapshot design is approved.

### 7.5 World/connection scope

Prefer the World as a synthetic root composition scope, with an ordered set of top-level Blockies. A Composite is the only ordinary Blockie that owns private descendants. Connections may target only Blockies visible in the same scope; crossing Composite boundaries requires public input/output ports. If a single root Blockie is retained instead, define a mandatory built-in Composite WorldRoot and its lifecycle.

### 7.6 Canonical persistence

Use materialized World serialization for v0.1:

- Every materialized Blockie has a concrete instance record and stable ID.
- Every Composite persists its member map, pinned Definition digest, parameters, and type arguments.
- Template-generated relationships persist stable IDs and provenance.
- Derived outputs/runtime generations may be stored in a separate runtime snapshot/cache, but are not canonical Model State in the World document.
- Loading validates materialization against the pinned template and never regenerates existing IDs.

---

## 8. Required document-by-document edit plan

### Core Protocol

1. Add `kind: atomic|composite` to Definition schema.
2. Replace raw JSON Schema examples and string-valued `value_type` examples with BTS Type Expressions.
3. Replace positional Compute/Reduce signatures with the common context-object ABI.
4. Add `dispatch` to reducer result for Composite reducers; explicitly state it is unavailable to atomic reducers.
5. Define `effects` declarations and result contracts.
6. Remove or derive `container.accepts_children`.
7. Restrict connections by visible composition scope.
8. Reconcile the World root model and canonical World field names.
9. Make Core transaction text high-level and defer detailed phase ordering to BRES.

### BTS

1. Change connected Compute input resolution from committed to staged generation, or defer generation semantics to BRES.
2. Clarify Decimal negative-zero normalization and precision/scale definitions.
3. Define deterministic value equality used by BCCS/BRES.
4. Clarify named type resolution and versioning.
5. Standardize BTS error-code namespace.
6. Ensure all Core examples use BTS Type Expressions.

### BCIS

1. Remove the prohibition on Composite Compute, Reduce, and own Model State.
2. Require Composite state/configuration under the same base Blockie rules as atomic instances.
3. Own only template definition, child instantiation, identity mapping, materialization, ownership, provenance, clone/reset, and migrations.
4. Remove generic value/event `exposures` semantics; reference BCCS and BCEFS route structures.
5. Harmonize value input fan-out with BCCS.
6. Make all instance/definition refs carry exact pinned definition identity/digest.
7. Choose materialized canonical serialization and align BCCS §13.4.
8. Define initializer replacement/merge precedence and clone/reset behavior for Composite-owned state.

### BCCS

1. Keep Composite-owned state and Composite Compute.
2. Keep exactly one producer per public value output.
3. Make Input Binding value-only; move event binding to BCEFS.
4. Use source port type as canonical observation type, or require a matching assertion.
5. Remove or defer its transaction algorithm to BRES; retain only value-boundary computation semantics.
6. Align canonical serialization with BCIS.
7. State whole-state/config dependency invalidation for v0.1 unless field paths are explicitly declared.

### BCEFS

1. Keep four event mechanisms and Composite reducer behavior.
2. Use the common reducer ABI from Core/BRES.
3. Define event route ID uniqueness scope and ordering precisely.
4. Separate immutable event envelope identity from delivery/boundary-visible metadata.
5. Keep its event-specific contracts, but defer global event/value phase ordering and commit semantics to BRES.
6. Define the exact handler declaration and effect-result event mapping in the canonical Definition schema.

### BRES

1. Be the only normative source for transaction phase ordering and global scheduling.
2. Align its pseudocode with the final canonical ABI/schema.
3. State that value input resolution uses staged outputs after event processing.
4. Define how document operations produce a new document revision and coherent runtime generation.
5. Define publication of external event outputs and effect outbox records.
6. Specify compute output-bundle failure granularity.
7. Define minimum persistence guarantees for the effect outbox, or explicitly scope conformance to process-lifetime execution.
8. Keep cross-client/distributed concurrency out of v0.1.

---

## 9. Freeze gates

Do not mark v0.1 stable until all of the following pass.

### Gate A — Contract closure

- [ ] Composite can own Model State, Reduce, and Compute consistently in every document.
- [ ] One Definition schema and one Instance schema are normative.
- [ ] One Compute ABI and one Reduce ABI are normative.
- [ ] BTS is the only canonical type representation.
- [ ] All Composite value and event routes have one canonical schema and owner.
- [ ] Input fan-out and per-target cardinality rules are explicit.
- [ ] Connection visibility across Composite scopes is explicit.
- [ ] World root model is settled.
- [ ] Canonical materialized serialization is settled.

### Gate B — Runtime semantics

- [ ] Reducer read set is settled (own state/config/event only, or an explicit value snapshot extension).
- [ ] Event FIFO ordering and action order agree in BCEFS and BRES.
- [ ] Event envelope and boundary redaction are compatible.
- [ ] Value input resolution uses one defined generation.
- [ ] Compute dependency invalidation is implementable without runtime code introspection.
- [ ] Error and blocked propagation are precise.
- [ ] Effects have typed result/failure routing.
- [ ] Document edits and runtime generations cannot be observed inconsistently.

### Gate C — Portable serialization and conformance

- [ ] Definition, Instance, World, TypeExpr, Connection, Composition, and route schemas have machine-readable schemas.
- [ ] Definition/package digest calculation is deterministic and specified.
- [ ] Stable error-code namespaces are defined.
- [ ] Shared conformance fixtures define input World, accepted events, expected reducer order, expected staged/committed state, outputs/statuses, effects, and errors.
- [ ] At least two independent implementations (or one implementation plus a deliberately separate reference interpreter) can pass the same fixtures.

---

## 10. Suggested v0.1 scope reductions

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

## 11. Final recommendation

**Current status: do not freeze v0.1 yet.**

The drafts are substantially aligned at the conceptual level, but they still contain normative contradictions and incomplete wire/runtime contracts. The most efficient next step is not to add another subsystem specification. It is to perform one consolidation pass:

1. Adopt the responsibility matrix in §6.
2. Apply the P0 fixes in §3.
3. Publish a canonical Definition/Instance/World/route schema and ABI.
4. Apply the P1 and P2 edits document by document.
5. Generate an integrated conformance corpus from the Poll, Counter, Multiply, nested Composite, and failure examples.
6. Re-run the same audit against the revised set.

When those gates pass, the family can be tagged as `v0.1.0` and implementation can begin against a stable contract rather than against six partially overlapping drafts.
