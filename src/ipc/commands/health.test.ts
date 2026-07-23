import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import { appHealth } from "./health";

describe("health commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("appHealth invokes app_health", async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: "ok",
      version: "0.1.0",
    });
    __setInvokeForTests(invoke);

    const result = await appHealth();
    expect(invoke).toHaveBeenCalledWith("app_health", undefined);
    expect(result).toEqual({ status: "ok", version: "0.1.0" });
  });
});
