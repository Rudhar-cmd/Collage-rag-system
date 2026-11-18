import traceback
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from rag import detect_programme, retrieve_documents, generate_answer

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

    question = data.get("question", "")
    if not isinstance(question, str):
        return jsonify({"error": "question must be a string"}), 400
    question = question.strip()
    history = data.get("history", [])
    student_profile = data.get("student_profile")
    try:
        top_k = max(1, min(int(data.get("top_k", 3)), 20))
    except (TypeError, ValueError):
        return jsonify({"error": "top_k must be an integer"}), 400

    if not question:
        return jsonify({
            "error": "Question is required"
        }), 400
    if not isinstance(history, list) or len(history) > 8:
        return jsonify({
            "error": "history must be a list of no more than 8 turns"
        }), 400

    if student_profile is not None:
        if not isinstance(student_profile, dict):
            return jsonify({
                "error": "student_profile must be an object"
            }), 400

        semester = student_profile.get("semester")
        branch = student_profile.get("branch")
        valid_profile = (
            isinstance(semester, str)
            and isinstance(branch, str)
            and semester in {"1", "3", "5", "7"}
            and (
                (semester == "1" and branch == "general")
                or (
                    semester in {"3", "5", "7"}
                    and branch in {"cse", "aiml", "cybersecurity"}
                )
            )
        )
        if not valid_profile:
            return jsonify({
                "error": "student_profile has an invalid semester or branch"
            }), 400

    for turn in history:
        if (
            not isinstance(turn, dict)
            or turn.get("role") not in {"user", "assistant"}
            or not isinstance(turn.get("content"), str)
            or not turn["content"].strip()
            or len(turn["content"]) > 2000
        ):
            return jsonify({
                "error": "history contains an invalid turn"
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
        prior_turn_text = [
            turn["content"]
            for turn in history
        ][-4:]
        prior_questions = [
            turn["content"]
            for turn in history
            if turn["role"] == "user"
        ][-2:]

        conversation_text = " ".join([*prior_turn_text, question]).lower()
        current_text = question.lower()
        is_timetable_question = bool(
            re.search(
                r"\b(?:timetable|time table|class(?:es)?|schedule|periods?|"
                r"course(?: name)?|subject|9\s*[:.]?\s*35|monday|tuesday|"
                r"wednesday|thursday|friday)\b",
                current_text,
            )
        )
        if not is_timetable_question:
            is_timetable_question = bool(
                re.search(
                    r"\b(?:timetable|time table|class(?:es)?|schedule|periods?|"
                    r"course(?: name)?|subject|monday|tuesday|wednesday|"
                    r"thursday|friday)\b",
                    conversation_text,
                )
            )
        if not is_timetable_question:
            is_timetable_question = bool(
                re.search(
                    r"\b(?:1st|3rd|5th|7th|first|third|fifth|seventh)"
                    r"\s*(?:semester|sem\.?)\b",
                    current_text,
                )
            )
        profile_context = ""
        if student_profile and is_timetable_question:
            profile_lookup_text = " ".join([*prior_turn_text, question])
            has_semester = bool(
                re.search(
                    r"\b(?:semester|sem\.?)\s*(?:1|3|5|7)(?:st|rd|th)?\b"
                    r"|\b(?:1|3|5|7)(?:st|rd|th)?\s+semester\b"
                    r"|\b(?:1|3|5|7)(?:st|rd|th)?\s*(?:semester|sem\.?)\b"
                    r"|\b(?:first|third|fifth|seventh)\s+(?:semester|sem\.?)\b",
                    profile_lookup_text.lower(),
                )
            )
            has_branch = detect_programme(profile_lookup_text) is not None
            branch_names = {
                "cse": "CSE",
                "aiml": "AIML",
                "cybersecurity": "Cyber Security",
                "general": "B.E. first-year common",
            }
            profile_terms = []
            if not has_semester:
                profile_terms.append(f"semester {student_profile['semester']}")
            if not has_branch:
                profile_terms.append(branch_names[student_profile["branch"]])
            if profile_terms:
                profile_context = "B.Tech " + " ".join(profile_terms) + " time table"

        weekday_tokens = {
            "monday": "mon",
            "tuesday": "tue",
            "wednesday": "wed",
            "thursday": "thu",
            "friday": "fri",
        }
        weekday_context = " ".join(
            abbreviation
            for day, abbreviation in weekday_tokens.items()
            if is_timetable_question
            and re.search(rf"\b{day}\b", question.lower())
        )
        retrieval_question = " ".join(
            [*prior_questions, question, profile_context, weekday_context]
        )
        documents = retrieve_documents(retrieval_question, top_k) or []
        if not isinstance(documents, (list, tuple)):
            raise TypeError("retrieve_documents must return a list of documents")
        retrieval_time = time.perf_counter() - start

        answer_start = time.perf_counter()
        answer = generate_answer(
            question,
            documents,
            history,
            student_profile=(
                student_profile if is_timetable_question else None
            ),
            timetable_hint=is_timetable_question,
        )
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
