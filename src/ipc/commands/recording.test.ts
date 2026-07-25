import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import {
  recordListInputDevices,
  recordStart,
  recordStatus,
  recordStop,
} from "./recording";

describe("recording commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("recordListInputDevices invokes record_list_input_devices", async () => {
    const invoke = vi.fn().mockResolvedValue({
      devices: [{ id: "0", name: "Mic", is_default: true }],
      default_id: "0",
    });
    __setInvokeForTests(invoke);
    const result = await recordListInputDevices();
    expect(invoke).toHaveBeenCalledWith("record_list_input_devices", undefined);
    expect(result.default_id).toBe("0");
  });

  it("recordStart passes device_id", async () => {
    const invoke = vi.fn().mockResolvedValue({
      path: "D:\\rec.wav",
      device_name: "Mic",
      output_device_name: "Speakers",
    });
    __setInvokeForTests(invoke);
    await recordStart("1");
    expect(invoke).toHaveBeenCalledWith("record_start", { device_id: "1" });
  });

  it("recordStop and recordStatus invoke commands", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ path: "D:\\rec.wav", duration_ms: 1000 })
      .mockResolvedValueOnce({
        state: "idle",
        path: null,
        started_at: null,
        device_name: null,
        output_device_name: null,
        mic_level: 0,
        system_level: 0,
      });
    __setInvokeForTests(invoke);
    await recordStop();
    await recordStatus();
    expect(invoke).toHaveBeenNthCalledWith(1, "record_stop", undefined);
    expect(invoke).toHaveBeenNthCalledWith(2, "record_status", undefined);
  });
});
