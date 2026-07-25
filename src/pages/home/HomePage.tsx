import { useState } from "react";
import { TranscriptionImportPanel } from "../../features/transcription-import";
import { MeetingSummaryPanel } from "../../features/meeting-summary";

type Props = {
  onOpenSettings: () => void;
};

export function HomePage({ onOpenSettings }: Props) {
  const [summaryMeetingId, setSummaryMeetingId] = useState<string | null>(null);

  return (
    <div>
      <h1>Meetly</h1>
      <p>导入本地音频，经豆包极速版转写后查看全文，并可手动生成结构化摘要。</p>
      <TranscriptionImportPanel
        onTranscriptReady={setSummaryMeetingId}
        onReset={() => setSummaryMeetingId(null)}
      />
      {summaryMeetingId && (
        <MeetingSummaryPanel meetingId={summaryMeetingId} />
      )}
      <p>
        <button type="button" onClick={onOpenSettings}>
          打开设置
        </button>
      </p>
    </div>
  );
}
