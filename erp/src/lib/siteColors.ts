// Colour helpers for the public site: named swatches for icons/sections and
// the site-wide brand palette that is turned into CSS custom properties.
import type { CSSProperties } from "react";

export interface ColorSwatch {
  value: string;
  label: string;
  /** Empty for "primary" — it follows the site's brand colour at render time. */
  hex: string;
}

/** Named swatches offered wherever a colour can be picked. Values are stored as-is. */
export const COLOR_SWATCHES: ColorSwatch[] = [
  { value: "primary", label: "Brand", hex: "" },
  { value: "sky", label: "Sky", hex: "#0284c7" },
  { value: "blue", label: "Blue", hex: "#2563eb" },
  { value: "indigo", label: "Indigo", hex: "#4f46e5" },
  { value: "violet", label: "Violet", hex: "#7c3aed" },
  { value: "purple", label: "Purple", hex: "#9333ea" },
  { value: "pink", label: "Pink", hex: "#db2777" },
  { value: "rose", label: "Rose", hex: "#e11d48" },
  { value: "red", label: "Red", hex: "#dc2626" },
  { value: "orange", label: "Orange", hex: "#ea580c" },
  { value: "amber", label: "Amber", hex: "#d97706" },
  { value: "yellow", label: "Yellow", hex: "#ca8a04" },
  { value: "lime", label: "Lime", hex: "#65a30d" },
  { value: "green", label: "Green", hex: "#16a34a" },
  { value: "emerald", label: "Emerald", hex: "#059669" },
  { value: "teal", label: "Teal", hex: "#0d9488" },
  { value: "cyan", label: "Cyan", hex: "#0891b2" },
  { value: "slate", label: "Slate", hex: "#475569" },
];

/** One-click palettes for the whole website (brand colour + hero gradient end). */
export const THEME_PRESETS: Array<{ name: string; primary: string; gradient: string }> = [
  { name: "Ocean Blue (default)", primary: "", gradient: "" },
  { name: "Forest Green", primary: "#15803d", gradient: "#65a30d" },
  { name: "Teal", primary: "#0f766e", gradient: "#06b6d4" },
  { name: "Indigo", primary: "#4338ca", gradient: "#3b82f6" },
  { name: "Royal Purple", primary: "#6d28d9", gradient: "#c026d3" },
  { name: "Rose", primary: "#be123c", gradient: "#f472b6" },
  { name: "Sunset Orange", primary: "#ea580c", gradient: "#f59e0b" },
  { name: "Charcoal & Gold", primary: "#1f2937", gradient: "#d97706" },
];

export const isHex = (value?: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((value || "").trim());

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** WCAG relative luminance. */
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio of white text on the given colour. */
export function contrastWithWhite(rgb: { r: number; g: number; b: number }): number {
  return 1.05 / (relativeLuminance(rgb) + 0.05);
}

/**
 * The darkest shade of a brand colour is not always the brand colour.
 *
 * The accent tokens are used as *fills under white text* — header pills, the
 * solid donate button, the mobile bar. A light brand colour (the People's
 * Foundation cyan, #00B0E6, is 2.4:1 against white) would put the whole
 * navigation below AA, so the fill steps down in lightness until white text
 * clears 4.5:1. A colour that already passes is returned untouched, which is
 * why a darker brand like the Baithuzzakath green comes back unchanged.
 */
function accentLightness(h: number, s: number, l: number): number {
  for (let candidate = l; candidate >= 12; candidate -= 1) {
    if (contrastWithWhite(hslToRgb(h, s, candidate)) >= 4.5) return candidate;
  }
  return 12;
}

/** Relative luminance check — true when white text is readable on the colour. */
export function isDarkColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum < 0.6;
}

export function findSwatch(value?: string): ColorSwatch | undefined {
  return COLOR_SWATCHES.find((s) => s.value === value);
}

/** Human label for a stored colour value. */
export function colorLabel(value?: string, emptyLabel = "Default"): string {
  if (!value) return emptyLabel;
  const swatch = findSwatch(value);
  if (swatch) return swatch.label;
  return isHex(value) ? value.toUpperCase() : emptyLabel;
}

/** Solid CSS colour for text, borders or icons. */
export function colorValue(value?: string, fallback = "primary"): string {
  const v = value || fallback;
  const swatch = findSwatch(v);
  if (swatch && swatch.hex) return swatch.hex;
  if (isHex(v)) return v;
  return "hsl(var(--primary))";
}

/** Translucent tint of the colour for icon badges and soft backgrounds. */
export function colorTint(value?: string, alpha = 0.12, fallback = "primary"): string {
  const v = value || fallback;
  const swatch = findSwatch(v);
  const hex = swatch && swatch.hex ? swatch.hex : isHex(v) ? v : "";
  if (!hex) return `hsl(var(--primary) / ${alpha})`;
  const rgb = hexToRgb(hex);
  return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : `hsl(var(--primary) / ${alpha})`;
}

/** Inline style for the round icon badge used across the site. */
export function iconBadgeStyle(value?: string, fallback?: string): { color: string; backgroundColor: string } {
  const v = value || fallback || "primary";
  return { color: colorValue(v), backgroundColor: colorTint(v) };
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

/**
 * Site-wide palette → CSS custom properties (same names as index.css) derived
 * from one brand colour and an optional gradient end colour.
 */
export function themeVars(primaryHex?: string, gradientHex?: string): Record<string, string> {
  if (!primaryHex || !isHex(primaryHex)) return {};
  const p = hexToHsl(primaryHex);
  if (!p) return {};
  const { h, s, l } = p;
  const light = clamp(l + 10);
  const dark = clamp(l - 8);
  // White text only where white text actually works. The old rule was a crude
  // luminance threshold, which put white on a mid-bright brand colour (a cyan
  // or a lime) at barely 2.5:1 — readable to the person who picked the colour,
  // not to anyone else.
  const fg = contrastWithWhite(hslToRgb(h, s, l)) >= 4.5 ? "0 0% 100%" : `${h} 60% 12%`;
  const g = gradientHex && isHex(gradientHex) ? hexToHsl(gradientHex) : null;
  const g2 = g || { h, s: clamp(s - 4), l: clamp(l + 12) };
  const hsl = `${h} ${s}% ${l}%`;
  const accentL = accentLightness(h, s, l);
  const accentGradientL = accentLightness(g2.h, g2.s, g2.l);

  return {
    "--primary": hsl,
    "--primary-foreground": fg,
    "--primary-light": `${h} ${s}% ${light}%`,
    "--primary-dark": `${h} ${s}% ${dark}%`,
    "--accent": hsl,
    "--accent-foreground": fg,
    "--ring": hsl,
    "--info": hsl,
    "--secondary": `${h} 60% 96%`,
    "--secondary-foreground": `${h} 60% 25%`,
    "--muted": `${h} 25% 96%`,
    "--muted-foreground": `${h} 15% 45%`,
    "--border": `${h} 20% 90%`,
    "--input": `${h} 20% 90%`,
    "--foreground": `${h} 50% 12%`,
    "--card-foreground": `${h} 50% 12%`,
    "--popover-foreground": `${h} 50% 12%`,
    // Brand accent family. index.css seeds these from the bundled logo's
    // greens; left at that default every franchise's header, bottom bar and
    // calculator would wear one franchise's green no matter what palette it
    // picked. Deriving them from the site's own brand colour is what makes the
    // chrome follow the franchise rather than the build.
    //
    // These are fills under white text, so they take the AA-safe shade of the
    // brand colour rather than the brand colour itself (see accentLightness).
    "--brand-green": `${h} ${s}% ${accentL}%`,
    "--brand-green-dark": `${h} ${s}% ${clamp(accentL - 10)}%`,
    "--brand-green-mid": `${h} ${clamp(s - 12)}% ${clamp(accentL + 8)}%`,
    "--brand-lime": `${g2.h} ${g2.s}% ${g2.l}%`,
    "--gradient-brand": `linear-gradient(135deg, hsl(${h} ${s}% ${clamp(accentL - 10)}%) 0%, hsl(${h} ${s}% ${accentL}%) 45%, hsl(${g2.h} ${g2.s}% ${accentGradientL}%) 100%)`,
    "--gradient-primary": `linear-gradient(135deg, hsl(${h} ${s}% ${dark}%), hsl(${h} ${s}% ${light}%))`,
    "--gradient-secondary": `linear-gradient(135deg, hsl(${h} 60% 92%), hsl(${h} 70% 96%))`,
    // The hero gradient is the footer band and the page's opening ground, both
    // of which carry white text — so it is built from the AA-safe shades, not
    // from the raw brand colour.
    "--gradient-hero": `linear-gradient(135deg, hsl(${h} ${s}% ${clamp(accentL - 8)}%), hsl(${h} ${s}% ${accentL}%), hsl(${g2.h} ${g2.s}% ${accentGradientL}%))`,
    "--shadow-glow": `0 0 40px hsl(${hsl} / 0.25)`,
    "--shadow-elegant": `0 10px 30px -10px hsl(${hsl} / 0.2)`,
  };
}

/** Same palette as an inline style object, for scoping the brand colours to one element (previews). */
export const themeStyle = (primaryHex?: string, gradientHex?: string): CSSProperties =>
  themeVars(primaryHex, gradientHex) as CSSProperties;

/** Only the brand-specific tokens — what dark mode should still pick up. */
const DARK_SAFE_VARS = new Set([
  "--primary", "--primary-light", "--primary-dark", "--accent", "--ring", "--info",
  "--gradient-primary", "--gradient-hero", "--shadow-glow",
  "--brand-green", "--brand-green-dark", "--brand-green-mid", "--brand-lime", "--gradient-brand",
]);

/** CSS text that overrides the active theme for as long as it is in the document. */
export function themeCss(vars: Record<string, string>): string {
  const entries = Object.entries(vars);
  if (!entries.length) return "";
  const light = entries.map(([k, v]) => `${k}: ${v};`).join(" ");
  const dark = entries.filter(([k]) => DARK_SAFE_VARS.has(k)).map(([k, v]) => `${k}: ${v};`).join(" ");
  return `html[data-theme]:not(.dark), html:not(.dark) { ${light} }\nhtml.dark { ${dark} }`;
}
