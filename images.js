function validateImageFile(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error(`Ảnh ${file.name} lớn hơn 10 MB.`);
  if (!/^image\//.test(file.type) && !/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)) {
    throw new Error(`${file.name} không phải file ảnh.`);
  }
}

function readImagePayload(file) {
  validateImageFile(file);
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

if (typeof module !== "undefined") module.exports = { validateImageFile, readImagePayload };
