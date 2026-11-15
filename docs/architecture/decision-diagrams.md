# Decision diagrams

One diagram per decision in `decisions/`. Superseded decisions are kept and marked, not
deleted: the trail is the point.

| ID | Decision | Status |
|---|---|---|
| D-001 | Grouping and instantiation are different operations | active |
| D-002 | Run state is separate from host Model State | active |
| D-003 | Composites may be static; three independent state dimensions | active |
| D-004 | Explicit state, minimal implicit machines (with two bounds) | active |
| D-005 | Every managed process is represented | **superseded by D-013** |
| D-006 | Geometry is semantically inert | active |
| D-007 | One World, global placement, views are cameras | active |
| D-008 | Representation is stage/backstage | **superseded by D-013** |
| D-009 | Attention is derived, not an entity | active |
| D-010 | Status is a projection with many dialects | active |
| D-011 | Declared graph, not runtime signal tracking | active |
| D-012 | Aggregation is declared; implicit fan-in stays forbidden | active |
| D-013 | Host is mandatory, placement is nullable | active |
| D-014 | Primary status is derived, never declared | active |

## Lineage

```mermaid
flowchart LR
    A["D-005<br/>every run drawn"] --> B["D-005 + represented flag"]
    B --> C["D-008<br/>stage / backstage"]
    C --> D["D-013<br/>placement: null"]
    style C stroke-dasharray: 5 5
```

## D-001 — Grouping and instantiation

Ad-hoc grouping is mutable and keeps identities. Instantiation materialises fresh identities
and is immutable. `save as` promotes a grouping to a definition; `fork` demotes an instance
back to a grouping.

```mermaid
flowchart LR
    subgraph G["Grouping (ad-hoc)"]
        GB["Existing Blockies<br/>identities preserved"]
        GC["Composite<br/>mutable membership"]
        GB --> GC
    end
    subgraph I["Instantiation"]
        ID["Composite Definition<br/>immutable, pinned"]
        IN["Fresh members<br/>fresh identities"]
        ID --> IN
    end
    GC -- "save as" --> ID
    IN -- "fork" --> GC
```

## D-002 — Run state is separate from host Model State

The run never writes the host's state. It publishes through declared bindings; it reads through
declared inputs. One writer per state, always.

```mermaid
flowchart LR
    subgraph R["Process Run"]
        RS["Run state<br/>checkpointed"]
        RB["Bounded step"]
        RS --> RB
    end
    subgraph H["Host Blockie"]
        HS["Model State"]
        HR["Type reducer / compute"]
        HP["Ports"]
        HR --> HS
    end
    HP -- "declared input" --> RB
    RB -- "declared output binding" --> HP
    N["Prohibited: run writes<br/>host Model State"]
    RB -.- N
```

## D-003 — Composites may be static

Three independent dimensions. Collapsing them into one enum is the conflation the rest of the
architecture forbids.

```mermaid
flowchart TB
    subgraph E["Existence"]
        E1["forming"] --> E2["assembled"] --> E3["dissolving"] --> E4["dissolved"]
    end
    subgraph M["Management"]
        M1["unmanaged"] --> M2["designating"] --> M3["managed"] --> M4["handoff pending"]
    end
    subgraph I["Interface mode"]
        I1["declarative<br/>no process needed"]
        I2["managed<br/>live manager required"]
    end
```

## D-004 — Explicit state, with two bounds

State that carries transition authority is stored. Everything else is a projection or view
ephemera.

```mermaid
flowchart TB
    subgraph S["Stored, authoritative"]
        A["Process registry"]
        B["Membership records"]
        C["Placement records"]
    end
    subgraph D["Derived projections (never stored)"]
        D1["occupancy"]
        D2["footprint"]
        D3["manager availability"]
    end
    subgraph V["View ephemera (never in the World)"]
        V1["hover"]
        V2["scroll"]
        V3["selection"]
    end
    A --> D1
    C --> D2
    A --> D3
```

## D-005 — Every managed process is represented

Superseded. The intent survived; the mechanism did not: a boolean flag became stage/backstage,
which became nullable placement. See the lineage diagram.

```mermaid
flowchart LR
    R["Process Run"] --> H["Host Blockie"]
    H --> V["drawn in the Frame"]
    H --> F["represented: true / false"]
    style F stroke-dasharray: 5 5
```

## D-006 — Geometry is semantically inert

Placement may influence what you see. It may not influence what happens.

```mermaid
flowchart LR
    P["Placement / geometry"]
    S["Semantics<br/>membership · management<br/>parentage · authority"]
    P -. "must not influence" .-> S
    T["Same World<br/>randomised geometry"] --> TR["Identical execution trace"]
```

## D-007 — One World, global placement, views are cameras

Four distinct entities in the two-view scenario. The green buttons drive the beige composites by
connection, not by identity. A view is a viewport plus renderer plus grants.

```mermaid
flowchart TB
    W["One World<br/>one placement tree"]
    W --> C1["Viewport: presenter<br/>camera · renderer · grants"]
    W --> C2["Viewport: audience phone<br/>camera · renderer · grants"]
    C1 --> P1["beige composite A"]
    C1 --> P2["beige composite B"]
    C2 --> G1["green button A"]
    C2 --> G2["green button B"]
    G1 -- "event" --> P1
    G2 -- "event" --> P2
```

## D-008 — Representation is stage/backstage

Superseded by D-013. Kept because it is the step where "not drawn" stopped being a run state.

```mermaid
flowchart LR
    H["Host Blockie"] --> S["stage<br/>drawn"]
    H --> B["backstage<br/>placed, never drawn"]
    H --> A["aggregated<br/>derived per view"]
    style B stroke-dasharray: 5 5
```

## D-009 — Attention is derived, not an entity

Who is looking is a function of sessions. No second truth about who is working on what.

```mermaid
flowchart LR
    A["Actor / agent"] --> S["Session<br/>viewport + grants"]
    S --> E["Entities in scope"]
    S --> AT["Attention<br/>derived"]
    E --> AT
    AT -. "grants nothing" .-> X["no data access<br/>no membership<br/>no management"]
```

## D-010 — Status is a projection with many dialects

One internal projection, N exporters. Egress only: reading a dialect back would be an ambient
dependency.

```mermaid
flowchart LR
    R["Run registry"] --> P["Status projection<br/>idle · working · blocked · done · error"]
    P --> F["Frame badge"]
    P --> T["TUI / CLI"]
    P --> I["Agent inbox"]
    P --> O["OSC 7501"]
    O -. "egress only" .-> X["never read back into the World"]
```

## D-011 — Declared graph, not runtime signal tracking

The value graph is a signal graph whose edges are declared rather than discovered. That is what
makes it serialisable and validatable.

```mermaid
flowchart LR
    subgraph Decl["Declared graph (chosen)"]
        D1["ports + connections<br/>edges known before execution"] --> D2["topological order"]
        D2 --> D3["equality-gated propagation"]
    end
    subgraph Sig["Runtime tracking (rejected)"]
        S1["read tracking inside JS"] --> S2["in-memory signal graph"]
    end
    Decl --> OK["serialisable · validatable · collaborative"]
    Sig --> NO["not serialisable · not validatable<br/>breaks across process boundaries"]
```

## D-012 — Aggregation is declared

Fan-out is free. Fan-in is forbidden because the combining rule would be implicit. A fold makes
it explicit, with no process and no shared state.

```mermaid
flowchart LR
    A["one output"] --> B1["input 1"]
    A --> B2["input 2"]
    A --> B3["input 3"]
    subgraph F["implicit fan-in (forbidden)"]
        X1["output 1"] --> T["one input"]
        X2["output 2"] --> T
    end
    subgraph FD["declared fold (allowed)"]
        M1["member output"] --> F1["sum / count / min / max / collect"]
        M2["member output"] --> F1
        M3["member output"] --> F1
        F1 --> OUT["Composite output"]
    end
```

## D-013 — Host is mandatory, placement is nullable

The host is the run's interface, not its picture. Promotion and demotion are placement
operations: reversible, identity-preserving, no capability change.

```mermaid
flowchart TB
    R["Process Run"] --> H["Host Blockie<br/>ports · membership · identity"]
    H --> P1["placement: present<br/>drawn · hit-tested · in footprint"]
    H --> P2["placement: null<br/>not drawn · not hit-tested<br/>still countable"]
    P2 -- "assign placement" --> P1
    P1 -- "clear placement" --> P2
```

## D-014 — Primary status is derived, never declared

A claim can be wrong; an observation cannot. Sub-phases are a label on top, never the truth.

```mermaid
flowchart TB
    subgraph Facts["Facts the runtime owns"]
        R["run record"]
        W["wait reason"]
        K["acknowledgement"]
    end
    S["Status<br/>idle · working · blocked · done · error"]
    R --> S
    W --> S
    K --> S
    S --> V["viewers, badges, exporters"]
    subgraph Claim["Rejected: declared status"]
        C1["program says 'working'"] -. "can disagree" .-> C2["reality: stuck"]
    end
```
