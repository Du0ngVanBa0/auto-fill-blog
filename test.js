const assert = require("node:assert/strict");
const path = require("node:path");
const { columnIndex, columnLetter, parseCsv, parseRowList, parseImagePaths, readSheetRow, readSheetRows } = require("./sheet.js");
const { matchImageFile } = require("./images.js");
const { contentFilePath, localFileUrl, resolveContentRow } = require("./content.js");

async function main() {
  assert.equal(columnIndex("D"), 3);
  assert.equal(columnLetter(27), "AB");
  assert.deepEqual(parseCsv('id,"First line\nSecond ""quote""",title\r\n'), [
    ["id", 'First line\nSecond "quote"', "title"]
  ]);
  assert.deepEqual(parseRowList("2, 4-6, 2"), [2, 4, 5, 6]);
  assert.deepEqual(parseImagePaths("C:\\a\\one.jpg\nC:\\b\\two.png"),
    ["C:\\a\\one.jpg", "C:\\b\\two.png"]);
  assert.throws(() => parseRowList("6-4"), /không hợp lệ/);
  const imageFiles = [
    { name: "cover.jpg", webkitRelativePath: "images/row2/cover.jpg" },
    { name: "cover.jpg", webkitRelativePath: "images/row4/cover.jpg" }
  ];
  assert.equal(matchImageFile("C:\\sample\\images\\row2\\cover.jpg", imageFiles), imageFiles[0]);
  assert.throws(() => matchImageFile("cover.jpg", imageFiles), /nhiều ảnh/);
  const localPath = "C:\\sample\\article.txt";
  assert.equal(contentFilePath(`[FILE ${localPath}]\nĐoạn xem trước bị cắt`), localPath);
  assert.equal(contentFilePath("Nội dung trực tiếp"), "");
  assert.equal(localFileUrl(localPath), "file:///C:/sample/article.txt");
  assert.equal(localFileUrl("C:\\sample\\my blog.txt"), "file:///C:/sample/my%20blog.txt");
  const fullBlog = "CHAPTER 1\n" + "A long paragraph. ".repeat(4000);
  const resolved = await resolveContentRow({ blog: `[FILE ${localPath}]\nĐoạn xem trước bị cắt` },
    async path => { assert.equal(path, localPath); return fullBlog; });
  assert.equal(resolved.blog, fullBlog);
  assert.ok(resolved.blog.length > 50_000);
  assert.match((await resolveContentRow({ blog: `[FILE ${localPath}]` },
    async () => { throw new Error("Không đọc được file local."); })).contentError, /Không đọc được/);

  const originalFetch = global.fetch;
  global.fetch = async url => {
    assert.equal(url.searchParams.get("sheet"), "output");
    assert.equal(url.searchParams.get("range"), "A2:F2");
    assert.equal(url.searchParams.get("headers"), "0");
    return {
      ok: true, headers: { get: () => "text/csv; charset=utf-8" },
      text: async () => 'a,b,c,"CHAPTER 1\nStory",e,"Blog title"'
    };
  };
  try {
    const row = await readSheetRow({
      sheetUrl: "https://docs.google.com/spreadsheets/d/example-id/edit", sheetTab: "output",
      blogColumn: "D", titleColumn: "F", rowNumber: 2
    });
    assert.equal(row.blog, "CHAPTER 1\nStory");
    assert.equal(row.title, "Blog title");
  } finally { global.fetch = originalFetch; }

  global.fetch = async url => {
    const row = Number(/A(\d+):/.exec(url.searchParams.get("range"))[1]);
    assert.equal(url.searchParams.get("range"), `A${row}:G${row}`);
    return {
      ok: true, headers: { get: () => "text/csv" },
      text: async () => `a,b,c,Story,e,Title ${row},"C:\\sample\\images\\row${row}\\one.jpg\nC:\\sample\\images\\row${row}\\two.jpg"`
    };
  };
  try {
    const rows = await readSheetRows({
      sheetUrl: "https://docs.google.com/spreadsheets/d/example-id/edit", sheetTab: "output",
      blogColumn: "D", titleColumn: "F", imageColumn: "G", rowList: "2,4"
    });
    assert.deepEqual(rows.map(row => row.row), [2, 4]);
    assert.deepEqual(rows[1].imagePaths, [
      "C:\\sample\\images\\row4\\one.jpg", "C:\\sample\\images\\row4\\two.jpg"
    ]);
  } finally { global.fetch = originalFetch; }

  if (process.argv[2]) await browserTest(process.argv[2]);
  console.log("OK: đọc hàng, CSV nhiều dòng" + (process.argv[2] ? ", điền biểu mẫu" : ""));
}

async function browserTest(playwrightModule) {
  const { chromium } = require(playwrightModule);
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>body{font:16px Arial}button,input,#editor{display:block;margin:8px}</style>
      <form class="post-editor-form">
      <aside><span>Danh mục</span></aside>
      <input id="post-image-test" type="file" accept="image/*">
      <div><label>Tiêu đề <span>*</span></label><input id="title"></div>
      <button id="reka-tabs-v-62-trigger-chapter" role="tab" type="button" data-state="inactive" aria-selected="false">Chương</button>
      <div><label>Danh mục</label><button role="combobox" type="button" id="category">Chọn danh mục</button></div>
      <div id="options" hidden><div role="option" id="entertainment">Entertainment</div></div>
      <div><label>Intro / Mô tả</label><div id="editor">Editor</div></div>
      <div id="chapter-controls" hidden>
        <label><input type="checkbox" id="save-name">Lưu tên chapter</label>
        <button id="analyze" type="button">Phân tích chương</button>
      </div>
      <section><h3 id="chapter-heading">CHƯƠNG (0)</h3><div id="rows"></div></section>
      <div><label>Tiêu đề SEO</label><input></div>
      <button id="save">Lưu</button>
      </form>
      <script>
        window.events=[];
        document.querySelector('#post-image-test').onchange=()=>events.push('cover-image');
        window.chapterUploads=[];
        document.querySelector('[role=tab]').onmousedown=()=>{
          document.querySelector('[role=tab]').setAttribute('aria-selected','true');
          document.querySelector('[role=tab]').setAttribute('data-state','active');
          document.querySelector('#chapter-controls').hidden=false;
          events.push('mode');
        };
        category.onclick=()=>{options.hidden=false;events.push('category')};
        entertainment.onclick=()=>{category.textContent='Entertainment';options.hidden=true;events.push('option')};
        analyze.onclick=()=>{
          events.push('analyze');
          setTimeout(()=>{
            document.querySelector('#chapter-heading').textContent='CHƯƠNG ( 2 )';
            document.querySelector('#rows').innerHTML=['Chapter 2: Walls','Chapter 3: Fear'].map((title,index)=>
              '<div class="chapter"><input type="search" value="'+title+'"><button type="button" aria-label="Sửa">Open</button><div class="chapter-editor" hidden></div></div>'
            ).join('');
            document.querySelectorAll('.chapter').forEach((chapter,index)=>{
              chapter.querySelector('button').onclick=()=>{
                const container=chapter.querySelector('.chapter-editor');
                container.hidden=false;
                if (container.dataset.ready) return;
                container.dataset.ready='1';
                const body=document.createElement('div');
                body.innerHTML='<p>Chapter body '+(index+1)+'</p>';
                container.append(body);
                let imageFile;
                window.tinymce.editors.push({
                  initialized:true,getBody:()=>body,getContainer:()=>container,
                  options:{get:key=>key==='images_upload_url'?'/upload':undefined},
                  editorUpload:{blobCache:{create:(id,file)=>{imageFile=file;return {blobUri:()=>
                    'blob:'+id}},add:()=>{}}},
                  getContent:()=>body.innerHTML,
                  setContent:html=>{body.innerHTML=html},
                  uploadImages:async()=>{
                    const img=body.querySelector('img');
                    window.chapterUploads.push({chapter:index+1,name:imageFile.name,size:imageFile.size});
                    img.setAttribute('src','https://example.test/uploads/'+imageFile.name);
                    return [{status:true}];
                  },save:()=>{},fire:()=>{}
                });
              };
            });
          }, 150);
        };
        save.onclick=()=>events.push('save');
        window.tinymce={editors:[{
          initialized:true,getBody:()=>editor,getContainer:()=>editor,
          setContent:html=>{window.editorHtml=html;events.push('content')},
          save:()=>{},fire:()=>{}
        }]};
      </script>
    `);
    await page.addScriptTag({ path: path.join(__dirname, "fill.js") });
    const result = await page.evaluate(() => fillBlogPage({
      blog: "CHAPTER 1\nStory", title: "Blog title", trafficId: "123", category: "Entertainment",
      chapterImages: [
        { name: "episode-1.png", type: "image/png", base64: "AQID" },
        { name: "episode-2.png", type: "image/png", base64: "BAUG" }
      ]
    }));
    assert.deepEqual(result, { ok: true, chapters: 2 });
    const state = await page.evaluate(() => ({
      title: document.querySelector("#title").value,
      chapters: [...document.querySelectorAll("#rows input")].map(input => input.value),
      category: document.querySelector("#category").textContent,
      checked: document.querySelector("#save-name").checked,
      html: window.editorHtml,
      uploads: window.chapterUploads,
      events: window.events
    }));
    assert.equal(state.title, "Blog title 123");
    assert.deepEqual(state.chapters, ["Chapter 2: Walls 123", "Chapter 3: Fear 123"]);
    assert.equal(state.category, "Entertainment");
    assert.equal(state.checked, true);
    assert.match(state.html, /<p>CHAPTER 1<\/p><p>Story<\/p>/);
    assert.deepEqual(state.events, ["mode", "category", "option", "content", "analyze"]);
    assert.deepEqual(state.uploads, [
      { chapter: 1, name: "episode-1.png", size: 3 },
      { chapter: 2, name: "episode-2.png", size: 3 }
    ]);
    const mismatched = await page.evaluate(() => fillBlogPage({
      blog: "CHAPTER 1\nStory", title: "Blog title", trafficId: "123", category: "Entertainment",
      chapterImages: [{ name: "only-one.png", type: "image/png", base64: "AQID" }]
    }));
    assert.match(mismatched.error, /1 đường dẫn.*2 chương/);
    assert.equal(await page.evaluate(() => window.chapterUploads.length), 2);

    await page.evaluate(() => {
      window.tinymce = undefined;
      document.querySelector("#editor").contentEditable = "true";
      document.querySelector("#chapter-heading").textContent = "CHƯƠNG (0)";
      document.querySelector("#rows").replaceChildren();
    });
    const started = Date.now();
    const fallbackResult = await page.evaluate(() => fillBlogPage({
      blog: "CHAPTER 1\nStory", title: "Blog title", trafficId: "123", category: "Entertainment"
    }));
    assert.deepEqual(fallbackResult, { ok: true, chapters: 2 });
    assert.ok(Date.now() - started < 3000, "vùng soạn thảo sẵn có không được chờ TinyMCE 12 giây");
    assert.equal(await page.evaluate(() => window.events.includes("cover-image")), false);
    assert.equal(await page.evaluate(() => window.events.includes("save")), false);

    const missingAnalyze = await browser.newPage();
    await missingAnalyze.setContent(`<form class="post-editor-form"><button role="tab" type="button" id="reka-tabs-v-62-trigger-chapter" aria-selected="false" data-state="inactive">Chương</button></form>`);
    await missingAnalyze.addScriptTag({ path: path.join(__dirname, "fill.js") });
    const failure = await missingAnalyze.evaluate(async () => {
      document.querySelector("[role=tab]").onclick = event => {
        event.currentTarget.setAttribute("aria-selected", "true");
        event.currentTarget.setAttribute("data-state", "active");
      };
      let now = 0;
      Date.now = () => now += 5000;
      return fillBlogPage({ blog: "x", title: "x", trafficId: "123", category: "Entertainment" });
    });
    assert.match(failure.error, /Dừng ở bước nút Phân tích chương/);

    const appPage = await browser.newPage();
    await appPage.addInitScript(() => {
      window.fetch = async url => {
        if (String(url).startsWith("file://")) {
          window.fileReadUrls.push(String(url));
          return new Response(window.fullLocalBlog, { status: 200, headers: { "content-type": "text/plain" } });
        }
        const row = Number(/A(\d+):/.exec(url.searchParams.get("range"))[1]);
        const image = url.searchParams.get("range").includes(":G")
          ? `,"C:\\sample\\images\\row${row}\\one.jpg\nC:\\sample\\images\\row${row}\\two.jpg"` : "";
        const blog = row === 7
          ? "[FILE C:\\sample\\article.txt]\nĐoạn xem trước bị cắt"
          : "CHAPTER 1\nStory";
        return new Response(`a,b,c,"${blog}",e,"Blog title ${row}"${image}`, {
          status: 200, headers: { "content-type": "text/csv" }
        });
      };
      window.tabCreateCalls = 0;
      window.tabUpdateCalls = 0;
      window.filledRows = [];
      window.filledBlogs = [];
      window.filledImages = [];
      window.fileReadUrls = [];
      window.fullLocalBlog = "";
      window.chrome = {
        extension: { isAllowedFileSchemeAccess: async () => true },
        tabs: {
          create: async options => {
            window.tabCreateCalls++;
            window.createdActive = options.active;
            if (window.tabCreateCalls === 1) throw new Error("Tabs cannot be edited right now (user may be dragging a tab).");
            return { id: 7 };
          },
          get: async () => ({ status: "complete" }),
          update: async () => {
            window.tabUpdateCalls++;
            if (window.tabUpdateCalls === 1) throw new Error("Tabs cannot be edited right now (user may be dragging a tab).");
            return {};
          },
          onUpdated: { addListener() {}, removeListener() {} }
        },
        scripting: { executeScript: async options => {
          window.filledRows.push(options.args[0].title);
          window.filledBlogs.push(options.args[0].blog);
          window.filledImages.push(options.args[0].chapterImages);
          return [{ result: { ok: true, chapters: 2 } }];
        } }
      };
    });
    await appPage.goto(`file:///${path.join(__dirname, "app.html").replaceAll("\\", "/")}`);
    assert.equal(await appPage.locator("#preview-panel").isHidden(), true);
    assert.ok(await appPage.evaluate(() => document.querySelector("footer").getBoundingClientRect().bottom < 400),
      "biểu mẫu mặc định cần gọn trên màn hình desktop");
    await appPage.setViewportSize({ width: 390, height: 844 });
    assert.ok(await appPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "giao diện nhỏ không được tràn ngang");
    await appPage.setViewportSize({ width: 1280, height: 720 });
    assert.equal(await appPage.locator("#row-list").inputValue(), "");
    assert.equal(await appPage.locator("#sheet-tab").inputValue(), "");
    assert.equal(await appPage.locator("#blog-column").inputValue(), "");
    assert.equal(await appPage.locator("#title-column").inputValue(), "");
    assert.equal(await appPage.locator("#traffic-id").inputValue(), "");
    assert.equal(await appPage.locator("#category").inputValue(), "Entertainment");
    await appPage.locator("#sheet-url").fill("https://docs.google.com/spreadsheets/d/example-id/edit");
    await appPage.locator("#row-list").fill("2");
    await appPage.locator("#image-settings summary").click();
    await appPage.locator("#sheet-tab").fill("output");
    await appPage.locator("#blog-column").fill("D");
    await appPage.locator("#title-column").fill("F");
    await appPage.locator("#image-settings summary").click();
    await appPage.getByRole("button", { name: "Đọc các hàng từ Sheets" }).click();
    await appPage.getByText("Đã đọc 1 hàng.", { exact: false }).waitFor();
    assert.equal(await appPage.locator("#preview-panel").isVisible(), true);
    await appPage.locator("#traffic-id").fill("123");
    await appPage.locator("#fill-button").click();
    await appPage.getByText("Hoàn tất: 1 hàng đã điền, 0 hàng lỗi.", { exact: false }).waitFor();
    assert.equal(await appPage.evaluate(() => window.tabCreateCalls), 2);
    assert.equal(await appPage.evaluate(() => window.createdActive), true);
    assert.equal(await appPage.evaluate(() => window.tabUpdateCalls), 0);

    await appPage.locator("#row-list").fill("2,4");
    await appPage.getByRole("button", { name: "Đọc các hàng từ Sheets" }).click();
    await appPage.getByText("Đã đọc 2 hàng.", { exact: false }).waitFor();
    await appPage.locator("#fill-button").click();
    await appPage.getByText("Hoàn tất: 2 hàng đã điền, 0 hàng lỗi.", { exact: false }).waitFor();
    assert.deepEqual(await appPage.evaluate(() => window.filledRows),
      ["Blog title 2", "Blog title 2", "Blog title 4"]);
    assert.equal(await appPage.evaluate(() => window.tabCreateCalls), 4);

    await appPage.locator("#row-list").fill("2");
    await appPage.locator("#image-settings summary").click();
    await appPage.locator("#image-column").fill("G");
    await appPage.getByRole("button", { name: "Đọc các hàng từ Sheets" }).click();
    await appPage.getByText("Chọn đúng thư mục ảnh", { exact: false }).waitFor();
    assert.equal(await appPage.locator("#fill-button").isDisabled(), true);
    await appPage.evaluate(() => {
      const file = new File([new Uint8Array([1, 2, 3])], "one.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "webkitRelativePath", { value: "images/row2/one.jpg" });
      const second = new File([new Uint8Array([4, 5, 6])], "two.jpg", { type: "image/jpeg" });
      Object.defineProperty(second, "webkitRelativePath", { value: "images/row2/two.jpg" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      transfer.items.add(second);
      const picker = document.querySelector("#image-folder");
      picker.files = transfer.files;
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    assert.equal(await appPage.locator("#fill-button").isEnabled(), true);
    await appPage.locator("#fill-button").click();
    await appPage.getByText("Hoàn tất: 1 hàng đã điền, 0 hàng lỗi.", { exact: false }).waitFor();
    assert.deepEqual(await appPage.evaluate(() => window.filledImages.at(-1).map(image => image.name)),
      ["one.jpg", "two.jpg"]);
    assert.deepEqual(await appPage.evaluate(() => window.filledImages.at(-1).map(image => image.base64)),
      ["AQID", "BAUG"]);

    await appPage.locator("#image-column").fill("");
    await appPage.getByRole("button", { name: "Đọc các hàng từ Sheets" }).click();
    await appPage.getByText("Đã đọc 1 hàng.", { exact: false }).waitFor();

    await appPage.locator("#row-list").fill("7");
    await appPage.evaluate(() => { window.chrome.extension.isAllowedFileSchemeAccess = async () => false; });
    await appPage.getByRole("button", { name: "Đọc các hàng từ Sheets" }).click();
    await appPage.locator("#status").getByText("Allow access to file URLs", { exact: false }).waitFor();
    assert.equal(await appPage.locator("#fill-button").isDisabled(), true);
    const longBlog = "CHAPTER 1\n" + "Long paragraph. ".repeat(4000);
    await appPage.evaluate(text => {
      window.fullLocalBlog = text;
      window.chrome.extension.isAllowedFileSchemeAccess = async () => true;
    }, longBlog);
    await appPage.getByRole("button", { name: "Đọc các hàng từ Sheets" }).click();
    await appPage.getByText("Đã đọc 1 hàng.", { exact: false }).waitFor();
    assert.equal(await appPage.locator("#fill-button").isEnabled(), true);
    assert.deepEqual(await appPage.evaluate(() => window.fileReadUrls),
      ["file:///C:/sample/article.txt"]);
    await appPage.locator("#fill-button").click();
    await appPage.getByText("Hoàn tất: 1 hàng đã điền, 0 hàng lỗi.", { exact: false }).waitFor();
    assert.equal(await appPage.evaluate(() => window.filledBlogs.at(-1)), longBlog);

    await appPage.evaluate(() => {
      window.tabCreateCalls = 0;
      window.chrome.tabs.create = async () => {
        window.tabCreateCalls++;
        throw new Error("Tabs cannot be edited right now (user may be dragging a tab).");
      };
    });
    await appPage.locator("#fill-button").click();
    await appPage.getByText("Chrome đang khóa thanh tab.", { exact: false }).waitFor({ timeout: 5000 });
    assert.equal(await appPage.evaluate(() => window.tabCreateCalls), 20);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
