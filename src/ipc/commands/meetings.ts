import { invokeCommand } from "../client";
import type { Meeting, Transcript } from "../types";

export function meetingsCreateFromFile(path: string): Promise<Meeting> {
  return invokeCommand<Meeting>("meetings_create_from_file", { path });
}

export function meetingsList(): Promise<Meeting[]> {
  return invokeCommand<Meeting[]>("meetings_list");
}

export function meetingsGet(meetingId: string): Promise<Meeting> {
  return invokeCommand<Meeting>("meetings_get", { meeting_id: meetingId });
}

export function meetingsRename(
  meetingId: string,
  title: string,
): Promise<Meeting> {
  return invokeCommand<Meeting>("meetings_rename", {
    meeting_id: meetingId,
    title,
  });
}

export function meetingsDelete(meetingId: string): Promise<void> {
  return invokeCommand<void>("meetings_delete", { meeting_id: meetingId });
}

export function meetingsGetTranscript(meetingId: string): Promise<Transcript> {
  return invokeCommand<Transcript>("meetings_get_transcript", {
    meeting_id: meetingId,
  });
}

export function meetingsUpdateSpeakers(
  meetingId: string,
  speakerNames: Record<string, string>,
): Promise<Transcript> {
  return invokeCommand<Transcript>("meetings_update_speakers", {
    meeting_id: meetingId,
    speaker_names: speakerNames,
  });
}
