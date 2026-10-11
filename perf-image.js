const assert = require("node:assert/strict");
const { chromium } = require(process.argv[2]);

// Compare the extension's previous byte loop with the native decoder for a 10 MB cover.
async function run() {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const page = await browser.newPage();
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const result = await page.evaluate(() => {
      const bytes = "a".repeat(10 * 1024 * 1024);
      const encoded = btoa(bytes);
      let start = performance.now();
      const binary = atob(encoded);
      const old = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) old[i] = binary.charCodeAt(i);
      const oldMs = performance.now() - start;
      let nativeMs = null;
      if (Uint8Array.fromBase64) {
        start = performance.now();
        const result = Uint8Array.fromBase64(encoded);
        nativeMs = performance.now() - start;
        if (result.length !== old.length) throw new Error("length mismatch");
      }
      return { oldMs: Math.round(oldMs), nativeMs: nativeMs && Math.round(nativeMs), supported: !!Uint8Array.fromBase64 };
    });
    console.log(JSON.stringify(result));
    if (result.supported) assert.ok(result.nativeMs < result.oldMs / 2);
  } finally { await browser.close(); }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
