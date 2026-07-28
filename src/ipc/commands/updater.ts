import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";

export type UpdateDownloadEvent = DownloadEvent;

export type AvailableUpdate = {
  version: string;
  body: string | null;
  date: string | null;
  download: (
    onEvent?: (event: UpdateDownloadEvent) => void,
  ) => Promise<void>;
  install: () => Promise<void>;
  downloadAndInstall: (
    onEvent?: (event: UpdateDownloadEvent) => void,
  ) => Promise<void>;
};

type CheckFn = () => Promise<Update | null>;
type VersionFn = () => Promise<string>;
type RelaunchFn = () => Promise<void>;

let checkImpl: CheckFn = () => check();
let versionImpl: VersionFn = () => getVersion();
let relaunchImpl: RelaunchFn = () => relaunch();

export function __setUpdaterMocksForTests(mocks: {
  check?: CheckFn | null;
  getVersion?: VersionFn | null;
  relaunch?: RelaunchFn | null;
}): void {
  checkImpl = mocks.check === null || mocks.check === undefined
    ? () => check()
    : mocks.check;
  versionImpl =
    mocks.getVersion === null || mocks.getVersion === undefined
      ? () => getVersion()
      : mocks.getVersion;
  relaunchImpl =
    mocks.relaunch === null || mocks.relaunch === undefined
      ? () => relaunch()
      : mocks.relaunch;
}

function wrapUpdate(update: Update): AvailableUpdate {
  return {
    version: update.version,
    body: update.body ?? null,
    date: update.date ?? null,
    download: (onEvent) => update.download(onEvent),
    install: () => update.install(),
    downloadAndInstall: (onEvent) => update.downloadAndInstall(onEvent),
  };
}

export async function appGetVersion(): Promise<string> {
  return versionImpl();
}

export async function updaterCheck(): Promise<AvailableUpdate | null> {
  const update = await checkImpl();
  return update ? wrapUpdate(update) : null;
}

export async function appRelaunch(): Promise<void> {
  return relaunchImpl();
}
