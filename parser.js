(function (root) {
  "use strict";

  const DATE_LINE = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s+.*)?$/;
  const MESSAGE_LINE = /^(\d{1,2}):(\d{2})\s+(.+)$/;

  function toDateKey(year, month, day) {
    return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  }

  function deriveSpeakerCandidates(lines) {
    const candidates = new Set();
    const bracketedCounts = new Map();
    const prefixStats = new Map();

    function stripRecallSuffix(value) {
      return value.replace(/已收回訊息$/u, "").trim();
    }

    lines.forEach((line) => {
      const match = line.match(MESSAGE_LINE);
      if (!match) return;
      const rest = match[3].trim();

      if (rest.includes("\t")) {
        const sender = rest.split("\t")[0].trim();
        if (sender) candidates.add(sender);
      }

      const repeated = rest.match(/^(.{1,60}?)\s+\1(?:已|新增|將|收回)/u);
      if (repeated) candidates.add(repeated[1].trim());

      const bracketed = rest.match(/^(.{1,60}?[）)])(?=\s|已|收回|$)/u);
      if (bracketed) {
        const name = bracketed[1].trim();
        if (name.includes("（") && name.split(/\s+/u).length <= 3) {
          bracketedCounts.set(name, (bracketedCounts.get(name) || 0) + 1);
        }
      }

      const added = rest.match(/已新增(.+?)至群組/u);
      if (added) {
        added[1].split(/[,，、]/u).map((name) => name.trim()).filter(Boolean).forEach((name) => candidates.add(name));
      }

      if (!rest.includes("\t")) {
        const parts = rest.split(/\s+/u);
        const first = stripRecallSuffix(parts[0] || "");
        const second = stripRecallSuffix(parts[1] || "");
        if (first && !first.includes(":") && !/^[–—-]/u.test(first)) {
          if (!prefixStats.has(first)) prefixStats.set(first, { count: 0, seconds: new Map() });
          const stats = prefixStats.get(first);
          stats.count += 1;
          if (second) stats.seconds.set(second, (stats.seconds.get(second) || 0) + 1);
        }
      }
    });

    bracketedCounts.forEach((count, name) => {
      if (count >= 2) candidates.add(name);
    });

    prefixStats.forEach((stats, first) => {
      if (stats.count < 2) return;
      const dominantSecond = [...stats.seconds.entries()].sort((a, b) => b[1] - a[1])[0];
      if (dominantSecond && dominantSecond[1] / stats.count >= 0.8) {
        candidates.add(`${first} ${dominantSecond[0]}`);
      } else {
        candidates.add(first);
      }
    });

    return [...candidates].sort((a, b) => b.length - a.length);
  }

  function splitSenderAndContent(rest, candidates) {
    if (rest.includes("\t")) {
      const parts = rest.split("\t");
      return { sender: parts.shift().trim(), content: parts.join("\t").trim() };
    }

    const sender = candidates.find((name) =>
      rest === name || rest.startsWith(`${name} `) || rest.startsWith(`${name}已`) || rest.startsWith(`${name}收回`)
    );

    if (sender) {
      const tail = rest.slice(sender.length).trim();
      return { sender, content: tail || "（系統訊息）" };
    }

    if (rest === "已收回訊息") return { sender: "系統訊息", content: rest };
    return null;
  }

  function parseLineChat(text) {
    const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
    const candidates = deriveSpeakerCandidates(lines);
    const messages = [];
    let currentDate = null;
    let currentMessage = null;

    lines.forEach((rawLine) => {
      const line = rawLine.trimEnd();
      const dateMatch = line.trim().match(DATE_LINE);
      if (dateMatch) {
        currentDate = toDateKey(dateMatch[1], dateMatch[2], dateMatch[3]);
        currentMessage = null;
        return;
      }

      const messageMatch = line.match(MESSAGE_LINE);
      if (messageMatch && currentDate) {
        const hour = String(messageMatch[1]).padStart(2, "0");
        const minute = messageMatch[2];
        const parsed = splitSenderAndContent(messageMatch[3].trim(), candidates);
        if (!parsed) {
          if (currentMessage) currentMessage.content += `\n${hour}:${minute} ${messageMatch[3].trim()}`;
          return;
        }
        currentMessage = {
          id: messages.length + 1,
          date: currentDate,
          time: `${hour}:${minute}`,
          sender: parsed.sender,
          content: parsed.content
        };
        messages.push(currentMessage);
        return;
      }

      if (currentMessage && line.length > 0) {
        currentMessage.content += `\n${line}`;
      }
    });

    return messages;
  }

  function formatLineChat(messages) {
    let currentDate = "";
    const lines = [];

    messages.forEach((message) => {
      if (message.date !== currentDate) {
        if (lines.length) lines.push("");
        currentDate = message.date;
        lines.push(message.date.replace(/-/g, "."));
      }
      lines.push(`${message.time} ${message.sender} ${message.content}`);
    });

    return `${lines.join("\n")}\n`;
  }

  function formatAISummaryPrompt(messages) {
    return `請分析以下 LINE 對話，並以繁體中文回答：

1. 摘要主要議題與結論
2. 列出待辦事項、負責人與時間
3. 找出尚未獲得回覆的問題
4. 整理重要決策與風險

篩選結果共 ${messages.length} 則訊息。

--- 對話開始 ---
${formatLineChat(messages)}--- 對話結束 ---`;
  }

  const api = { parseLineChat, formatLineChat, formatAISummaryPrompt };
  root.LineChatParser = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
