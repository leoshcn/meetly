import { invokeCommand } from "../client";
import type {
  DevicesResponse,
  RecordStartResponse,
  RecordStatusResponse,
  RecordStopResponse,
} from "../types";

export function recordListInputDevices(): Promise<DevicesResponse> {
  return invokeCommand<DevicesResponse>("record_list_input_devices");
}

export function recordStart(deviceId?: string | null): Promise<RecordStartResponse> {
  return invokeCommand<RecordStartResponse>("record_start", {
    device_id: deviceId ?? null,
  });
}

export function recordStop(): Promise<RecordStopResponse> {
  return invokeCommand<RecordStopResponse>("record_stop");
}

export function recordStatus(): Promise<RecordStatusResponse> {
  return invokeCommand<RecordStatusResponse>("record_status");
}
