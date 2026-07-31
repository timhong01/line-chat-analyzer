(function () {
  "use strict";

  const MESSAGE_PAGE_SIZE = 300;
  const state = { messages: [], fileName: "", selectedPeople: new Set(), people: [], metric: "messages", visibleMessageLimit: MESSAGE_PAGE_SIZE };
  const elements = {
    fileInput: document.getElementById("file-input"),
    dropZone: document.getElementById("drop-zone"),
    workspace: document.getElementById("workspace"),
    peopleFilters: document.getElementById("people-filters"),
    keywordSearch: document.getElementById("keyword-search"),
    dateFrom: document.getElementById("date-from"),
    dateTo: document.getElementById("date-to"),
    timeFrom: document.getElementById("time-from"),
    timeTo: document.getElementById("time-to"),
    fileName: document.getElementById("file-name"),
    resultCount: document.getElementById("result-count"),
    resultRange: document.getElementById("result-range"),
    downloadText: document.getElementById("download-text"),
    openAISummary: document.getElementById("open-ai-summary"),
    aiStatus: document.getElementById("ai-status"),
    aiDialog: document.getElementById("ai-dialog"),
    aiPrompt: document.getElementById("ai-prompt"),
    aiCopyStatus: document.getElementById("ai-copy-status"),
    copyAIText: document.getElementById("copy-ai-text"),
    chartSummary: document.getElementById("chart-summary"),
    chartLegend: document.getElementById("chart-legend"),
    timelineSvg: document.getElementById("timeline-svg"),
    metricButtons: document.querySelectorAll("[data-metric]"),
    messageList: document.getElementById("message-list"),
    messagePagination: document.getElementById("message-pagination"),
    messagePaginationStatus: document.getElementById("message-pagination-status"),
    loadMoreMessages: document.getElementById("load-more-messages"),
    emptyState: document.getElementById("empty-state"),
    resetFilters: document.getElementById("reset-filters"),
    emptyReset: document.getElementById("empty-reset")
  };

  function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function formatDate(dateKey) {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Taipei"
    }).format(new Date(`${dateKey}T12:00:00+08:00`));
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadMessages(String(reader.result), file.name);
    reader.readAsText(file, "UTF-8");
  }

  function loadMessages(text, fileName) {
    const messages = window.LineChatParser.parseLineChat(text);
    if (!messages.length) {
      window.alert("找不到可辨識的聊天內容。請確認檔案是 LINE 匯出的文字記錄。");
      return;
    }

    state.messages = messages;
    state.visibleMessageLimit = MESSAGE_PAGE_SIZE;
    state.fileName = fileName;
    state.selectedPeople = new Set(messages.map((message) => message.sender));
    const peopleCounts = new Map();
    messages.forEach((message) => peopleCounts.set(message.sender, (peopleCounts.get(message.sender) || 0) + 1));
    state.people = [...peopleCounts].sort((a, b) => b[1] - a[1]).map(([person]) => person);
    const dates = messages.map((message) => message.date).sort();
    elements.dateFrom.min = elements.dateTo.min = dates[0];
    elements.dateFrom.max = elements.dateTo.max = dates.at(-1);
    elements.dateFrom.value = dates[0];
    elements.dateTo.value = dates.at(-1);
    elements.timeFrom.value = "00:00";
    elements.timeTo.value = "23:59";
    elements.keywordSearch.value = "";
    elements.fileName.textContent = fileName;
    elements.dropZone.hidden = true;
    elements.workspace.hidden = false;
    renderPeopleFilters();
    renderMessages();
  }

  function renderPeopleFilters() {
    const counts = new Map();
    state.messages.forEach((message) => counts.set(message.sender, (counts.get(message.sender) || 0) + 1));
    elements.peopleFilters.innerHTML = state.people
      .map((person, index) => `
        <label class="person-option">
          <input type="checkbox" value="${escapeHtml(person)}" checked>
          <span class="person-dot dot-${(index % 5) + 1}" aria-hidden="true"></span>
          <span class="person-name">${escapeHtml(person)}</span>
          <span class="person-count">${counts.get(person)}</span>
        </label>`).join("");

    elements.peopleFilters.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        input.checked ? state.selectedPeople.add(input.value) : state.selectedPeople.delete(input.value);
        state.visibleMessageLimit = MESSAGE_PAGE_SIZE;
        renderMessages();
      });
    });
  }

  function getFilteredMessages() {
    const dateFrom = elements.dateFrom.value;
    const dateTo = elements.dateTo.value;
    const timeFrom = elements.timeFrom.value || "00:00";
    const timeTo = elements.timeTo.value || "23:59";
    const keyword = elements.keywordSearch.value.trim().toLocaleLowerCase("zh-TW");
    return state.messages.filter((message) =>
      state.selectedPeople.has(message.sender) &&
      (!dateFrom || message.date >= dateFrom) &&
      (!dateTo || message.date <= dateTo) &&
      message.time >= timeFrom && message.time <= timeTo &&
      (!keyword || message.content.toLocaleLowerCase("zh-TW").includes(keyword))
    );
  }

  function renderMessages() {
    const filtered = getFilteredMessages();
    elements.resultCount.textContent = `${filtered.length.toLocaleString("zh-TW")} 則對話`;
    elements.resultRange.textContent = filtered.length
      ? `${formatDate(filtered[0].date)}－${formatDate(filtered.at(-1).date)}`
      : "";
    elements.emptyState.hidden = filtered.length > 0;
    elements.messageList.hidden = filtered.length === 0;
    elements.downloadText.disabled = filtered.length === 0;
    elements.openAISummary.disabled = filtered.length === 0;
    elements.aiStatus.textContent = filtered.length
      ? "先確認內容，再複製並選擇 AI 平台。"
      : "沒有可複製的篩選結果。";
    renderTimelineChart(filtered);

    const visibleMessages = filtered.slice(0, state.visibleMessageLimit);
    elements.messagePagination.hidden = filtered.length <= state.visibleMessageLimit;
    elements.messagePaginationStatus.textContent = `目前顯示 ${visibleMessages.length.toLocaleString("zh-TW")}／${filtered.length.toLocaleString("zh-TW")} 則`;
    let currentDate = "";
    elements.messageList.innerHTML = visibleMessages.map((message) => {
      const dateHeader = message.date !== currentDate
        ? `<div class="date-divider"><span>${formatDate(message.date)}</span></div>`
        : "";
      currentDate = message.date;
      return `${dateHeader}
        <article class="message">
          <time datetime="${message.date}T${message.time}:00+08:00">${message.time}</time>
          <div class="message-body">
            <strong>${escapeHtml(message.sender)}</strong>
            <p>${escapeHtml(message.content).replace(/\n/g, "<br>")}</p>
          </div>
        </article>`;
    }).join("");
  }

  function listDates(from, to) {
    if (!from || !to || from > to) return [];
    const dates = [];
    const cursor = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    while (cursor <= end && dates.length < 2000) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  function niceMaximum(value) {
    if (value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const rounded = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return rounded * magnitude;
  }

  function renderTimelineChart(filtered) {
    const dates = listDates(elements.dateFrom.value, elements.dateTo.value);
    const selectedPeople = state.people.filter((person) => state.selectedPeople.has(person));
    const data = new Map(dates.map((date) => [date, new Map()]));
    const valueFor = state.metric === "characters"
      ? (message) => Array.from(message.content.replace(/\s/gu, "")).length
      : () => 1;

    filtered.forEach((message) => {
      if (!data.has(message.date)) data.set(message.date, new Map());
      const daily = data.get(message.date);
      daily.set(message.sender, (daily.get(message.sender) || 0) + valueFor(message));
    });

    const chartDates = dates.length ? dates : [...data.keys()].sort();
    const totals = chartDates.map((date) =>
      selectedPeople.reduce((total, person) => total + (data.get(date)?.get(person) || 0), 0)
    );
    const maximum = Math.max(4, niceMaximum(Math.max(0, ...totals)));
    const unit = state.metric === "characters" ? "字" : "則";
    const metricLabel = state.metric === "characters" ? "字數" : "訊息量";
    const peak = Math.max(0, ...totals);
    elements.chartSummary.textContent = `最高單日 ${peak.toLocaleString("zh-TW")} ${unit}・依人物堆疊`;
    elements.timelineSvg.setAttribute("aria-label", `每日${metricLabel}堆疊直條圖，最高單日 ${peak} ${unit}`);

    elements.chartLegend.innerHTML = selectedPeople.map((person) => {
      const index = state.people.indexOf(person) % 5 + 1;
      return `<span><i class="legend-${index}" aria-hidden="true"></i>${escapeHtml(person)}</span>`;
    }).join("");

    const width = Math.max(720, chartDates.length * 16 + 72);
    const height = 280;
    const margin = { top: 12, right: 16, bottom: 50, left: 52 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const band = chartDates.length ? plotWidth / chartDates.length : plotWidth;
    const barWidth = Math.max(3, Math.min(12, band * 0.72));
    const labelEvery = Math.max(1, Math.ceil(chartDates.length / 12));
    const svg = [];

    for (let tick = 0; tick <= 4; tick += 1) {
      const value = maximum * tick / 4;
      const y = margin.top + plotHeight - plotHeight * tick / 4;
      svg.push(`<line class="chart-grid" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>`);
      svg.push(`<text class="axis-label" x="${margin.left - 9}" y="${y + 4}" text-anchor="end">${Math.round(value).toLocaleString("zh-TW")}</text>`);
    }

    chartDates.forEach((date, dateIndex) => {
      const x = margin.left + dateIndex * band + (band - barWidth) / 2;
      let yBottom = margin.top + plotHeight;
      selectedPeople.forEach((person) => {
        const value = data.get(date)?.get(person) || 0;
        if (!value) return;
        const barHeight = value / maximum * plotHeight;
        yBottom -= barHeight;
        const colorIndex = state.people.indexOf(person) % 5 + 1;
        svg.push(`<rect class="chart-bar series-${colorIndex}" x="${x}" y="${yBottom}" width="${barWidth}" height="${barHeight}"><title>${date}・${escapeHtml(person)}：${value.toLocaleString("zh-TW")} ${unit}</title></rect>`);
      });
      if (dateIndex % labelEvery === 0 || dateIndex === chartDates.length - 1) {
        const label = `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
        svg.push(`<text class="axis-label" x="${x + barWidth / 2}" y="${height - 26}" text-anchor="end" transform="rotate(-45 ${x + barWidth / 2} ${height - 26})">${label}</text>`);
      }
    });

    if (!filtered.length) {
      svg.push(`<text class="chart-empty" x="${width / 2}" y="${height / 2}" text-anchor="middle">沒有符合條件的資料</text>`);
    }
    elements.timelineSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    elements.timelineSvg.style.width = `${width}px`;
    elements.timelineSvg.innerHTML = svg.join("");
  }

  function downloadFilteredText() {
    const filtered = getFilteredMessages();
    if (!filtered.length) return;

    const text = window.LineChatParser.formatLineChat(filtered);
    const sourceName = state.fileName.replace(/\.txt$/i, "") || "LINE聊天記錄";
    const dateRange = filtered[0].date === filtered.at(-1).date
      ? filtered[0].date.replace(/-/g, "")
      : `${filtered[0].date.replace(/-/g, "")}-${filtered.at(-1).date.replace(/-/g, "")}`;
    const fileName = `${sourceName}_篩選結果_${dateRange}.txt`;
    const url = URL.createObjectURL(new Blob(["\uFEFF", text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function selectPreparedPrompt() {
    elements.aiPrompt.focus();
    elements.aiPrompt.select();
    elements.aiPrompt.setSelectionRange(0, elements.aiPrompt.value.length);
  }

  async function copyPreparedPrompt() {
    const text = elements.aiPrompt.value;
    selectPreparedPrompt();
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        elements.aiCopyStatus.textContent = "已複製。請選擇 AI 平台並按 Command + V。";
        return true;
      } catch (_error) {
        // Continue with the visible textarea fallback.
      }
    }

    const copied = document.execCommand("copy");
    elements.aiCopyStatus.textContent = copied
      ? "已複製。請選擇 AI 平台並按 Command + V。"
      : "瀏覽器阻擋自動複製。文字已全選，請按 Command + C。";
    return copied;
  }

  function prepareAISummary() {
    const filtered = getFilteredMessages();
    if (!filtered.length) return;

    elements.aiPrompt.value = "正在準備篩選內容…";
    elements.aiCopyStatus.textContent = `正在整理 ${filtered.length.toLocaleString("zh-TW")} 則訊息…`;
    elements.copyAIText.disabled = true;
    if (typeof elements.aiDialog.showModal === "function") {
      elements.aiDialog.showModal();
    } else {
      elements.aiDialog.setAttribute("open", "");
    }
    setTimeout(() => {
      elements.aiPrompt.value = window.LineChatParser.formatAISummaryPrompt(filtered);
      elements.aiCopyStatus.textContent = `已準備 ${filtered.length.toLocaleString("zh-TW")} 則訊息。`;
      elements.copyAIText.disabled = false;
      selectPreparedPrompt();
    }, 0);
  }

  function resetFilters() {
    if (!state.messages.length) return;
    state.selectedPeople = new Set(state.messages.map((message) => message.sender));
    elements.peopleFilters.querySelectorAll("input").forEach((input) => { input.checked = true; });
    const dates = state.messages.map((message) => message.date).sort();
    elements.dateFrom.value = dates[0];
    elements.dateTo.value = dates.at(-1);
    elements.timeFrom.value = "00:00";
    elements.timeTo.value = "23:59";
    elements.keywordSearch.value = "";
    state.visibleMessageLimit = MESSAGE_PAGE_SIZE;
    renderMessages();
  }

  elements.fileInput.addEventListener("change", (event) => handleFile(event.target.files[0]));
  ["dragenter", "dragover"].forEach((type) => elements.dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((type) => elements.dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  }));
  elements.dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files[0]));
  elements.dropZone.addEventListener("click", () => elements.fileInput.click());
  [elements.dateFrom, elements.dateTo, elements.timeFrom, elements.timeTo]
    .forEach((input) => input.addEventListener("change", () => {
      state.visibleMessageLimit = MESSAGE_PAGE_SIZE;
      renderMessages();
    }));
  elements.keywordSearch.addEventListener("input", () => {
    state.visibleMessageLimit = MESSAGE_PAGE_SIZE;
    renderMessages();
  });
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.emptyReset.addEventListener("click", resetFilters);
  elements.downloadText.addEventListener("click", downloadFilteredText);
  elements.openAISummary.addEventListener("click", prepareAISummary);
  elements.copyAIText.addEventListener("click", copyPreparedPrompt);
  elements.loadMoreMessages.addEventListener("click", () => {
    state.visibleMessageLimit += MESSAGE_PAGE_SIZE;
    renderMessages();
  });
  elements.metricButtons.forEach((button) => button.addEventListener("click", () => {
    state.metric = button.dataset.metric;
    elements.metricButtons.forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
    renderMessages();
  }));
})();
