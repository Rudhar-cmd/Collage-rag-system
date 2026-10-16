# MIET Jammu crawler for College AI

## What it does
- Crawls public pages on `mietjmu.in` only.
- Reads `robots.txt` and stops if robots.txt cannot be fetched.
- Tries the site's sitemap and follows internal links.
- Downloads linked PDFs that are publicly linked and allowed by robots.txt.
- Writes per-page `.md` files under `data/miet_crawl/text/`.
- Writes `pages.jsonl` and `manifest.json` with URLs, categories and crawl timestamps.
- Generates topic PDFs under `data/miet_crawl/pdf/`.
- Stores downloaded source PDFs under `data/miet_crawl/downloaded_pdfs/`.

## Install
Run from your `rag-service` directory, using your existing virtual environment:

```bash
pip install -r requirements-crawler.txt
```

Copy `miet_crawler.py` into `rag-service/`.

## Run
Start with a small test:

```bash
python miet_crawler.py --max-pages 30 --delay 1.5
```

Then, if the output looks good:

```bash
python miet_crawler.py --max-pages 500 --delay 1.5
```

Output folder defaults to `rag-service/data/miet_crawl/`. Override it using `--out`.

## Important safeguards
- Do not lower the delay to hammer the website.
- This only collects publicly accessible pages; it does not log in or bypass access controls.
- Review the generated files and manifest before adding them to ChromaDB.
- Fees, admission requirements, deadlines and scholarships may conflict across old pages. Preserve URLs and verify against current official notices.
- This script uses simple page categorization by URL/title; review the category assignment.
- Text extraction does not OCR scanned PDFs. Run OCR separately if needed.
- For repeat crawls, compare `manifest.json` or hashes before reindexing to avoid duplicates.

## RAG ingestion
Recommended next step: update your ingestion script to read `.md` and `.txt` files from `data/miet_crawl/text/`, attach `source` (URL) and `category` metadata, split into chunks, and rebuild or update the ChromaDB collection. Don't ingest the topic PDFs as well as their source text; that would duplicate the same content.
