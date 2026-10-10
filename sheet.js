function spreadsheetId(url) {
  const match = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/.exec(url.trim());
  if (!match) throw new Error("Link Google Sheets không đúng định dạng.");
  return match[1];
}

function columnIndex(letter) {
  const value = letter.trim().toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(value)) throw new Error("Cột phải là chữ cái, ví dụ D hoặc F.");
  return [...value].reduce((index, char) => index * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function columnLetter(index) {
  let value = index + 1;
  let result = "";
  while (value) {
    value--;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"' && value === "") quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && csv[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("Dữ liệu CSV từ Sheets chưa hoàn chỉnh.");
  if (row.length || value) { row.push(value); rows.push(row); }
  return rows;
}

function parseRowList(value) {
  const rows = [];
  const seen = new Set();
  const tokens = String(value).trim().replace(/\s*[-–]\s*/g, "-").split(/[,;\s]+/).filter(Boolean);
  if (!tokens.length) throw new Error("Nhập hàng cần điền, ví dụ 2,4-6.");
  for (const token of tokens) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(token);
    if (!match) throw new Error(`Hàng "${token}" không hợp lệ. Dùng dạng 2,4-6.`);
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
      throw new Error(`Khoảng hàng "${token}" không hợp lệ.`);
    }
    if (end - start > 49) {
      throw new Error("Mỗi lần chọn tối đa 50 hàng.");
    }
    for (let row = start; row <= end; row++) {
      if (!seen.has(row)) {
        if (rows.length === 50) throw new Error("Mỗi lần chọn tối đa 50 hàng.");
        seen.add(row);
        rows.push(row);
      }
    }
  }
  return rows;
}

function parseImagePaths(value) {
  return String(value || "").split(/\r?\n/).map(path => path.trim()).filter(Boolean);
}

async function readSheetRow({ sheetUrl, sheetTab, blogColumn, titleColumn, imageColumn = "", rowNumber }) {
  const id = spreadsheetId(sheetUrl);
  const blogIndex = columnIndex(blogColumn);
  const titleIndex = columnIndex(titleColumn);
  const imageIndex = imageColumn.trim() ? columnIndex(imageColumn) : -1;
  const row = Number(rowNumber);
  if (!Number.isSafeInteger(row) || row < 1) throw new Error("Số hàng phải là số nguyên từ 1 trở lên.");
  if (!sheetTab.trim()) throw new Error("Nhập tên tab trong Sheets.");

  const endColumn = columnLetter(Math.max(blogIndex, titleIndex, imageIndex));
  const url = new URL(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheetTab.trim());
  url.searchParams.set("range", `A${row}:${endColumn}${row}`);
  url.searchParams.set("headers", "0");
  const response = await fetch(url, { credentials: "omit" });
  const csv = await response.text();
  if (!response.ok || !response.headers?.get("content-type")?.includes("text/csv") || /^\s*</.test(csv)) {
    throw new Error("Không đọc được Sheets. Kiểm tra link, tên tab và quyền xem bằng liên kết.");
  }
  const cells = parseCsv(csv)[0];
  if (!cells) throw new Error(`Hàng ${row} không có dữ liệu trong tab ${sheetTab}.`);
  const blog = cells[blogIndex] || "";
  const title = cells[titleIndex]?.trim() || "";
  const imagePaths = imageIndex < 0 ? [] : parseImagePaths(cells[imageIndex]);
  if (!blog.trim()) throw new Error(`Ô ${blogColumn.toUpperCase()}${row} không có nội dung blog.`);
  if (!title) throw new Error(`Ô ${titleColumn.toUpperCase()}${row} không có tiêu đề blog.`);
  return { blog, title, imagePaths, row, blogCell: `${blogColumn.toUpperCase()}${row}`,
    titleCell: `${titleColumn.toUpperCase()}${row}`,
    imageCell: imageIndex < 0 ? "" : `${imageColumn.toUpperCase()}${row}` };
}

async function readSheetRows(settings) {
  const numbers = parseRowList(settings.rowList);
  const rows = new Array(numbers.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, numbers.length) }, async () => {
    while (next < numbers.length) {
      const index = next++;
      rows[index] = await readSheetRow({ ...settings, rowNumber: numbers[index] });
    }
  }));
  return rows;
}

if (typeof module !== "undefined") module.exports = {
  spreadsheetId, columnIndex, columnLetter, parseCsv, parseRowList, parseImagePaths, readSheetRow, readSheetRows
};
