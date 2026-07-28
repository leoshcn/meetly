import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __setUpdaterMocksForTests,
  appGetVersion,
  appRelaunch,
  updaterCheck,
} from "./updater";

describe("updater commands", () => {
  beforeEach(() => {
    __setUpdaterMocksForTests({
      check: null,
      getVersion: null,
      relaunch: null,
    });
  });

  it("appGetVersion returns mocked version", async () => {
    __setUpdaterMocksForTests({
      getVersion: vi.fn().mockResolvedValue("0.2.0"),
    });
    await expect(appGetVersion()).resolves.toBe("0.2.0");
  });

  it("updaterCheck returns null when no update", async () => {
    __setUpdaterMocksForTests({
      check: vi.fn().mockResolvedValue(null),
    });
    await expect(updaterCheck()).resolves.toBeNull();
  });

  it("updaterCheck wraps available update", async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    const install = vi.fn().mockResolvedValue(undefined);
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    __setUpdaterMocksForTests({
      check: vi.fn().mockResolvedValue({
        version: "0.3.0",
        body: "notes",
        date: "2026-07-29",
        download,
        install,
        downloadAndInstall,
      }),
    });

    const update = await updaterCheck();
    expect(update?.version).toBe("0.3.0");
    expect(update?.body).toBe("notes");
    await update?.download();
    expect(download).toHaveBeenCalled();
  });

  it("appRelaunch delegates", async () => {
    const relaunch = vi.fn().mockResolvedValue(undefined);
    __setUpdaterMocksForTests({ relaunch });
    await appRelaunch();
    expect(relaunch).toHaveBeenCalled();
  });
});
