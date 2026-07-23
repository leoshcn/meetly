import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import { settingsGet, settingsUpdate } from "./settings";

describe("settings commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("settingsGet invokes settings_get", async () => {
    const invoke = vi.fn().mockResolvedValue({
      hotwords: ["Meetly"],
      context_text: "",
    });
    __setInvokeForTests(invoke);

    const result = await settingsGet();
    expect(invoke).toHaveBeenCalledWith("settings_get", undefined);
    expect(result.hotwords).toEqual(["Meetly"]);
  });

  it("settingsUpdate passes SettingsUpdate payload", async () => {
    const invoke = vi.fn().mockResolvedValue({
      hotwords: ["Meetly"],
      context_text: "ctx",
    });
    __setInvokeForTests(invoke);

    await settingsUpdate({ hotwords: ["Meetly"], context_text: "ctx" });
    expect(invoke).toHaveBeenCalledWith("settings_update", {
      update: { hotwords: ["Meetly"], context_text: "ctx" },
    });
  });
});
