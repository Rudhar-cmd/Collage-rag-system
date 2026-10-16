
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

BASE_DIR = Path(__file__).resolve().parent
CRAWL_DIR = BASE_DIR / "data" / "miet_crawl"
CHROMA_DIR = BASE_DIR / "chroma_db_miet_test"

TEXT_DIRS = [
    CRAWL_DIR / "text",
    CRAWL_DIR / "ocr_text",
    CRAWL_DIR / "recovered_text",
]

def main():
    documents = []

    for folder in TEXT_DIRS:
        if not folder.exists():
            continue

        for path in sorted(folder.iterdir()):
            if path.suffix.lower() not in {".md", ".txt"}:
                continue
            if path.name == "ocr_report.json":
                continue

            content = path.read_text(
                encoding="utf-8", errors="replace"
            ).strip()

            if content:
                documents.append(
                    Document(
                        page_content=content,
                        metadata={
                            "source": str(path.relative_to(BASE_DIR)),
                            "filename": path.name,
                        },
                    )
                )

    print(f"Loaded {len(documents)} files.", flush=True)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks.", flush=True)

    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={
            "normalize_embeddings": True,
            "batch_size": 16,
        },
    )

    # Create a fresh, separate test collection.
    if CHROMA_DIR.exists():
        import shutil
        shutil.rmtree(CHROMA_DIR)

    store = Chroma(
        collection_name="miet_crawl_test",
        persist_directory=str(CHROMA_DIR),
        embedding_function=embeddings,
    )

    batch_size = 64

    for start in range(0, len(chunks), batch_size):
        batch = chunks[start:start + batch_size]
        ids = [f"miet-chunk-{i}" for i in range(start, start + len(batch))]

        store.add_documents(documents=batch, ids=ids)

        print(
            f"Indexed {min(start + len(batch), len(chunks))}"
            f"/{len(chunks)} chunks",
            flush=True,
        )

    print("\nIngestion complete!", flush=True)
    print(f"Total indexed: {store._collection.count()}", flush=True)
    print(f"Test database: {CHROMA_DIR}", flush=True)

if __name__ == "__main__":
    main()
