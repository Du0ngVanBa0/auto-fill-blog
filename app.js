const fields = {
  sheetUrl: document.querySelector("#sheet-url"),
  sheetTab: document.querySelector("#sheet-tab"),
  blogColumn: document.querySelector("#blog-column"),
  titleColumn: document.querySelector("#title-column"),
  rowList: document.querySelector("#row-list"),
  editorUrl: document.querySelector("#editor-url"),
  category: document.querySelector("#category"),
  trafficId: document.querySelector("#traffic-id")
};
const status = document.querySelector("#status");
const readButton = document.querySelector("#read-button");
const previewList = document.querySelector("#preview-list");
const previewPanel = document.querySelector("#preview-panel");
const rowQueue = document.querySelector("#row-queue");
const rowFeedback = document.querySelector("#row-feedback");
const defaults = {
  sheetUrl: "",
  sheetTab: "", blogColumn: "", titleColumn: "", rowList: "",
  editorUrl: "https://dramastudio.danhngon.pro/admin/posts/new",
  category: "Entertainment", trafficId: ""
};
const sheetKeys = ["sheetUrl", "sheetTab", "blogColumn", "titleColumn", "rowList"];
let loaded = [];
const rowEntries = new Map();
let busy = false;

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

function selectedRows() {
  return [...rowQueue.children].filter(element =>
    rowEntries.get(Number(element.dataset.row))?.checkbox.checked).map(element => Number(element.dataset.row));
}

function makeRowEntry(row) {
  const element = document.createElement("div");
  element.className = "row-entry";
  element.dataset.row = row;
  const label = document.createElement("label");
  label.className = "row-check";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  label.append(checkbox, `Hàng ${row}`);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "row-image";
  fileInput.setAttribute("aria-label", `Ảnh đại diện hàng ${row}`);
  fileInput.tabIndex = -1;
  const dropZone = document.createElement("button");
  dropZone.type = "button";
  dropZone.className = "row-drop";
  dropZone.setAttribute("aria-label", `Thả hoặc chọn ảnh đại diện hàng ${row}`);
  const dropLabel = document.createElement("span");
  dropLabel.className = "row-drop-label";
  dropLabel.textContent = "Thả ảnh vào đây hoặc bấm chọn";
  dropZone.append(dropLabel);
  const thumbnail = document.createElement("img");
  thumbnail.className = "row-thumb";
  thumbnail.alt = `Ảnh hàng ${row}`;
  thumbnail.hidden = true;
  let imageUrl = null;
  const entry = { element, checkbox, fileInput, file: null,
    release: () => imageUrl && URL.revokeObjectURL(imageUrl) };
  function selectFile(file) {
    if (!file) return;
    try { validateImageFile(file); }
    catch (error) { showStatus(`Hàng ${row}: ${error.message}`, "error"); return; }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    entry.file = file;
    imageUrl = URL.createObjectURL(file);
    element.classList.add("has-image");
    dropLabel.textContent = `${file.name} · bấm để đổi`;
    dropZone.title = file.name;
    thumbnail.src = imageUrl;
    thumbnail.hidden = false;
    if (loaded.length) renderPreview();
  }
  checkbox.addEventListener("change", () => {
    element.classList.toggle("is-off", !checkbox.checked);
    invalidatePreview();
  });
  fileInput.addEventListener("change", () => selectFile(fileInput.files[0]));
  dropZone.addEventListener("click", () => {
    if (busy) return;
    fileInput.value = "";
    fileInput.click();
  });
  dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    if (busy) return;
    event.dataTransfer.dropEffect = "copy";
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
    if (busy) return;
    if (event.dataTransfer.files.length !== 1) {
      showStatus(`Hàng ${row}: chỉ thả một ảnh mỗi lần.`, "error");
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  });
  element.append(label, dropZone, fileInput, thumbnail);
  return entry;
}

function renderRowQueue() {
  let numbers;
  try { numbers = parseRowList(fields.rowList.value); }
  catch (error) {
    if (!fields.rowList.value.trim()) numbers = [];
    else {
      rowFeedback.textContent = error.message;
      rowFeedback.hidden = false;
      return;
    }
  }
  rowFeedback.hidden = true;
  const wanted = new Set(numbers);
  for (const [row, entry] of rowEntries) {
    if (!wanted.has(row)) { entry.release(); rowEntries.delete(row); }
  }
  for (const row of numbers) if (!rowEntries.has(row)) rowEntries.set(row, makeRowEntry(row));
  rowQueue.replaceChildren(...numbers.map(row => rowEntries.get(row).element));
  rowQueue.hidden = !numbers.length;
}

function showStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`;
}

function setBusy(value) {
  busy = value;
  readButton.disabled = value;
  for (const button of previewList.querySelectorAll(".row-fill-button")) {
    button.disabled = value || button.dataset.contentError === "true";
  }
  for (const input of rowQueue.querySelectorAll("input, button")) input.disabled = value;
  for (const input of Object.values(fields)) input.disabled = value;
}

function invalidatePreview() {
  loaded = [];
  showStatus("");
  previewList.hidden = true;
  previewPanel.hidden = true;
  previewList.replaceChildren();
}

function renderPreview() {
  previewList.replaceChildren();
  for (const row of loaded) {
    const item = document.createElement("div");
    item.className = "preview-item";
    const details = document.createElement("details");
    details.className = "preview-details";
    const summary = document.createElement("summary");
    const number = document.createElement("strong");
    number.textContent = `Hàng ${row.row}`;
    const title = document.createElement("span");
    title.textContent = row.title;
    summary.append(number, title);
    details.append(summary);

    const meta = document.createElement("p");
    meta.className = "preview-meta";
    meta.textContent = `${row.blogCell} → Mô tả · ${row.titleCell} → Tiêu đề · ${row.blog.length.toLocaleString("vi-VN")} ký tự`;
    details.append(meta);
    if (row.contentFilePath) {
      const source = document.createElement("p");
      source.className = `image-match${row.contentError ? " error" : ""}`;
      source.textContent = row.contentError
        ? `${row.blogCell} → ${row.contentError}`
        : `${row.blogCell} → Đã đọc toàn bộ ${row.contentFilePath}`;
      details.append(source);
    }
    const file = rowEntries.get(row.row)?.file;
    if (file) {
      const image = document.createElement("p");
      image.className = "image-match";
      image.textContent = `Ảnh đại diện → ${file.name}`;
      details.append(image);
    }
    if (row.blog) {
      const content = document.createElement("pre");
      content.textContent = row.blog;
      details.append(content);
    }
    const fill = document.createElement("button");
    fill.type = "button";
    fill.className = "button primary row-fill-button";
    fill.textContent = "Điền";
    fill.setAttribute("aria-label", `Điền hàng ${row.row}`);
    fill.dataset.contentError = String(Boolean(row.contentError));
    fill.disabled = busy || Boolean(row.contentError);
    const result = document.createElement("p");
    result.className = "row-result";
    result.setAttribute("role", "status");
    result.hidden = true;
    fill.addEventListener("click", () => fillSingleRow(row, result));
    item.append(details, fill, result);
    previewList.append(item);
  }
  previewList.hidden = !loaded.length;
  previewPanel.hidden = !loaded.length;
}

function showReadStatus() {
  const unavailable = loaded.filter(row => row.contentError).length;
  showStatus(`Đã đọc ${loaded.length} hàng. Bấm Điền ở hàng cần làm.${unavailable ? ` ${unavailable} hàng có file nội dung chưa đọc được.` : ""}`,
    unavailable ? "error" : "success");
}

for (const [key, input] of Object.entries(fields)) {
  input.addEventListener("input", () => {
    localStorage.setItem("autoFillBlogConfig", JSON.stringify(config()));
    if (sheetKeys.includes(key)) invalidatePreview();
    if (key === "rowList") renderRowQueue();
  });
}
renderRowQueue();

readButton.addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  showStatus("Đang đọc các hàng từ Google Sheets…");
  try {
    parseRowList(fields.rowList.value);
    const rows = selectedRows();
    if (!rows.length) throw new Error("Chọn ít nhất một hàng để đọc.");
    loaded = await resolveContentRows(await readSheetRows({ ...config(), rowList: rows.join(",") }));
    renderPreview();
    showReadStatus();
  } catch (error) {
    invalidatePreview();
    showStatus(error.message, "error");
  } finally { setBusy(false); }
});

document.querySelector("#config-form").addEventListener("submit", event => event.preventDefault());

async function fillSingleRow(row, resultLine) {
  if (busy || row.contentError || !loaded.includes(row)) return;
  const settings = config();
  if (!/^\d+$/.test(settings.trafficId)) return showStatus("Traffic ID phải là số, ví dụ 123.", "error");
  if (!settings.category) return showStatus("Nhập danh mục cần chọn.", "error");
  let editorUrl;
  try {
    editorUrl = new URL(settings.editorUrl);
    if (!/^https?:$/.test(editorUrl.protocol) || !editorUrl.hostname || editorUrl.username || editorUrl.password) throw new Error();
  } catch { return showStatus("URL trang tạo bài viết không hợp lệ.", "error"); }

  setBusy(true);
  resultLine.hidden = false;
  resultLine.className = "row-result";
  resultLine.textContent = `Hàng ${row.row}: đang mở tab…`;
  showStatus(`Đang điền hàng ${row.row}…`);
  try {
    if (!await chrome.permissions.request({ origins: [`${editorUrl.origin}/*`] })) {
      throw new Error(`Chưa được cấp quyền điền vào ${editorUrl.hostname}. Hãy cho phép Chrome truy cập trang này rồi thử lại.`);
    }
    const file = rowEntries.get(row.row)?.file;
    const image = file ? await readImagePayload(file) : null;
    const listUrl = new URL(editorUrl.href);
    if (/\/new\/?$/.test(listUrl.pathname)) {
      listUrl.pathname = listUrl.pathname.replace(/\/new\/?$/, "");
      listUrl.search = "";
      listUrl.hash = "";
    }
    let tab;
    try { tab = await retryTabEdit(() => chrome.tabs.create({ url: listUrl.href, active: true })); }
    catch (error) {
      if (isTabEditLock(error)) throw new Error("Chrome đang khóa thanh tab. Hãy thả tab đang kéo rồi thử lại.");
      throw error;
    }
    const openedAt = performance.now();
    resultLine.textContent = `Hàng ${row.row}: đang chờ trang tạo và biểu mẫu; có thể đóng tab để dừng.`;
    let result;
    let readyAt = openedAt;
    for (;;) {
      await waitForEditorReady(tab.id, editorUrl);
      readyAt = performance.now();
      resultLine.textContent = `Hàng ${row.row}: biểu mẫu đã hiện sau ${Math.round((readyAt - openedAt) / 1000)} giây; đang điền…`;
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id }, world: "MAIN", func: fillBlogPage,
          args: [{ blog: row.blog, title: row.title, trafficId: settings.trafficId,
            category: settings.category, image }]
        });
        result = results[0]?.result;
        if (!result?.ok) throw new Error(result?.error || "Không nhận được kết quả từ trang bài viết.");
        break;
      } catch (error) {
        if (!isFrameRemoved(error)) throw error;
        await chrome.tabs.get(tab.id);
      }
    }
    resultLine.classList.add("success");
    resultLine.textContent = `Hàng ${row.row}: đã điền ${result.chapters} chương${image ? `; ảnh đại diện ${image.name}` : ""} ` +
      `(mở trang ${Math.round((readyAt - openedAt) / 1000)} giây, điền ${Math.round((performance.now() - readyAt) / 1000)} giây). Kiểm tra tab rồi tự bấm Lưu.`;
    showStatus(`Hàng ${row.row} đã điền. Kiểm tra tab rồi tự bấm Lưu.`, "success");
  } catch (error) {
    resultLine.classList.add("error");
    resultLine.textContent = `Hàng ${row.row}: ${isMissingTab(error) ? "Đã dừng vì tab được đóng." : error.message}`;
    showStatus(resultLine.textContent, "error");
  } finally { setBusy(false); }
}

function isTabEditLock(error) {
  return String(error).includes("Tabs cannot be edited right now");
}

function isFrameRemoved(error) {
  return /Frame with ID \d+ was removed/i.test(String(error));
}

function isMissingTab(error) {
  return /No tab with id/i.test(String(error));
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

async function waitForEditorForm(targetPath) {
  const listPath = targetPath.replace(/\/new$/, "");
  let openedFromList = false;
  for (;;) {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path !== targetPath && path !== listPath) return "route-changed";
    if (path === targetPath && document.querySelector("form.post-editor-form")) return "ready";
    if (!openedFromList) {
      const create = [...document.querySelectorAll("button")].find(button =>
        button.textContent.replace(/\s+/g, " ").trim() === "Bài viết mới" &&
        (button.checkVisibility
          ? button.checkVisibility({ checkVisibilityCSS: true })
          : button.getClientRects().length > 0));
      if (create) {
        openedFromList = true;
        create.click();
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function waitForEditorReady(tabId, editorUrl) {
  const targetPath = editorUrl.pathname.replace(/\/+$/, "") || "/";
  const listPath = targetPath.replace(/\/new$/, "");
  for (;;) {
    const tab = await chrome.tabs.get(tabId);
    const tabUrl = new URL(tab.url || "about:blank");
    const tabPath = tabUrl.pathname.replace(/\/+$/, "") || "/";
    if (/\/login(?:\/|$)/i.test(tabPath)) {
      throw new Error("Trang đã chuyển về màn hình đăng nhập. Hãy đăng nhập rồi thử lại.");
    }
    if (tabUrl.origin === editorUrl.origin && (tabPath === targetPath || tabPath === listPath)) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId }, world: "ISOLATED", injectImmediately: true, func: waitForEditorForm,
          args: [targetPath]
        });
        const state = results[0]?.result;
        if (state === "ready") return;
      } catch (error) {
        if (isMissingTab(error)) throw error;
        if (!isFrameRemoved(error) && tab.status !== "loading") throw error;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
