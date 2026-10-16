
from pathlib import Path
from collections import defaultdict

base = Path("data/miet_crawl")
pdf_dirs = [base / "downloaded_pdfs", base / "recovered_pdfs"]
text_dir = base / "text"

# Index extracted text files by filename stem.
text_stems = {p.stem.lower() for p in text_dir.glob("*.txt")}

pdfs = [
    p for folder in pdf_dirs if folder.exists()
    for p in folder.rglob("*")
    if p.is_file() and p.suffix.lower() == ".pdf"
]

matched = []
unmatched = []

for pdf in pdfs:
    if pdf.stem.lower() in text_stems:
        matched.append(pdf)
    else:
        unmatched.append(pdf)

print("Total original PDFs:", len(pdfs))
print("PDFs with matching extracted TXT filename:", len(matched))
print("PDFs without matching TXT filename:", len(unmatched))

print("\nFirst 30 unmatched PDFs:")
for pdf in unmatched[:30]:
    print(" ", pdf.relative_to(base))

print("\nNote: unmatched filenames do not always mean missing text.")
print("Compare source URLs and manifest metadata before drawing conclusions.")
