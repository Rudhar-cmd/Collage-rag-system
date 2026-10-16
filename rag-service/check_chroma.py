import chromadb

client = chromadb.PersistentClient(path="./chroma_db")

collections = client.list_collections()

if not collections:
    print("No collections found in ChromaDB.")

for collection in collections:
    print(f"\nCollection: {collection.name}")
    print(f"Document count: {collection.count()}")

    # Search stored document text for the academic year.
    try:
        results = collection.get(
            where_document={"$contains": "2026-27"},
            include=["documents"],
            limit=5
        )

        docs = results.get("documents") or []
        print(f"Documents matching '2026-27': {len(docs)}")

        for i, doc in enumerate(docs, 1):
            print(f"\n--- Match {i} ---")
            print(doc[:700])

    except Exception as e:
        print("Document search error:", e)
