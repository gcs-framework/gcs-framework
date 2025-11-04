# GCSF TypeScript Reference Runner

Minimal reference implementation of a GCSF v1 runner in TypeScript.

**Note:** This is a reference implementation to demonstrate the GCSF specification. It is not production-grade and serves primarily as:
- Proof of concept for the GCSF framework
- Reference for building runners in other languages
- Tool for validating example specs

## Installation

```bash
npm install
```

## Usage

### Run a spec against an implementation

```bash
npm run example
# or
tsx runner.ts <path-to-spec.json> <path-to-implementation.ts>
```

### Example

```bash
tsx runner.ts ../../example-specs/color/0.1.0/spec.json ./example-impl.ts
```

## Implementation Format

Your implementation should export functions matching the operation names in your spec:

```typescript
export function hex_to_rgb(input: { hex: string }) {
  // ... implementation
  return { r: 64, g: 224, b: 208 };
}

export function rgb_to_hex(input: { r: number; g: number; b: number }) {
  // ... implementation
  return { hex: "#40E0D0" };
}
```

## Features

- ✓ Recursive group flattening
- ✓ Default inheritance (spec → group → test)
- ✓ Compare modes: `strict`, `deep`, `approx`
- ✓ Tolerance support (absolute, relative, per-field)
- ✓ NaN/Infinity detection and rejection
- ✓ `xfail` and `skip` support
- ✓ Clear test output with paths

For production use cases, consider building a more robust runner based on this reference.
