from pathlib import Path

base = Path("data/miet_crawl")
text_dir = base / "text"
pdf_dirs = [base / "downloaded_pdfs", base / "recovered_pdfs"]

txt_files = list(text_dir.glob("*.txt"))
pdf_files = [
    p for folder in pdf_dirs if folder.exists()
    for p in folder.rglob("*")
    if p.is_file() and p.suffix.lower() == ".pdf"
]

print("Extracted TXT files:", len(txt_files))
print("Original PDFs:", len(pdf_files))

sizes = [p.stat().st_size for p in txt_files]
print("\nTXT size distribution:")
print("  Empty:", sum(s == 0 for s in sizes))
print("  Under 500 bytes:", sum(s < 500 for s in sizes))
print("  At least 500 bytes:", sum(s >= 500 for s in sizes))

print("\nSample extracted text files:")
for path in sorted(txt_files)[:15]:
    text = path.read_text(encoding="utf-8", errors="replace")
    preview = " ".join(text.split())[:120]
    print(f"\n{path.name} | {len(text)} characters")
    print(" ", preview)
