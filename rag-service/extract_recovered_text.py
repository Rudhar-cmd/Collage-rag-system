
import fitz
import json
from pathlib import Path

BASE = Path("data/miet_crawl")
manifest = json.loads(
    (BASE / "manifest.json").read_text(encoding="utf-8")
)

output_dir = BASE / "recovered_text"
output_dir.mkdir(parents=True, exist_ok=True)

targets = {
    "academic_council_2024.pdf",
    "academic_council_2023.pdf",
    "academic_council_2022.pdf",
    "academic_council_2021.pdf",
    "iqac_pi360_1737356467.pdf",
}

for item in manifest.get("pdfs", []):
    pdf_path = BASE / item["file"]

    if pdf_path.name not in targets:
        continue

    if not pdf_path.exists():
        print(f"MISSING PDF: {pdf_path}")
        continue

    doc = fitz.open(pdf_path)
    pages = []

    for number, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()
        pages.append(f"--- Page {number} ---\n{text}")

    full_text = "\n\n".join(pages)
    doc.close()

    output_path = output_dir / f"{pdf_path.stem}.txt"
    output_path.write_text(full_text, encoding="utf-8")

    print(f"\nPDF: {pdf_path.name}")
    print(f"Manifest characters: {item.get('text_chars')}")
    print(f"Extracted characters: {len(full_text)}")
    print(f"Output: {output_path}")

    if len(full_text.strip()) < 200:
        print("WARNING: Very little selectable text; OCR may be needed.")
    else:
        print("Preview:", " ".join(full_text.split())[:250])
