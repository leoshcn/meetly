# Implement: 麦 + 系统声混录（规划修订）

## Checklist (ordered)

1. Update `research/recording-stack.md` with WASAPI loopback via cpal output-device input stream.
2. Extend `recording_service` ActiveRecording: mic stream + loopback stream + mix → single WavWriter.
3. Resample/downmix helpers + unit tests (synthetic buffers; no hardware).
4. Fail-closed if either stream cannot start; Windows-only gate for loopback if needed.
5. Extend `record_status` with `output_device_name` (optional but preferred).
6. Frontend: copy + show both device names while recording; mic select unchanged.
7. Windows manual AC7/AC8 validation.
8. Sync specs (`api-shape` status fields if added).

## Validation

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib
npm test
npm run tauri dev
# Manual: play YouTube/Teams audio + speak into mic → stop → listen to WAV
```

## Before implementing this revision

- [x] Product decision: always mix mic + speaker
- [x] User explicitly approves **this revised** planning summary
- [x] Then edit code (do not treat original approval as covering loopback)
