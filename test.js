const assert = require("node:assert/strict");
const path = require("node:path");
const { columnIndex, columnLetter, parseCsv, parseRowList, readSheetRows } = require("./sheet.js");
const { contentFilePath, localFileUrl, resolveContentRow } = require("./content.js");

async function main() {
  assert.equal(columnIndex("D"), 3);
  assert.equal(columnLetter(27), "AB");
  assert.deepEqual(parseCsv('id,"First line\nSecond ""quote""",title\r\n'),
    [["id", 'First line\nSecond "quote"', "title"]]);
  assert.deepEqual(parseRowList("2, 4-6, 2"), [2, 4, 5, 6]);
  assert.throws(() => parseRowList("6-4"), /không hợp lệ/);
  const localPath = "C:\\sample\\article.txt";
  assert.equal(contentFilePath(`[FILE ${localPath}]\nBản xem trước bị cắt`), localPath);
  assert.equal(localFileUrl(localPath), "file:///C:/sample/article.txt");
  const fullBlog = "CHAPTER 1\n" + "A long paragraph. ".repeat(4000);
  const resolved = await resolveContentRow({ blog: `[FILE ${localPath}]` }, async () => fullBlog);
  assert.equal(resolved.blog, fullBlog);
  assert.match((await resolveContentRow({ blog: `[FILE ${localPath}]` },
    async () => { throw new Error("Không đọc được file local."); })).contentError, /Không đọc được/);

  const originalFetch = global.fetch;
  global.fetch = async url => {
    const row = Number(/A(\d+):/.exec(url.searchParams.get("range"))[1]);
    assert.equal(url.searchParams.get("sheet"), "output");
    return { ok: true, headers: { get: () => "text/csv" },
      text: async () => `a,b,c,"CHAPTER 1\nStory",e,"Blog title ${row}"` };
  };
  try {
    const rows = await readSheetRows({
      sheetUrl: "https://docs.google.com/spreadsheets/d/example-id/edit", sheetTab: "output",
      blogColumn: "D", titleColumn: "F", rowList: "3-5"
    });
    assert.deepEqual(rows.map(row => row.row), [3, 4, 5]);
    assert.equal(rows[1].title, "Blog title 4");
  } finally { global.fetch = originalFetch; }

  if (process.argv[2]) await browserTest(process.argv[2]);
  console.log("OK: Sheets, hàng riêng, chờ trang và biểu mẫu" + (process.argv[2] ? ", giao diện" : ""));
}

async function browserTest(playwrightModule) {
  const { chromium } = require(playwrightModule);
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <form class="post-editor-form">
        <input type="file" accept="image/*">
        <label><span>Tiêu đề</span><span>*</span><input id="title"></label>
        <button type="button" role="tab" id="test-trigger-chapter" aria-selected="false">Chương</button>
        <label><span>Danh mục</span><button type="button" role="combobox" id="category">Chọn danh mục</button></label>
        <div id="category-options" hidden><div role="option" id="entertainment">Entertainment</div></div>
        <div id="editor" contenteditable="true">Editor</div>
        <label><input type="checkbox" id="save-name">Lưu tên chapter</label>
        <button type="button" id="analyze">Phân tích chương</button>
        <h3 id="chapter-heading">CHƯƠNG (0)</h3><div id="chapters"></div>
        <label>Tiêu đề SEO <input></label><button id="save">Lưu</button>
      </form>
      <script>
        window.saveClicks=0;
        document.querySelector('#save').onclick=()=>window.saveClicks++;
        document.querySelector('[role=tab]').onclick=event=>event.currentTarget.setAttribute('aria-selected','true');
        document.querySelector('#category').onclick=()=>document.querySelector('#category-options').hidden=false;
        document.querySelector('#entertainment').onclick=()=>{
          document.querySelector('#category').textContent='Entertainment';
          document.querySelector('#category-options').hidden=true;
        };
        document.querySelector('#analyze').onclick=()=>setTimeout(()=>{
          document.querySelector('#chapter-heading').textContent='CHƯƠNG (2)';
          document.querySelector('#chapters').innerHTML='<input value="Chapter 2: Walls"><input value="Chapter 3: Fear">';
        },100);
        window.tinymce={editors:[{initialized:true,getBody:()=>editor,getContainer:()=>editor,
          setContent:html=>window.editorHtml=html,save:()=>{},fire:()=>{}}]};
      </script>`);
    await page.addScriptTag({ path: path.join(__dirname, "fill.js") });
    const result = await page.evaluate(() => fillBlogPage({
      blog: "CHAPTER 1\nStory", title: "Blog title", trafficId: "123", category: "Entertainment"
    }));
    assert.deepEqual(result, { ok: true, chapters: 2 });
    assert.deepEqual(await page.evaluate(() => ({
      title: document.querySelector("#title").value,
      chapters: [...document.querySelectorAll("#chapters input")].map(input => input.value),
      category: document.querySelector("#category").textContent,
      html: window.editorHtml,
      saveClicks: window.saveClicks
    })), {
      title: "Blog title 123", chapters: ["Chapter 2: Walls 123", "Chapter 3: Fear 123"],
      category: "Entertainment",
      html: "<p>CHAPTER 1</p><p>Story</p>", saveClicks: 0
    });
    const imageResult = await page.evaluate(async () => {
      const decode = window.atob;
      window.atob = () => { throw new Error("Dùng bộ giải mã ảnh chậm"); };
      try {
        const result = await fillBlogPage({ blog: "Story", title: "Image title", trafficId: "123",
          category: "Entertainment", image: { base64: btoa("PNG"), name: "cover.png", type: "image/png" } });
        const file = document.querySelector('input[type="file"]').files[0];
        return { result, name: file?.name, size: file?.size, type: file?.type };
      } finally { window.atob = decode; }
    });
    assert.deepEqual(imageResult, { result: { ok: true, chapters: 2 },
      name: "cover.png", size: 3, type: "image/png" });
    const delayedControl = await page.evaluate(async () => {
      const button = document.querySelector("#analyze");
      button.remove();
      const realNow = Date.now;
      Date.now = () => realNow() + 1000000;
      setTimeout(() => document.querySelector("form").append(button), 1200);
      return fillBlogPage({ blog: "Story", title: "Another title", trafficId: "123", category: "Entertainment" });
    });
    assert.deepEqual(delayedControl, { ok: true, chapters: 2 });

    const longBlog = Array.from({ length: 1925 }, (_, index) => `A long paragraph ${index}.`).join("\n");
    const longBenchmark = await page.evaluate(async blog => {
      window.tinymce.editors[0].setContent = html => {
        document.querySelector("#editor").innerHTML = html;
        window.editorHtml = html;
      };
      const started = performance.now();
      const result = await fillBlogPage({ blog, title: "Long blog", trafficId: "123", category: "Entertainment" });
      return { result, elapsedMs: Math.round(performance.now() - started) };
    }, longBlog);
    assert.deepEqual(longBenchmark.result, { ok: true, chapters: 2 });
    assert.ok(longBenchmark.elapsedMs < 3000, `Nội dung dài xử lý quá chậm: ${longBenchmark.elapsedMs} ms`);
    console.log(`Benchmark ${longBlog.length} chars / 1925 lines: ${longBenchmark.elapsedMs} ms`);

    const appPage = await browser.newPage();
    await appPage.addInitScript(() => {
      window.fetch = async url => {
        const row = Number(/A(\d+):/.exec(url.searchParams.get("range"))[1]);
        return new Response(`a,b,c,"CHAPTER 1\nStory",e,"Blog title ${row}"`,
          { status: 200, headers: { "content-type": "text/csv" } });
      };
      window.createdTabs = [];
      window.filled = [];
      window.tabGets = 0;
      window.tabClosed = false;
      window.route = "https://dramastudio.danhngon.pro/admin/posts/new";
      window.chrome = {
        extension: { isAllowedFileSchemeAccess: async () => true },
        tabs: {
          create: async options => { window.createdTabs.push(options); return { id: window.createdTabs.length }; },
          get: async () => {
            window.tabGets++;
            if (window.tabClosed) throw new Error("No tab with id: 1.");
            return { status: "complete", url: window.route };
          }
        },
        scripting: { executeScript: async options => {
          if (options.func.name === "waitForEditorForm") {
            if (window.route.endsWith("/admin/posts")) {
              if (window.enableListProbe) {
                window.listProbeCalls++;
                window.route = "https://dramastudio.danhngon.pro/admin/posts/new";
              }
              return [{ result: "route-changed" }];
            }
            return [{ result: "ready" }];
          }
          window.filled.push(options.args[0]);
          return [{ result: { ok: true, chapters: 2 } }];
        } }
      };
    });
    await appPage.goto(`file:///${path.join(__dirname, "app.html").replaceAll("\\", "/")}`);
    assert.equal(await appPage.locator("#fill-button").count(), 0);
    assert.equal(await appPage.locator("#wait-seconds").count(), 0);
    await appPage.locator("#sheet-url").fill("https://docs.google.com/spreadsheets/d/example-id/edit");
    await appPage.locator("#row-list").fill("3-5");
    await appPage.locator("#traffic-id").fill("239");
    await appPage.locator("#image-settings summary").click();
    await appPage.locator("#sheet-tab").fill("output");
    await appPage.locator("#blog-column").fill("D");
    await appPage.locator("#title-column").fill("F");
    await appPage.locator("#image-settings summary").click();
    await appPage.locator('[data-row="4"] .row-image').setInputFiles({
      name: "row-4.png", mimeType: "image/png", buffer: Buffer.from([4])
    });
    await appPage.locator("#read-button").click();
    await appPage.getByText("Đã đọc 3 hàng.", { exact: false }).waitFor();
    assert.deepEqual(await appPage.locator(".row-fill-button").allTextContents(), ["Điền", "Điền", "Điền"]);
    assert.deepEqual(await appPage.locator(".row-fill-button").evaluateAll(buttons =>
      buttons.map(button => button.getAttribute("aria-label"))),
    ["Điền hàng 3", "Điền hàng 4", "Điền hàng 5"]);
    await appPage.setViewportSize({ width: 390, height: 844 });
    assert.ok(await appPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await appPage.setViewportSize({ width: 1280, height: 720 });
    await appPage.getByRole("button", { name: "Điền hàng 4" }).click();
    await appPage.getByText("Hàng 4: đã điền 2 chương", { exact: false }).waitFor();
    assert.match(await appPage.locator(".preview-item").nth(1).locator(".row-result").textContent(),
      /mở trang \d+ giây, điền \d+ giây/);
    assert.deepEqual(await appPage.evaluate(() => ({
      tabs: window.createdTabs.length,
      titles: window.filled.map(row => row.title),
      image: window.filled[0].image?.name,
      openedUrl: window.createdTabs[0].url
    })), { tabs: 1, titles: ["Blog title 4"], image: "row-4.png",
      openedUrl: "https://dramastudio.danhngon.pro/admin/posts" });

    await appPage.evaluate(() => {
      const target = document.querySelector('[data-row="3"] .row-drop');
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array([3])], "row-3.png", { type: "image/png" }));
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    });
    assert.match(await appPage.locator('[data-row="3"] .row-drop').innerText(), /row-3.png/);

    await appPage.evaluate(() => {
      window.route = "https://dramastudio.danhngon.pro/admin/posts";
      window.tabGets = 0;
      const realNow = Date.now;
      Date.now = () => realNow() + 1000000;
      setTimeout(() => { window.route = "https://dramastudio.danhngon.pro/admin/posts/new"; }, 2200);
    });
    await appPage.getByRole("button", { name: "Điền hàng 3" }).click();
    await appPage.getByText("Hàng 3: đã điền 2 chương", { exact: false }).waitFor({ timeout: 7000 });
    assert.ok(await appPage.evaluate(() => window.tabGets) >= 3);
    assert.equal(await appPage.evaluate(() => window.createdTabs.length), 2);
    assert.equal(await appPage.evaluate(() => window.filled.at(-1).image.name), "row-3.png");

    await appPage.evaluate(() => {
      window.route = "https://dramastudio.danhngon.pro/admin/posts";
      window.enableListProbe = true;
      window.listProbeCalls = 0;
    });
    await appPage.getByRole("button", { name: "Điền hàng 4" }).click();
    await appPage.waitForFunction(() => window.filled.length === 3, undefined, { timeout: 1800 });
    assert.equal(await appPage.evaluate(() => window.listProbeCalls), 1,
      "khi SPA còn ở /admin/posts phải vào form qua nút Bài viết mới");

    await appPage.evaluate(() => { window.tabClosed = true; });
    await appPage.getByRole("button", { name: "Điền hàng 5" }).click();
    const stopped = appPage.locator(".preview-item").nth(2).locator(".row-result");
    await stopped.waitFor();
    assert.match(await stopped.textContent(), /Đã dừng vì tab được đóng/);
    assert.equal(await appPage.evaluate(() => window.createdTabs.length), 4);
    assert.equal(await appPage.getByRole("button", { name: "Điền hàng 5" }).isEnabled(), true);

    const probe = await appPage.evaluate(async () => {
      setTimeout(() => {
        const form = document.createElement("form");
        form.className = "post-editor-form";
        document.body.append(form);
      }, 1200);
      return waitForEditorForm(location.pathname);
    });
    assert.equal(probe, "ready");

    const listBeforeForm = await appPage.evaluate(async () => {
      document.querySelector("form.post-editor-form").remove();
      const button = document.createElement("button");
      button.textContent = "Bài viết mới";
      let clicks = 0;
      button.onclick = () => {
        clicks++;
        button.remove();
        const form = document.createElement("form");
        form.className = "post-editor-form";
        document.body.append(form);
      };
      setTimeout(() => document.body.append(button), 250);
      const state = await Promise.race([
        waitForEditorForm(location.pathname),
        new Promise(resolve => setTimeout(() => resolve("stuck"), 2600))
      ]);
      return { state, clicks };
    });
    assert.deepEqual(listBeforeForm, { state: "ready", clicks: 1 },
      "URL trang tạo đã đúng nhưng SPA còn ở danh sách: phải vào biểu mẫu ngay khi nút Bài viết mới xuất hiện");
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
