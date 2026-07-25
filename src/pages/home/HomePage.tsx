import { useEffect, useState } from "react";
import { TranscriptionImportPanel } from "../../features/transcription-import";
import { MeetingRecordingPanel } from "../../features/meeting-recording";
import { MeetingSummaryPanel } from "../../features/meeting-summary";
import { MeetingSidebar } from "../../features/meeting-sidebar";
import type { Meeting } from "../../ipc";
import styles from "./HomePage.module.css";

type Props = {
  onOpenSettings: () => void;
  onTranscribingChange?: (busy: boolean) => void;
  onActiveTitleChange?: (title: string | null) => void;
};

export function HomePage({
  onOpenSettings,
  onTranscribingChange,
  onActiveTitleChange,
}: Props) {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [summaryEpoch, setSummaryEpoch] = useState(0);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [bootstrapJobId, setBootstrapJobId] = useState<string | null>(null);

  function bumpList() {
    setListRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    onTranscribingChange?.(transcribing);
  }, [transcribing, onTranscribingChange]);

  useEffect(() => {
    onActiveTitleChange?.(activeMeetingId ? activeTitle : null);
  }, [activeMeetingId, activeTitle, onActiveTitleChange]);

  const showWorkspace = activeMeetingId !== null;

  function handleMeetingCreated(meeting: Meeting, jobId?: string) {
    setActiveMeetingId(meeting.id);
    setActiveTitle(meeting.title);
    setHasTranscript(false);
    setBootstrapJobId(jobId ?? null);
    bumpList();
  }

  return (
    <div className={styles.layout}>
      <MeetingSidebar
        activeMeetingId={activeMeetingId}
        refreshKey={listRefreshKey}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        onSelect={(id, meeting) => {
          setActiveMeetingId(id);
          setActiveTitle(meeting?.title ?? null);
          setHasTranscript(false);
          setBootstrapJobId(null);
        }}
        onNewProject={() => {
          setActiveMeetingId(null);
          setActiveTitle(null);
          setHasTranscript(false);
          setTranscribing(false);
          setBootstrapJobId(null);
        }}
        onDeleted={(id) => {
          if (activeMeetingId === id) {
            setActiveMeetingId(null);
            setActiveTitle(null);
            setHasTranscript(false);
            setTranscribing(false);
          }
          bumpList();
        }}
        onRenamed={(meeting) => {
          if (meeting.id === activeMeetingId) {
            setActiveTitle(meeting.title);
          }
          bumpList();
        }}
      />
      <div className={styles.workspace}>
        <div
          className={
            showWorkspace
              ? `${styles.split} meetly-fade-up`
              : `${styles.emptyStage} meetly-fade-up`
          }
        >
          {!showWorkspace ? (
            <div className={styles.stageBody}>
              <MeetingRecordingPanel
                onOpenSettings={onOpenSettings}
                onMeetingCreated={handleMeetingCreated}
                onBusyChange={setTranscribing}
                onTitleResolved={(title) => setActiveTitle(title)}
                onReset={() => {
                  setHasTranscript(false);
                }}
              />
            </div>
          ) : (
            <>
              <section className={styles.pane} aria-label="转写">
                <header className={styles.paneHeader}>
                  <h2>转写</h2>
                </header>
                <div className={styles.paneBody}>
                  <TranscriptionImportPanel
                    meetingId={activeMeetingId}
                    layout="pane"
                    bootstrapJobId={bootstrapJobId}
                    onBootstrapJobConsumed={() => setBootstrapJobId(null)}
                    onOpenSettings={onOpenSettings}
                    onMeetingCreated={(meeting) => handleMeetingCreated(meeting)}
                    onTranscriptReady={(id) => {
                      setActiveMeetingId(id);
                      setHasTranscript(true);
                      bumpList();
                    }}
                    onSpeakersUpdated={() => {
                      setSummaryEpoch((n) => n + 1);
                      setHasTranscript(true);
                    }}
                    onBusyChange={setTranscribing}
                    onTitleResolved={(title) => setActiveTitle(title)}
                    onReset={() => {
                      setHasTranscript(false);
                    }}
                  />
                </div>
              </section>
              <section className={styles.pane} aria-label="摘要">
                <header className={styles.paneHeader}>
                  <h2>摘要</h2>
                </header>
                <div className={styles.paneBody}>
                  <MeetingSummaryPanel
                    meetingId={activeMeetingId}
                    summaryEpoch={summaryEpoch}
                    ready={hasTranscript}
                    onOpenSettings={onOpenSettings}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
