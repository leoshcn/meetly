import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import {
  meetingsCreateFromFile,
  meetingsGet,
  meetingsGetTranscript,
} from "./meetings";

describe("meetings commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("meetingsCreateFromFile passes path", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "m1",
      source_path: "/a.wav",
      title: "a",
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await meetingsCreateFromFile("/a.wav");
    expect(invoke).toHaveBeenCalledWith("meetings_create_from_file", {
      path: "/a.wav",
    });
  });

  it("meetingsGet passes meeting_id", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "m1",
      source_path: "/a.wav",
      title: null,
      created_at: "t",
    });
    __setInvokeForTests(invoke);
    await meetingsGet("m1");
    expect(invoke).toHaveBeenCalledWith("meetings_get", { meeting_id: "m1" });
  });

  it("meetingsGetTranscript passes meeting_id", async () => {
    const invoke = vi.fn().mockResolvedValue({
      meeting_id: "m1",
      text: "hello",
    });
    __setInvokeForTests(invoke);
    await meetingsGetTranscript("m1");
    expect(invoke).toHaveBeenCalledWith("meetings_get_transcript", {
      meeting_id: "m1",
    });
  });
});
