const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.argv[2]);

async function run() {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><body><form class="post-editor-form">
      <label><span>Tiêu đề</span><span>*</span><input id="title"></label>
      <button type="button" role="tab" id="test-trigger-chapter" aria-selected="false">Chương</button>
      <label><span>Danh mục</span><button type="button" role="combobox" id="category">Chọn danh mục</button></label>
      <div id="options" hidden><div role="option" id="entertainment">Entertainment</div></div>
      <textarea id="editor"></textarea>
      <label><input type="checkbox" id="save-name">Lưu tên chapter</label>
      <button type="button" id="analyze">Phân tích chương</button>
      <h3 id="heading">CHƯƠNG (0)</h3><div id="chapters"></div>
      <label><span>Tiêu đề SEO</span><input></label>
      <button id="save" type="button">Lưu</button>
    </form></body></html>`);
    await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/tinymce/7.9.1/tinymce.min.js" });
    await page.evaluate(() => tinymce.init({ selector: "#editor", menubar: false, toolbar: false,
      plugins: "wordcount", skin: false, content_css: false, license_key: "gpl" }));
    await page.waitForFunction(() => tinymce.activeEditor?.initialized);
    await page.addScriptTag({ path: path.join(__dirname, "fill.js") });
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const fallback = process.argv[3] === "fallback";
    const result = await page.evaluate(async ({ fallback }) => {
      const editor = tinymce.activeEditor;
      const events = { input: 0, change: 0, setContent: 0 };
      editor.on("input", () => events.input++);
      editor.on("change", () => events.change++);
      editor.on("SetContent", () => events.setContent++);
      let saveClicks = 0;
      document.querySelector("#save").onclick = () => saveClicks++;
      document.querySelector("[role=tab]").onclick = event => event.currentTarget.setAttribute("aria-selected", "true");
      document.querySelector("#category").onclick = () => document.querySelector("#options").hidden = false;
      document.querySelector("#entertainment").onclick = () => {
        document.querySelector("#category").textContent = "Entertainment";
        document.querySelector("#options").hidden = true;
      };
      document.querySelector("#analyze").onclick = () => setTimeout(() => {
        document.querySelector("#heading").textContent = "CHƯƠNG (4)";
        document.querySelector("#chapters").innerHTML = [2, 3, 4, 5]
          .map(number => `<input value="Chapter ${number}: Story">`).join("");
      }, 100);
      const blog = Array.from({ length: fallback ? 3 : 1925 }, (_, n) => `A long paragraph ${n}.`).join("\n");
      const started = performance.now();
      const manager = window.tinymce;
      if (fallback) window.tinymce = undefined;
      const fill = await Promise.race([
        fillBlogPage({ blog, title: "Long story", trafficId: "239", category: "Entertainment" }),
        new Promise(resolve => setTimeout(() => resolve({ ok: false, error: "stuck" }), fallback ? 2000 : 10000))
      ]);
      window.tinymce = manager;
      return { fill, elapsedMs: Math.round(performance.now() - started), chars: blog.length,
        paragraphs: editor.getBody().querySelectorAll("p").length,
        textareaLength: document.querySelector("#editor").value.length,
        title: document.querySelector("#title").value,
        chapters: [...document.querySelectorAll("#chapters input")].map(input => input.value),
        category: document.querySelector("#category").textContent,
        saveClicks, events };
    }, { fallback });
    console.log(JSON.stringify(result));
    if (fallback) {
      assert.match(result.fill.error, /Không lấy được TinyMCE/);
      assert.ok(result.elapsedMs < 200);
      assert.equal(result.textareaLength, 0);
      assert.equal(result.title, "");
      assert.equal(result.events.input, 0);
      return;
    }
    assert.deepEqual(result.fill, { ok: true, chapters: 4 });
    assert.ok(result.elapsedMs < 3000);
    assert.equal(result.paragraphs, 1925);
    assert.ok(result.textareaLength > result.chars);
    assert.equal(result.title, "Long story 239");
    assert.deepEqual(result.chapters, [2, 3, 4, 5].map(number => `Chapter ${number}: Story 239`));
    assert.equal(result.category, "Entertainment");
    assert.equal(result.saveClicks, 0);
    assert.deepEqual(result.events, { input: 0, change: 1, setContent: 1 });
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
