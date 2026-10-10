function normalizeImagePath(value) {
  let path = String(value).trim().replace(/^\[FILE\s+(.+)\]$/i, "$1").replace(/^["']|["']$/g, "");
  if (/^file:\/\//i.test(path)) {
    try { path = decodeURIComponent(new URL(path).pathname); } catch { /* Keep the original path. */ }
  }
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "").toLowerCase();
}

function matchLocalFile(filePath, files, label) {
  if (!filePath) return null;
  if (!files.length) throw new Error(`Chưa chọn thư mục ${label}.`);
  const target = normalizeImagePath(filePath);
  let bestScore = 0;
  let matches = [];
  for (const file of files) {
    const relative = normalizeImagePath(file.webkitRelativePath || file.name);
    const parts = relative.split("/");
    const variants = [relative];
    if (parts.length > 1) variants.push(parts.slice(1).join("/"));
    if (!target.includes("/")) variants.push(file.name.toLowerCase());
    const score = Math.max(0, ...variants.map(value =>
      target === value || target.endsWith(`/${value}`) ? value.split("/").length : 0));
    if (score > bestScore) { bestScore = score; matches = [file]; }
    else if (score && score === bestScore) matches.push(file);
  }
  if (!bestScore) throw new Error(`Không tìm thấy ${label} "${filePath}" trong thư mục đã chọn.`);
  if (matches.length > 1) throw new Error(`Có nhiều ${label} khớp "${filePath}". Hãy chọn thư mục hẹp hơn.`);
  return matches[0];
}

function matchImageFile(imagePath, files) {
  return matchLocalFile(imagePath, files, "ảnh");
}

function readImagePayload(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error(`Ảnh ${file.name} lớn hơn 10 MB.`);
  if (!/^image\//.test(file.type) && !/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)) {
    throw new Error(`${file.name} không phải file ảnh.`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const extension = file.name.split(".").pop().toLowerCase();
    const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
      gif: "image/gif", avif: "image/avif", bmp: "image/bmp" }[extension];
    reader.onerror = () => reject(new Error(`Không đọc được ảnh ${file.name}.`));
    reader.onload = () => resolve({
      name: file.name, type: file.type || mime,
      base64: String(reader.result).split(",", 2)[1]
    });
    reader.readAsDataURL(file);
  });
}

if (typeof module !== "undefined") module.exports = { normalizeImagePath, matchLocalFile, matchImageFile };
