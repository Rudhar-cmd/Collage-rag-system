
import fitz
import pytesseract
from PIL import Image
from io import BytesIO
from pathlib import Path

pdf_path = Path("data/miet_crawl/recovered_pdfs/academic_council_2020.pdf")
output_dir = Path("data/miet_crawl/ocr_text")
output_dir.mkdir(parents=True, exist_ok=True)

if not pdf_path.exists():
    raise FileNotFoundError(f"PDF not found: {pdf_path}")

doc = fitz.open(pdf_path)
extracted_pages = []

for page_number, page in enumerate(doc, start=1):
    # Render the page at 2x resolution for OCR
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image = Image.open(BytesIO(pix.tobytes("png")))

    text = pytesseract.image_to_string(image, lang="eng")
    extracted_pages.append(f"\n--- Page {page_number} ---\n{text}")

    print(f"Processed page {page_number}/{len(doc)}")

output_path = output_dir / "academic_council_2020.txt"
output_path.write_text("\n".join(extracted_pages), encoding="utf-8")

print(f"\nOCR completed. Text saved to: {output_path}")
print("\nExtracted text preview:\n")
print(output_path.read_text(encoding="utf-8")[:2000])
