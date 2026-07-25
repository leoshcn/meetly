# Design: 会议录音（麦 + 系统扬声器混录）

## Architecture

```
record_start
  ├─ mic input stream (selected / default input)
  └─ loopback input stream (default output device via WASAPI)
        │
        ▼
  ring buffers → mix (resample/downmix) → temp WAV → FFmpeg AAC → M4A
        │
record_stop → finalize M4A → frontend create meeting + transcribe
```

Worker thread still owns both `cpal::Stream`s (`!Send`).

## Capture strategy

| Stream | Device | Config API |
|--------|--------|------------|
| Microphone | User-selected input (default = default input) | `default_input_config` + `build_input_stream` |
| System speaker | Default **output** device | `default_output_config` + `build_input_stream` (loopback) |

If either stream fails to open/play → fail `record_start` with `RECORD_DEVICE_ERROR` (or `RECORD_NO_DEVICE` if no output); do not leave mic-only session.

## Mixing

1. Both callbacks push f32 mono (downmix if multi-channel) into lock-free or mutex ring buffers with timestamps/`Instant` or sample counters.
2. Mixer thread (same worker) or write path: read available frames from both, pad missing side with silence for short gaps, sum and clamp to i16.
3. Target capture mix: 16-bit mono @ **48 kHz** PCM, then encode to **M4A (AAC 128 kbps)** via `ffmpeg-sidecar` (Doubao accepts `m4a`).

MVP resample: simple linear interpolation is enough; document quality limits.

## IPC changes

| Command | Change |
|---------|--------|
| `record_list_input_devices` | Unchanged (mic list) |
| `record_start` | Unchanged request shape; behavior starts **two** streams |
| `record_stop` / `record_status` | Status may include `device_name` (mic) + `output_device_name` (loopback) |

Optional status fields:

```ts
device_name: string | null;        // mic
output_device_name: string | null; // loopback target
```

## UI

- Idle: mic select + hint「将同时录制麦克风与系统声音（会议对方）」
- Recording: timer + mic name + output device name
- Settings recording dir: unchanged

## Errors

| Situation | Code |
|-----------|------|
| No mic | `RECORD_NO_DEVICE` |
| No output / loopback open fail | `RECORD_DEVICE_ERROR` |
| Mic open fail | `RECORD_DEVICE_ERROR` |
| Already recording | `RECORD_BUSY` |
| Empty mix (no frames either side) | `INVALID_ARGUMENT` |

## Platform

- **Windows**: required path.
- **Non-Windows**: `record_start` may return `RECORD_DEVICE_ERROR` with message that system-audio mix requires Windows in this version — or best-effort mic-only **only if** we explicitly reject that per PRD (PRD says fail closed, no silent mic-only). Prefer fail closed on non-Windows for mix requirement.

## Trade-offs

| Choice | Why |
|--------|-----|
| Always mix | Matches network-meeting need; no mode UI |
| Fail if loopback fails | Avoid false sense of “full meeting” capture |
| No AEC | Scope; user can use headset to reduce echo |
| Fixed 48 kHz mono out | Simpler mixer + smaller files than stereo 96k |

## Rollback

- Revert recording_service dual-stream + UI copy; settings path stays.
