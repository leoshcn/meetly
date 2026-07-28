import { describe, expect, it } from "vitest";
import {
  parseThemePreference,
  resolveTheme,
} from "./theme";

describe("theme helpers", () => {
  it("parseThemePreference accepts known values and falls back", () => {
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("nope")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
  });

  it("resolveTheme maps preference without requiring matchMedia for fixed modes", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });
});
