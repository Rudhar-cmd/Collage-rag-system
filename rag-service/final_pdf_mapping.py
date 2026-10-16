
import json
import re
from pathlib import Path

BASE = Path("data/miet_crawl")
manifest = json.loads(
    (BASE / "manifest.json").read_text(encoding="utf-8")
)

# Map source URLs to the extracted PDF text files.
text_by_url = {}

for path in (BASE / "text").glob("*.txt"):
    content = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r"(?m)^SOURCE_URL:\s*(\S+)", content)
    if match:
        text_by_url.setdefault(match.group(1).strip(), []).append(path)

# OCR and recovered text use the original PDF filename stem.
auxiliary_dirs = [BASE / "ocr_text", BASE / "recovered_text"]
text_by_stem = {}

for folder in auxiliary_dirs:
    for path in folder.glob("*.txt"):
        text_by_stem.setdefault(path.stem.lower(), []).append(path)

records = []
missing = []
ambiguous = []

for pdf in manifest.get("pdfs", []):
    url = pdf.get("url", "").strip()
    pdf_path = BASE / pdf["file"]
    stem = pdf_path.stem.lower()

    candidates = text_by_url.get(url, [])

    if not candidates:
        candidates = text_by_stem.get(stem, [])

    # Remove repeated references to the same path.
    candidates = list(dict.fromkeys(candidates))

    if len(candidates) == 0:
        missing.append(pdf)
        continue

    if len(candidates) > 1:
        ambiguous.append({
            "url": url,
            "files": [str(p) for p in candidates]
        })
        continue

    text_path = candidates[0]
    content = text_path.read_text(encoding="utf-8", errors="replace")

    records.append({
        "url": url,
        "pdf_path": str(pdf_path),
        "text_path": str(text_path),
        "text_source": text_path.parent.name,
        "text_characters": len(content.strip()),
        "manifest_text_characters": pdf.get("text_chars", 0),
    })

output = BASE / "pdf_text_mapping.json"
output.write_text(
    json.dumps(records, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

print("PDFs in manifest:", len(manifest.get("pdfs", [])))
print("PDFs mapped uniquely:", len(records))
print("Missing mappings:", len(missing))
print("Ambiguous mappings:", len(ambiguous))
print("Mapping report:", output)

if missing:
    print("\nMissing PDFs:")
    for item in missing:
        print(" ", item.get("url"), "->", item.get("file"))

if ambiguous:
    print("\nAmbiguous mappings:")
    for item in ambiguous:
        print(" ", item["url"], "->", item["files"])
