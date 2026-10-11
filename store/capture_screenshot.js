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
          return new Response("CHAPTER 1 - A New Start\n\nSample text for the first chapter.\n\nCHAPTER 2 - The Letter\n\nSample text for the second chapter.",
            { status: 200, headers: { "content-type": "text/plain" } });
        }
        const row = Number(/A(\d+):/.exec(url.searchParams.get("range"))[1]);
        const titles = { 3: "Sample Story One", 4: "Sample Story Two", 5: "Sample Story Three" };
        const blog = row === 3
          ? "[FILE C:\\sample\\chapter.txt]\nPreview text is shortened in Sheets"
          : "CHAPTER 1 - An opening scene\n\nSample chapter content.";
        const cells = ["", "", "", blog, "", titles[row]];
        const csv = cells.map(value => `"${value.replaceAll('"', '""')}"`).join(",");
        return new Response(csv, { status: 200, headers: { "content-type": "text/csv" } });
      };
    });
    await page.goto(`file:///${path.join(__dirname, "..", "app.html").replaceAll("\\", "/")}`);
    await page.locator("#sheet-url").fill("https://docs.google.com/spreadsheets/d/example-id/edit");
    await page.locator("#row-list").fill("3-5");
    await page.locator("#traffic-id").fill("123");

    const samplePng = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#e6b1a4";
      ctx.fillRect(0, 0, 96, 96);
      ctx.fillStyle = "#5b6c5e";
      ctx.fillRect(24, 24, 48, 48);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.locator('.row-entry[data-row="4"] input[type="file"]').setInputFiles({
      name: "cover-row-4.png", mimeType: "image/png", buffer: Buffer.from(samplePng, "base64")
    });
    await page.locator(".form-panel").screenshot({ path: path.join(__dirname, "readme-rows.png") });

    await page.locator("#image-settings summary").click();
    await page.locator("#sheet-tab").fill("output");
    await page.locator("#blog-column").fill("D");
    await page.locator("#title-column").fill("F");
    await page.locator("#image-settings").screenshot({ path: path.join(__dirname, "readme-columns.png") });
    await page.locator("#image-settings summary").click();

    await page.locator("#read-button").click();
    await page.getByText("Đã đọc 3 hàng.", { exact: false }).waitFor();
    await page.locator(".preview-details").first().locator("summary").click();
    await page.locator("#sheet-url").blur();
    await page.locator(".shell").screenshot({ path: path.join(__dirname, "readme-preview.png") });
    await page.screenshot({ path: path.join(__dirname, "screenshot-1280x800.png") });

  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
