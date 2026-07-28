import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  appGetVersion,
  appRelaunch,
  type AvailableUpdate,
  type AppError,
  type UpdateDownloadEvent,
  updaterCheck,
} from "../../ipc";
import { friendlyErrorMessage } from "../../shared/lib";
import {
  canInstallUpdate,
  downloadProgressPercent,
  shouldShowUpdateBanner,
  type UpdatePhase,
} from "./updateGate";

type AppUpdateContextValue = {
  phase: UpdatePhase;
  currentVersion: string | null;
  availableVersion: string | null;
  notes: string | null;
  error: string | null;
  progressPercent: number | null;
  bannerVisible: boolean;
  badgeVisible: boolean;
  appBusy: boolean;
  canInstall: boolean;
  checkManual: () => Promise<void>;
  download: () => Promise<void>;
  installAndRelaunch: () => Promise<void>;
  downloadInstallAndRelaunch: () => Promise<void>;
  dismissBanner: () => void;
};

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

type ProviderProps = {
  appBusy: boolean;
  children: ReactNode;
};

export function AppUpdateProvider({ appBusy, children }: ProviderProps) {
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [available, setAvailable] = useState<AvailableUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState<number | null>(null);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const updateRef = useRef<AvailableUpdate | null>(null);
  const silentDone = useRef(false);

  useEffect(() => {
    updateRef.current = available;
  }, [available]);

  const applyProgress = useCallback((event: UpdateDownloadEvent) => {
    if (event.event === "Started") {
      setDownloaded(0);
      setContentLength(event.data.contentLength ?? null);
    } else if (event.event === "Progress") {
      setDownloaded((n) => n + event.data.chunkLength);
    } else if (event.event === "Finished") {
      setPhase("readyToInstall");
    }
  }, []);

  const runCheck = useCallback(async (silent: boolean) => {
    setPhase("checking");
    setError(null);
    try {
      if (!currentVersion) {
        setCurrentVersion(await appGetVersion());
      }
      const update = await updaterCheck();
      if (!update) {
        setAvailable(null);
        setPhase("upToDate");
        return;
      }
      setAvailable(update);
      setSessionDismissed(false);
      setPhase("available");
    } catch (err) {
      if (silent) {
        setPhase("idle");
        return;
      }
      setError(friendlyErrorMessage(err as AppError));
      setPhase("error");
    }
  }, [currentVersion]);

  useEffect(() => {
    if (silentDone.current) return;
    silentDone.current = true;
    void (async () => {
      try {
        setCurrentVersion(await appGetVersion());
      } catch {
        /* ignore version read on boot */
      }
      await runCheck(true);
    })();
  }, [runCheck]);

  const download = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    setPhase("downloading");
    setError(null);
    setDownloaded(0);
    setContentLength(null);
    try {
      await update.download((event) => applyProgress(event));
      setPhase("readyToInstall");
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
      setPhase("error");
    }
  }, [applyProgress]);

  const installAndRelaunch = useCallback(async () => {
    const update = updateRef.current;
    if (!update || appBusy) return;
    setPhase("installing");
    setError(null);
    try {
      await update.install();
      await appRelaunch();
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
      setPhase("error");
    }
  }, [appBusy]);

  const downloadInstallAndRelaunch = useCallback(async () => {
    const update = updateRef.current;
    if (!update || appBusy) return;
    setPhase("downloading");
    setError(null);
    setDownloaded(0);
    setContentLength(null);
    try {
      await update.downloadAndInstall((event) => applyProgress(event));
      setPhase("installing");
      await appRelaunch();
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
      setPhase("error");
    }
  }, [appBusy, applyProgress]);

  const value = useMemo<AppUpdateContextValue>(() => {
    const phaseForInstall = phase;
    return {
      phase,
      currentVersion,
      availableVersion: available?.version ?? null,
      notes: available?.body ?? null,
      error,
      progressPercent: downloadProgressPercent(downloaded, contentLength),
      bannerVisible: shouldShowUpdateBanner(phase, sessionDismissed),
      badgeVisible:
        phase === "available" ||
        phase === "downloading" ||
        phase === "readyToInstall",
      appBusy,
      canInstall: canInstallUpdate(appBusy, phaseForInstall),
      checkManual: () => runCheck(false),
      download,
      installAndRelaunch,
      downloadInstallAndRelaunch,
      dismissBanner: () => setSessionDismissed(true),
    };
  }, [
    phase,
    currentVersion,
    available,
    error,
    downloaded,
    contentLength,
    sessionDismissed,
    appBusy,
    runCheck,
    download,
    installAndRelaunch,
    downloadInstallAndRelaunch,
  ]);

  return (
    <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
  );
}

export function useAppUpdate(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) {
    throw new Error("useAppUpdate must be used within AppUpdateProvider");
  }
  return ctx;
}
