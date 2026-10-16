import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from rag import retrieve_documents, generate_answer

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "college-rag-service"
    })


@app.post("/query")
def query():
    print("FLASK /query ROUTE HIT", flush=True)
    data = request.get_json(silent=True) or {}

    question = data.get("question", "").strip()
    top_k = int(data.get("top_k", 3))

    if not question:
        return jsonify({
            "error": "Question is required"
        }), 400

    try:
        import time

        start = time.perf_counter()

        documents = retrieve_documents(question, top_k)
        retrieval_time = time.perf_counter() - start

        answer_start = time.perf_counter()
        answer = generate_answer(question, documents)
        generation_time = time.perf_counter() - answer_start
 
        print(
            f"Retrieval: {retrieval_time:.2f}s | "
            f"Answer generation: {generation_time:.2f}s | "
            f"Total: {time.perf_counter() - start:.2f}s",
            flush=True
            )

        # Step 3: Prepare source information
        sources = []

        for doc in documents:
            sources.append({
                "source": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", "Unknown"),
                "score": doc.metadata.get("score")
            })

        return jsonify({
            "answer": answer,
            "sources": sources
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True
    )