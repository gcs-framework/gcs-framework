#!/usr/bin/env node

/**
 * GCSF TypeScript Reference Runner
 *
 * Minimal reference implementation - not production-grade.
 * Demonstrates how to execute GCSF v1 specs.
 */

import * as fs from "fs";
import * as path from "path";

interface Spec {
  spec: string;
  version: string;
  schema?: string;
  capabilities?: string[];
  defaults?: Defaults;
  groups: Group[];
}

interface Group {
  group: string;
  description?: string;
  defaults?: Defaults;
  groups?: Group[];
  tests?: Test[];
}

interface Test {
  id: string;
  kind?: string;
  op: string;
  input: any;
  expected: any;
  description?: string;
  compare?: "strict" | "deep" | "approx";
  tolerance?: number | ToleranceObject;
  xfail?: boolean;
  skip?: string;
  meta?: any;
}

interface Defaults {
  compare?: "strict" | "deep" | "approx";
  tolerance?: number | ToleranceObject;
}

interface ToleranceObject {
  abs?: number;
  rel?: number;
  fields?: Record<string, number>;
}

interface FlatTest extends Test {
  groupPath: string[];
  resolvedCompare: "strict" | "deep" | "approx";
  resolvedTolerance?: number | ToleranceObject;
}

interface TestResult {
  test: FlatTest;
  status: "PASS" | "FAIL" | "SKIP" | "ERROR";
  message?: string;
  actual?: any;
}

class GCSFRunner {
  private spec: Spec;
  private implementation: Record<string, Function>;

  constructor(specPath: string, implementation: Record<string, Function>) {
    const specContent = fs.readFileSync(specPath, "utf-8");
    this.spec = JSON.parse(specContent);
    this.implementation = implementation;
  }

  run(): TestResult[] {
    const flatTests = this.flattenGroups(
      this.spec.groups,
      [],
      this.spec.defaults
    );
    const results: TestResult[] = [];

    for (const test of flatTests) {
      results.push(this.runTest(test));
    }

    return results;
  }

  private flattenGroups(
    groups: Group[],
    groupPath: string[],
    parentDefaults?: Defaults
  ): FlatTest[] {
    const flatTests: FlatTest[] = [];

    for (const group of groups) {
      const currentPath = [...groupPath, group.group];
      const mergedDefaults = { ...parentDefaults, ...group.defaults };

      // Recursively flatten nested groups
      if (group.groups) {
        flatTests.push(
          ...this.flattenGroups(group.groups, currentPath, mergedDefaults)
        );
      }

      // Flatten tests in this group
      if (group.tests) {
        for (const test of group.tests) {
          const resolvedCompare =
            test.compare || mergedDefaults?.compare || "strict";
          const resolvedTolerance = test.tolerance ?? mergedDefaults?.tolerance;

          flatTests.push({
            ...test,
            groupPath: currentPath,
            resolvedCompare,
            resolvedTolerance,
          });
        }
      }
    }

    return flatTests;
  }

  private runTest(test: FlatTest): TestResult {
    // Handle skip
    if (test.skip) {
      return {
        test,
        status: "SKIP",
        message: test.skip,
      };
    }

    try {
      // Check if operation exists
      const opFunc = this.implementation[test.op];
      if (!opFunc) {
        return {
          test,
          status: "ERROR",
          message: `Operation '${test.op}' not found in implementation`,
        };
      }

      // Execute the operation
      const actual = opFunc(test.input);

      // Check for NaN/Infinity
      if (this.hasSpecialValues(actual)) {
        return {
          test,
          status: "ERROR",
          message:
            "Implementation returned NaN or Infinity (forbidden in GCSF v1)",
          actual,
        };
      }

      // Validate tolerance for approx mode
      if (
        test.resolvedCompare === "approx" &&
        test.resolvedTolerance === undefined
      ) {
        return {
          test,
          status: "ERROR",
          message: 'compare="approx" requires tolerance to be set',
        };
      }

      // Compare result
      const matches = this.compare(
        actual,
        test.expected,
        test.resolvedCompare,
        test.resolvedTolerance
      );

      const status = test.xfail
        ? matches
          ? "FAIL"
          : "PASS"
        : matches
        ? "PASS"
        : "FAIL";

      return {
        test,
        status,
        actual,
        message:
          status === "FAIL"
            ? `Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(
                actual
              )}`
            : undefined,
      };
    } catch (error: any) {
      return {
        test,
        status: "ERROR",
        message: `Exception: ${error.message}`,
      };
    }
  }

  private hasSpecialValues(value: any): boolean {
    if (typeof value === "number") {
      return !isFinite(value);
    }
    if (typeof value === "object" && value !== null) {
      return Object.values(value).some((v) => this.hasSpecialValues(v));
    }
    if (Array.isArray(value)) {
      return value.some((v) => this.hasSpecialValues(v));
    }
    return false;
  }

  private compare(
    actual: any,
    expected: any,
    mode: "strict" | "deep" | "approx",
    tolerance?: number | ToleranceObject
  ): boolean {
    if (mode === "strict") {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }

    if (mode === "deep") {
      return this.deepEqual(actual, expected);
    }

    if (mode === "approx") {
      return this.approxEqual(actual, expected, tolerance!);
    }

    return false;
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    if (typeof a === "object" && typeof b === "object") {
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      if (keysA.length !== keysB.length) return false;
      if (!keysA.every((key, idx) => key === keysB[idx])) return false;
      return keysA.every((key) => this.deepEqual(a[key], b[key]));
    }

    return false;
  }

  private approxEqual(
    a: any,
    b: any,
    tolerance: number | ToleranceObject
  ): boolean {
    // Handle numeric tolerance
    if (typeof tolerance === "number") {
      return this.approxEqualWithAbsTolerance(a, b, tolerance);
    }

    // Handle structured tolerance
    const { abs, rel, fields } = tolerance;

    if (typeof a === "number" && typeof b === "number") {
      if (abs !== undefined && Math.abs(a - b) > abs) return false;
      if (rel !== undefined && Math.abs(a - b) > Math.abs(b) * rel)
        return false;
      return true;
    }

    if (
      typeof a === "object" &&
      typeof b === "object" &&
      a !== null &&
      b !== null
    ) {
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      if (
        keysA.length !== keysB.length ||
        !keysA.every((k, i) => k === keysB[i])
      ) {
        return false;
      }

      return keysA.every((key) => {
        const fieldTolerance = fields?.[key] ?? tolerance;
        if (typeof a[key] === "number" && typeof b[key] === "number") {
          return this.approxEqual(a[key], b[key], fieldTolerance);
        }
        return this.deepEqual(a[key], b[key]);
      });
    }

    return this.deepEqual(a, b);
  }

  private approxEqualWithAbsTolerance(
    a: any,
    b: any,
    tolerance: number
  ): boolean {
    if (typeof a === "number" && typeof b === "number") {
      return Math.abs(a - b) <= tolerance;
    }

    if (
      typeof a === "object" &&
      typeof b === "object" &&
      a !== null &&
      b !== null
    ) {
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      if (
        keysA.length !== keysB.length ||
        !keysA.every((k, i) => k === keysB[i])
      ) {
        return false;
      }

      return keysA.every((key) =>
        this.approxEqualWithAbsTolerance(a[key], b[key], tolerance)
      );
    }

    return this.deepEqual(a, b);
  }

  printResults(results: TestResult[]) {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    const skipped = results.filter((r) => r.status === "SKIP").length;
    const errors = results.filter((r) => r.status === "ERROR").length;

    console.log("\nTest Results:");
    console.log("=".repeat(60));

    for (const result of results) {
      const icon = {
        PASS: "✓",
        FAIL: "✗",
        SKIP: "○",
        ERROR: "⚠",
      }[result.status];

      const path = [...result.test.groupPath, result.test.id].join(" › ");
      console.log(`${icon} ${result.status.padEnd(5)} ${path}`);

      if (result.message) {
        console.log(`  ${result.message}`);
      }
    }

    console.log("=".repeat(60));
    console.log(
      `Total: ${results.length} | Pass: ${passed} | Fail: ${failed} | Skip: ${skipped} | Error: ${errors}`
    );
    console.log();

    return failed === 0 && errors === 0;
  }
}

// Example usage (can be imported or run directly)
export { GCSFRunner };

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: runner.ts <spec.json> <implementation.js>");
    process.exit(1);
  }

  const [specPath, implPath] = args;
  const implementation = require(path.resolve(implPath));

  const runner = new GCSFRunner(specPath, implementation);
  const results = runner.run();
  const success = runner.printResults(results);

  process.exit(success ? 0 : 1);
}
