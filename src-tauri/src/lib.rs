use base64::Engine;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaMetadata {
    duration: f64,
    format: String,
    width: u32,
    height: u32,
}

#[derive(Debug, Deserialize)]
pub struct ExportClip {
    path: String,
    start: f64,
    end: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct FfprobeFormat {
    duration: Option<String>,
    format_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FfprobeStream {
    width: Option<u32>,
    height: Option<u32>,
    codec_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FfprobeOutput {
    format: FfprobeFormat,
    streams: Vec<FfprobeStream>,
}

fn get_ffmpeg_path(app: &tauri::AppHandle) -> PathBuf {
    let binary_name = if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };

    let platform_folder = if cfg!(target_os = "macos") {
        "ffmpeg-mac"
    } else if cfg!(target_os = "windows") {
        "ffmpeg-win"
    } else {
        "ffmpeg-linux"
    };

    // Try resource path first (production)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let path = resource_dir
            .join("resources")
            .join(platform_folder)
            .join(binary_name);
        if path.exists() {
            return path;
        }
    }

    // Development paths: try both relative locations
    for base in &["resources", "../resources"] {
        let dev_path = PathBuf::from(base)
            .join(platform_folder)
            .join(binary_name);
        if dev_path.exists() {
            return dev_path;
        }
    }

    // Fallback: assume it's in PATH
    PathBuf::from(binary_name)
}

fn get_ffprobe_path(app: &tauri::AppHandle) -> PathBuf {
    let binary_name = if cfg!(target_os = "windows") {
        "ffprobe.exe"
    } else {
        "ffprobe"
    };

    let platform_folder = if cfg!(target_os = "macos") {
        "ffmpeg-mac"
    } else if cfg!(target_os = "windows") {
        "ffmpeg-win"
    } else {
        "ffmpeg-linux"
    };

    if let Ok(resource_dir) = app.path().resource_dir() {
        let path = resource_dir
            .join("resources")
            .join(platform_folder)
            .join(binary_name);
        if path.exists() {
            return path;
        }
    }

    for base in &["resources", "../resources"] {
        let dev_path = PathBuf::from(base)
            .join(platform_folder)
            .join(binary_name);
        if dev_path.exists() {
            return dev_path;
        }
    }

    PathBuf::from(binary_name)
}

#[tauri::command]
async fn get_metadata(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<MediaMetadata, String> {
    let ffprobe = get_ffprobe_path(&app);

    let output = Command::new(&ffprobe)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {}", stderr));
    }

    let probe: FfprobeOutput = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let duration = probe
        .format
        .duration
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let format = probe.format.format_name.unwrap_or_default();

    // Find the video stream
    let video_stream = probe
        .streams
        .iter()
        .find(|s| s.codec_type.as_deref() == Some("video"));

    let (width, height) = video_stream
        .map(|s| (s.width.unwrap_or(0), s.height.unwrap_or(0)))
        .unwrap_or((0, 0));

    Ok(MediaMetadata {
        duration,
        format,
        width,
        height,
    })
}

#[tauri::command]
async fn get_thumbnail(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<Option<String>, String> {
    let ffmpeg = get_ffmpeg_path(&app);
    let temp_dir = std::env::temp_dir();
    let filename = format!(
        "thumb_{}_{}.png",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
        rand_suffix()
    );
    let output_path = temp_dir.join(&filename);

    let status = Command::new(&ffmpeg)
        .args([
            "-i",
            &file_path,
            "-ss",
            "1",
            "-vframes",
            "1",
            "-vf",
            "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2",
            "-y",
            output_path.to_str().unwrap_or_default(),
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !status.status.success() {
        let stderr = String::from_utf8_lossy(&status.stderr);
        eprintln!("Thumbnail generation failed: {}", stderr);
        return Ok(None);
    }

    match std::fs::read(&output_path) {
        Ok(data) => {
            let _ = std::fs::remove_file(&output_path);
            let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
            Ok(Some(format!("data:image/png;base64,{}", b64)))
        }
        Err(_) => Ok(None),
    }
}

#[tauri::command]
async fn get_waveform(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<Option<String>, String> {
    let ffmpeg = get_ffmpeg_path(&app);
    let temp_dir = std::env::temp_dir();
    let filename = format!(
        "wave_{}_{}.png",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
        rand_suffix()
    );
    let output_path = temp_dir.join(&filename);

    let status = Command::new(&ffmpeg)
        .args([
            "-i",
            &file_path,
            "-filter_complex",
            "aformat=channel_layouts=mono,showwavespic=s=2048x240:colors=#0ea5e9,scale=2048:120,pad=2048:120:0:(oh-ih)/2:color=black@0[outv]",
            "-map",
            "[outv]",
            "-f",
            "image2",
            "-vframes",
            "1",
            "-y",
            output_path.to_str().unwrap_or_default(),
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !status.status.success() {
        // Waveform generation can fail for files without audio - return empty string
        return Ok(Some(String::new()));
    }

    match std::fs::read(&output_path) {
        Ok(data) => {
            let _ = std::fs::remove_file(&output_path);
            let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
            Ok(Some(format!("data:image/png;base64,{}", b64)))
        }
        Err(_) => Ok(Some(String::new())),
    }
}

#[tauri::command]
async fn export_video(
    app: tauri::AppHandle,
    window: tauri::Window,
    clips: Vec<ExportClip>,
    output_path: String,
) -> Result<bool, String> {
    let ffmpeg = get_ffmpeg_path(&app);
    let ffprobe = get_ffprobe_path(&app);

    // Check which clips have audio streams
    let mut has_audio: Vec<bool> = Vec::new();
    for clip in &clips {
        let output = Command::new(&ffprobe)
            .args([
                "-v", "quiet",
                "-print_format", "json",
                "-show_streams",
                "-select_streams", "a",
                &clip.path,
            ])
            .output()
            .unwrap_or_else(|_| std::process::Command::new("true").output().unwrap());

        let has = output.status.success()
            && serde_json::from_slice::<serde_json::Value>(&output.stdout)
                .ok()
                .and_then(|v| v["streams"].as_array().map(|a| !a.is_empty()))
                .unwrap_or(false);
        has_audio.push(has);
    }

    let any_audio = has_audio.iter().any(|&a| a);

    let mut args: Vec<String> = Vec::new();

    // Add inputs
    for clip in &clips {
        args.push("-i".to_string());
        args.push(clip.path.clone());
    }

    // Build complex filter
    let mut filter_parts: Vec<String> = Vec::new();
    let mut concat_inputs = String::new();

    for (i, clip) in clips.iter().enumerate() {
        filter_parts.push(format!(
            "[{i}:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}]",
            i = i,
            start = clip.start,
            end = clip.end
        ));

        if any_audio {
            if has_audio[i] {
                filter_parts.push(format!(
                    "[{i}:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}]",
                    i = i,
                    start = clip.start,
                    end = clip.end
                ));
            } else {
                // Generate silent audio for clips without audio
                let duration = clip.end - clip.start;
                filter_parts.push(format!(
                    "anullsrc=r=44100:cl=stereo[a{i}_raw];[a{i}_raw]atrim=0:{duration}[a{i}]",
                    i = i,
                    duration = duration
                ));
            }
            concat_inputs.push_str(&format!("[v{i}][a{i}]"));
        } else {
            concat_inputs.push_str(&format!("[v{i}]"));
        }
    }

    if any_audio {
        filter_parts.push(format!(
            "{}concat=n={}:v=1:a=1[outv][outa]",
            concat_inputs,
            clips.len()
        ));
    } else {
        filter_parts.push(format!(
            "{}concat=n={}:v=1:a=0[outv]",
            concat_inputs,
            clips.len()
        ));
    }

    let filter_complex = filter_parts.join(";");

    args.push("-filter_complex".to_string());
    args.push(filter_complex);
    args.push("-map".to_string());
    args.push("[outv]".to_string());
    if any_audio {
        args.push("-map".to_string());
        args.push("[outa]".to_string());
    }
    args.push("-y".to_string());
    args.push(output_path.clone());

    eprintln!("[Perseus] FFmpeg path: {:?}", ffmpeg);
    eprintln!("[Perseus] FFmpeg args: {:?}", args);

    // Run ffmpeg and capture stderr for both progress and error reporting
    let mut child = Command::new(&ffmpeg)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start ffmpeg at {:?}: {}", ffmpeg, e))?;

    // Read stderr in a thread, collecting all output for error reporting
    let stderr = child.stderr.take();
    let window_clone = window.clone();
    let stderr_handle = if let Some(stderr) = stderr {
        Some(std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stderr);
            let mut all_lines = Vec::new();
            for line in reader.lines() {
                if let Ok(line) = line {
                    if line.contains("time=") {
                        let _ = window_clone.emit("export:progress", &line);
                    }
                    all_lines.push(line);
                }
            }
            all_lines
        }))
    } else {
        None
    };

    let status = child
        .wait()
        .map_err(|e| format!("FFmpeg process error: {}", e))?;

    // Collect stderr output
    let stderr_output = stderr_handle
        .and_then(|h| h.join().ok())
        .unwrap_or_default();

    if !status.success() {
        let last_lines: Vec<&String> = stderr_output.iter().rev().take(10).collect::<Vec<_>>().into_iter().rev().collect();
        let error_detail = last_lines.iter().map(|s| s.as_str()).collect::<Vec<_>>().join("\n");
        return Err(format!("FFmpeg export failed (exit code {:?}):\n{}", status.code(), error_detail));
    }

    // Emit 100% completion
    let _ = window.emit("export:progress-percent", 100.0_f64);

    Ok(true)
}

fn rand_suffix() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    std::time::SystemTime::now().hash(&mut hasher);
    std::thread::current().id().hash(&mut hasher);
    format!("{:x}", hasher.finish())[..7].to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_metadata,
            get_thumbnail,
            get_waveform,
            export_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
