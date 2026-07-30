# Research: Tauri 2 floating always-on-top widget window (Windows)

Source: docs.rs `tauri 2` `WebviewWindowBuilder` / `WindowBuilder`, v2.tauri.app capabilities docs.
Verified 2026-07-29 against the current project (Tauri 2, `src-tauri/Cargo.toml:16`).

## Window options (all available on Tauri 2)

| Option | Value for widget | Notes |
|---|---|---|
| `always_on_top` | `true` | "Whether the window should always be on top of other windows." |
| `decorations` | `false` | No title bar / borders. |
| `transparent` | `true` | On macOS requires the `macos-private-api` crate feature; **on Windows no extra feature needed**. Project is Windows-only for recording (`recording_service.rs:594`). |
| `skip_taskbar` | `true` | Unsupported on macOS; fine on Windows. |
| `shadow` | `false` | **Important**: docs state `shadow(true)` on an *undecorated* window "will make undecorated window have a 1px white border, and on Windows 11, it will have rounded corners". A 1px white border around a transparent pill is a visible artifact — keep shadow off and draw rounded corners + shadow in CSS. |
| `resizable` | `false` | Fixed pill / dot sizes. |
| `visible` | `false` initially | See creation-timing trap below. |

## Creation-timing trap (decides the whole architecture)

docs.rs, `WebviewWindowBuilder::new`:

> On Windows, this function deadlocks when used in a synchronous command and event handlers, see the Webview2 issue. You should use `async` commands and separate threads when creating windows.

`record_start` is a **synchronous** `#[tauri::command]` (`src-tauri/src/commands/recording.rs:16`). Creating the widget window inside it would deadlock on Windows.

**Conclusion**: do not create the widget at runtime. Declare it in `tauri.conf.json` `app.windows` with `"visible": false` alongside `main`, and only `show()` / `hide()` it. This sidesteps the deadlock entirely, makes show instant (webview already warm), and needs no window-creation permission.

## Capabilities are per window label

`src-tauri/capabilities/default.json:5` is currently `"windows": ["main"]`. A window whose label matches no capability "has no access to the IPC layer at all".

So the widget needs its own capability file listing its label. Permissions needed:

- `core:default` (event listen/emit, basic window info)
- `core:window:allow-start-dragging` — required for `data-tauri-drag-region` to work
- `core:window:allow-set-position`, `allow-set-size`, `allow-show`, `allow-hide`
- `core:window:allow-set-focus`, `allow-unminimize`, `allow-show` — to summon the `main` window from the widget

App commands registered via `invoke_handler` are allowed for all windows by default (no `AppManifest::commands` in `lib.rs`), so `record_status` is callable from the widget without extra permission entries.

The `main` window's capability needs the show/hide permissions used to control the widget.

## Dragging

Put `data-tauri-drag-region` on the pill's background element. Requires `core:window:allow-start-dragging` on the widget's capability. Interactive children (buttons) must not carry the attribute or they become drag handles instead of buttons.

## Multi-monitor position validation

`availableMonitors()` (JS) / `available_monitors()` (Rust) returns each monitor's position + size. A saved widget position must be checked for intersection with at least one monitor's work area before `setPosition`, otherwise unplugging an external display leaves the widget permanently off-screen with no way to recover.

## App-exit trap with a persistent second window

Tauri exits when all windows close. With a permanently-declared widget window, closing `main` will **not** exit the app — the hidden widget keeps the process alive. The `main` window's `CloseRequested` / `Destroyed` handling must explicitly `app_handle.exit(0)`.

## Single Vite entry, route by window label

`src/main.tsx` mounts `AppShell` unconditionally. Rather than adding a second HTML entry to the Vite build, read `getCurrentWindow().label` in `main.tsx` and mount either `AppShell` or the widget root. One bundle, one entry, no build-config change.

## Not verified — must be checked by hand on Windows

- Whether `always_on_top` renders above a maximized/fullscreen 腾讯会议 / Zoom window. Borderless-maximized should be fine; true exclusive fullscreen will cover the widget. Needs a manual pass on real meeting apps.
- Transparent-window click-through behavior on the pill's transparent margins (should be handled by keeping the window rect tight around the pill).
