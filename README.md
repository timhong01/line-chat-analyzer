# LINE 聊天記錄篩選器

直接用瀏覽器開啟 `index.html`，匯入 LINE 匯出的 `.txt` 聊天記錄。

GitHub Pages 啟用後網址：[https://timhong01.github.io/line-chat-analyzer/](https://timhong01.github.io/line-chat-analyzer/)

支援篩選：

- 人物
- 訊息內容關鍵字
- 開始與結束日期
- 每日開始與結束時間
- 篩選分類可獨立收折，人物清單支援滾動
- 將目前篩選結果下載為 UTF-8 `.txt` 檔
- 依日期查看人物堆疊直條圖，可切換訊息量與字數

## 隱私保護

- 聊天記錄只在使用者的瀏覽器記憶體中處理。
- 程式不會將聊天檔案或解析結果上傳到網路。
- 程式不使用 `localStorage`、遠端資料庫或分析追蹤服務。
- 重整或關閉頁面後，匯入內容與篩選狀態即清除。
- 下載的篩選結果只會儲存在使用者指定的本機位置。
