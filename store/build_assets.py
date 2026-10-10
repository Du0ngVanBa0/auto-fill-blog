from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
STORE = ROOT / "store"
ICONS.mkdir(exist_ok=True)

ROSE = "#EAB2C0"
PAPER = "#FFFCF7"
INK = "#334F49"
SAGE = "#BBD7CC"
PEACH = "#F5D5C5"


def font(size, bold=False):
    name = "georgiab.ttf" if bold else "georgia.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size)


def icon(size):
    avatar = Image.open(ICONS / "owner-avatar.png").convert("RGBA")
    avatar.resize((size, size), Image.Resampling.LANCZOS).save(ICONS / f"icon{size}.png")


for size in (16, 32, 48, 128):
    icon(size)


promo = Image.new("RGB", (440, 280), ROSE)
draw = ImageDraw.Draw(promo)
draw.rounded_rectangle((23, 21, 417, 259), radius=20, fill=PAPER)
promo.paste(Image.open(ICONS / "icon48.png").convert("RGB").resize((37, 37)), (43, 40))
draw.text((93, 45), "Auto Fill Blog", font=font(23, bold=True), fill=INK)

# A small spreadsheet flows into a clean article page.
draw.rounded_rectangle((57, 105, 184, 218), radius=8, fill="#F2FAF7", outline="#A3C3B7", width=2)
for y in (127, 151, 175, 199):
    draw.line((58, y, 183, y), fill="#B6D4C8", width=2)
for x in (99, 141):
    draw.line((x, 106, x, 217), fill="#B6D4C8", width=2)
draw.rounded_rectangle((103, 153, 138, 172), radius=3, fill=SAGE)

draw.line((200, 162, 236, 162), fill=INK, width=4)
draw.polygon(((237, 162), (226, 154), (226, 170)), fill=INK)

draw.rounded_rectangle((252, 100, 382, 222), radius=8, fill="#FFFFFF", outline="#E5C6BA", width=2)
draw.rounded_rectangle((270, 118, 365, 129), radius=3, fill=PEACH)
for y, end in ((150, 359), (167, 354), (184, 362), (201, 334)):
    draw.line((270, y, end, y), fill="#B0CFC3", width=5)
promo.save(STORE / "promo-440x280.png")
