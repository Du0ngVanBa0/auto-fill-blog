import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
version = manifest["version"]
package = root / "store" / f"auto-fill-blog-{version}.zip"

files = [
    "manifest.json", "background.js", "app.html", "app.css", "app.js",
    "sheet.js", "images.js", "content.js", "fill.js", "privacy.html", "COPYRIGHT.txt",
    "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png",
    "icons/owner-avatar.png",
]
for name in files:
    if not (root / name).is_file():
        raise SystemExit(f"Thiếu file: {name}")

with ZipFile(package, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name in files:
        archive.write(root / name, arcname=name)

with ZipFile(package) as archive:
    assert archive.testzip() is None
    assert "manifest.json" in archive.namelist()

print(package)
