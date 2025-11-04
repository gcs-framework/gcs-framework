# Generative Conformance Specification Framework (GCSF)

**Distribute behavior, not code.**

GCSF defines a portable, machine-readable format for describing how software should behave. Instead of porting libraries across languages, you write a spec once and generate conforming implementations in any language.

## What is GCSF?

GCSF is an open standard that provides:
- **A schema** ([`schema/v0.1.json`](schema/v0.1.json)) — defines the structure of conformance specifications
- **Reference runners** ([`runners/`](runners/)) — demonstrate how to execute specs in specific languages
- **Example specs** ([`example-specs/`](example-specs/)) — show what conformance specs look like

The spec is the portable artifact. Implementations (human-written or AI-generated) prove conformance by passing the tests.

> **Note:** GCSF is currently at v0.x (pre-release). The schema and features may change based on feedback before v1.0 is released.

## Who is this for?

### Spec Authors
You want to define behavior once and let others (or AI) generate implementations across languages. Good candidates:
- Pure, deterministic functions (color conversion, validation, string transforms)
- Unit conversions (distance, temperature, currency)
- Date/time operations (RRule expansion, timezone calculations)
- Encoding/decoding utilities (base64, hex, URL parsing)
- Mathematical operations (checksums, hashes, semver parsing)

### Implementation Authors
You want to prove your library conforms to a published spec. Run the spec against your implementation and report results.

### AI/Code Generation
GCSF specs are designed to be machine-readable. An AI can read a spec and generate conforming code until tests pass.

### Library Maintainers
Instead of maintaining identical implementations across 5+ languages, publish one spec and let the ecosystem handle implementations.

### Behavior-First Developers
You want to write specs before code (BDD/TDD style). Define what your code should do in a machine-readable format, then generate implementations against runners using AI until tests pass.

## How it works

```
┌─────────┐
│  Schema │  ← GCSF provides this (defines format)
└────┬────┘
     │
     ↓
┌─────────┐
│  Spec   │  ← You write this (defines behavior)
└────┬────┘
     │
     ↓
┌─────────┐
│ Runner  │  ← Executes tests (one per language)
└────┬────┘
     │
     ↓
┌──────────────┐
│Implementation│  ← Your code being tested
└──────────────┘
```

1. **Schema** — Defines how specs must be structured
2. **Spec** — JSON file describing operations, inputs, expected outputs
3. **Runner** — Language-specific test executor (anyone can build one)
4. **Implementation** — Your code that must pass the spec

## Quick Start

### Try the example

```bash
# Clone the repo
git clone https://github.com/gcs-framework/gcs-framework.git
cd gcs-framework/runners/ts

# Install dependencies
pnpm install

# Run the color example spec
pnpm run example
```

You'll see output like:
```
✓ PASS  conversion › hex_to_rgb › turquoise
✓ PASS  conversion › rgb_to_hex › black
✓ PASS  luminance › white
○ SKIP  transforms › hsl_to_rgb
...
Total: 17 | Pass: 16 | Fail: 0 | Skip: 1 | Error: 0
```

## Creating a Spec

Specs are JSON files following the [v0.1 schema](schema/v0.1.json). Minimal example:

```json
{
  "spec": "my-spec",
  "version": "0.1.0",
  "schema": "https://raw.githubusercontent.com/gcs-framework/gcs-framework/refs/heads/main/schema/v0.1.json",
  "groups": [
    {
      "group": "math",
      "tests": [
        {
          "id": "add_integers",
          "op": "add",
          "input": { "a": 2, "b": 3 },
          "expected": { "result": 5 }
        }
      ]
    }
  ]
}
```

### Key Concepts

**Groups** — Organize tests hierarchically (like `describe` blocks in Jest)
```json
{
  "group": "conversion",
  "groups": [
    { "group": "hex_to_rgb", "tests": [...] }
  ]
}
```

**Defaults** — Set compare mode/tolerance for a whole group
```json
{
  "group": "float_math",
  "defaults": { "compare": "approx", "tolerance": 0.001 },
  "tests": [...]
}
```

**Compare modes**
- `strict` — Byte-for-byte JSON equality (default)
- `deep` — Structural equality, object key order ignored
- `approx` — Deep + numeric tolerance (requires `tolerance`)

**Tolerance**
```json
"tolerance": 0.01                          // absolute
"tolerance": { "abs": 0.01, "rel": 0.001 } // absolute + relative
```

**Special test flags**
- `skip: "reason"` — Don't run this test
- `xfail: true` — Test expected to fail (inverts pass/fail)

See [`example-specs/color/0.1.0/spec.json`](example-specs/color/0.1.0/spec.json) for a complete example.

## Building a Runner

Runners execute specs against implementations. You only need one runner for your language to use any spec, but anyone can build runners — there's no central registry or single canonical implementation.

### Minimal runner responsibilities

1. **Load spec JSON** and validate against schema
2. **Flatten nested groups** recursively
3. **Resolve defaults** (spec → group → test inheritance)
4. **Call implementation** functions by operation name
5. **Compare results** using appropriate mode (strict/deep/approx)
6. **Enforce runtime rules** (forbid NaN/Infinity, require tolerance for approx)
7. **Output results** (PASS/FAIL/SKIP/ERROR per test)

### Reference implementation

See [`runners/ts/`](runners/ts/) for a complete TypeScript reference runner (~400 LOC).

Key implementation details:
- Missing `compare` defaults to `strict`
- `compare: "approx"` without `tolerance` is a runtime error
- NaN/Infinity in results is an error (forbidden in v1)
- `deep` comparison: structural equality, object keys unordered, arrays ordered
- `approx` comparison: `deep` + numeric tolerance (absolute and/or relative)

### Runner CLI pattern

```bash
runner <spec.json> <implementation.js>
```

Implementation should export functions matching operation names:
```typescript
export function add(input: { a: number, b: number }) {
  return { result: input.a + input.b };
}
```

## Important Notes

### Runners are reference implementations
The runners in this repo are **minimal reference implementations** to demonstrate the GCSF specification. They are:
- ✓ Functional and correct
- ✓ Useful for validating specs
- ✓ Templates for building production runners
- ✗ **Not production-grade** (no optimization, parallelization, filtering, watch mode, etc.)

For production use cases, build a more robust runner based on these references.

### Specs are not maintained here
GCSF provides the framework (schema + reference runners). Actual specs should be:
- Published independently (npm, GitHub, wherever)
- Versioned semantically
- Maintained by their authors

The `example-specs/` directory contains examples only, not blessed/maintained specs.

## Schema Versioning

- Pre-release: `v0.x.json` (breaking changes allowed before v1.0)
- Stable major versions: `v1.json`, `v2.json` (breaking changes bump major version)
- Non-breaking additions stay within same major version
- Specs declare their schema version via the `schema` field

Current version: **v0.1** (pre-release, pure function tests with compare modes)

Future versions may add:
- Stateful test sequences
- Environment descriptors (mocked IO, fixed clock/RNG)
- Performance budgets
- Concurrency tests

## Contributing

Contributions welcome:
- Schema improvements (propose via issues)
- Reference runners for other languages (Python, Go, Rust, Dart, etc.)
- Documentation improvements
- Bug reports for existing runners

## License

MIT — See [LICENSE](LICENSE) file.

---

**Status:** v0.1 pre-release — seeking feedback before v1.0

GCSF is functional but the schema may evolve based on community input. Breaking changes are possible before v1.0.

For questions, feedback, or discussion, open an issue.