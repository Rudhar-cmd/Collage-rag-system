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
    "What is the examination schedule publication date for 2026-27?",
    "When is the mid-semester academic review in 2026-27?",
    "What are the final examination dates for 2026-27?",
]

for question in questions:
    print("\nQUESTION:", question)

    results = store.similarity_search_with_score(
        question,
        k=3,
        filter={"filename": "Academic-Calender-AY-2026-27-1.txt"},
    )

    for doc, score in results:
        print("\nSource:", doc.metadata.get("source"))
        print("Distance:", round(score, 4))
        print(doc.page_content[:900])
