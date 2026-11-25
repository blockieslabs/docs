# 0001 — Minimal model

**Status:** Working draft
**Derived from:** `traces/0001-reference-traces.md` and decisions 0001–0006.
**Rule:** every field below traces to a trace line or a decision. Anything that did not trace was
cut, and the cuts are listed at the end.

Notation is TypeScript-like for readability. `BtsType` and `BtsValue` are the type system's
expressions and values; this document does not redefine them.

## Primitives

```ts
type Id = string;              // opaque, stable, never derived from position, name, or path
type PortId = string;
type Digest = `sha256:${string}`;
type DefRef = { id: Id; version: string; digest: Digest };
type EntityRef = { blockie: Id } | { composite: Id };
```

## World

```ts
type World = {
  protocol: "blockies/0.x";
  id: Id;
  frame: Frame;
  definitions: {
    published: { blueprints: DefRef[]; processes: DefRef[] };   // registry references (D-028)
    embedded: { blueprints: Blueprint[]; processes: ProcessDefinition[] };  // authored here
  };
  blockies: Record<Id, Blockie>;
  composites: Record<Id, Composite>;
  placements: Record<Id, Placement>;  // absence = unplaced (D-013)
  connections: Connection[];
  runs: Record<Id, Run>;              // the process registry: authoritative
};

type Frame = { id: Id; space: "2d" };
```

Two registries, not one map with a discriminator. The entity kinds meet only through
`EntityRef` and `Endpoint`, where the union is explicit.

## Blockie

```ts
type Blockie = {
  id: Id;
  blueprint: DefRef;
  config: BtsValue;
  state: BtsValue;
};
```

That is the whole entity. No placement, no membership, no mode, no owner, no parent, no
representation flag — every one of those is either a separate table or derived.

## Composite

```ts
type Composite = {
  id: Id;
  origin:
    | { kind: "grouping" }                                    // D-001
    | { kind: "template"; definition: DefRef; memberMap: Record<string, EntityRef> };
  members: MemberEdge[];                                      // exactly one role: brain; >=1 non-brain
  manager?: { run: Id; epoch: number };                       // F-07, D-018; a Run role, not the Brain
  aliases: Alias[];
  folds: Fold[];
  presentation?: CompositePresentation;                       // D-035
};

type CompositePresentation = {
  label: string;
  renderer?: DefRef;          // a renderer package, not a Blueprint
  body?: EntityRef;           // a direct child that stands for the assembly
};

type MemberEdge = {
  entity: EntityRef;
  role: "brain" | "part" | "member";                          // D-047
  provenance: "grouping" | { template: string };              // D-025
};
```

`manager` is absent when unmanaged. `epoch` increments on every designation change so a stale
grant can be rejected. Existence (`assembled` / `dissolved`) is encoded as presence or absence in
`composites`; `forming` and `dissolving` are transaction-internal (F-06).

A Composite has exactly one `role: "brain"` edge and at least one non-brain edge. `brain` and
`part` reference Blockies; `member` may reference a Blockie or a Composite. The Composite itself has
no Blueprint, state, or ports; the Brain provides them, and the Parts render slices.

## Aliases and folds

```ts
type Alias = {
  id: Id;
  direction: "in" | "out";
  kind: "value" | "event";
  type: BtsType;                     // assertion; the child port's type is canonical
  ref:
    | { member: EntityRef; port: PortId }   // the Brain or a Member, never a Part
    | { fold: Id };
};

type Fold = {
  id: Id;
  op: "sum" | "count" | "min" | "max" | "collect";
  select: { kind: "all" } | { kind: "members"; members: EntityRef[] };  // Members, not Parts
  port: PortId;                      // which output port of each selected member
  resultType: BtsType;
  emptyValue?: BtsValue;             // required when the empty set is legal
};
```

One `ref` field, not `source`/`target`: direction decides which way the value or event flows.
A fold is only legal as the ref of a `value`/`out` alias.

## Placement

```ts
type Placement = {
  // keyed by entity id in world.placements; the key is authoritative, no embedded id
  scope: { frame: Id } | { composite: Id };   // nearest placed ancestor scope
  transform: { translate: [number, number]; scale: number };
  layer?: number;                             // draw order within the scope, default 0 (D-038)
};
```

No rotation (D-022). No `space` field: the space belongs to the Frame, so a 3D Frame can widen the
transform without changing every placement.

## Connections

```ts
type Endpoint =
  | { blockie: Id; port: PortId }
  | { composite: Id; alias: Id };

type Connection = { id: Id; from: Endpoint; to: Endpoint };
```

`from` is always an output endpoint, `to` always an input endpoint. A composite endpoint names an
alias, never a member port (D-015).

## Runs

```ts
type Run = {
  id: Id;
  host: Id;                          // exactly one Blockie (D-013)
  definition: DefRef;
  status: RunStatus;
  wait?: { reason: WaitReason; detail?: string };
  ack: "unacknowledged" | "acknowledged" | "expired";
  parent?: Id;                       // process parentage, never membership
  state: BtsValue;                   // run state, separate from host state (D-002)
  inbox: InboxItem[];
  grant?: { composite: Id; memberSet: EntityRef[] };   // D-033
};

type RunStatus =
  | "queued" | "running" | "waiting" | "suspended" | "cancelling"
  | "succeeded" | "failed" | "cancelled";

type WaitReason =
  | "inbox" | "human_permission" | "human_question" | "human_auth"
  | "external_service" | "timer" | "dependency";

type InboxItem = {
  delivery: Id;
  event: Id;
  port: PortId;
  payload: BtsValue;
  causation?: Id;
};
```

`status`, `wait`, and `ack` are the three facts D-019 needs. There is no mode field, because
`occupied` is a function of `status` and the display word is a function of both.

## Process definition

```ts
type ProcessDefinition = {
  id: Id;
  version: string;
  digest: Digest;
  stateType: BtsType;
  host: {
    claims: PortId[];      // event inputs this run owns (D-016)
    reads: PortId[];       // value inputs it may read
    publishes: PortId[];   // value outputs it produces (D-017)
  };
  step: { runtime: string; module: Digest; export: string };
  wake: WakeCondition[];
  limits?: { steps?: number; ms?: number; memory?: number };
};

type WakeCondition =
  | { reason: "inbox" }
  | { reason: "dependency"; port: PortId }
  | { reason: "timer"; after: number }
  | { reason: "human"; kind: "permission" | "question" | "auth" };
```

## Blueprint

```ts
type Blueprint = {
  id: Id;
  version: string;
  digest: Digest;
  appearance: { geometry: string; renderer: DefRef };
  state: { type: BtsType; initial: BtsValue };
  config: { type: BtsType; defaults: BtsValue };
  ports: Port[];
  logic?: {
    compute?: { module: Digest; export: string; outputs: PortId[] };
    reduce?: { module: Digest; export: string; handles: PortId[] };
  };
};

type Port = {
  id: PortId;
  direction: "in" | "out";
  kind: "value" | "event";
  type: BtsType;
  producer?: "compute" | "process";   // value outputs only (D-017)
  claimable?: true;                   // event inputs only (D-016)
  required?: boolean;                 // value inputs
  default?: BtsValue;                 // value inputs
};
```

`claimable` and `producer` live on the port, not in a separate host block: the constraint belongs
to the port it constrains, and a validator reading one port has everything it needs.

## Traceability

| Field | Source |
|---|---|
| `Blockie` has no placement, mode, or owner | D-013, D-019, D-001 |
| `Composite.origin` union | D-001, D-025 |
| `MemberEdge.provenance` | D-025 |
| `MemberEdge.role` | D-047 |
| `manager.epoch` | F-07, D-018 |
| `Alias.ref` union without a dispatch case | D-032 |
| `Fold.emptyValue` | D-026 |
| `Placement.scope` | D-022 |
| `Placement.transform` without rotation | D-022 |
| `Endpoint` union | D-015 |
| `Run.state` separate from host | D-002 |
| `Run.grant` | D-033 |
| `Run.status` / `wait` / `ack` | D-019, F-21, F-22 |
| `ProcessDefinition.host` | D-016, D-017 |
| `WakeCondition` | F-21, D-030 |
| `Port.claimable` / `producer` | D-016, D-017 |
| `Composite.presentation` | D-035 |
| `Placement.layer` | D-038 |

## Cut, and why

| Not in the schema | Why |
|---|---|
| `operational_mode` | Derived from `Run.status` (D-019) |
| `represented` flag | Placement absence (D-013) |
| `kind: atomic \| composite` on definitions | Composites are entities, not definitions (0001) |
| `container.accepts_children` | Follows from entity kind; never a separate field |
| `exposures`, `input_bindings` | Aliases (D-015) |
| `interface_mode` | Deleted as redundant (D-018 amendment) |
| `attention` | Projection over bindings and sessions (D-031) |
| `manager` capability list | One verb, expressed as the run's grant (D-033) |
| Grid, zoom, hover, selection | View state, never World state (D-004) |
| Styling, typography, materials | Renderer package territory (D-035) |
| Derived outputs, generations | Runtime snapshot, not the document |
| Event queues, dirty flags | Transient |
| Effect outbox | Runtime state, not the document (D-028) |
| `parent` on a Blockie | Membership lives on the Composite |

## Not settled here

- Canonical JSON encoding for digesting (key order, number form, decimal form). Still open.
- Validation order across the document (structural, cross-reference, then invariant).
- Whether `definitions.embedded` is keyed or a list. A list with `id` inside is simpler; a map
  makes duplicate detection trivial.
- How `state` and `config` are checked against their `BtsType` at load, and what happens on
  mismatch (reject, never repair).
