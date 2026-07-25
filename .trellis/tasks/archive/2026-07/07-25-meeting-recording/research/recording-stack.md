# Research: recording stack (updated)

## Decision (revised)

Capture **microphone + Windows WASAPI loopback** (system speaker mix), always mixed into one WAV. Still `cpal` + `hound`; no third-party Tauri recorder plugin.

## Loopback how-to (Windows / cpal)

1. Resolve default (or chosen) **output** device.
2. Use `device.default_output_config()` — not input config (fails on render endpoints).
3. `device.build_input_stream(...)` — WASAPI backend sets `AUDCLNT_STREAMFLAGS_LOOPBACK`.
4. Run in parallel with a normal mic input stream; mix in the recording worker thread.

Evidence: cpal WASAPI loopback support; swyh-rs / auricle-capture patterns.

## Why not “Stereo Mix” device only

Stereo Mix is optional/OEM-dependent; WASAPI loopback works without enabling legacy stereo mix.

## Format

Final file is **`.m4a` (AAC-LC)**. Capture still mixes to 48 kHz mono PCM WAV temp, then `ffmpeg-sidecar` encodes (`-c:a aac -b:a 128k`). Doubao ASR already maps `.m4a` → format `m4a` in `audio_format_from_path`.
