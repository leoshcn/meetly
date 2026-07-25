import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import { summaryGenerate, summaryGet } from "./summary";

describe("summary commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("summaryGenerate invokes summary_generate", async () => {
    const summary = {
      meeting_id: "m1",
      key_points: [] as string[],
      action_items: [] as string[],
      decisions: [] as string[],
      language: "en" as const,
      created_at: "t",
    };
    const invoke = vi.fn().mockResolvedValue(summary);
    __setInvokeForTests(invoke);

    const result = await summaryGenerate("m1", "en");
    expect(invoke).toHaveBeenCalledWith("summary_generate", {
      meeting_id: "m1",
      language: "en",
    });
    expect(result).toEqual(summary);
  });

  it("summaryGet invokes summary_get", async () => {
    const invoke = vi.fn().mockResolvedValue({
      meeting_id: "m1",
      key_points: [],
      action_items: [],
      decisions: [],
      language: "zh-CN",
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await summaryGet("m1");
    expect(invoke).toHaveBeenCalledWith("summary_get", { meeting_id: "m1" });
  });
});
