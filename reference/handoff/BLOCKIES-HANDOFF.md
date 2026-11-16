# Blockies — Architecture Handoff

**Purpose:** Continue Blockies architecture and protocol design with another AI agent  
**Prepared:** 13 November 2026  
**Status:** Working design summary; not a frozen specification  
**Current model:** Core v0.2 + Process v0.1 draft + Composite v0.1 draft + integration review

> **Read this document first.** It records the current product vision, the latest conceptual model, decisions reached so far, unresolved contracts, and the recommended next steps. Do not assume the older v0.1 documents use the current ontology: they are valuable technical references, but several of their foundational assumptions have been superseded.

## 1. What Blockies is

**Blockies is an agent-operated visualization platform.** Users provide information and intent; external AI agents interpret that information and construct or modify a visual World using Blockies.

The AI agents are the operators of the medium. The Blockies are the medium being operated. Blockies are not primarily a way to visualize AI agents, nor is the product primarily a programming environment or a dashboard for observing agents.

The central creative principle is:

> A small, deliberately designed vocabulary of Blockie Types; complex and expressive visualizations emerge through composition and interaction.

A Blockie has a fixed visual archetype. An individual Blockie does not morph into a different shape to represent something else. More complex shapes and representations are assembled from multiple Blockies.

Both structural composition and spatial composition matter:

- **Structural composition** establishes which Blockies belong together and can establish reusable hierarchy.
- **Spatial composition** arranges their fixed geometries to create the visible result.
- **Connections and behavior** establish how members communicate and react.

A composition may be saved and reused as a Composite Definition. It remains a Composite, not a newly invented primitive Type.

### Design philosophy

- Finite vocabulary, expansive expression.
- Constrain the building materials, not the creativity of their arrangement.
- Prefer a predefined Blockie Type library over agents inventing primitive types dynamically.
- A new Type can be introduced deliberately through a versioned package.
- Anthropomorphism and personality are desirable future presentation capabilities, but must not silently alter computational semantics.

## 2. Current ontology — the most important correction

Earlier discussions treated **Computer Blockie** and **Drawing Blockie** as two primitive Types. That is superseded.

There is one universal entity: **Blockie**.

### 2.1 Universal Blockie

Every Blockie has:

- A stable identity in a World.
- One registered, versioned Blockie Type.
- Configuration and optional persistent Model State.
- A placement in a Frame.
- Explicit relationships to other World entities.
- The ability to host an authorized process, subject to Type compatibility, capabilities, and World policy.

A Blockie's identity and Type remain stable when its process starts, waits, finishes, or when it is moved or rearranged.

### 2.2 Drawing and Computing are operational modes

These are not Types:

| Operational mode | Derived condition | Meaning |
|---|---|---|
| `drawing` | No active Process Run attached | The Blockie exists without an active process. |
| `computing` | One active Process Run attached | The Blockie represents and hosts an active process. |

The informal term **nihilist state** was used for a Blockie with no process; the proposed normative value is `drawing`.

Active Process Run statuses:

- `queued`
- `running`
- `waiting`
- `suspended`
- `cancelling`

Terminal statuses:

- `succeeded`
- `failed`
- `cancelled`

A waiting or suspended process is still attached, so its host remains Computing. A terminal process is detached, so its host returns to Drawing.

**Core invariant:** the Process Registry is authoritative. Do not make `operational_mode` an independently mutable field that can contradict the active process record.

### 2.3 Blockie Types

Blockie Types are the predefined visual/capability vocabulary. Examples discussed:

- Pixel Blockie
- Science Object Blockie
- UI Blockie
- Voxel Blockie
- Other future Types

A Type Package should define its visual archetype, geometry contract, interaction model, schemas, ports, capabilities, assets, and compatibility requirements.

New Types may require different extension levels:

1. Renderer capability only.
2. Runtime capability through an existing extension contract (e.g. 2D physics).
3. A Core protocol feature if the new Type requires fundamentally new semantics (e.g. if 3D spatial semantics become a core concept rather than only a renderer capability).

Do not assume every new Type requires a Core change. Require every package to declare its Core, Runtime, and Renderer compatibility.

### 2.4 Process is a separate entity

A Process Definition describes executable behavior. A Process Run is one particular execution. A Process Host is the Blockie representing that run.

The Process Run and its host Blockie have separate identities and lifecycles.

Core process invariants currently proposed:

- Every managed Process Run has exactly one host Blockie.
- A Blockie hosts at most one active Process Run in the initial model.
- A Blockie can host multiple historical terminal runs over its lifetime.
- Starting a process does not change the host's Type.
- Spawning a child process creates a new Blockie and a new Process Run atomically.
- The child Process Run has a parent Process Run reference, but its host's Composite membership is explicitly chosen, not inferred.
- Ordinary pure `Compute` and event `Reduce` invocations do not each require a separate Process Run. A Process Run is a first-class managed/resumable in-world activity.

## 3. Composite model

A **Composite is a first-class grouping entity, not a Blockie and not a Blockie Type**.

A Composite is an explicit assembly of Blockies and optionally nested Composites. Its members retain their own IDs, Types, state, process, and placement. The Composite does not absorb or replace their identities.

### 3.1 Membership

Current proposed rules:

- Membership is explicit; adjacency or visual similarity does not imply membership.
- A Blockie may be a direct member of at most one Composite in the initial model.
- A Blockie may also be standalone (no Composite membership).
- A Composite may contain multiple Blockies and nested Composites.
- A nested Composite has at most one parent; containment is acyclic.
- A committed Composite must have at least one direct Blockie or child Composite.
- Removing a Blockie from a Composite does not delete it. It remains in the World, with its identity and process preserved unless separately changed.
- Dissolving a Composite preserves its member Blockies by default.

### 3.2 Composite manager — critical concept

The Computer is physically one of the Composite's constituents. It is not an external brain attached to the group.

A Composite may designate **zero or one manager**. The manager:

- MUST be a direct member of the Composite.
- MUST be Computing (have an active Process Run).
- MUST have explicit World-granted authority scoped to that Composite.
- Is the computational coordinator of the assembly.

A Composite may contain several Computing Blockies. Only one is the designated manager. Other Computers may calculate, run processes, communicate, and spawn their own children without becoming manager.

A manager's process may be queued, running, waiting, suspended, or cancelling while it retains designation. When its Process Run becomes terminal, its manager relationship must be cleared or replaced atomically in the same committed World transition.

Management is not a Type. It is a relationship between a Composite and one of its member Blockies.

A manager does not get unrestricted access to member private state. It coordinates through declared ports, events, Process Inbox notifications, and authorized services.

Nested Composites have their own managers. A parent Composite's manager does not automatically gain management authority over child Composites.

### 3.3 Structural vs spatial composition

These are independent structures:

- Membership determines what belongs to a Composite.
- Placement determines where a member appears.
- A Composite's footprint is derived from member geometry and nested Composite footprints.
- The footprint is not itself a Blockie and does not determine membership.
- A Composite may be spatially disconnected or contain gaps.
- Spatial order MUST NOT imply execution order, communication, membership, process parentage, or manager authority.

### 3.4 Composite public interface

External Blockies communicate with a Composite through declared public endpoints. They must not reach into private member ports.

A critical integration gap remains: the old Core Connection schema only describes Blockie port endpoints, but a Composite is not a Blockie. The current recommendation is an endpoint union:

```ts
type Endpoint =
  | { kind: "blockie_port"; blockieId: string; portId: string }
  | { kind: "composite_port"; compositeId: string; portId: string };
```

The Interaction Specification should define this canonically.

### 3.5 Shared state

No implicit Composite-wide mutable shared store has been accepted yet.

For now, information sharing should use typed ports, events, an explicit state-holder Blockie, or an authorized service. The future Librarian Blockie / Blockies Network System idea is deliberately deferred until its ownership, permissions, scope, and transaction semantics are designed.

## 4. Independent relationships — never conflate these

The architecture depends on keeping these relationships separate:

| Relationship | Answers | Must not imply |
|---|---|---|
| Spatial placement | Where is the Blockie? | Membership, management, process parentage |
| Composite membership | Which Composite directly contains it? | Process parentage or manager status |
| Composite nesting | Which Composite contains another Composite? | That child members become direct parent members |
| Management | Which member coordinates this Composite? | Ownership of all member processes or private state |
| Process hosting | Which Blockie represents this Process Run? | Composite membership |
| Process parentage | Which Process Run spawned another? | Spatial or Composite hierarchy |
| Communication | Which endpoints exchange values/events? | Membership or authority |
| Attention | What is a Blockie observing/assisting? | Membership, management, or private access |

An external AI agent is an Actor operating the World. It may optionally have an in-world representative Blockie and Process Run. The external Actor and its representative Blockie are not automatically the same identity or execution environment.

A standalone Supervisor Blockie can observe Composite A, then Composite B. Its Attention Relationship and explicit placement operation are separate. Merely moving near a Composite does not make it a member or manager.

## 5. Spatial model — recommended but not yet ratified

The Core Model proposes one primary World Frame, with 2D placement as the baseline. 3D support can arrive through compatible spatial, Type, Runtime, and Renderer capabilities.

The integration review recommends **hierarchical local coordinates**:

- Standalone Blockies are placed relative to the World Frame.
- Direct members are placed relative to their owning Composite.
- Nested Composites are placed relative to their parent Composite.
- Composite transforms compose through the hierarchy.
- Moving a Composite changes its transform; member-local positions remain unchanged.
- Moving a member does not change membership.
- Moving a Blockie between coordinate scopes converts its placement while preserving world-space position by default.

This is a recommendation from integration review, not yet a ratified decision. The next agent should test it against nesting, group movement, reparenting, rotation/scaling, 3D, and collaborative edits before freezing it.

## 6. The three reference scenarios

### Scenario A — `[D][C][D]` Button

A Composite contains two Drawing Blockies and one Computing Blockie. The Computing member is its manager and has an active Process Run.

Expected flow:

1. User interacts with rendered button surface.
2. Renderer translates the interaction to a Composite public event input.
3. An explicit Composite input binding routes the event to the manager's declared host input / Process Inbox handler.
4. Process Run wakes and executes a bounded step.
5. Process output is published through an explicit Process Output Binding to a host Blockie output port.
6. Composite public output exposes that value.
7. A committed generation is rendered.

Reordering the members spatially (e.g. `[D][C][D]`, `[C][D][D]`, `[D][D][C]`) must not alter behavior when membership, bindings, and communication contracts are unchanged.

Not every button or interactive Blockie needs a long-running Process Run. Ordinary event/reducer behavior remains possible. This example specifically uses a managed process.

### Scenario B — One Composite, multiple Computers

One Composite contains a manager Computer, two worker Computers, and Drawing members.

- All Computers have independent Process Runs.
- Only one member is designated manager.
- Workers can be spawned by the manager or created independently.
- Worker membership is explicitly chosen; process parentage does not create it.
- The manager receives typed results/events through declared interfaces.
- The manager cannot directly mutate worker private state.
- Manager failure must atomically clear/replace the manager relationship and update the host's operational mode.

### Scenario C — Standalone AI Supervisor

A standalone Blockie hosts a supervision Process Run. It observes Composite A, then Composite B.

- It remains standalone unless explicitly added as a member.
- Attention does not imply management or private data access.
- Moving near a Composite requires an explicit placement operation.
- The external AI Actor's authority remains controlled by World permissions.
- A Runtime adapter may use an external AI service to execute Process Steps, while the Runtime retains Process Run identity and lifecycle ownership.

### Scenario D — Nested Composites

A Company Composite contains Finance and Operations child Composites. Each child may have its own manager. A direct member manager coordinates only its own Composite unless authority is explicitly delegated. Parent-to-child coordination uses public interfaces; private descendant ports and state are not reachable directly.

## 7. The three current working specifications

These specifications were drafted in the conversation as writing artifacts, but have **not yet been archived as standalone files in the reference folder**. This handoff summarizes their current state:

### BCM — Blockies Core Model v0.2 (draft)

Defines the universal Blockie, identity, operational modes, predefined Types, Process Host relationship, Composite grouping, manager relationship, Frame, placement, attention, invariants, and World representation.

Key proposed constraints: one primary Frame; 2D baseline; one active Process Run per Blockie; one direct Composite per Blockie; zero-or-one manager per Composite; manager must be a direct Computing member.

### BPS — Blockies Process Specification v0.1 (draft)

Defines Process Definitions, Process Runs, Process Host attachment, lifecycle, bounded Process Steps, checkpoints, waits/wake conditions, scheduling, child spawning, Process Inbox, Process Results, capabilities, persistence, cancellation, and recovery.

Process Run statuses: `queued`, `running`, `waiting`, `suspended`, `cancelling`, `succeeded`, `failed`, `cancelled`.

Each Process Run has one Blockie host. Child spawning atomically creates a new Blockie and new Process Run. Child membership is optional and explicit. A parent waits for child processes to reach terminal states before successful completion; default parent failure/cancellation policy requests descendant cancellation.

### BCS — Blockies Composite Specification v0.1 (draft)

Defines Composite as a grouping entity rather than a Blockie; membership; reusable templates; manager designation and handoff; multiple Computing members; spatial composition and footprint; public interfaces; nested Composites; lifecycle operations; instantiation, dissolution, and deletion.

Manager is a direct member with an active Process Run and scoped authority. A Composite can exist unmanaged. Multiple Computers may be members; only one is manager.

### Integration review / decision register

The last review found the concepts compatible but not implementation-ready. It proposed 21 cross-specification resolutions (IR-001 to IR-021), with P0 and P1 issues below. These proposals are not yet formally ratified.

## 8. Integration issues to resolve next

### P0 — resolve before implementation freeze

1. **Process input dispatch:** Define how a host Blockie's incoming event reaches the attached Process Run. Avoid accidentally invoking both a Type reducer and a Process handler.
2. **Process output bindings:** Define how a Process Run publishes intermediate/final values through declared host Blockie output ports. Enforce one effective producer per output.
3. **Manager authorization:** Separate Process Definition capability requirement, World-granted permission, and Composite manager designation. Scope `composite.manage` to one Composite ID.
4. **Atomic manager termination:** Process terminal status, host return to Drawing, and manager clearing/replacement must commit as one coherent World transition.
5. **Composite endpoints:** Add a first-class Composite endpoint to the Connection model, alongside Blockie port endpoints.
6. **Spatial coordinate ownership:** Decide between absolute World coordinates and hierarchical local coordinates. Review recommends hierarchical local coordinates; not ratified.
7. **Canonical Computing derivation:** Keep Process Registry authoritative; all active statuses imply Computing, terminal statuses imply Drawing.

### P1 — resolve before conformance suite is frozen

8. Manager designation vs availability: waiting/suspended managers remain designated, but availability should be exposed separately.
9. Spawned child placement and membership: both explicit and independent.
10. External AI Actor vs in-world representative: define an authorized execution-provider adapter.
11. Attention vs movement: separate semantic attention from explicit placement changes.
12. Empty Composite behavior: committed Composite must not be empty; removing final member either rejects or dissolves atomically.
13. Host deletion: active Process Run must be terminated first; retain historical identity references through archival/tombstone rules.
14. Process Result publication: define how Process Run result is projected to host outputs or Inbox without direct state mutation.
15. Nested manager scope: a parent manager does not automatically manage child Composites.

## 9. Important cautions about legacy v0.1 documents

The included v0.1 material predates the universal Blockie / Drawing-vs-Computing operational model.

In particular, the older documents may assume:

- Definitions classified as `atomic` or `composite` Blockie types.
- A Composite is itself a Blockie Instance.
- Composite computation/reducers are owned by that Composite Blockie.
- Processes are invisible Runtime tasks, rather than first-class activities with Blockie hosts.
- A single root Blockie contains the World.

Those assumptions must not be copied automatically into the new architecture.

However, the legacy specifications contain useful reusable technical work:

- Stable identities and definition/version references.
- BTS type expressions and assignability.
- Typed value and event ports.
- Explicit input bindings and output exposures.
- Composite template-local IDs, instance materialization, and state isolation.
- Explicit event envelopes, FIFO delivery, forwarding vs dispatch.
- Single-writer World transactions, staged state, reactive value stabilization, post-commit effects.
- Structural validation vs semantic cross-reference validation.

Use the legacy documents as technical references, not as the current source of truth for entity ontology.

## 10. Reference documents and image

The `references/` folder in the accompanying bundle contains copies of the following Library documents. The Markdown links are relative and work when the handoff file remains beside the `references/` folder.

### Essential reading order

1. [Legacy consolidated Blockies v0.1 documentation](references/blockies-v0.1-complete-documentation.md) — overview and historical architectural decisions.
2. [Legacy Core Protocol specification](references/blockies-protocol-spec-v0.1.0-draft.md) — identity, state, ports, connections, World, serialization.
3. [Legacy Type System specification](references/blockies-type-system-v0.1.0-draft.md) — type expressions, compatibility, assignability, generics.
4. [Legacy Composite Instantiation specification](references/blockies-composite-instantiation-v0.1.0-draft.md) — template nodes, IDs, materialization, isolation, nested composites. Its old Composite-as-Blockie ontology is superseded.
5. [Legacy Composite Computation specification](references/blockies-composite-computation-spec-v0.1.0-draft.md) — public value boundaries, observations, output exposures, reactive semantics. Re-evaluate ownership under the new model.
6. [Legacy Composite Event Flow specification](references/blockies-composite-event-flow-spec-v0.1.0-draft.md) — event envelopes, FIFO event flow, forwarding, notification, exposure, dispatch.
7. [Legacy Runtime Execution specification](references/blockies-runtime-execution-spec-v0.1.0-draft.md) — transactions, reducers, compute scheduling, effects, errors, commits.
8. [Legacy consistency review](references/blockies-v0.1-specification-consistency-review.md) — known contradictions and architecture risks in the old specification family.
9. [Legacy conformance suite](references/blockies-v0.1-conformance-suite.md) — historical tests and blocked cases; these must be revised for the new ontology.
10. [Original Blockies World example](references/blockies-world-example.png) — user-provided diagram showing the Frame, four process indicators, four represented Blockies, and the parent Computer concept.

## 11. Recommended next work for the receiving agent

Do not immediately implement Rust structures. First establish one canonical cross-specification model.

Recommended sequence:

1. Review this handoff and the original World example.
2. Read the legacy Core, BTS, Composite, event, and Runtime documents in the order above.
3. Treat BCM/BPS/BCS drafts summarized here as the current ontology, and explicitly identify where the legacy specs conflict.
4. Ratify or revise IR-001 through IR-021. Start with P0 items.
5. Produce one canonical entity/relationship diagram and canonical logical schemas for World, Frame, Blockie, Type Package, Process Definition, Process Run, Composite, membership, manager, Placement, and Connection Endpoint.
6. Define transaction boundaries for process attachment, child spawn, manager handoff, manager termination, membership transfer, Composite creation/dissolution, and spatial group movement.
7. Produce complete execution traces for the button, multi-Computer Composite, standalone Supervisor, and nested Composite scenarios.
8. Derive updated conformance tests from those traces.
9. Only then reconcile the Runtime and validator designs and plan the Rust reference implementation.

### Guardrails for the next discussion

- Do not reintroduce Computer and Drawing as primitive Blockie Types.
- Do not describe a Composite as an external container with a brain attached; the manager is one of its members.
- Do not infer membership from proximity.
- Do not infer process parentage from membership.
- Do not infer authority from attention or spatial proximity.
- Do not let a Process Definition grant its own capabilities.
- Do not equate every Compute/Reduce call with a first-class Process Run.
- Do not adopt legacy Composite-as-Blockie assumptions without an explicit migration decision.
- Keep user-facing Type Library vocabulary predefined; reusable Composites are not new primitive Types.

## 12. Current working thesis

A Blockie is a persistent, independently identifiable entity with a fixed visual Type. It may exist in Drawing mode or host a Process Run in Computing mode. Every managed process is represented by a host Blockie. Multiple Blockies combine into Composites through explicit membership and spatial arrangement. A Composite may designate one of its Computing members as manager, while other Computing members participate independently. Spatial placement, membership, process parentage, management, communication, and attention are separate relationships.

**Blockies are the inhabitants and building materials of a visual World. AI agents construct and operate that World.**
