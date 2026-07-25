import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setInvokeForTests } from "../client";
import { jobsGet, jobsStartTranscription } from "./jobs";

describe("jobs commands", () => {
  beforeEach(() => {
    __setInvokeForTests(null);
  });

  it("jobsStartTranscription passes meeting_id", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "j1",
      meeting_id: "m1",
      kind: "transcription",
      status: "running",
      error_code: null,
      error_message: null,
      created_at: "t",
      updated_at: "t",
    });
    __setInvokeForTests(invoke);
    await jobsStartTranscription("m1");
    expect(invoke).toHaveBeenCalledWith("jobs_start_transcription", {
      meeting_id: "m1",
    });
  });

  it("jobsGet passes job_id", async () => {
    const invoke = vi.fn().mockResolvedValue({
      id: "j1",
      meeting_id: "m1",
      kind: "transcription",
      status: "succeeded",
      error_code: null,
      error_message: null,
      created_at: "t",
      updated_at: "t",
    });
    __setInvokeForTests(invoke);
    await jobsGet("j1");
    expect(invoke).toHaveBeenCalledWith("jobs_get", { job_id: "j1" });
  });
});
