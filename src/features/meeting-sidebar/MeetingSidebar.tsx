import { useCallback, useEffect, useState } from "react";
import {
  meetingsDelete,
  meetingsList,
  meetingsRename,
  type AppError,
  type Meeting,
} from "../../ipc";
import { errorTitle, friendlyErrorMessage } from "../../shared/lib";
import { Button } from "../../shared/ui";
import styles from "./MeetingSidebar.module.css";

type Props = {
  activeMeetingId: string | null;
  refreshKey: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (meetingId: string, meeting?: Meeting) => void;
  onNewProject: () => void;
  onDeleted: (meetingId: string) => void;
  onRenamed: (meeting: Meeting) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MeetingSidebar({
  activeMeetingId,
  refreshKey,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onNewProject,
  onDeleted,
  onRenamed,
}: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await meetingsList();
      setMeetings(list);
      setError(null);
      setErrorCode(undefined);
    } catch (err) {
      const appErr = err as AppError;
      setError(friendlyErrorMessage(appErr));
      setErrorCode(errorTitle(appErr));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function commitRename(meetingId: string) {
    const title = editTitle.trim();
    if (!title) {
      setError("标题不能为空");
      setErrorCode(undefined);
      return;
    }
    try {
      const updated = await meetingsRename(meetingId, title);
      setEditingId(null);
      onRenamed(updated);
      await load();
    } catch (err) {
      const appErr = err as AppError;
      setError(friendlyErrorMessage(appErr));
      setErrorCode(errorTitle(appErr));
    }
  }

  async function handleDelete(meeting: Meeting) {
    const label = meeting.title ?? meeting.id;
    if (
      !window.confirm(
        `确定删除项目「${label}」？转写与摘要将一并删除（本地音频文件保留）。`,
      )
    ) {
      return;
    }
    try {
      await meetingsDelete(meeting.id);
      onDeleted(meeting.id);
      await load();
    } catch (err) {
      const appErr = err as AppError;
      setError(friendlyErrorMessage(appErr));
      setErrorCode(errorTitle(appErr));
    }
  }

  if (collapsed) {
    return (
      <aside className={styles.rail}>
        <button
          type="button"
          className={styles.iconRail}
          onClick={onNewProject}
          aria-label="新建项目"
          title="新建项目"
        >
          +
        </button>
        <button
          type="button"
          className={styles.iconRail}
          onClick={onToggleCollapsed}
          aria-label="展开侧边栏"
          title="展开侧边栏"
        >
          »
        </button>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2>项目</h2>
        <button
          type="button"
          className={styles.collapse}
          onClick={onToggleCollapsed}
          aria-label="收起侧边栏"
        >
          «
        </button>
      </div>
      <div className={styles.toolbar}>
        <Button variant="primary" block onClick={onNewProject}>
          新建项目
        </Button>
      </div>
      {error && (
        <p className={styles.error} role="alert" title={errorCode}>
          {error}
        </p>
      )}
      <ul className={styles.list}>
        {meetings.length === 0 ? (
          <li className={styles.empty}>暂无项目</li>
        ) : (
          meetings.map((meeting) => {
            const active = meeting.id === activeMeetingId;
            const editing = editingId === meeting.id;
            return (
              <li
                key={meeting.id}
                className={active ? styles.itemActive : styles.item}
              >
                {editing ? (
                  <div className={styles.editRow}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void commitRename(meeting.id);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      aria-label="项目标题"
                      autoFocus
                    />
                    <div className={styles.editActions}>
                      <Button
                        variant="primary"
                        onClick={() => void commitRename(meeting.id)}
                      >
                        保存
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.selectBtn}
                      onClick={() => onSelect(meeting.id, meeting)}
                    >
                      <span className={styles.title}>
                        {meeting.title ?? meeting.id}
                      </span>
                      <span className={styles.time}>
                        {formatTime(meeting.created_at)}
                      </span>
                    </button>
                    <div className={styles.rowActions}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingId(meeting.id);
                          setEditTitle(meeting.title ?? "");
                        }}
                      >
                        重命名
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => void handleDelete(meeting)}
                      >
                        删除
                      </Button>
                    </div>
                  </>
                )}
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
