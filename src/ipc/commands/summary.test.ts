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
      key_points: ["a"],
      action_items: [],
      decisions: ["d"],
      language: "zh-CN" as const,
      created_at: "2026-01-01T00:00:00Z",
    };
    const invoke = vi.fn().mockResolvedValue(summary);
    __setInvokeForTests(invoke);

    const result = await summaryGenerate("m1");
    expect(invoke).toHaveBeenCalledWith("summary_generate", {
      meeting_id: "m1",
    });
    expect(result.key_points).toEqual(["a"]);
  });

  it("summaryGet invokes summary_get", async () => {
    const invoke = vi.fn().mockResolvedValue({
      meeting_id: "m1",
      key_points: [],
      action_items: [],
      decisions: [],
      language: "zh-CN",
      created_at: "2026-01-01T00:00:00Z",
    });
    __setInvokeForTests(invoke);
    await summaryGet("m1");
    expect(invoke).toHaveBeenCalledWith("summary_get", { meeting_id: "m1" });
  });
});
