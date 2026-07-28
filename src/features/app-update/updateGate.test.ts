import { describe, expect, it } from "vitest";
import {
  canInstallUpdate,
  downloadProgressPercent,
  shouldShowUpdateBanner,
} from "./updateGate";

describe("updateGate", () => {
  it("blocks install while app is busy", () => {
    expect(canInstallUpdate(true, "available")).toBe(false);
    expect(canInstallUpdate(true, "readyToInstall")).toBe(false);
    expect(canInstallUpdate(false, "readyToInstall")).toBe(true);
    expect(canInstallUpdate(false, "available")).toBe(true);
    expect(canInstallUpdate(false, "downloading")).toBe(false);
  });

  it("hides banner after session dismiss", () => {
    expect(shouldShowUpdateBanner("available", false)).toBe(true);
    expect(shouldShowUpdateBanner("available", true)).toBe(false);
    expect(shouldShowUpdateBanner("idle", false)).toBe(false);
  });

  it("computes download percent", () => {
    expect(downloadProgressPercent(50, 100)).toBe(50);
    expect(downloadProgressPercent(10, null)).toBeNull();
    expect(downloadProgressPercent(200, 100)).toBe(100);
  });
});
