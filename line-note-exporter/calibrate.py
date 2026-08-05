#!/usr/bin/env python3
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BUILD_DIR = ROOT / ".build"
HELPER = BUILD_DIR / "macos-input"
CONFIG = ROOT / "config.json"


def build_helper():
    BUILD_DIR.mkdir(exist_ok=True)
    source = ROOT / "macos_input.swift"
    if not HELPER.exists() or HELPER.stat().st_mtime < source.stat().st_mtime:
        subprocess.run(["swiftc", str(source), "-o", str(HELPER)], check=True)


def position(label, instruction):
    print(f"\n{label}：{instruction}")
    input("把滑鼠移到指定位置後按 Enter（不要點擊）… ")
    output = subprocess.check_output([str(HELPER), "position"], text=True)
    x, y = (int(value) for value in output.split())
    print(f"記錄座標：{x}, {y}")
    return [x, y]


def main():
    if sys.platform != "darwin":
        raise SystemExit("本工具只支援 macOS。")
    build_helper()
    print("LINE 筆記匯出器校正")
    print("請先固定 LINE 視窗大小，開啟社群的筆記列表，並讓第一篇筆記位於畫面內。")
    first = position("第一篇筆記", "移到第一篇筆記列表項目的中央")
    content = position("正文區", "先手動開啟一篇筆記，再移到可選取正文的文字區")
    back = position("返回按鈕", "移到關閉筆記或返回列表的按鈕")

    print("\n請輸入列表設定。第一次建議只跑 3 篇。")
    row_step = int(input("每篇筆記列表項目的垂直距離（預設 86）：") or "86")
    rows_per_page = int(input("單頁可點擊的筆記數（預設 6）：") or "6")
    scroll_amount = int(input("換頁捲動量，向下使用負數（預設 -5）：") or "-5")
    config = {
        "app_name": "LINE",
        "coordinates": {"first_note": first, "content": content, "back": back},
        "list": {
            "row_step": row_step,
            "rows_per_page": rows_per_page,
            "scroll_amount": scroll_amount,
        },
        "timing_seconds": {"open": 1.8, "copy": 0.8, "back": 0.8, "scroll": 1.2},
    }
    CONFIG.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n設定已儲存：{CONFIG}")
    print("下一步：python3 export_notes.py --count 3 --dry-run")


if __name__ == "__main__":
    main()
