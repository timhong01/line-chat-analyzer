# LINE 聊天記錄分析器

在瀏覽器中匯入 LINE 匯出的 `.txt` 聊天記錄，依人物、關鍵字、日期與時間篩選，查看每日趨勢並匯出結果。

GitHub Pages 啟用後網址：[https://timhong01.github.io/line-chat-analyzer/](https://timhong01.github.io/line-chat-analyzer/)

## 主要功能

| 功能 | 說明 |
|---|---|
| 本機匯入 | 支援選取或拖放 LINE `.txt` 聊天記錄 |
| 多條件篩選 | 人物、訊息關鍵字、開始與結束日期、每日時間區間 |
| 收折與滾動 | 各類篩選可獨立收折；大量人物選項可在清單內滾動 |
| 對話檢視 | 依日期分組，保留時間、人物及多行訊息 |
| 大量資料 | 每次載入 300 則訊息，避免大型聊天室拖慢頁面 |
| 時間序列圖 | X 軸為日期，依人物堆疊；可切換訊息量與字數 |
| TXT 匯出 | 下載目前所有篩選條件產生的 UTF-8 文字檔 |
| AI 輔助 | 複製篩選內容與分析提示，並選擇主流 AI 平台 |

## 使用方式

1. 在 LINE 聊天室匯出聊天記錄 `.txt`。
2. 開啟本工具，點選「匯入聊天記錄」或將檔案拖入頁面。
3. 設定人物、關鍵字、日期與每日時間區間。
4. 查看篩選後的訊息與每日堆疊圖。
5. 選擇下載 TXT，或複製內容後交給 AI 平台分析。

所有篩選條件會同步套用到：

- 對話列表
- 訊息總數
- 每日堆疊圖
- TXT 下載內容
- AI 總結複製內容

## 讓 AI 幫我總結

按下「讓 AI 幫我總結」後，工具會：

1. 將目前篩選結果整理成文字。
2. 加入摘要、待辦、未回覆問題、決策與風險的分析提示。
3. 在畫面中顯示完整文字，讓使用者先確認。
4. 使用者點「複製內容」。若瀏覽器阻擋剪貼簿，仍可在文字框按 `Command + C`。
5. 使用者選擇 ChatGPT、Claude、Gemini、Microsoft Copilot 或 Perplexity，再按 `Command + V` 貼上。

資料不會因為開啟 AI 平台而自動送出。使用者貼上並送出後，資料才會傳送給所選平台。

## 隱私與資料流向

| 資料 | 儲存或處理位置 |
|---|---|
| 原始聊天檔案 | 使用者自己的裝置 |
| 解析後訊息 | 目前瀏覽器記憶體 |
| 篩選條件 | 目前瀏覽器記憶體 |
| 匯出的 TXT | 使用者指定的下載位置 |
| AI 總結內容 | 使用者貼上並送出後才傳送給所選平台 |

- 程式沒有聊天檔案上傳 API。
- 程式不使用 `localStorage`、遠端資料庫或分析追蹤服務。
- 重整或關閉頁面後，匯入內容與篩選狀態會清除。
- GitHub Pages 只提供 HTML、CSS 與 JavaScript 靜態檔案。

## 支援的聊天格式

預期格式與 LINE 匯出的文字記錄相近：

```text
2026.07.31 星期五
09:00 使用者A 第一則訊息
09:05 使用者B 第二則訊息
接續的多行內容
```

支援項目：

- `YYYY.MM.DD`、`YYYY/MM/DD` 或 `YYYY-MM-DD` 日期標頭
- `HH:mm` 時間格式
- 空白或 Tab 分隔的人物與訊息
- 多行訊息內容
- LINE 系統訊息、貼圖、圖片及檔案名稱文字

## 已知限制

- LINE 記事本正文、留言與附件不會包含在一般聊天記錄 TXT 中。
- 圖片、影片與貼圖只會依 LINE 匯出的文字標記顯示。
- 不同語言、裝置或 LINE 版本可能產生不同匯出格式。
- 人物辨識使用文字格式與重複名稱判斷；特殊名稱可能需要後續調整。
- 空白分隔格式會依重複前綴推斷一字或多字人物名稱。
- AI 平台需要使用者自行貼上並送出內容。

## 本機執行

本專案沒有套件依賴與建置步驟。

```bash
git clone https://github.com/timhong01/line-chat-analyzer.git
cd line-chat-analyzer
open index.html
```

也可以啟動簡易靜態伺服器：

```bash
python3 -m http.server 8000
```

然後開啟 `http://localhost:8000`。

## GitHub Pages 設定

1. 進入 repository 的 `Settings`。
2. 選擇 `Pages`。
3. 在 `Build and deployment` 選擇 `Deploy from a branch`。
4. Branch 選擇 `main`，資料夾選擇 `/ (root)`。
5. 儲存後等待 GitHub 完成部署。

## 專案結構

```text
line-chat-analyzer/
├── index.html   # 介面與控制元件
├── styles.css   # 響應式版面與圖表樣式
├── parser.js    # LINE 記錄解析與文字輸出
├── app.js       # 篩選、圖表、下載及 AI 平台操作
└── README.md
```

## 基本檢查

```bash
node --check parser.js
node --check app.js
git diff --check
```
