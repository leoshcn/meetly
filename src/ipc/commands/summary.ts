import { invokeCommand } from "../client";
import type { Summary } from "../types";

export function summaryGenerate(meetingId: string): Promise<Summary> {
  return invokeCommand<Summary>("summary_generate", {
    meeting_id: meetingId,
  });
}

export function summaryGet(meetingId: string): Promise<Summary> {
  return invokeCommand<Summary>("summary_get", { meeting_id: meetingId });
}
