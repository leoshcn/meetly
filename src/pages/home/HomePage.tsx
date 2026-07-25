import { TranscriptionImportPanel } from "../../features/transcription-import";

type Props = {
  onOpenSettings: () => void;
};

export function HomePage({ onOpenSettings }: Props) {
  return (
    <div>
      <h1>Meetly</h1>
      <p>导入本地音频，经豆包极速版转写后查看全文。摘要与录音将在后续版本提供。</p>
      <TranscriptionImportPanel />
      <p>
        <button type="button" onClick={onOpenSettings}>
          打开设置
        </button>
      </p>
    </div>
  );
}
