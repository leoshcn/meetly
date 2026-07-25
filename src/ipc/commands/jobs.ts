import { invokeCommand } from "../client";
import type { Job } from "../types";

export function jobsStartTranscription(meetingId: string): Promise<Job> {
  return invokeCommand<Job>("jobs_start_transcription", {
    meeting_id: meetingId,
  });
}

export function jobsGet(jobId: string): Promise<Job> {
  return invokeCommand<Job>("jobs_get", { job_id: jobId });
}
