async function fillBlogPage({ blog, title, trafficId, category, chapterImages = [] }) {
  let step = "mở biểu mẫu";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const text = element => element?.textContent?.replace(/\s+/g, " ").trim() || "";
  const visible = element => !!element && element.getClientRects().length > 0;
  const controls = "input, textarea, select, button, [role='combobox']";

  async function waitFor(getValue, timeout = 20000) {
    const end = Date.now() + timeout;
    let value;
    while (Date.now() < end) {
      if (location.pathname === "/login") throw new Error("Trang đã chuyển về màn hình đăng nhập. Hãy đăng nhập rồi thử lại.");
      value = getValue();
      if (value && (!Array.isArray(value) || value.length > 0)) return value;
      await sleep(250);
    }
    throw new Error(`Không tìm thấy ${step} trên trang.`);
  }

  function findLabel(pattern) {
    const matches = [...document.querySelectorAll("label, span, div, p")]
      .filter(element => visible(element) && pattern.test(text(element)));
    return matches.find(element => element.tagName === "LABEL") ||
      matches.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0];
  }

  function fieldControl(pattern) {
    const labels = [...document.querySelectorAll("label, span, div, p")]
      .filter(element => visible(element) && pattern.test(text(element)))
      .sort((a, b) => (a.tagName === "LABEL" ? -1 : 0) - (b.tagName === "LABEL" ? -1 : 0) ||
        a.querySelectorAll("*").length - b.querySelectorAll("*").length);
    for (const label of labels) {
      const linked = label.getAttribute("for") && document.getElementById(label.getAttribute("for"));
      if (linked) return linked;
      let container = label;
      for (let depth = 0; depth < 3 && container && !container.matches("body, html, main, form, nav, aside"); depth++, container = container.parentElement) {
        const found = [...container.querySelectorAll(controls)].find(visible);
        if (found) return found;
      }
    }
    return null;
  }

  function findButton(pattern) {
    return [...document.querySelectorAll("button, [role='button']")]
      .find(button => visible(button) && pattern.test(text(button)));
  }

  function setValue(input, value) {
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!setter) throw new Error("Không thể điền ô nhập liệu.");
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function addId(value) {
    const trimmed = value.trim();
    return trimmed.endsWith(` ${trafficId}`) ? trimmed : `${trimmed} ${trafficId}`;
  }

  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  async function fillEditor() {
    const target = await waitFor(() => {
      const editors = Object.values(window.tinymce?.editors || {});
      const editor = editors.find(item => item.initialized && item.getBody?.() && visible(item.getContainer?.()));
      if (editor) return { editor };
      const iframeBody = [...document.querySelectorAll("iframe")]
        .map(frame => { try { return frame.contentDocument?.body; } catch { return null; } })
        .find(body => body?.isContentEditable);
      const editable = iframeBody || [...document.querySelectorAll("[contenteditable='true']")].find(visible);
      return editable ? { editable } : null;
    }, 12000);
    if (target.editor) {
      const html = blog.replace(/\r\n?/g, "\n").split("\n")
        .map(line => `<p>${line ? escapeHtml(line) : "&nbsp;"}</p>`).join("");
      target.editor.setContent(html);
      target.editor.save();
      target.editor.fire("input");
      target.editor.fire("change");
      return;
    }

    const editable = target.editable;
    const editorDocument = editable.ownerDocument;
    editable.focus();
    const range = editorDocument.createRange();
    range.selectNodeContents(editable);
    const selection = editorDocument.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    if (!editorDocument.execCommand("insertText", false, blog)) {
      throw new Error("Trình soạn thảo không nhận nội dung thuần văn bản.");
    }
    editable.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function chapterInputs() {
    const form = document.querySelector("form.post-editor-form");
    const heading = [...form.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span")]
      .filter(element => visible(element) && /^CHƯƠNG\s*\(\s*\d+\s*\)$/i.test(text(element)))
      .sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0];
    if (!heading) return null;
    const count = Number(text(heading).match(/\(\s*(\d+)\s*\)/)?.[1]);
    if (!count) return null;
    const seo = findLabel(/^Tiêu đề SEO$/i);
    const inputs = [...form.querySelectorAll("input")]
      .filter(input => ["text", "search"].includes(input.type) && visible(input) &&
        input.value.trim() && !/^\d+$/.test(input.value.trim()) &&
        !!(heading.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        (!seo || !!(input.compareDocumentPosition(seo) & Node.DOCUMENT_POSITION_FOLLOWING)));
    return inputs.length >= count ? inputs.slice(0, count) : null;
  }

  async function chapterEditor(input, nextInput) {
    const inChapter = element => element &&
      !!(input.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      (!nextInput || !!(element.compareDocumentPosition(nextInput) & Node.DOCUMENT_POSITION_FOLLOWING));
    const findEditor = () => Object.values(window.tinymce?.editors || {}).find(editor =>
      editor.initialized && editor.getBody?.() && inChapter(editor.getContainer?.()) && visible(editor.getContainer()));
    let editor = findEditor();
    if (editor) return editor;
    let container = input.parentElement;
    let expand = null;
    while (container && !container.matches("form, body")) {
      expand = [...container.querySelectorAll("button")].find(button => visible(button) &&
        /^(Sửa|Mở|Chỉnh sửa|Edit|Expand)$/i.test(button.getAttribute("aria-label") ||
          button.getAttribute("title") || text(button)));
      if (expand) break;
      container = container.parentElement;
    }
    if (!expand) throw new Error(`Không tìm thấy nút mở chương "${input.value}".`);
    expand.click();
    editor = await waitFor(findEditor, 10000);
    return editor;
  }

  async function uploadChapterImage(editor, image, index) {
    const options = editor.options;
    if (!options?.get?.("images_upload_url") && !options?.get?.("images_upload_handler")) {
      throw new Error(`Chương ${index + 1} chưa có cấu hình tải ảnh của website.`);
    }
    const cache = editor.editorUpload?.blobCache;
    if (!cache?.create || !cache?.add || !editor.uploadImages) {
      throw new Error(`Không truy cập được bộ tải ảnh của chương ${index + 1}.`);
    }
    const binary = atob(image.base64);
    const bytes = new Uint8Array(binary.length);
    for (let offset = 0; offset < binary.length; offset++) bytes[offset] = binary.charCodeAt(offset);
    const file = new File([bytes], image.name, { type: image.type });
    const info = cache.create(`auto-fill-blog-${Date.now()}-${index}`, file, image.base64);
    cache.add(info);
    const marker = `Ảnh chương ${index + 1}: ${image.name}`;
    editor.setContent(`<p><img src="${info.blobUri()}" alt="${escapeHtml(marker)}"></p>${editor.getContent()}`);
    editor.save();
    editor.fire("input");
    let uploadTimeout;
    let uploads;
    try {
      uploads = await Promise.race([
        editor.uploadImages(),
        new Promise((_, reject) => {
          uploadTimeout = setTimeout(() => reject(new Error("Tải ảnh quá 30 giây.")), 30000);
        })
      ]);
    } finally { clearTimeout(uploadTimeout); }
    const inserted = [...editor.getBody().querySelectorAll("img")].find(img => img.alt === marker);
    if (!inserted || /^(blob:|data:)/i.test(inserted.getAttribute("src") || "") ||
        uploads?.some?.(item => item.status === false)) {
      throw new Error(`Website chưa tải xong ảnh của chương ${index + 1}.`);
    }
    editor.save();
    editor.fire("input");
    editor.fire("change");
  }

  try {
    step = "biểu mẫu tạo bài viết";
    const form = await waitFor(() => document.querySelector("form.post-editor-form"));

    step = "tab Chương";
    const chapterTab = () => document.querySelector('form.post-editor-form [role="tab"][id$="-trigger-chapter"]') ||
      findButton(/^Chương$/i);
    const mode = await waitFor(chapterTab);
    if (mode.getAttribute("aria-selected") !== "true" && mode.getAttribute("data-state") !== "active") {
      mode.focus();
      mode.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
      mode.click();
    }

    step = "kích hoạt chế độ Chương";
    await waitFor(() => {
      const current = chapterTab();
      return current && (current.getAttribute("aria-selected") === "true" || current.getAttribute("data-state") === "active");
    }, 10000);

    step = "nút Phân tích chương";
    await waitFor(() => findButton(/Phân tích chương/i));

    step = `danh mục ${category}`;
    const categoryControl = await waitFor(() => fieldControl(/^Danh mục$/i));
    if (categoryControl.tagName === "SELECT") {
      const option = [...categoryControl.options].find(item => text(item).toLowerCase() === category.toLowerCase());
      if (!option) throw new Error(`Không có danh mục ${category}.`);
      categoryControl.value = option.value;
      categoryControl.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      categoryControl.click();
      if (categoryControl.matches("input")) setValue(categoryControl, category);
      const option = await waitFor(() => {
        const matches = [...document.querySelectorAll("[role='option'], [cmdk-item], li, div, span")]
          .filter(element => visible(element) && !categoryControl.contains(element) &&
            text(element).toLowerCase() === category.toLowerCase());
        return matches.find(element => element.matches("[role='option'], [cmdk-item]")) ||
          matches.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0];
      }, 7000);
      option.click();
    }

    step = "ô Intro / Mô tả";
    await fillEditor();

    step = "tùy chọn Lưu tên chapter";
    const saveNameLabel = await waitFor(() => findLabel(/^Lưu tên chapter$/i));
    const checkbox = saveNameLabel.closest("label")?.querySelector("input[type='checkbox'], [role='checkbox']") ||
      saveNameLabel.parentElement?.querySelector("input[type='checkbox'], [role='checkbox']");
    if (!checkbox) throw new Error("Không tìm thấy ô chọn Lưu tên chapter.");
    if (!(checkbox.checked || checkbox.getAttribute("aria-checked") === "true")) checkbox.click();

    step = "nút Phân tích chương";
    const analyze = await waitFor(() => findButton(/Phân tích chương/i));
    analyze.click();

    step = "các tiêu đề chương sau phân tích";
    const chapters = await waitFor(chapterInputs, 30000);

    if (chapterImages.length && chapterImages.length !== chapters.length) {
      throw new Error(`Cột ảnh có ${chapterImages.length} đường dẫn nhưng trang đã tách ${chapters.length} chương. Mỗi chương cần đúng một ảnh theo thứ tự.`);
    }

    step = "tiêu đề bài viết";
    const titleInput = await waitFor(() => fieldControl(/^Tiêu đề\s*\*?$/i));
    if (!titleInput.matches("input, textarea")) throw new Error("Không tìm thấy ô nhập Tiêu đề.");
    setValue(titleInput, addId(title));

    step = "traffic ID của từng chương";
    for (const input of chapters) setValue(input, addId(input.value));

    if (chapterImages.length) {
      step = "ảnh riêng của từng chương";
      const editors = [];
      for (let index = 0; index < chapters.length; index++) {
        editors.push(await chapterEditor(chapters[index], chapters[index + 1]));
      }
      for (let start = 0; start < editors.length; start += 4) {
        await Promise.all(editors.slice(start, start + 4).map((editor, offset) =>
          uploadChapterImage(editor, chapterImages[start + offset], start + offset)));
      }
    }
    return { ok: true, chapters: chapters.length };
  } catch (error) {
    return { ok: false, error: `Dừng ở bước ${step}: ${error.message} Các ô đã điền trước đó vẫn nằm trên trang để kiểm tra.` };
  }
}

if (typeof module !== "undefined") module.exports = { fillBlogPage };
