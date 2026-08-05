# LINE 社群筆記 macOS 匯出器

用滑鼠座標、鍵盤複製及 macOS 剪貼簿，逐篇備份目前帳號有權限閱讀的 LINE 社群筆記。

## 自動化範圍

| 項目 | 第一版支援 |
|---|---|
| 逐篇開啟與返回 | 支援 |
| 展開正文 | 依 LINE 畫面；需要正文原本可完整選取 |
| 文字輸出 | Markdown |
| 重複偵測 | SHA-256 |
| 空白與失敗紀錄 | JSONL |
| 圖片、影片及留言 | 尚未支援 |
| LINE 內部資料庫 | 不讀取 |

## 安全設計

- 工具只模擬滑鼠、鍵盤及讀取剪貼簿。
- 不讀取或修改 LINE 資料庫。
- 不傳送內容到網路。
- `output/`、`logs/`、`config.json` 由 Git 排除。
- 執行時建立 `STOP` 檔案，或把滑鼠移到螢幕左上角，即可停止。

## 首次設定

1. 固定 LINE 視窗大小及位置。
2. 開啟目標社群的筆記列表。
3. 執行：

```bash
cd line-note-exporter
python3 calibrate.py
```

4. macOS 詢問權限時，前往「系統設定 → 隱私權與安全性 → 輔助使用」，允許目前使用的 Terminal 或 Codex。
5. 依畫面提示記錄第一篇筆記、正文區及返回按鈕座標。

## 測試與正式執行

先測試點擊 3 篇，不寫入內容：

```bash
python3 export_notes.py --count 3 --dry-run
```

確認每次都能正確開啟及返回後，正式擷取 3 篇：

```bash
python3 export_notes.py --count 3
```

成功後再逐步增加：

```bash
python3 export_notes.py --count 30
```

緊急停止：

```bash
touch STOP
```

## 輸出

```text
line-note-exporter/
├── output/  # 私密筆記 Markdown，不進 Git
├── logs/    # 每篇成功、空白或重複狀態，不進 Git
└── config.json # 本機畫面座標，不進 Git
```

## 限制

- 執行期間不要操作滑鼠或鍵盤。
- 視窗移動、縮放或 LINE 更新介面後，需要重新校正。
- `Command-A` 必須能在正文區選取完整文字；部分 WebView 可能只複製可見區域。
- 換頁捲動量與每頁筆記數需依實際畫面調整。
- 第一次只跑 3 篇，檢查 Markdown 是否完整，再批次執行。
