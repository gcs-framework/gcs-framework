/**
 * Example color implementation for testing the GCSF runner
 * This is NOT part of GCSF - just a test fixture
 */

export function hex_to_rgb(input: { hex: string }): {
  r: number;
  g: number;
  b: number;
} {
  const hex = input.hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

export function rgb_to_hex(input: { r: number; g: number; b: number }): {
  hex: string;
} {
  const toHex = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
  const hex = `#${toHex(input.r)}${toHex(input.g)}${toHex(input.b)}`;
  return { hex };
}

export function luminance(input: { r: number; g: number; b: number }): {
  value: number;
} {
  // Relative luminance formula (simplified)
  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(input.r);
  const gLinear = toLinear(input.g);
  const bLinear = toLinear(input.b);

  const value = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  return { value };
}

export function is_valid_hex(input: { hex: string }): { valid: boolean } {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  return { valid: hexPattern.test(input.hex) };
}

export function rgb_to_array(input: {
  r: number;
  g: number;
  b: number;
}): number[] {
  return [input.r, input.g, input.b];
}

export function invert_color(input: { r: number; g: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  return {
    r: 255 - input.r,
    g: 255 - input.g,
    b: 255 - input.b,
  };
}

export function hsl_to_rgb(input: { h: number; s: number; l: number }): {
  r: number;
  g: number;
  b: number;
} {
  // Not implemented - will be skipped
  throw new Error("HSL conversion not implemented");
}
