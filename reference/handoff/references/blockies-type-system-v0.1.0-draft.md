# Blockies Type System Specification

**Specification:** Blockies Type System (BTS)  
**Version:** 0.1.0-draft  
**Status:** Proposed  
**Parent specification:** Blockies Protocol v0.1.0-draft  
**Scope:** Type expressions, values, compatibility, generics, and port validation

---

## 1. Abstract

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

## 2. Normative terminology

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

- **Type expression:** A declaration describing a set of valid values.
- **Value:** A concrete datum carried by a state field or port.
- **Validation:** Determining whether a value conforms to a type expression.
- **Assignability:** Determining whether every value allowed by one type can safely be used where another type is expected.
- **Specialization:** Replacing generic type parameters with concrete types.
- **Type inference:** Determining generic type arguments from declared connections or context.
- **Nullable:** A type that explicitly permits `null`.
- **Optional property/input:** A field or input that may be absent.

## 3. Design principles

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

## 4. Type expression model

A type expression describes the set of values accepted at a boundary. BTS defines primitive types, composite types, and type references.

A definition MAY declare named types and generic type parameters. Port declarations, state schemas, and configuration schemas MAY refer to these types.

### 4.1 Canonical type expression forms

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

### 4.2 Type expression validity

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

## 5. Primitive types

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

### 5.1 `null`

`null` is a concrete value. It is not equivalent to an omitted property, an unresolved input, or a missing output.

A type permits null only when it explicitly includes `null`, normally through a union such as `string | null`.

### 5.2 `boolean`

A Boolean value MUST be exactly `true` or `false`.

Strings such as `"true"`, numbers such as `1`, and other truthy/falsy values MUST NOT be accepted as Boolean values.

### 5.3 `integer`

An Integer MUST be a whole number within the JavaScript safe integer range:

`-(2^53 - 1) <= value <= (2^53 - 1)`

An Integer type MAY additionally declare `minimum` and `maximum` inclusive constraints. Both constraints MUST be safe integers, and `minimum` MUST NOT exceed `maximum`.

This limit is chosen so that the integer has the same exact value in common JSON implementations, including JavaScript implementations.

A future extension MAY define wider integer types with explicit wire encodings.

### 5.4 `number`

A Number MUST be a finite IEEE 754 binary64 value. NaN, positive infinity, and negative infinity are invalid. Negative zero MUST be treated as numerically equal to zero and serialized as `0`.

The JSON representation MUST be a JSON number. Implementations MUST NOT silently accept numeric strings. A Number type MAY additionally declare finite inclusive `minimum` and `maximum` constraints. `minimum` MUST NOT exceed `maximum`.

### 5.5 `decimal`

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

### 5.6 `string`

String is a sequence of Unicode scalar values. BTS does not implicitly normalize Unicode text.

A String type MAY specify `min_length` and `max_length`. Length is measured in Unicode scalar values, not UTF-8 bytes or UTF-16 code units. A string containing an unpaired UTF-16 surrogate MUST be rejected because it is not a sequence of Unicode scalar values.

Pattern-based validation is deferred from the core v0.1 type system because regular-expression dialects differ across runtimes. A future extension MAY define a portable pattern dialect. Format-specific string validation MUST use a namespaced, explicitly declared format extension; implementations MUST NOT silently interpret an unknown format.

### 5.7 `bytes`

Bytes represents arbitrary binary data.

Its JSON wire representation MUST be an unpadded base64url-encoded string without whitespace. Implementations MUST validate the encoding before accepting the value.

### 5.8 `date`

Date represents a calendar date in the proleptic Gregorian calendar.

The wire representation MUST use `YYYY-MM-DD`, with a four-digit year from `0001` through `9999`, and MUST represent a valid calendar date.

A Date is not a timestamp and MUST NOT be interpreted as midnight UTC.

### 5.9 `time`

Time represents a time of day without a date or timezone.

The wire representation MUST use `HH:mm:ss` with an optional fractional-second component. Hours MUST be `00` through `23`; minutes and seconds MUST be `00` through `59`. Leap seconds are not supported in v0.1. A Time MUST NOT contain a UTC offset.

### 5.10 `datetime`

DateTime represents an absolute instant.

The wire representation MUST be an RFC 3339 timestamp containing `Z` or an explicit numeric offset.

Two DateTime values representing the same instant with different offsets are semantically equal as instants. An implementation MAY preserve the original textual offset for display, but comparisons MUST use instant semantics. Leap-second notation is not supported in v0.1.

### 5.11 `duration`

Duration represents a time span as a signed safe integer number of milliseconds.

Fractional milliseconds are not supported in v0.1.

### 5.12 `unknown` and `never`

`unknown` is the safe top type. Every valid BTS value is assignable to `unknown`. A value of type `unknown` MUST be narrowed or validated before it is used where a more specific type is required.

`never` is the bottom type. No concrete value validates as `never`. It is useful for representing impossible branches and exhaustive generic logic.

BTS MUST NOT define an unrestricted `any` type. Unlike `unknown`, `any` would allow unvalidated values to bypass type safety.

## 6. Composite types

### 6.1 Array

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

### 6.2 Tuple

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

### 6.3 Record

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

### 6.4 Map

A Map is a collection of string keys mapped to values of one declared type.

```json
{
  "kind": "map",
  "values": { "kind": "primitive", "name": "decimal" }
}
```

The wire representation is a JSON object. Every key MUST be a string and every value MUST validate against the declared value type.

Map keys are not required to be declared in advance.

### 6.5 Union

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

### 6.6 Literal

A Literal type accepts exactly one value. A source Literal is assignable to an identical target Literal; otherwise it is assignable only to a compatible broader type.

```json
{ "kind": "literal", "value": "success" }
```

Literal values MUST be valid BTS scalar values in v0.1. A Literal is assignable to its corresponding primitive type.

### 6.7 Enum

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

### 6.8 Named types and aliases

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

### 6.9 Deferred composite types

The following are not core types in v0.1:

- Function and closure types.
- Stream and observable types.
- Mutable references and pointers.
- Arbitrary class instances.
- Native platform handles.
- Unbounded recursive types.
- Resource references such as file handles or live database connections.

They MAY be introduced by future extensions with explicit serialization and execution semantics.

## 7. Optionality and nullability

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

## 8. Type compatibility and assignability

### 8.1 Directional rule

A connection from output type `S` to input type `T` is valid only when:

`S is assignable to T`

In other words, every value that the source may legally produce must be accepted by the target.

Compatibility is directional. The fact that `T` is assignable to `S` does not make the connection valid in the opposite direction.

### 8.2 Core assignability rules

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

### 8.3 Record assignability

A source Record `S` is assignable to a target Record `T` when:

- Every required property of `T` exists in `S` and is guaranteed to be present.
- For every property declared by `T`, the corresponding source property type is assignable to the target property type when the source property may be present.
- A source property that is optional cannot satisfy a required target property.
- If `T` is closed (`additional_properties: false`), the source MUST NOT be capable of supplying undeclared properties that would be rejected by `T`.
- If `T` allows additional properties of type `U`, every additional source property type MUST be assignable to `U`.

An implementation MUST use the declared required/optional status; it MUST NOT infer that a property is required merely because it appears in `properties`.

### 8.4 No implicit conversions

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

### 8.5 Type constraints

Refinement constraints such as `minimum`, `maximum`, `min_items`, `max_items`, `min_length`, `max_length`, `precision`, and `scale` are part of the type.

A source refinement is assignable to a target refinement only when the source guarantees the target's constraints. For numeric minimum/maximum constraints, the source range MUST be a subset of the target range. For string and array length constraints, the source length range MUST be a subset of the target range. If the target requires unique array items, the source MUST also guarantee uniqueness. For Decimal, the source precision and scale limits MUST be no less restrictive than the target limits.

Example:

- `integer` is assignable to `number`.
- `number` constrained to `[0, 100]` is assignable to `number` constrained to `[0, 1000]`.
- `number` constrained to `[0, 1000]` is not generally assignable to `number` constrained to `[0, 100]`.

If an implementation cannot prove a refinement relationship statically, it MUST reject the connection or require an explicit runtime validation/conversion Blockie. It MUST NOT assume compatibility.

## 9. Generic types

### 9.1 Purpose

Generics allow a Blockie Definition to operate on values of different types without duplicating the Definition.

Examples include:

- Identity Blockie: `T -> T`.
- List Blockie: `Array<T> -> Array<T>`.
- Pair Blockie: `(T, U) -> Pair<T, U>`.
- Filter Blockie: `Array<T> -> Array<T>`.

### 9.2 Type parameter declaration

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

### 9.3 Generic use

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

### 9.4 Instance specialization

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

### 9.5 Type inference

A Runtime MAY infer generic arguments from connected ports.

Inference order:

1. Explicit instance type arguments take precedence.
2. Otherwise, infer from statically declared source output types and other available type context.
3. If inference cannot resolve a parameter, use its declared default if one exists.
4. If a required parameter remains unresolved, instance validation MUST fail.

Inference MUST NOT depend on sampling an arbitrary runtime value when a declared source type is available.

If a parameter appears at multiple inference sites, v0.1 inference requires the candidates to resolve to the same normalized type expression. `integer` and `number`, for example, are not treated as identical inference candidates even though `integer` is assignable to `number`. If candidates conflict, inference MUST fail with a generic inference error. The Runtime MUST NOT silently choose `unknown` or widen to a common supertype to hide a conflict. Authors MAY provide an explicit type argument to resolve the ambiguity.

### 9.6 Constraints

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

### 9.7 Generic variance

Generic parameters declared by user-defined generic Definitions are invariant in v0.1.

Built-in immutable containers have specified variance:

- `Array<T>` is covariant in `T`.
- `Map<T>` is covariant in `T`.
- `Tuple<T1, ...>` is covariant in each element.

User-defined covariance and contravariance annotations are deferred. This restriction avoids unsound connections while the type system is young.

## 10. Port type declarations

### 10.1 Value input

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

### 10.2 Value output

```json
{
  "id": "total",
  "direction": "output",
  "kind": "value",
  "value_type": { "kind": "primitive", "name": "decimal" }
}
```

A Compute invocation MUST return a value for every declared value output. If no meaningful value exists, the output type MUST explicitly allow `null`, or the computation MUST report an error/unavailable status through the Runtime. Missing output keys MUST be treated as a contract violation.

### 10.3 Event input

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

### 10.4 Event output

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

## 11. Port validation lifecycle

A conforming Runtime MUST validate types at the following boundaries.

### 11.1 Definition validation

When loading or registering a Definition, the implementation MUST validate:

- Port IDs are unique within the Definition.
- Port directions and kinds are valid.
- Every port has the required type declaration.
- All named types and generic parameters resolve.
- Generic constraints and defaults are valid.
- Input defaults conform to their declared types.
- State and configuration schemas are valid.
- Logic exports and referenced modules are declared.

### 11.2 Instance validation

When creating or loading an instance, the implementation MUST:

- Resolve the exact Definition version and digest.
- Resolve generic type arguments.
- Substitute type parameters.
- Validate configuration against the specialized configuration schema.
- Validate model state against the specialized state schema.

### 11.3 Connection validation

When creating or loading a connection, the implementation MUST:

1. Resolve the source and target instances.
2. Resolve their specialized Definitions.
3. Resolve the referenced ports.
4. Verify output-to-input direction.
5. Verify matching communication kinds.
6. Verify source type assignability to target type.
7. Verify input cardinality.

An invalid connection MUST be rejected before the World is executed.

### 11.4 Input resolution

Before invoking Compute, each input MUST be resolved as follows:

1. If connected, use the current committed value from the source output.
2. Otherwise, if a default exists, use the default.
3. Otherwise, if the input is optional, omit the input key.
4. Otherwise, mark the Blockie as blocked because a required input is unresolved.

A connected source that is in an error or unavailable state MUST NOT silently fall back to the target's default.

Resolved values MUST be validated against the target input type before invocation.

### 11.5 Compute output validation

After Compute returns, the Runtime MUST:

- Verify that all declared value output keys are present.
- Reject undeclared output keys.
- Validate every returned value against its output type.
- Reject non-serializable values.
- Publish outputs only after successful validation.

A computation that returns an invalid output MUST be marked as a computation error. Invalid output values MUST NOT be propagated.

### 11.6 Event validation

An event payload MUST be validated against the source event output payload type before emission and against the target event input payload type before delivery.

An invalid event MUST be rejected and MUST NOT invoke a reducer.

### 11.7 Reducer result validation

After Reduce returns, the Runtime MUST:

- Validate the complete next state against the specialized state schema.
- Validate every emitted event against its declared event output payload type.
- Verify that every requested effect is declared by the Definition.
- Reject undeclared emitted ports and effects.

If validation fails, the originating transaction MUST NOT commit the invalid state transition.

### 11.8 Value immutability

Values passed into or returned from Blockie logic MUST behave as immutable snapshots.

A Runtime MUST prevent one Blockie's mutation of an input object from changing another Blockie's state or output.

An implementation MAY use copy-on-write, persistent data structures, or other optimizations while preserving this observable behavior.

## 12. Validation errors

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

## 13. Conformance tests

A BTS implementation SHOULD provide automated tests for at least the following cases.

### 13.1 Primitive validation

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

### 13.2 Assignability

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

### 13.3 Optionality and nullability

Tests MUST verify that:

- An omitted optional property is accepted.
- An omitted required property is rejected.
- A present `null` is accepted only by a nullable type.
- An optional nullable property accepts omission, `null`, or a valid non-null value.
- An omitted input is not automatically converted to `null`.

### 13.4 Generic inference

Tests MUST verify that:

- A generic Identity Blockie infers `T = string` from a string-producing connection.
- A generic Identity Blockie infers `T = number` from a number-producing connection.
- An explicit type argument is respected.
- A type argument violating a constraint is rejected.
- Conflicting generic constraints fail rather than silently becoming `unknown`.

### 13.5 Port validation

Tests MUST verify that:

- An incompatible connection is rejected.
- A missing required input blocks computation.
- A valid default resolves an unconnected input.
- A connected upstream error does not trigger default fallback.
- Invalid Compute outputs are not propagated.
- Invalid event payloads do not reach reducers.
- Invalid reducer state does not commit.

## 14. Open issues and deferred decisions

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

## Appendix A. Example generic List passthrough Blockie

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

## Appendix B. Example typed Dataset

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

## Appendix C. Relationship to other type systems

BTS borrows useful concepts from structural type systems, generic programming, and schema validation systems. It does not claim compatibility with TypeScript's complete type system or with the complete JSON Schema specification.

A TypeScript SDK MAY generate TypeScript types from BTS definitions. Generated TypeScript types are a developer convenience; runtime validation MUST still be performed according to BTS.

A Runtime MAY use JSON Schema or another validator internally, provided that all BTS-specific semantics—including decimal, date/time, assignability, generic specialization, and port validation—are preserved.

---

**End of Blockies Type System Specification v0.1.0-draft**
