use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

// ---------------------------------------------------------------------------
// Win32 input module — only compiled on Windows
// ---------------------------------------------------------------------------

#[cfg(target_os = "windows")]
mod win_input {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYEVENTF_KEYUP,
        KEYEVENTF_SCANCODE, MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
        MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN,
        MOUSEEVENTF_RIGHTUP, MOUSEINPUT, VIRTUAL_KEY, VK_BACK, VK_CONTROL, VK_DELETE, VK_ESCAPE,
        VK_F1, VK_F10, VK_F11, VK_F12, VK_F2, VK_F3, VK_F4, VK_F5, VK_F6, VK_F7, VK_F8, VK_F9,
        VK_MENU, VK_RETURN, VK_SHIFT, VK_SPACE, VK_TAB,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetSystemMetrics;
    use windows::Win32::UI::WindowsAndMessaging::{SM_CXSCREEN, SM_CYSCREEN};

    fn send(inputs: &[INPUT]) {
        unsafe {
            SendInput(inputs, std::mem::size_of::<INPUT>() as i32);
        }
    }

    // Absolute mouse coordinates use 0-65535 normalized range
    fn normalize_coords(x: i32, y: i32) -> (i32, i32) {
        unsafe {
            let cx = GetSystemMetrics(SM_CXSCREEN);
            let cy = GetSystemMetrics(SM_CYSCREEN);
            if cx == 0 || cy == 0 {
                return (0, 0);
            }
            let nx = (x * 65535 + cx / 2) / cx;
            let ny = (y * 65535 + cy / 2) / cy;
            (nx, ny)
        }
    }

    pub fn move_mouse_abs(x: i32, y: i32) {
        let (nx, ny) = normalize_coords(x, y);
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: nx,
                    dy: ny,
                    dwFlags: MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
                    ..Default::default()
                },
            },
        };
        send(&[input]);
    }

    pub fn mouse_click(button: &str) {
        let (down, up) = match button {
            "right" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            "middle" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
            _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
        };
        let inputs = [
            INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: INPUT_0 {
                    mi: MOUSEINPUT {
                        dwFlags: down,
                        ..Default::default()
                    },
                },
            },
            INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: INPUT_0 {
                    mi: MOUSEINPUT {
                        dwFlags: up,
                        ..Default::default()
                    },
                },
            },
        ];
        send(&inputs);
    }

    pub fn move_mouse_rel(dx: i32, dy: i32) {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx,
                    dy,
                    dwFlags: MOUSEEVENTF_MOVE,
                    ..Default::default()
                },
            },
        };
        send(&[input]);
    }

    pub fn mouse_down(button: &str) {
        let flag = match button {
            "right" => MOUSEEVENTF_RIGHTDOWN,
            "middle" => MOUSEEVENTF_MIDDLEDOWN,
            _ => MOUSEEVENTF_LEFTDOWN,
        };
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dwFlags: flag,
                    ..Default::default()
                },
            },
        };
        send(&[input]);
    }

    pub fn mouse_up(button: &str) {
        let flag = match button {
            "right" => MOUSEEVENTF_RIGHTUP,
            "middle" => MOUSEEVENTF_MIDDLEUP,
            _ => MOUSEEVENTF_LEFTUP,
        };
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dwFlags: flag,
                    ..Default::default()
                },
            },
        };
        send(&[input]);
    }

    pub fn resolve_vk(name: &str) -> VIRTUAL_KEY {
        match name.to_lowercase().as_str() {
            "space" | "spacebar" => VK_SPACE,
            "enter" | "return" => VK_RETURN,
            "tab" => VK_TAB,
            "escape" | "esc" => VK_ESCAPE,
            "shift" => VK_SHIFT,
            "control" | "ctrl" => VK_CONTROL,
            "alt" => VK_MENU,
            "backspace" => VK_BACK,
            "delete" | "del" => VK_DELETE,
            "f1" => VK_F1,
            "f2" => VK_F2,
            "f3" => VK_F3,
            "f4" => VK_F4,
            "f5" => VK_F5,
            "f6" => VK_F6,
            "f7" => VK_F7,
            "f8" => VK_F8,
            "f9" => VK_F9,
            "f10" => VK_F10,
            "f11" => VK_F11,
            "f12" => VK_F12,
            other => {
                // Single character → virtual key code (uppercase ASCII)
                if let Some(c) = other.chars().next() {
                    let upper = c.to_ascii_uppercase() as u16;
                    VIRTUAL_KEY(upper)
                } else {
                    VK_SPACE
                }
            }
        }
    }

    pub fn key_down(vk: VIRTUAL_KEY) {
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: KEYEVENTF_SCANCODE, // just use vk
                    ..Default::default()
                },
            },
        };
        // Actually: for vk-based input, dwFlags should be 0 (not SCANCODE)
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    dwFlags: Default::default(),
                    ..Default::default()
                },
            },
        };
        send(&[input]);
    }

    pub fn key_up(vk: VIRTUAL_KEY) {
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    dwFlags: KEYEVENTF_KEYUP,
                    ..Default::default()
                },
            },
        };
        send(&[input]);
    }

    pub fn key_press(vk: VIRTUAL_KEY) {
        key_down(vk);
        key_up(vk);
    }
}

// No-op stubs for non-Windows (macOS dev builds)
#[cfg(not(target_os = "windows"))]
#[allow(non_camel_case_types, dead_code)]
mod win_input {
    #[derive(Clone, Copy)]
    pub struct VIRTUAL_KEY(pub u16);
    pub fn move_mouse_abs(_x: i32, _y: i32) {}
    pub fn move_mouse_rel(_dx: i32, _dy: i32) {}
    pub fn mouse_click(_button: &str) {}
    pub fn mouse_down(_button: &str) {}
    pub fn mouse_up(_button: &str) {}
    pub fn resolve_vk(_name: &str) -> VIRTUAL_KEY {
        VIRTUAL_KEY(0)
    }
    pub fn key_down(_vk: VIRTUAL_KEY) {}
    pub fn key_up(_vk: VIRTUAL_KEY) {}
    pub fn key_press(_vk: VIRTUAL_KEY) {}
}

// ---------------------------------------------------------------------------
// Settings model
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoInputSettings {
    pub hours: u64,
    pub minutes: u64,
    pub seconds: u64,
    pub milliseconds: u64,

    pub mouse_button: String,
    pub click_type: String,

    pub repeat_mode: String,
    pub repeat_count: u64,

    pub location_mode: String,
    pub fixed_x: i32,
    pub fixed_y: i32,

    pub action_type: String,
    pub mouse_mode: String,
    pub drag_speed: i32,
    pub drag_direction_x: f64,
    pub drag_direction_y: f64,

    pub hold_key: String,
    pub key_mode: String,
}

impl Default for AutoInputSettings {
    fn default() -> Self {
        Self {
            hours: 0,
            minutes: 0,
            seconds: 0,
            milliseconds: 20,
            mouse_button: "left".into(),
            click_type: "single".into(),
            repeat_mode: "infinite".into(),
            repeat_count: 10,
            location_mode: "current".into(),
            fixed_x: 0,
            fixed_y: 0,
            action_type: "click".into(),
            mouse_mode: "click".into(),
            drag_speed: 5,
            drag_direction_x: 0.0,
            drag_direction_y: -1.0,
            hold_key: "e".into(),
            key_mode: "hold".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotkeySettings {
    pub start: Option<String>,
    pub stop: Option<String>,
    pub toggle: Option<String>,
}

impl Default for HotkeySettings {
    fn default() -> Self {
        Self {
            start: None,
            stop: None,
            toggle: None,
        }
    }
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

struct InputState {
    stop: Option<Arc<AtomicBool>>,
    done: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl Default for InputState {
    fn default() -> Self {
        Self {
            stop: None,
            done: Arc::new(AtomicBool::new(true)),
            handle: None,
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn calc_interval_ms(s: &AutoInputSettings) -> u64 {
    s.milliseconds + s.seconds * 1000 + s.minutes * 60_000 + s.hours * 3_600_000
}

fn lock_state(state: &Mutex<InputState>) -> std::sync::MutexGuard<'_, InputState> {
    state.lock().unwrap_or_else(|e| e.into_inner())
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn start_action(
    app: AppHandle,
    state: tauri::State<'_, Mutex<InputState>>,
    settings: AutoInputSettings,
) -> Result<(), String> {
    let mut st = lock_state(&state);

    // Clean up finished thread
    if st.done.load(Ordering::Acquire) {
        if let Some(handle) = st.handle.take() {
            let _ = handle.join();
        }
        st.stop = None;
    }

    if st.handle.is_some() {
        return Ok(());
    }

    let interval = calc_interval_ms(&settings);
    // Hold modes don't use interval — only validate for click/repeat modes
    let is_hold_mode = (settings.action_type == "click" && settings.mouse_mode == "hold")
        || (settings.action_type == "hold-key" && settings.key_mode == "hold");
    if interval == 0 && !is_hold_mode {
        return Err("Interval must be greater than 0".into());
    }

    if settings.action_type == "hold-key" && settings.hold_key.is_empty() {
        return Err("No key selected".into());
    }

    let stop = Arc::new(AtomicBool::new(false));
    let stop_clone = Arc::clone(&stop);

    let done = Arc::new(AtomicBool::new(false));
    let done_clone = Arc::clone(&done);

    let app_handle = app.clone();

    let handle = thread::spawn(move || {
        let is_click = settings.action_type == "click";
        let is_hold = settings.key_mode == "hold";
        let is_mouse_hold = settings.mouse_mode == "hold";
        let repeat_count = if settings.repeat_mode == "count" {
            settings.repeat_count
        } else {
            0
        };

        // Key-hold mode: press down, wait for stop, release
        if !is_click && is_hold {
            let vk = win_input::resolve_vk(&settings.hold_key);
            win_input::key_down(vk);
            while !stop_clone.load(Ordering::Acquire) {
                thread::sleep(Duration::from_millis(50));
            }
            win_input::key_up(vk);
            done_clone.store(true, Ordering::Release);
            let _ = app_handle.emit("action-stopped", ());
            return;
        }

        // Mouse-hold mode: press down, continuously drag in the configured direction, release
        if is_click && is_mouse_hold {
            // We want a consistent pixels-per-second regardless of tick rate.
            // Cap per-tick displacement at 10px so the OS processes each move
            // naturally, and vary the sleep interval to achieve the target speed.
            //
            // target speed = drag_speed * 62.5 px/s  (preserving old scale at low values)
            // sleep_ms = (per_tick_px / target_speed_per_sec) * 1000
            //          = per_tick_px / (drag_speed * 0.0625)
            //
            // At drag_speed <= 10 this gives the same 16ms / same behavior as before.
            // At drag_speed = 100 the sleep drops to ~1.6ms → ~625 moves/s → 6250 px/s
            // At drag_speed = 500 the sleep drops to ~0.3ms → ~3125 moves/s → 31250 px/s
            let speed = settings.drag_speed.max(1) as f64;
            let dir_mag = (settings.drag_direction_x.powi(2) + settings.drag_direction_y.powi(2))
                .sqrt()
                .max(0.001);

            // Per-tick displacement: cap magnitude at 10px for smooth OS event handling
            let per_tick_cap = 10.0_f64;
            let per_tick_mag = per_tick_cap.min(speed);
            let dx = (settings.drag_direction_x / dir_mag * per_tick_mag).round() as i32;
            let dy = (settings.drag_direction_y / dir_mag * per_tick_mag).round() as i32;

            // Derive sleep from target velocity: target_px_per_sec = speed * 62.5
            let target_pps = speed * 62.5;
            let sleep_secs = per_tick_mag / target_pps;
            let sleep_us = (sleep_secs * 1_000_000.0).round().max(200.0) as u64; // floor at 200µs

            if settings.location_mode == "fixed" {
                win_input::move_mouse_abs(settings.fixed_x, settings.fixed_y);
            }
            win_input::mouse_down(&settings.mouse_button);
            while !stop_clone.load(Ordering::Acquire) {
                if dx != 0 || dy != 0 {
                    win_input::move_mouse_rel(dx, dy);
                }
                thread::sleep(Duration::from_micros(sleep_us));
            }
            win_input::mouse_up(&settings.mouse_button);
            done_clone.store(true, Ordering::Release);
            let _ = app_handle.emit("action-stopped", ());
            return;
        }

        let mut count: u64 = 0;
        while !stop_clone.load(Ordering::Acquire) {
            if is_click {
                if settings.location_mode == "fixed" {
                    win_input::move_mouse_abs(settings.fixed_x, settings.fixed_y);
                }

                let clicks = if settings.click_type == "double" {
                    2
                } else {
                    1
                };
                for _ in 0..clicks {
                    win_input::mouse_click(&settings.mouse_button);
                }
            } else {
                // Key repeat mode — tap at interval
                let vk = win_input::resolve_vk(&settings.hold_key);
                win_input::key_press(vk);
            }

            count += 1;
            if repeat_count > 0 && count >= repeat_count {
                break;
            }

            thread::sleep(Duration::from_millis(interval));
        }

        done_clone.store(true, Ordering::Release);
        let _ = app_handle.emit("action-stopped", ());
    });

    st.stop = Some(stop);
    st.done = done;
    st.handle = Some(handle);

    Ok(())
}

#[tauri::command]
fn stop_action(state: tauri::State<'_, Mutex<InputState>>) -> Result<(), String> {
    let mut st = lock_state(&state);

    if let Some(stop) = &st.stop {
        stop.store(true, Ordering::Release);
    }

    if let Some(handle) = st.handle.take() {
        let _ = handle.join();
    }

    st.stop = None;

    Ok(())
}

#[tauri::command]
fn is_running(state: tauri::State<'_, Mutex<InputState>>) -> bool {
    let st = lock_state(&state);
    st.handle.is_some() && !st.done.load(Ordering::Acquire)
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

// ---------------------------------------------------------------------------
// App entry
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

                let show_i = MenuItemBuilder::with_id("show", "Show AutoInput").build(app)?;
                let hide_i = MenuItemBuilder::with_id("hide", "Minimize to Tray").build(app)?;
                let quit_i = MenuItemBuilder::with_id("quit", "Exit").build(app)?;
                let menu = MenuBuilder::new(app)
                    .items(&[&show_i, &hide_i, &quit_i])
                    .build()?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("AutoInput")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.unminimize();
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.hide();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.unminimize();
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .manage(Mutex::new(InputState::default()))
        .invoke_handler(tauri::generate_handler![
            start_action,
            stop_action,
            is_running,
            show_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
