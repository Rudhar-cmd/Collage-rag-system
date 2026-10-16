
import fitz
import pytesseract
from PIL import Image
from io import BytesIO
from pathlib import Path
import json

BASE = Path("data/miet_crawl")
OUTPUT = BASE / "ocr_text"
OUTPUT.mkdir(parents=True, exist_ok=True)

# Scan the original downloaded and recovered PDFs.
PDF_DIRS = [
    BASE / "downloaded_pdfs",
    BASE / "recovered_pdfs",
]

# Only OCR PDFs that have no extractable text.
scanned_pdfs = []

for folder in PDF_DIRS:
    if not folder.exists():
        continue

    for pdf_path in folder.rglob("*"):
        if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
            continue

        try:
            doc = fitz.open(pdf_path)
            text_length = sum(len(page.get_text().strip()) for page in doc)

            if text_length < 20:
                scanned_pdfs.append(pdf_path)

            doc.close()
        except Exception as exc:
            print(f"Cannot inspect {pdf_path.name}: {exc}")

print(f"Scanned PDFs found: {len(scanned_pdfs)}")

results = []

for index, pdf_path in enumerate(scanned_pdfs, start=1):
    output_path = OUTPUT / f"{pdf_path.stem}.txt"

    if output_path.exists() and output_path.stat().st_size > 100:
        print(f"[{index}/{len(scanned_pdfs)}] Skipping existing: {pdf_path.name}")
        continue

    print(f"[{index}/{len(scanned_pdfs)}] OCR: {pdf_path.name}")

    try:
        doc = fitz.open(pdf_path)
        pages = []

        for page_number, page in enumerate(doc, start=1):
            pix = page.get_pixmap(
                matrix=fitz.Matrix(2, 2),
                alpha=False
            )
            image = Image.open(BytesIO(pix.tobytes("png")))

            text = pytesseract.image_to_string(image, lang="eng")
            pages.append(f"--- Page {page_number} ---\n{text}")

        doc.close()

        full_text = "\n\n".join(pages)
        output_path.write_text(full_text, encoding="utf-8")

        results.append({
            "pdf": str(pdf_path),
            "output": str(output_path),
            "characters": len(full_text),
            "status": "success" if full_text.strip() else "empty"
        })

        print(f"  Saved {len(full_text)} characters")

    except Exception as exc:
        results.append({
            "pdf": str(pdf_path),
            "status": "error",
            "error": str(exc)
        })
        print(f"  ERROR: {exc}")

report_path = OUTPUT / "ocr_report.json"
report_path.write_text(
    json.dumps(results, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

print("\nOCR batch finished.")
print(f"Report: {report_path}")
print(f"Successful: {sum(r['status'] == 'success' for r in results)}")
print(f"Errors: {sum(r['status'] == 'error' for r in results)}")
