
import json
from pathlib import Path

BASE = Path("data/miet_crawl")

manifest = json.loads(
    (BASE / "manifest.json").read_text(encoding="utf-8")
)

text_dirs = [
    BASE / "text",
    BASE / "ocr_text",
    BASE / "recovered_text",
]

available_text = {}

for folder in text_dirs:
    if not folder.exists():
        continue

    for path in folder.glob("*.txt"):
        content = path.read_text(encoding="utf-8", errors="replace")
        available_text[path.name] = len(content.strip())

print("Manifest PDFs:", len(manifest.get("pdfs", [])))
print("Extracted text files across folders:", len(available_text))

print("\nText files by folder:")
for folder in text_dirs:
    count = len(list(folder.glob("*.txt"))) if folder.exists() else 0
    print(f"  {folder.name}: {count}")

print("\nOCR files with fewer than 500 characters:")
for path in (BASE / "ocr_text").glob("*.txt"):
    content = path.read_text(encoding="utf-8", errors="replace")
    if len(content.strip()) < 500:
        print(f"  {path.name}: {len(content.strip())} characters")

print("\nNote: this counts files, not unique PDF sources.")
print("The next ingestion step must match text to manifest URLs.")
