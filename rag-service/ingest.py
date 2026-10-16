import json
import re
import shutil
import os
from dotenv import load_dotenv

from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Source documents
DATA_DIR = BASE_DIR / "data" / "raw"

# ChromaDB settings — must match rag.py and .env
CHROMA_DIR = Path(
    os.getenv("CHROMA_PATH", "./chroma_db")
)

if not CHROMA_DIR.is_absolute():
    CHROMA_DIR = (BASE_DIR / CHROMA_DIR).resolve()

COLLECTION_NAME = os.getenv(
    "COLLECTION_NAME", "college_documents"
)

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
)


def normalize_programme(filename):
    """Return a programme tag based on the source filename."""
    name = filename.lower().replace("_", " ").replace("-", " ")
    compact = re.sub(r"[^a-z0-9]+", "", name)

    # 1. Detect explicitly named programmes first
    if "mtech" in compact or "masteroftechnology" in compact:
        return "mtech"

    if "bca" in compact or "bachelorofcomputerapplications" in compact:
        return "bca"

    if "bba" in compact or "bachelorofbusinessadministration" in compact:
        return "bba"

    if "llb" in compact or "law" in compact:
        return "llb"

    # 2. Detect explicitly named B.Tech programmes
    if "btech" in compact or "bacheloroftechnology" in compact:
        if "aiml" in compact or (
            "artificialintelligence" in compact
            and "machinelearning" in compact
        ):
            return "btech_aiml"

        if "cybersecurity" in compact:
            return "btech_cybersecurity"

        if "cse" in compact or "computerscience" in compact:
            return "btech_cse"

        if "ece" in compact or "electronicsandcommunication" in compact:
            return "ece"

        return "btech_general"

    # 3. Existing syllabus filenames
    if "cseaiml" in compact or "aiml" in compact:
        return "btech_aiml"

    if "cybersecurity" in compact:
        return "btech_cybersecurity"

    if "ecesyllabus" in compact or "electronicsandcommunicationsyllabus" in compact:
        return "ece"

    if "csesyllabus" in compact or "computersciencesyllabus" in compact:
        return "btech_cse"

    if "ece" in compact:
        return "ece"

    if "cse" in compact or "computerscience" in compact:
        return "cse"

    return "general"




def load_sources():
    """Load PDFs and JSON syllabus files from data/raw."""
    documents = []
    source_paths = sorted(list(DATA_DIR.glob("*.pdf")) + list(DATA_DIR.glob("*.json")))

    for source_path in source_paths:
        print(f"Loading: {source_path.name}")
        programme = normalize_programme(source_path.name)

        if source_path.suffix.lower() == ".pdf":
            docs = PyPDFLoader(str(source_path)).load()
        elif source_path.suffix.lower() == ".json":
            try:
                payload = json.loads(source_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                print(f"  -> skipped invalid JSON: {exc}")
                continue

            # Store readable, searchable JSON text as a LangChain document.
            docs = [Document(
                page_content=json.dumps(payload, ensure_ascii=False, indent=2),
                metadata={"page": 1},
            )]
        else:
            continue

        for doc in docs:
            doc.metadata["source"] = source_path.name
            doc.metadata["filename"] = source_path.name
            doc.metadata["programme"] = programme

        print(f"  -> tagged programme: {programme}; pages/documents: {len(docs)}")
        documents.extend(docs)

    return documents


def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    for index, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = index
    return chunks


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    sources = list(DATA_DIR.glob("*.pdf")) + list(DATA_DIR.glob("*.json"))
    if not sources:
        print(f"No PDF or JSON sources found. Put them into: {DATA_DIR}")
        return

    documents = load_sources()
    if not documents:
        print("No readable documents were loaded; existing ChromaDB was not changed.")
        return

    print(f"Loaded {len(documents)} pages/documents.")
    chunks = split_documents(documents)
    print(f"Created {len(chunks)} chunks.")

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    # Rebuilds the local index only. Source PDFs/JSON files remain untouched.
    if CHROMA_DIR.exists():
        shutil.rmtree(CHROMA_DIR)

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_DIR),
    )
    print("Ingestion complete.")
    print(f"Vector database: {CHROMA_DIR}")
    print("Programme tags indexed:")
    for programme in sorted({d.metadata.get("programme", "general") for d in chunks}):
        print(f"  - {programme}")


if __name__ == "__main__":
    main()
