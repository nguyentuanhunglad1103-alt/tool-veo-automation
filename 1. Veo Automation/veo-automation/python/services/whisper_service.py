#!/usr/bin/env python3
"""
Whisper Service — faster-whisper backend for VEO Automation PRO
Communicates via JSON stdout protocol.

Usage:
    python whisper_service.py download-model --model medium --models-dir /path/to/models
    python whisper_service.py transcribe --video /path/to/video.mp4 --model medium [--language vi]

Output format (JSON lines on stdout):
    {"type": "progress", "stage": "downloading", "percent": 45, "message": "Downloading..."}
    {"type": "result", "success": true, "srt": "1\n00:00:00,000 --> ...", "language": "vi"}
"""

import sys
import os
import json
import argparse
import time

# Force UTF-8 encoding for stdout to prevent UnicodeEncodeError on Windows
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

def emit(data: dict):
    """Emit a JSON message to stdout."""
    print(json.dumps(data, ensure_ascii=False), flush=True)

def emit_progress(stage: str, percent: int, message: str = ""):
    emit({"type": "progress", "stage": stage, "percent": percent, "message": message})

def emit_result(success: bool, **kwargs):
    emit({"type": "result", "success": success, **kwargs})

def format_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def segments_to_srt(segments) -> str:
    """Convert faster-whisper segments to SRT format."""
    srt_lines = []
    for i, segment in enumerate(segments, 1):
        start = format_timestamp(segment.start)
        end = format_timestamp(segment.end)
        text = segment.text.strip()
        if text:
            srt_lines.append(f"{i}")
            srt_lines.append(f"{start} --> {end}")
            srt_lines.append(text)
            srt_lines.append("")
    return "\n".join(srt_lines)

# ─── Commands ───

def cmd_download_model(args):
    """Download a faster-whisper model."""
    model = args.model
    models_dir = args.models_dir

    emit_progress("downloading", 0, f"Đang chuẩn bị tải model {model}...")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        emit_progress("downloading", 10, "Đang cài đặt faster-whisper...")
        os.system(f'"{sys.executable}" -m pip install faster-whisper --quiet')
        from faster_whisper import WhisperModel

    emit_progress("downloading", 20, f"Đang tải model {model}... (có thể mất vài phút)")

    # Set download dir
    os.environ["HF_HOME"] = models_dir

    try:
        # This will download the model if not cached
        _model = WhisperModel(model, device="cpu", compute_type="int8", download_root=models_dir)
        emit_progress("downloading", 100, f"Model {model} sẵn sàng!")
        emit_result(True, model=model, message=f"Model {model} đã sẵn sàng")
    except Exception as e:
        emit_result(False, error=str(e))

def cmd_transcribe(args):
    """Transcribe a video/audio file."""
    video_path = args.video
    model_name = args.model
    models_dir = args.models_dir
    language = args.language if args.language else None

    if not os.path.exists(video_path):
        emit_result(False, error=f"File không tồn tại: {video_path}")
        return

    emit_progress("transcribing", 0, "Đang khởi tạo model AI...")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        emit_progress("transcribing", 5, "Đang cài đặt faster-whisper...")
        os.system(f'"{sys.executable}" -m pip install faster-whisper --quiet')
        from faster_whisper import WhisperModel

    emit_progress("transcribing", 10, f"Đang tải model {model_name}...")

    try:
        os.environ["HF_HOME"] = models_dir
        model = WhisperModel(model_name, device="cpu", compute_type="int8", download_root=models_dir)

        emit_progress("transcribing", 30, "Đang nhận dạng giọng nói...")

        # Transcribe
        transcribe_kwargs = {
            "beam_size": 5,
            "word_timestamps": False,
            "vad_filter": True,
            "vad_parameters": {"min_silence_duration_ms": 500},
        }
        if language:
            transcribe_kwargs["language"] = language

        segments, info = model.transcribe(video_path, **transcribe_kwargs)

        detected_language = info.language if hasattr(info, 'language') else 'unknown'
        emit_progress("transcribing", 50, f"Ngôn ngữ: {detected_language} — Đang xử lý...")

        # Collect segments with progress
        all_segments = []
        for seg in segments:
            all_segments.append(seg)
            # Estimate progress based on audio duration
            if hasattr(info, 'duration') and info.duration > 0:
                progress = min(95, 50 + int((seg.end / info.duration) * 45))
                emit_progress("transcribing", progress, f"Đang xử lý ({format_timestamp(seg.end)})...")

        # Convert to SRT
        srt_content = segments_to_srt(all_segments)

        emit_progress("transcribing", 100, f"Hoàn tất! {len(all_segments)} phân đoạn")
        emit_result(True, srt=srt_content, language=detected_language, segments_count=len(all_segments))

    except Exception as e:
        emit_result(False, error=str(e))

# ─── Main ───

def main():
    parser = argparse.ArgumentParser(description="Whisper Service for VEO")
    subparsers = parser.add_subparsers(dest="command")

    # download-model
    dl_parser = subparsers.add_parser("download-model")
    dl_parser.add_argument("--model", required=True, choices=["tiny", "base", "small", "medium", "large-v3"])
    dl_parser.add_argument("--models-dir", required=True)

    # transcribe
    tr_parser = subparsers.add_parser("transcribe")
    tr_parser.add_argument("--video", required=True)
    tr_parser.add_argument("--model", default="medium")
    tr_parser.add_argument("--models-dir", required=True)
    tr_parser.add_argument("--language", default=None)

    args = parser.parse_args()

    if args.command == "download-model":
        cmd_download_model(args)
    elif args.command == "transcribe":
        cmd_transcribe(args)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
