import { invokeCommand } from "../client";
import type { Meeting, Transcript } from "../types";

export function meetingsCreateFromFile(path: string): Promise<Meeting> {
  return invokeCommand<Meeting>("meetings_create_from_file", { path });
}

export function meetingsGet(meetingId: string): Promise<Meeting> {
  return invokeCommand<Meeting>("meetings_get", { meeting_id: meetingId });
}

export function meetingsGetTranscript(meetingId: string): Promise<Transcript> {
  return invokeCommand<Transcript>("meetings_get_transcript", {
    meeting_id: meetingId,
  });
}
