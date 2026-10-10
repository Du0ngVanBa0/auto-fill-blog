const fields = {
  sheetUrl: document.querySelector("#sheet-url"),
  sheetTab: document.querySelector("#sheet-tab"),
  blogColumn: document.querySelector("#blog-column"),
  titleColumn: document.querySelector("#title-column"),
  imageColumn: document.querySelector("#image-column"),
  rowList: document.querySelector("#row-list"),
  editorUrl: document.querySelector("#editor-url"),
  category: document.querySelector("#category"),
  trafficId: document.querySelector("#traffic-id")
};
const status = document.querySelector("#status");
const readButton = document.querySelector("#read-button");
const fillButton = document.querySelector("#fill-button");
const previewList = document.querySelector("#preview-list");
const previewPanel = document.querySelector("#preview-panel");
const imageFolder = document.querySelector("#image-folder");
const batchResults = document.querySelector("#batch-results");
const defaults = {
  sheetUrl: "",
  sheetTab: "", blogColumn: "", titleColumn: "", imageColumn: "", rowList: "",
  editorUrl: "https://dramastudio.danhngon.pro/admin/posts/new", category: "Entertainment", trafficId: ""
};
const sheetKeys = ["sheetUrl", "sheetTab", "blogColumn", "titleColumn", "imageColumn", "rowList"];
let loaded = [];
let selectedFiles = [];
let busy = false;
let imagesReady = true;
let contentReady = true;
let previewUrls = [];

try {
  const saved = JSON.parse(localStorage.getItem("autoFillBlogConfig") || "{}");
  for (const [key, input] of Object.entries(fields)) {
    input.value = key === "rowList" ? saved.rowList ?? saved.rowNumber ?? defaults.rowList : saved[key] ?? defaults[key];
  }
} catch {
  for (const [key, input] of Object.entries(fields)) input.value = defaults[key];
}

function config() {
  return Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
}

function showStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`;
}

function setBusy(value) {
  busy = value;
  readButton.disabled = value;
  fillButton.disabled = value || !loaded.length || !imagesReady || !contentReady;
  imageFolder.disabled = value;
  for (const input of Object.values(fields)) input.disabled = value;
}

function invalidatePreview() {
  loaded = [];
  contentReady = true;
  fillButton.disabled = true;
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];
  previewList.hidden = true;
  previewPanel.hidden = true;
  previewList.replaceChildren();
  batchResults.replaceChildren();
}

function renderPreview() {
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];
  previewList.replaceChildren();
  imagesReady = true;
  contentReady = true;
  for (const row of loaded) {
    const item = document.createElement("details");
    item.className = "preview-item";
    const summary = document.createElement("summary");
    const number = document.createElement("strong");
    number.textContent = `Hàng ${row.row}`;
    const title = document.createElement("span");
    title.textContent = row.title;
    summary.append(number, title);
    item.append(summary);

    const meta = document.createElement("p");
    meta.className = "preview-meta";
    meta.textContent = `${row.blogCell} → Mô tả · ${row.titleCell} → Tiêu đề · ${row.blog.length.toLocaleString("vi-VN")} ký tự`;
    item.append(meta);
    if (row.contentFilePath) {
      const source = document.createElement("p");
      source.className = `image-match${row.contentError ? " error" : ""}`;
      source.textContent = row.contentError
        ? `${row.blogCell} → ${row.contentError}`
        : `${row.blogCell} → Đã đọc toàn bộ ${row.contentFilePath}`;
      item.append(source);
      if (row.contentError) contentReady = false;
    }
    for (const [index, path] of row.imagePaths.entries()) {
      const image = document.createElement("p");
      image.className = "image-match";
      try {
        const file = matchImageFile(path, selectedFiles);
        image.textContent = `${row.imageCell} · ảnh chương ${index + 1} → ${file.webkitRelativePath || file.name}`;
        const thumbnail = document.createElement("img");
        thumbnail.className = "image-thumbnail";
        thumbnail.alt = `Ảnh chương ${index + 1}, hàng ${row.row}`;
        thumbnail.src = URL.createObjectURL(file);
        previewUrls.push(thumbnail.src);
        item.append(thumbnail);
      } catch (error) {
        imagesReady = false;
        image.classList.add("error");
        image.textContent = `${row.imageCell} · ảnh chương ${index + 1} → ${error.message}`;
      }
      item.append(image);
    }
    if (row.blog) {
      const content = document.createElement("pre");
      content.textContent = row.blog;
      item.append(content);
    }
    previewList.append(item);
  }
  previewList.hidden = !loaded.length;
  previewPanel.hidden = !loaded.length;
  fillButton.disabled = busy || !loaded.length || !imagesReady || !contentReady;
}

function showReadStatus() {
  if (!contentReady) return showStatus(loaded.find(row => row.contentError)?.contentError || "Có file nội dung chưa đọc được.", "error");
  if (!imagesReady) return showStatus("Có ảnh chương chưa khớp đường dẫn. Chọn đúng thư mục ảnh trong Tùy chọn.", "error");
  showStatus(`Đã đọc ${loaded.length} hàng. Kiểm tra danh sách rồi bấm Điền.`, "success");
}

for (const [key, input] of Object.entries(fields)) {
  input.addEventListener("input", () => {
    localStorage.setItem("autoFillBlogConfig", JSON.stringify(config()));
    if (sheetKeys.includes(key)) invalidatePreview();
  });
}

imageFolder.addEventListener("change", () => {
  selectedFiles = [...imageFolder.files];
  document.querySelector("#folder-count").textContent = selectedFiles.length
    ? `Đã chọn ${selectedFiles.length.toLocaleString("vi-VN")} file trong thư mục ảnh.`
    : "Chưa chọn thư mục ảnh.";
  if (loaded.length) renderPreview();
  if (loaded.length) showReadStatus();
});

readButton.addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  showStatus("Đang đọc các hàng từ Google Sheets…");
  try {
    loaded = await resolveContentRows(await readSheetRows(config()));
    renderPreview();
    showReadStatus();
  } catch (error) {
    invalidatePreview();
    showStatus(error.message, "error");
  } finally { setBusy(false); }
});

document.querySelector("#config-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (busy || !loaded.length || !imagesReady) return;
  const settings = config();
  if (!/^\d+$/.test(settings.trafficId)) return showStatus("Traffic ID phải là số, ví dụ 123.", "error");
  if (!settings.category) return showStatus("Nhập danh mục cần chọn.", "error");
  let editorUrl;
  try {
    editorUrl = new URL(settings.editorUrl);
    if (editorUrl.protocol !== "https:" || editorUrl.hostname !== "dramastudio.danhngon.pro") throw new Error();
  } catch { return showStatus("URL trang tạo bài viết không hợp lệ.", "error"); }

  setBusy(true);
  batchResults.replaceChildren();
  let filled = 0;
  let failed = 0;
  for (const row of loaded) {
    const line = document.createElement("p");
    line.className = "batch-row";
    line.textContent = `Hàng ${row.row}: đang chuẩn bị…`;
    batchResults.append(line);
    showStatus(`Đang điền hàng ${row.row} (${filled + failed + 1}/${loaded.length})…`);
    try {
      const chapterImages = await Promise.all(row.imagePaths.map(async path =>
        readImagePayload(matchImageFile(path, selectedFiles))));
      let tab;
      try {
        tab = await retryTabEdit(() => chrome.tabs.create({ url: editorUrl.href, active: true }));
      } catch (error) {
        if (isTabEditLock(error)) throw new Error("Chrome đang khóa thanh tab. Hãy thả tab đang kéo rồi thử lại.");
        throw error;
      }
      await waitForTab(tab.id);
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: "MAIN", func: fillBlogPage,
        args: [{ blog: row.blog, title: row.title, trafficId: settings.trafficId,
          category: settings.category, chapterImages }]
      });
      const result = results[0]?.result;
      if (!result?.ok) throw new Error(result?.error || "Không nhận được kết quả từ trang bài viết.");
      line.classList.add("success");
      line.textContent = `Hàng ${row.row}: đã điền ${result.chapters} chương${chapterImages.length ? `; tải ${chapterImages.length} ảnh vào từng chương` : ""}.`;
      filled++;
    } catch (error) {
      line.classList.add("error");
      line.textContent = `Hàng ${row.row}: ${error.message}`;
      failed++;
    }
  }
  showStatus(`Hoàn tất: ${filled} hàng đã điền, ${failed} hàng lỗi. Kiểm tra từng tab rồi tự bấm Lưu.`,
    failed ? "error" : "success");
  setBusy(false);
});

function isTabEditLock(error) {
  return String(error).includes("Tabs cannot be edited right now");
}

async function retryTabEdit(action) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try { return await action(); }
    catch (error) {
      if (!isTabEditLock(error) || attempt === 19) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

function waitForTab(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("Trang tạo bài viết tải quá lâu.")), 30000);
    function finish(error) {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      if (error) reject(error); else resolve();
    }
    function onUpdated(id, change) { if (id === tabId && change.status === "complete") finish(); }
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId).then(tab => { if (tab.status === "complete") finish(); }).catch(finish);
  });
}
