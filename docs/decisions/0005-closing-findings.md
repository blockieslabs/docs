# 0005 — Closing the integrity findings

**Date:** 2026-11-16
**Status:** Accepted (working)
**Resolves:** I-006, I-011 … I-022, I-023 … I-028
**Amends:** D-014 (status vocabulary)

## D-019 — One status chain, three layers

The registry is the only source. Mode and display status are projections, in that order.

**Layer 1 — registry run state (F-01).** `queued`, `running`, `waiting`, `suspended`,
`cancelling`, `succeeded`, `failed`, `cancelled`.

**Layer 2 — mode (binary).** `occupied` if the run is in any non-terminal state, else `vacant`.
The terms `computing` and `drawing` are retired as normative vocabulary: "computing" is false for
a queued or suspended run, and the binary is about attachment, not activity. They may survive as
informal words in prose and in the renderer.

**Layer 3 — display status (seven words).** Amends D-014, which had five and could not express
`suspended` or `cancelled`:

| Registry | Mode | Display |
|---|---|---|
| `queued` | occupied | `working` |
| `running` | occupied | `working` |
| `waiting`, human wait reason | occupied | `blocked` |
| `waiting`, other reason | occupied | `idle` |
| `suspended` | occupied | `paused` |
| `cancelling` | occupied | `working` |
| `succeeded`, unacknowledged | vacant | `done` |
| `succeeded`, acknowledged | vacant | — (no status) |
| `failed` | vacant | `error` |
| `cancelled`, unacknowledged | vacant | `cancelled` |
| `cancelled`, acknowledged | vacant | — (no status) |

Exporters are lossy and must say so: OSC 7501 maps `paused` to `idle` and `cancelled` to `done`
with a message. The World's vocabulary is richer than any single dialect.

Consequence of D-016: if a run claims every event input, its host's reducer never runs and the
host's Model State is frozen for the run's lifetime. That is legal, visible in the host contract,
and must be tested.

## D-020 — Value equality is typed and defined per type

Equality gates propagation (D-011) and decides whether a committed generation changed. It is
always computed between two values of the same declared type; comparing across types is a
validation error.

| Type | Equality |
|---|---|
| `null`, `boolean` | identity |
| `integer`, `number` | numeric; `-0` equals `0` |
| `decimal` | numeric. Scale is representation metadata and does **not** affect equality, so `"12.50"` equals `"12.5"` and does not propagate |
| `string` | exact scalar sequence; no Unicode normalisation |
| `bytes` | byte sequence |
| `date` | calendar date |
| `time` | time of day |
| `datetime` | instant; equal instants with different offsets are equal |
| `duration` | integer milliseconds |
| `array`, `tuple` | element-wise, order significant |
| `record` | property-wise; absent ≠ `null` |
| `map` | key-wise, order insignificant |
| `union`, `literal`, `enum` | underlying value |
| `unknown` | structural over the serialised form; must be narrowed before semantic comparison |

Status changes always propagate, even when the value is unchanged: `ready → error` and
`error → ready` are observable transitions.

## D-021 — Inputs resolve from the staged generation

During value stabilisation, a connected input reads the **staged** output of the current
transaction. An output not affected by this transaction is inherited from the base committed
generation. A connected source that is `error`, `blocked`, or unavailable never falls back to the
target's default.

This is the legacy review's P0-2 recommendation, now recorded rather than assumed.

## D-022 — Hierarchical local coordinates, translation and uniform scale only

- The World Frame is the root scope.
- A placed Blockie's placement is relative to its nearest placed ancestor scope: its Composite if
  it has one, otherwise the World Frame.
- A Composite stores its own transform (its origin in its parent scope). Moving a Composite
  changes that transform; member-local positions do not change.
- Transform is **translation plus uniform scale**. Rotation is deferred, because rotation
  composed with non-uniform scale is not closed and would make reparenting lossy.
- `placement: null` is the third case: no coordinate, no footprint contribution, no hit-testing.
- Placement carries a space tag. `2d` is the only conforming space in v1; the field exists so
  3D is an extension, not a migration.
- Reparenting preserves the member's **world** transform. With uniform scale this is always
  expressible.
- Dissolving a Composite converts member placements into the parent scope, preserving world
  transforms.
- A Composite's footprint is the union of member world-space bounds, ignoring unplaced members.
  A Composite whose members are all unplaced has an empty footprint and is not drawn.

## D-023 — Placement operations are atomic document operations

F-17 gains the full set: `assign` (promote from null), `clear` (demote to null), `move`,
`reparent`, `group_move`, `dissolve_convert`. Each is a single document transaction: either every
affected member moves or nothing does. A partially moved group is a corrupt World.

## D-024 — A view has a camera and a grant scope, and they are unrelated

- **Camera:** spatial framing, presentation only.
- **Grant scope:** an explicit set of entities, ports, and verbs a session may act through.
  Authority is never derived from geometry — framing a region confers nothing.

A view is `{ camera, renderer profile, grant scope }`. The audience view can frame the two voting
Blockies while its grant scope allows exactly one verb on exactly those two inputs.

## D-025 — Fork rewrites provenance; save-as captures structure only

**Fork** (D-001) rewrites every membership edge's provenance from `template:<local_id>` to
`grouping`, and drops the pinned definition reference from the Composite. F-05's recovery rule is
conditioned: the provenance check applies **only when a pinned template exists**.

**Save-as** captures structure, member Type references, initial configuration, and the alias
table. It never captures Model State or run state. Member identities are not captured; template
nodes receive local IDs. A grouping containing an ad-hoc nested Composite is saved recursively,
each nested grouping becoming its own definition (`parent.child`). A save that would produce a
recursive definition is rejected.

## D-026 — Empty Composites dissolve; folds revalidate

**Emptiness.** `assembled` requires at least one direct member. Removing the last member dissolves
the Composite in the same transaction. No partial state, no configurable alternative.

**Folds.** A fold declares either an explicit member list or a selector over direct members. On
any membership change the fold is revalidated in the same transaction:

- explicit list + a removed member → the transaction must repair the fold or reject;
- selector → the set recomputes, and every selected member must still expose a compatible output;
- a nested Composite's public output may be selected;
- an empty set is permitted only if the fold declares an `empty_value` valid for its result type
  (`sum → 0`, `count → 0`, `min`/`max → null` on a nullable type).

## D-027 — JS/TS first, WASM second, no native libraries

Recorded because the plugin system depends on it and it previously existed only as prose.

- Authoring language: JavaScript/TypeScript. Engine: QuickJS or Boa — embeddable, deterministic,
  small enough for browser and mobile. Not V8.
- The adapter contract is a bounded `step`, never "run a program": the runtime supplies a snapshot
  and a budget and receives a serialisable result.
- Adapter rules: no ambient time, randomness, network, or filesystem; deterministic microtask
  draining; structured clone at the boundary; BTS-native values (decimal as a canonical string
  plus helpers, never silently coerced to `number`).
- WASM is the second adapter: Rust/C Types, physics, hot paths.
- Two plugin surfaces: **computation** (Definition plus JS or WASM module, capability-gated,
  digest-pinned) and **presentation** (renderer package). Never native dynamic libraries.

## D-028 — Terminology and retention

- **Published** means registered in a package registry with an immutable digest. **Embedded** means
  carried inside a World's manifest because it was authored in that World (D-001). A World may
  contain both.
- **Retention.** Terminal run records and their state are retained with the World after
  acknowledgement. A host may archive them; archival is a host policy, not protocol state. Run
  identity is never reused.
- **Amendment note.** The handoff states every Blockie has "a placement in a Frame". D-013
  amends this: a Blockie may be unplaced. Any future copy of the handoff must carry that note.
