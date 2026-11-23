# 0011 — Vocabulary: Blueprint, value type, appearance, Blockie state

**Date:** 2026-11-23
**Status:** Accepted
**Builds on:** 0001–0010
**Supersedes:** the vocabulary, not the substance, of the earlier decisions

## D-046 — Rename the words that were doing two jobs

The design uses "Type" for two different things:

- the **blueprint** a Blockie is made from (archetype, state schema, config schema, ports, logic);
- the **shape of a value** (a record, an array, an integer) inside that blueprint.

That is not a cosmetic problem. It makes the specification harder to read, it makes the schema
and the prose disagree, and it makes a first explanation of the model slower than it should be.
"Model State" has the same issue: it sounds like machine learning, while it means the state that
belongs to a Blockie.

### The mapping

| Old | New | Where it changes |
|---|---|---|
| Type package, Blockie Type | **Blueprint** | prose, schema `$defs/Blueprint`, Blockie field `blueprint` |
| BTS type | **value type** | prose; the schema keeps `BtsType` and `BtsValue` |
| archetype | **appearance** | prose, schema field `appearance` |
| Model State | **Blockie state** | prose; the schema field stays `state` |
| Type renderer package | **renderer package** | prose |
| Type reducer | **blueprint reducer** | prose |
| Type Compute | **blueprint compute** | prose |

### The rules that follow

1. **"Type" is reserved for the BTS.** A BTS type is called a **value type** in prose. The schema
   names `BtsType` and `BtsValue` stay: they are the type system's proper nouns, not the generic
   word.
2. **A Blueprint is a complete plan for an instance.** It declares an appearance, a state schema
   with an initial value, a config schema with defaults, ports, and optional `compute`/`reduce`
   logic.
3. **A Blockie pins exactly one Blueprint.** The schema field is `blueprint`, a `DefRef`.
4. **An appearance is exactly geometry plus a renderer package.** It is not a prototype, not an
   original, and not a second kind of entity.
5. **Blockie state is the state the Blockie owns.** It is changed only by the Blockie's reducer.
   Run state is separate; a Run never writes Blockie state (C-45).
6. **The decision log is append-only.** Decisions 0001–0010 keep their original vocabulary. When
   one is quoted, translate on first use: "Type package (now Blueprint)", "Model State (now
   Blockie state)".

### Why these words

**Blueprint** is a complete plan for making an instance. It contains the value types, but it is
not itself a value type. That is the distinction the old word lost.

**Appearance** says what the thing is: a geometry descriptor and a renderer package. "Archetype"
suggests an original or a prototype, which is not what it is, and it collides with the ECS use of
"archetype" for a storage layout.

**Blockie state** says whose state it is. "Model State" adds a word that implies a model, a
simulation, or a machine-learning artefact. The state belongs to the Blockie.

**Value type** says what the BTS describes. It also lets the schema keep `BtsType` as a technical
name without the prose using "Type" for two jobs.

### Schema changes

These are breaking changes to the 0.x schema. No implementation exists, so the cost is a
regeneration of the example and the conformance vectors, not a migration.

| Before | After |
|---|---|
| `$defs/TypePackage` | `$defs/Blueprint` |
| `Blockie.type` | `Blockie.blueprint` |
| `Blueprint.archetype` | `Blueprint.appearance` |
| `definitions.published.types` | `definitions.published.blueprints` |
| `definitions.embedded.types` | `definitions.embedded.blueprints` |

`BtsType`, `BtsValue`, `ProcessDefinition`, `DefinitionManifest`, `state`, and `config` keep
their names.

### Consequences

- The specifications, schema, example, fixtures, field guide, glossary, architecture notes and
  performance analysis use the new vocabulary.
- The glossary keeps the old anchors (`#type-package`, `#model-state`, `#archetype`) as aliases,
  so existing links keep working.
- The review in `reviews/0001-integrity-check.md` is a historical record and keeps its original
  vocabulary, with a note at the top.
- The HTML guide's page formerly called "Types, state and ports" becomes "Blueprints, state and
  ports".
