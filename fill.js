async function fillBlogPage({ blog, title, trafficId, category, image = null }) {
  let step = "mở biểu mẫu";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const text = element => element?.textContent?.replace(/\s+/g, " ").trim() || "";
  const visible = element => !!element && (element.checkVisibility
    ? element.checkVisibility({ checkVisibilityCSS: true })
    : element.getClientRects().length > 0);
  const controls = "input, textarea, select, button, [role='combobox']";
  const modeReset = new Error("Trang đã tự chuyển khỏi chế độ Chương.");
  let watchChapterMode = false;

  function chapterTab() {
    return document.querySelector('form.post-editor-form [role="tab"][id$="-trigger-chapter"]') ||
      findButton(/^Chương$/i);
  }

  function chapterIsActive() {
    const tab = chapterTab();
    return tab && (tab.getAttribute("aria-selected") === "true" ||
      tab.getAttribute("data-state") === "active");
  }

  function matchingFieldLabels(pattern) {
    const form = document.querySelector("form.post-editor-form");
    const scope = form || document;
    const labels = [...scope.querySelectorAll("label")]
      .filter(element => pattern.test(text(element)) && visible(element));
    if (labels.length) return labels;
    return [...scope.querySelectorAll("span, div")]
      .filter(element => !element.children.length && pattern.test(text(element)) && visible(element));
  }

  async function waitFor(getValue) {
    for (;;) {
      if (location.pathname === "/login") throw new Error("Trang đã chuyển về màn hình đăng nhập. Hãy đăng nhập rồi thử lại.");
      if (watchChapterMode && !chapterIsActive()) throw modeReset;
      const value = getValue();
      if (value && (!Array.isArray(value) || value.length > 0)) return value;
      await sleep(500);
    }
  }

  function findLabel(pattern) {
    return matchingFieldLabels(pattern)[0];
  }

  function fieldControl(pattern) {
    for (const label of matchingFieldLabels(pattern)) {
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
      .find(button => pattern.test(text(button)) && visible(button));
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

  function blogHtml() {
    return blog.replace(/\r\n?/g, "\n").split("\n")
      .map(line => `<p>${line ? escapeHtml(line) : "&nbsp;"}</p>`).join("");
  }

  async function fillEditor() {
    const target = await waitFor(() => {
      const manager = window.tinymce;
      const listed = manager?.get?.();
      const editors = [...(Array.isArray(listed) ? listed : []),
        ...Object.values(manager?.editors || {}), manager?.activeEditor].filter(Boolean);
      const editor = editors.find(item => item.initialized && item.getBody?.() &&
        item.getContainer?.()?.getClientRects().length);
      if (editor) return { editor };
      if (editors.length) return null;
      const editableFrame = [...document.querySelectorAll("iframe")].find(frame => {
        try { return frame.contentDocument?.body?.isContentEditable; } catch { return false; }
      });
      if (editableFrame?.matches(".tox-edit-area__iframe, iframe[id$='_ifr']")) {
        throw new Error("Không lấy được TinyMCE của trang. Tải lại tab tạo bài viết rồi bấm Điền lại.");
      }
      const editable = editableFrame?.contentDocument.body ||
        [...document.querySelectorAll("[contenteditable='true']")].find(visible);
      return editable ? { editable } : null;
    });
    if (target.editor) {
      target.editor.setContent(blogHtml());
      target.editor.save();
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
    if (!editorDocument.execCommand("insertHTML", false, blogHtml())) {
      throw new Error("Trình soạn thảo không nhận nội dung thuần văn bản.");
    }
  }

  function chapterInputs() {
    const form = document.querySelector("form.post-editor-form");
    if (!form) return null;
    const heading = [...form.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span")]
      .filter(element => (element.tagName[0] === "H" || element.children.length <= 2) &&
        /^CHƯƠNG\s*\(\s*\d+\s*\)$/i.test(text(element)) && visible(element))
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

  try {
    step = "biểu mẫu tạo bài viết";
    const form = await waitFor(() => document.querySelector("form.post-editor-form"));

    if (image) {
      step = "ảnh đại diện của hàng";
      const input = await waitFor(() => form.querySelector('input[type="file"][accept*="image"]'));
      let bytes;
      if (Uint8Array.fromBase64) bytes = Uint8Array.fromBase64(image.base64);
      else {
        const binary = atob(image.base64);
        bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      }
      const file = new File([bytes], image.name, { type: image.type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      watchChapterMode = false;
      try {
        step = "tab Chương";
        const mode = await waitFor(chapterTab);
        if (!chapterIsActive()) {
          mode.focus();
          mode.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
          mode.click();
        }

        step = "kích hoạt chế độ Chương";
        await waitFor(chapterIsActive);
        watchChapterMode = true;

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
              .filter(element => !categoryControl.contains(element) &&
                text(element).toLowerCase() === category.toLowerCase() && visible(element));
            return matches.find(element => element.matches("[role='option'], [cmdk-item]")) ||
              matches.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0];
          });
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
        const chapters = await waitFor(chapterInputs);

        step = "tiêu đề bài viết";
        const titleInput = await waitFor(() => fieldControl(/^Tiêu đề\s*\*?$/i));
        if (!titleInput.matches("input, textarea")) throw new Error("Không tìm thấy ô nhập Tiêu đề.");
        setValue(titleInput, addId(title));

        step = "traffic ID của từng chương";
        for (const input of chapters) setValue(input, addId(input.value));
        // Let the page apply reactive updates from the last input events.
        await sleep(0);
        if (!chapterIsActive()) throw modeReset;
        return { ok: true, chapters: chapters.length };
      } catch (error) {
        if (error !== modeReset || attempt === 2) throw error;
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: `Dừng ở bước ${step}: ${error.message} Các ô đã điền trước đó vẫn nằm trên trang để kiểm tra.`
    };
  }
}

if (typeof module !== "undefined") module.exports = { fillBlogPage };
