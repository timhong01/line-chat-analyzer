#!/usr/bin/env python3
import argparse
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config.json"
BUILD_DIR = ROOT / ".build"
HELPER = BUILD_DIR / "macos-input"
OUTPUT_DIR = ROOT / "output"
LOG_DIR = ROOT / "logs"
STOP_FILE = ROOT / "STOP"


def run(*args):
    subprocess.run([str(HELPER), *map(str, args)], check=True)


def click(point):
    run("click", point[0], point[1])


def clipboard():
    return subprocess.check_output(["pbpaste"], text=True, errors="replace")


def activate_line(app_name):
    script = f'tell application "{app_name.replace(chr(34), "")}" to activate'
    subprocess.run(["osascript", "-e", script], check=True)


def safe_filename(index, text):
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "untitled")
    cleaned = "".join(char if char.isalnum() or char in "-_ " else "_" for char in first_line)
    return f"{index:04d}-{cleaned[:60].strip() or 'untitled'}.md"


def write_note(index, text):
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    body = f"---\nsource: LINE note UI\nsequence: {index}\ncaptured_at: {timestamp}\nsha256: {digest}\n---\n\n{text.rstrip()}\n"
    path = OUTPUT_DIR / safe_filename(index, text)
    path.write_text(body, encoding="utf-8")
    return path, digest


def main():
    parser = argparse.ArgumentParser(description="以 macOS 點擊與剪貼簿批次備份 LINE 社群筆記")
    parser.add_argument("--count", type=int, required=True, help="本次要擷取的筆記數")
    parser.add_argument("--start", type=int, default=1, help="輸出序號起點，預設 1")
    parser.add_argument("--dry-run", action="store_true", help="只移動與點擊，不複製或寫檔")
    args = parser.parse_args()
    if sys.platform != "darwin":
        raise SystemExit("本工具只支援 macOS。")
    if args.count < 1:
        raise SystemExit("--count 必須大於 0。")
    if not CONFIG_PATH.exists() or not HELPER.exists():
        raise SystemExit("請先執行 python3 calibrate.py。")

    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    coords = config["coordinates"]
    listing = config["list"]
    timing = config["timing_seconds"]
    OUTPUT_DIR.mkdir(exist_ok=True)
    LOG_DIR.mkdir(exist_ok=True)
    STOP_FILE.unlink(missing_ok=True)
    log_path = LOG_DIR / f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}.jsonl"
    seen = set()
    results = {"saved": 0, "empty": 0, "duplicate": 0, "dry_run": 0}

    print("3 秒後開始。建立 STOP 檔案或把滑鼠移到螢幕左上角可停止。")
    print(f"touch '{STOP_FILE}'")
    time.sleep(3)
    activate_line(config["app_name"])

    with log_path.open("a", encoding="utf-8") as log:
        for offset in range(args.count):
            if STOP_FILE.exists():
                print("偵測到 STOP，安全停止。")
                break
            mouse_x, mouse_y = map(int, subprocess.check_output([str(HELPER), "position"], text=True).split())
            if mouse_x <= 5 and mouse_y <= 5:
                print("滑鼠位於左上角，安全停止。")
                break

            row = offset % listing["rows_per_page"]
            note_point = [coords["first_note"][0], coords["first_note"][1] + row * listing["row_step"]]
            click(note_point)
            time.sleep(timing["open"])

            status = "dry_run"
            path = None
            digest = None
            if not args.dry_run:
                subprocess.run(["pbcopy"], input="", text=True, check=True)
                click(coords["content"])
                run("copy-all")
                time.sleep(timing["copy"])
                text = clipboard().strip()
                if not text:
                    status = "empty"
                else:
                    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
                    if digest in seen:
                        status = "duplicate"
                    else:
                        seen.add(digest)
                        path, digest = write_note(args.start + offset, text)
                        status = "saved"
            results[status] += 1
            event = {"sequence": args.start + offset, "status": status,
                     "file": str(path) if path else None, "sha256": digest}
            log.write(json.dumps(event, ensure_ascii=False) + "\n")
            log.flush()
            print(f"[{offset + 1}/{args.count}] {status}" + (f": {path.name}" if path else ""))

            click(coords["back"])
            time.sleep(timing["back"])
            if (offset + 1) % listing["rows_per_page"] == 0 and offset + 1 < args.count:
                click(coords["first_note"])
                run("escape")
                run("scroll", listing["scroll_amount"])
                time.sleep(timing["scroll"])

    print("完成：" + "、".join(f"{key}={value}" for key, value in results.items()))
    print(f"紀錄：{log_path}")


if __name__ == "__main__":
    main()
