import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import { ffmpegDownload, ffmpegStatus } from "./ffmpeg";

describe("ffmpeg commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("ffmpegStatus invokes ffmpeg_status", async () => {
    const invoke = vi.fn().mockResolvedValue({
      installed: false,
      busy: false,
      phase: "missing",
      downloaded_bytes: 0,
      total_bytes: 0,
      path: null,
      message: null,
    });
    __setInvokeForTests(invoke);
    const result = await ffmpegStatus();
    expect(invoke).toHaveBeenCalledWith("ffmpeg_status", undefined);
    expect(result.phase).toBe("missing");
  });

  it("ffmpegDownload invokes ffmpeg_download", async () => {
    const invoke = vi.fn().mockResolvedValue({
      installed: false,
      busy: true,
      phase: "starting",
      downloaded_bytes: 0,
      total_bytes: 0,
      path: null,
      message: "Starting download…",
    });
    __setInvokeForTests(invoke);
    const result = await ffmpegDownload();
    expect(invoke).toHaveBeenCalledWith("ffmpeg_download", undefined);
    expect(result.busy).toBe(true);
  });
});
