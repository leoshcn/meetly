import { invokeCommand } from "../client";
import type { FfmpegStatus } from "../types";

export function ffmpegStatus(): Promise<FfmpegStatus> {
  return invokeCommand<FfmpegStatus>("ffmpeg_status");
}

export function ffmpegDownload(): Promise<FfmpegStatus> {
  return invokeCommand<FfmpegStatus>("ffmpeg_download");
}
