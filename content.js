function contentFilePath(value) {
  const match = /^\s*\[FILE[ \t]+([^\]\r\n]+)\]/i.exec(String(value).replace(/^\uFEFF/, ""));
  return match ? match[1].trim() : "";
}

function localFileUrl(path) {
  const value = String(path).trim().replace(/^["']|["']$/g, "");
  if (/^file:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.protocol !== "file:") throw new Error("Đường dẫn file không hợp lệ.");
    return url.href;
  }
  const match = /^([A-Za-z]):[\\/](.+)$/.exec(value);
  if (!match) throw new Error(`Đường dẫn "${path}" phải là đường dẫn local đầy đủ, ví dụ D:\\stories\\blog.txt.`);
  const segments = match[2].split(/[\\/]+/);
  if (segments.some(segment => !segment || segment === "." || segment === "..")) {
    throw new Error(`Đường dẫn "${path}" không hợp lệ.`);
  }
  return `file:///${match[1].toUpperCase()}:/${segments.map(encodeURIComponent).join("/")}`;
}

async function readLocalTextFile(path) {
  if (!/\.(txt|md)$/i.test(path)) throw new Error("File nội dung cần có đuôi .txt hoặc .md.");
  if (typeof chrome !== "undefined" && chrome.extension?.isAllowedFileSchemeAccess) {
    const allowed = await chrome.extension.isAllowedFileSchemeAccess();
    if (!allowed) throw new Error("Bật 'Allow access to file URLs' cho tiện ích trong chrome://extensions, rồi bấm Đọc lại.");
  }
  let response;
  try { response = await fetch(localFileUrl(path), { credentials: "omit" }); }
  catch { throw new Error(`Không mở được file "${path}". Kiểm tra đường dẫn và quyền file URLs của tiện ích.`); }
  if (!response.ok && response.status !== 0) throw new Error(`Không đọc được file "${path}".`);
  const blob = await response.blob();
  if (blob.size > 10 * 1024 * 1024) throw new Error(`File "${path}" lớn hơn 10 MB.`);
  const blog = (await blob.text()).replace(/^\uFEFF/, "");
  if (!blog.trim()) throw new Error(`File "${path}" không có nội dung.`);
  return blog;
}

async function resolveContentRow(row, loadFile = readLocalTextFile) {
  const path = contentFilePath(row.blog);
  if (!path) return row;
  try {
    const blog = await loadFile(path);
    if (!blog.trim()) throw new Error(`File "${path}" không có nội dung.`);
    return { ...row, blog, contentFilePath: path };
  } catch (error) {
    return { ...row, blog: "", contentFilePath: path, contentError: error.message };
  }
}

async function resolveContentRows(rows, loadFile = readLocalTextFile) {
  return Promise.all(rows.map(row => resolveContentRow(row, loadFile)));
}

if (typeof module !== "undefined") module.exports = {
  contentFilePath, localFileUrl, readLocalTextFile, resolveContentRow, resolveContentRows
};
