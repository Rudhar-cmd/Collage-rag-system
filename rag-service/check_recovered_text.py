
import json
from pathlib import Path

base = Path("data/miet_crawl")
manifest = json.loads(
    (base / "manifest.json").read_text(encoding="utf-8")
)

for item in manifest.get("pdfs", []):
    file_path = item.get("file", "")
    if not file_path.startswith("recovered_pdfs/"):
        continue

    pdf_name = Path(file_path).name
    stem = Path(pdf_name).stem

    # Check common locations for extracted text.
    candidates = [
        base / "text" / f"{stem}.txt",
        base / "ocr_text" / f"{stem}.txt",
    ]

    found = [str(p) for p in candidates if p.exists()]

    print(f"\nPDF: {pdf_name}")
    print(f"Manifest text_chars: {item.get('text_chars')}")
    print("Matching text:", found if found else "Not found by filename")
