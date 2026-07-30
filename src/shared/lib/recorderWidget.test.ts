import { describe, expect, it } from "vitest";
import type { Monitor } from "@tauri-apps/api/window";
import {
  formatRecordingElapsed,
  positionIntersectsAnyMonitor,
  type WidgetPosition,
} from "./recorderWidget";

function mockMonitor(
  x: number,
  y: number,
  width: number,
  height: number,
): Monitor {
  return {
    name: "mock",
    scaleFactor: 1,
    position: {
      x,
      y,
      toLogical() {
        return { x, y };
      },
    },
    size: {
      width,
      height,
      toLogical() {
        return { width, height };
      },
    },
    workArea: {
      position: {
        x,
        y,
        toLogical() {
          return { x, y };
        },
      },
      size: {
        width,
        height,
        toLogical() {
          return { width, height };
        },
      },
    },
  } as unknown as Monitor;
}

describe("formatRecordingElapsed", () => {
  it("formats under one hour as MM:SS", () => {
    expect(formatRecordingElapsed(0)).toBe("00:00");
    expect(formatRecordingElapsed(65_000)).toBe("01:05");
    expect(formatRecordingElapsed(3_599_000)).toBe("59:59");
  });

  it("formats one hour and above as H:MM:SS", () => {
    expect(formatRecordingElapsed(3_600_000)).toBe("1:00:00");
    expect(formatRecordingElapsed(3_661_000)).toBe("1:01:01");
  });
});

describe("positionIntersectsAnyMonitor", () => {
  const size = { width: 360, height: 52 };
  const monitors = [mockMonitor(0, 0, 1920, 1080)];

  it("accepts a position inside the primary work area", () => {
    const position: WidgetPosition = { x: 780, y: 40 };
    expect(positionIntersectsAnyMonitor(position, size, monitors)).toBe(true);
  });

  it("rejects a position on a disconnected display", () => {
    const position: WidgetPosition = { x: 8000, y: 40 };
    expect(positionIntersectsAnyMonitor(position, size, monitors)).toBe(false);
  });

  it("accepts a position that only partially overlaps a monitor", () => {
    const position: WidgetPosition = { x: 1900, y: 10 };
    expect(positionIntersectsAnyMonitor(position, size, monitors)).toBe(true);
  });
});
