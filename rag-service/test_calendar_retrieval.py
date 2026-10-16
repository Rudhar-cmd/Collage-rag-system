from pathlib import Path
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

BASE_DIR = Path(__file__).resolve().parent

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

store = Chroma(
    collection_name="miet_crawl_test",
    persist_directory=str(BASE_DIR / "chroma_db_miet_test"),
    embedding_function=embeddings,
)

questions = [
    "What events and dates are listed in MIET's academic calendar for 2026-27?",
    "When is the examination schedule published in September 2026?",
    "When does the mid-semester academic review take place?",
]

for question in questions:
    print(f"\n{'=' * 70}")
    print("QUESTION:", question)

    results = store.similarity_search_with_score(question, k=5)

    for doc, score in results:
        print("\nSource:", doc.metadata.get("source"))
        print("Distance:", round(score, 4))
        print(doc.page_content[:1000])
