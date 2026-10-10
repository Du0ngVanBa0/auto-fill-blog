const path = require("node:path");
const { chromium } = require(process.argv[2]);

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      window.fetch = async url => {
        if (String(url).startsWith("file://")) {
          return new Response("CHAPTER 1\nA Sample Chapter\n\nThis is sample content for the store screenshot.",
            { status: 200, headers: { "content-type": "text/plain" } });
        }
        const row = Number(/A(\d+):/.exec(url.searchParams.get("range"))[1]);
        const titles = {
          2: "Sample Story One",
          4: "Sample Story Two",
          5: "Sample Story Three",
          6: "Sample Story Four"
        };
        const blog = row === 2
          ? "[FILE C:\\sample\\chapter.txt]\nĐoạn xem trước bị cắt"
          : "CHAPTER 1\nAn opening scene...";
        const cells = ["", "", "", blog, "", titles[row]];
        const csv = cells.map(value => `"${value.replaceAll('"', '""')}"`).join(",");
        return new Response(csv, { status: 200, headers: { "content-type": "text/csv" } });
      };
    });
    await page.goto(`file:///${path.join(__dirname, "..", "app.html").replaceAll("\\", "/")}`);
    await page.locator("#sheet-url").fill("https://docs.google.com/spreadsheets/d/example-id/edit");
    await page.locator("#row-list").fill("2,4-6");
    await page.locator("#image-settings summary").click();
    await page.locator("#sheet-tab").fill("sample");
    await page.locator("#blog-column").fill("D");
    await page.locator("#title-column").fill("F");
    await page.locator("#image-settings summary").click();
    await page.locator("#traffic-id").fill("123");
    await page.locator("#read-button").click();
    await page.getByText("Đã đọc 4 hàng.", { exact: false }).waitFor();
    await page.locator(".preview-item").first().locator("summary").click();
    await page.locator("#sheet-url").blur();
    await page.screenshot({ path: path.join(__dirname, "screenshot-1280x800.png") });
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
