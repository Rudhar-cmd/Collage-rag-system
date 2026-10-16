
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE = Path("data/miet_crawl")
manifest = json.loads(
    (BASE / "manifest.json").read_text(encoding="utf-8")
)

text_dir = BASE / "text"
txt_files = list(text_dir.glob("*.txt"))

# Extract SOURCE_URL from each generated text file.
texts_by_url = {}

for path in txt_files:
    content = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r"(?m)^SOURCE_URL:\s*(\S+)", content)

    if match:
        url = match.group(1).strip()
        texts_by_url.setdefault(url, []).append({
            "file": path.name,
            "characters": len(content),
        })

pdfs = manifest.get("pdfs", [])
matched = []
missing = []

for pdf in pdfs:
    url = pdf.get("url", "").strip()
    candidates = texts_by_url.get(url, [])

    if candidates:
        matched.append((pdf, candidates))
    else:
        missing.append(pdf)

print("Manifest PDFs:", len(pdfs))
print("TXT files with SOURCE_URL:", len(texts_by_url))
print("PDF URLs with matching extracted text:", len(matched))
print("PDF URLs without matching extracted text:", len(missing))

print("\nFirst 25 PDFs without a URL match:")
for pdf in missing[:25]:
    print(f"\nURL: {pdf.get('url')}")
    print(f"File: {pdf.get('file')}")
    print(f"Manifest text_chars: {pdf.get('text_chars')}")

print("\nPDF entries with multiple text files for the same URL:")
for pdf, candidates in matched:
    if len(candidates) > 1:
        print(pdf.get("url"), "->", candidates)

print("\nNote: text_chars is a useful cross-check, not proof")
print("that the extracted text file is complete or accurate.")
