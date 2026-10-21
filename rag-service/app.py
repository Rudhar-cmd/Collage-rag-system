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
    try:
        top_k = max(1, min(int(data.get("top_k", 3)), 20))
    except (TypeError, ValueError):
        return jsonify({"error": "top_k must be an integer"}), 400

    if not question:
        return jsonify({
            "error": "Question is required"
        }), 400
    # Handle greetings without searching the PDF database
    greeting = question.lower().strip(" !.,?")

    if greeting in {
    "hi", "hello", "hey",
    "good morning", "good afternoon", "good evening"
   }:
     return jsonify({
        "answer": (
            "Hi! 👋 I'm your MIET College AI Assistant. "
            "You can ask me about courses, syllabus, attendance, "
            "fees, examinations, and other college-related information."
        ),
        "sources": []
    }), 200
    try:
        import time

        start = time.perf_counter()

        # Keep the retrieval contract stable even if a vector-store adapter
        # unexpectedly returns None for an empty result set.
        documents = retrieve_documents(question, top_k) or []
        if not isinstance(documents, (list, tuple)):
            raise TypeError("retrieve_documents must return a list of documents")
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
            metadata = getattr(doc, "metadata", None) or {}
            sources.append({
                "source": metadata.get("source", "Unknown"),
                "page": metadata.get("page", "Unknown"),
                "score": metadata.get("score")
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
