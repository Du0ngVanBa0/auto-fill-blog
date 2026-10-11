const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.argv[2]);

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <form class="post-editor-form">
        <label><span>Tiêu đề</span><input id="title"></label>
        <button type="button" role="tab" id="test-trigger-normal" aria-selected="true" data-state="active">Normal</button>
        <button type="button" role="tab" id="test-trigger-chapter" aria-selected="false" data-state="inactive">Chương</button>
        <label><span>Danh mục</span><select><option>Entertainment</option></select></label>
        <div id="editor" contenteditable="true"></div>
        <section id="chapter-panel" hidden>
          <label><input type="checkbox">Lưu tên chapter</label>
          <button type="button" id="analyze">Phân tích chương</button>
          <h3 id="heading">CHƯƠNG (0)</h3><div id="chapters"></div>
        </section>
        <label>Tiêu đề SEO <input></label><button id="save" type="button">Lưu</button>
      </form>
      <script>
        const chapter = document.querySelector("#test-trigger-chapter");
        const normal = document.querySelector("#test-trigger-normal");
        const panel = document.querySelector("#chapter-panel");
        window.chapterClicks = 0;
        window.saveClicks = 0;
        document.querySelector("#save").onclick = () => window.saveClicks++;
        function mode(value) {
          chapter.setAttribute("aria-selected", String(value === "chapter"));
          normal.setAttribute("aria-selected", String(value === "normal"));
          chapter.setAttribute("data-state", value === "chapter" ? "active" : "inactive");
          normal.setAttribute("data-state", value === "normal" ? "active" : "inactive");
          panel.hidden = value !== "chapter";
          if (value !== "chapter") {
            document.querySelector("#heading").textContent = "CHƯƠNG (0)";
            document.querySelector("#chapters").replaceChildren();
          }
        }
        chapter.onclick = () => {
          mode("chapter");
          if (++window.chapterClicks === 1) setTimeout(() => mode("normal"), 60);
        };
        document.querySelector("#analyze").onclick = () => {
          setTimeout(() => {
            if (chapter.getAttribute("aria-selected") !== "true") return;
            document.querySelector("#heading").textContent = "CHƯƠNG (1)";
            document.querySelector("#chapters").innerHTML = '<input value="Chapter 2: Sample">';
          }, 100);
        };
        window.tinymce = { editors: [{
          initialized: true, getBody: () => editor, getContainer: () => editor,
          setContent: html => editor.innerHTML = html, save: () => {}
        }] };
      </script>
    `);
    await page.addScriptTag({ path: path.join(__dirname, "fill.js") });
    const actual = await page.evaluate(async () => {
      const result = await Promise.race([
        fillBlogPage({ blog: "CHAPTER 1\nSample", title: "Sample", trafficId: "239", category: "Entertainment" }),
        new Promise(resolve => setTimeout(() => resolve("stuck"), 1200))
      ]);
      return {
        result,
        mode: document.querySelector("#test-trigger-chapter").getAttribute("aria-selected"),
        chapterClicks: window.chapterClicks,
        chapters: [...document.querySelectorAll("#chapters input")].map(input => input.value),
        title: document.querySelector("#title").value,
        content: editor.textContent,
        saveClicks: window.saveClicks
      };
    });
    assert.deepEqual(actual, {
      result: { ok: true, chapters: 1 },
      mode: "true", chapterClicks: 2, chapters: ["Chapter 2: Sample 239"],
      title: "Sample 239", content: "CHAPTER 1Sample", saveClicks: 0
    });
    console.log("OK: chế độ Chương không trở về Normal sau khi trang cập nhật muộn");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
