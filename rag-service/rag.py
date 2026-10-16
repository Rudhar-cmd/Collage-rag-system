
import os
import re
from datetime import date
from pathlib import Path

from langchain_groq import ChatGroq
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

CHROMA_PATH = Path(
    os.getenv("CHROMA_PATH", str(BASE_DIR / "chroma_db"))
)

if not CHROMA_PATH.is_absolute():
    CHROMA_PATH = (BASE_DIR / CHROMA_PATH).resolve()

CHROMA_PATH = str(CHROMA_PATH)

COLLECTION_NAME = os.getenv(
    "COLLECTION_NAME", "college_documents"
)

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
)


# ============================================================
# PROGRAMME CONFIGURATION
# ============================================================

PROGRAMME_ALIASES = {
    "aiml": [
        "ai&ml",
        "ai & ml",
        "aiml",
        "artificial intelligence and machine learning",
        "artificial intelligence & machine learning",
    ],
    "cybersecurity": [
        "cyber security",
        "cybersecurity",
    ],
    "bca": [
        "bca",
        "bachelor of computer applications",
    ],
    "bba": [
        "bba",
        "bachelor of business administration",
    ],
    "llb": [
        "llb",
        "law syllabus",
        "law programme",
        "law program",
    ],
    "mtech": [
        "m.tech",
        "mtech",
        "master of technology",
    ],
    "cse": [
        "cse",
        "computer science engineering",
        "computer science and engineering",
        "core cse",
    ],
}

# These must match programme metadata created by ingest.py.
BTECH_PROGRAMMES = [
    "btech_cse",
    "btech_aiml",
    "btech_cybersecurity",
]


# ============================================================
# EMBEDDINGS AND VECTOR DATABASE
# ============================================================

def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def get_vector_store():
    return Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_PATH,
        embedding_function=get_embeddings(),
    )


# ============================================================
# PROGRAMME DETECTION
# ============================================================






def get_syllabus_answer(question):
    """Read syllabus details from the JSON for the requested programme."""

    import json
    import re

    q = re.sub(r"\s+", " ", question.lower()).strip()

    # Handle only syllabus-related questions.
    if not any(term in q for term in (
        "syllabus",
        "semester-wise subjects",
        "subject list",
    )):
        return None

    raw_dir = BASE_DIR / "data" / "raw"

    # --------------------------------------------------
    # 1. Detect the requested programme.
    # Specific programmes must come before generic CSE.
    # --------------------------------------------------

    # M.Tech
    if re.search(
        r"\bm\s*\.?\s*tech\b|\bmtech\b|master of technology",
        q,
    ):
        if re.search(
            r"\b(other specializations|other specialisations|"
            r"specializations other than cse|"
            r"specialisations other than cse)\b",
            q,
        ):
            filename = "mtech_other_specializations_syllabus.json"
        else:
            filename = "mtech_cse_syllabus.json"

    # BBA
    elif re.search(
        r"\bb\s*\.?\s*ba\b|bachelor of business administration",
        q,
    ):
        filename = "bba_syllabus.json"

    # BCA
    elif re.search(
        r"\bb\s*\.?\s*ca\b|bca|bachelor of computer applications",
        q,
    ):
        filename = "bca_syllabus.json"

    # LLB
    elif re.search(
        r"\bl\s*\.?\s*lb\b|llb|bachelor of laws|law syllabus",
        q,
    ):
        filename = "llb_syllabus_full_6_semesters.json"

    # ECE
    elif re.search(
        r"\bece\b|electronics and communication engineering",
        q,
    ):
        filename = "ece_syllabus.json"

    # Cyber Security: do not substitute another programme's syllabus.
    elif re.search(r"cyber\s*security|cybersecurity", q):
        return (
            "I couldn't find a verified Cyber Security-specific syllabus "
            "in the available knowledge base. Please refer to the official "
            "curriculum. I won't substitute the AI&ML or generic CSE syllabus."
        )

    # AI & ML
    elif re.search(
        r"\bai\s*&?\s*ml\b|\baiml\b|"
        r"artificial intelligence and machine learning",
        q,
    ):
        filename = "cse_aiml_syllabus.json"

    # Core CSE / generic CSE
    # Core CSE must not use an AI&ML syllabus as a substitute.
    # Core CSE / generic CSE
    elif re.search(
    r"\b(core\s+cse|cse\s+core|core\s+computer\s+science)\b",
    q,
    ):
      filename = "cse_syllabus.json"

    elif re.search(
    r"\bcse\b|computer science engineering|"
    r"computer science and engineering",
    q,
    ):
      filename = "cse_syllabus.json"

    # --------------------------------------------------
    # 2. Check that the selected JSON file exists.
    # --------------------------------------------------

    path = raw_dir / filename

    if not path.exists():
        print(f"Syllabus JSON not found: {path}")

        return (
            "I couldn't find a verified syllabus file for this programme. "
            f"Expected file: {filename}"
        )

    # --------------------------------------------------
    # 3. Load the JSON exactly once.
    # --------------------------------------------------

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Could not read {filename}: {exc}")

        return (
            "The syllabus file could not be read. "
            "Please check the JSON file format."
        )

    # --------------------------------------------------
    # 4. Format the syllabus answer.
    # Supports programName or source.title metadata.
    # --------------------------------------------------

    source_info = data.get("source", {})
    if not isinstance(source_info, dict):
        source_info = {}

    program_name = (
        data.get("programName")
        or source_info.get("title")
        or path.stem
    )

    lines = [f"# {program_name} — Syllabus"]

    batch = data.get("batch") or source_info.get("batch")

    if batch:
        lines.append(f"**Batch:** {batch}")

    lines.append("")

    semesters = data.get("semesters", [])

    if not semesters:
        lines.append(
            "No structured semester list is available in this JSON."
        )

    for semester in semesters:
        semester_number = semester.get("semester", "Unknown")
        lines.append(f"## Semester {semester_number}")

        # Preserve scheme/category information when present.
        scheme = semester.get("scheme")
        if scheme:
            lines.append(f"**Scheme:** {scheme}")
            lines.append("")

        subjects = semester.get("subjects", [])

        if subjects:
            for subject in subjects:
                code = subject.get("code", "Code not listed")
                name = subject.get("name", "Unnamed subject")

                line = f"- **{code}** — {name}"

                if subject.get("credits") is not None:
                    line += f" · Credits: {subject['credits']}"

                if subject.get("marks") is not None:
                    line += f" · Marks: {subject['marks']}"

                lines.append(line)
        else:
            # Some curriculum JSON files use categories instead of subjects.
            categories = semester.get("categories", [])

            for category in categories:
                category_name = (
                    category.get("name", "Curriculum")
                    if isinstance(category, dict)
                    else str(category)
                )

                lines.append(f"### {category_name}")

                if isinstance(category, dict):
                    for subject in category.get("subjects", []):
                        if isinstance(subject, dict):
                            lines.append(
                                f"- {subject.get('name', 'Unnamed subject')}"
                            )
                        else:
                            lines.append(f"- {subject}")

        lines.append("")

    # --------------------------------------------------
    # 5. Include pending-semester verification notes.
    # --------------------------------------------------

    availability = data.get("availability", {})

    if isinstance(availability, dict):
        pending = availability.get("pendingSemesters", [])

        if pending:
            lines.append(
                "**Verification note:** Official syllabus details are "
                "pending for semester(s): "
                + ", ".join(map(str, pending))
                + "."
            )
            lines.append("")

    # --------------------------------------------------
    # 6. Show the actual JSON filename as the source.
    # --------------------------------------------------

    lines.append(f"**Source:** `{filename}`")
    print("SYLLABUS FUNCTION CALLED")
    print("QUESTION:", question)
    print("SELECTED FILE:", filename)
    return "\n".join(lines)





def detect_programme(question):
    """
    Detect the programme explicitly mentioned by the student.

    Specific B.Tech branches are detected before generic CSE.
    General B.Tech/B.E. questions return btech_general.
    """

    q = re.sub(r"\s+", " ", question.lower()).strip()

    # Detect B.Tech/B.E. and its branch before generic CSE.
    is_btech = bool(
        re.search(
            r"\bb\s*\.?\s*tech\b"
            r"|\bb\s*\.?\s*e\s*\.?\b"
            r"|\bbachelor\s+of\s+technology\b"
            r"|\bbachelor\s+of\s+engineering\b",
            q,
        )
    )

    if is_btech:
        if any(
            re.search(
                r"(?<!\w)" + re.escape(alias) + r"(?!\w)",
                q,
            )
            for alias in PROGRAMME_ALIASES["aiml"]
        ):
            return "btech_aiml"

        if any(
            re.search(
                r"(?<!\w)" + re.escape(alias) + r"(?!\w)",
                q,
            )
            for alias in PROGRAMME_ALIASES["cybersecurity"]
        ):
            return "btech_cybersecurity"

        if any(
            re.search(
                r"(?<!\w)" + re.escape(alias) + r"(?!\w)",
                q,
            )
            for alias in PROGRAMME_ALIASES["cse"]
        ):
            return "btech_cse"

        return "btech_general"

    # Detect standalone programmes.
    checks = [
        ("aiml", PROGRAMME_ALIASES["aiml"]),
        ("cybersecurity", PROGRAMME_ALIASES["cybersecurity"]),
        ("bca", PROGRAMME_ALIASES["bca"]),
        ("bba", PROGRAMME_ALIASES["bba"]),
        ("llb", PROGRAMME_ALIASES["llb"]),
        ("mtech", PROGRAMME_ALIASES["mtech"]),
        ("cse", PROGRAMME_ALIASES["cse"]),
    ]

    for programme, phrases in checks:
        if any(
            re.search(
                r"(?<!\w)" + re.escape(phrase) + r"(?!\w)",
                q,
            )
            for phrase in phrases
        ):
            return programme

    return None


# ============================================================
# RESULT HELPERS
# ============================================================

def _tag_scores(results):
    """Attach the vector-store score to each retrieved document."""

    docs = []

    for doc, score in results:
        doc.metadata = dict(doc.metadata or {})
        doc.metadata["score"] = float(score)
        docs.append(doc)

    return docs


def _print_results(results):
    for doc, score in results:
        metadata = doc.metadata or {}

        print(
            "SOURCE:",
            metadata.get(
                "source",
                metadata.get("filename", "Unknown"),
            ),
            "| TAG:",
            metadata.get("programme", "general"),
            "| SCORE:",
            float(score),
        )


# ============================================================
# STRICT PROGRAMME RETRIEVAL
# ============================================================


def _retrieve_by_programme(
    vector_store,
    question,
    programme,
    top_k,
):
    """Retrieve programme-specific documents, prioritizing exact project matches."""

    print("FILTERING BY PROGRAMME:", programme)

    q = question.lower()

    # For questions specifically about Major Project, search more broadly
    # within the same programme to avoid missing the relevant chunk.
    if "major project" in q or "project credits" in q:
        search_queries = [
            "Major Project COM-811 credits marks",
            "Major Project semester 8",
            question,
        ]

        collected = []
        seen = set()

        for search_query in search_queries:
            results = vector_store.similarity_search_with_score(
                search_query,
                k=max(top_k, 8),
                filter={"programme": programme},
            )

            for doc, score in results:
                metadata = doc.metadata or {}

                if metadata.get("programme") != programme:
                    continue

                key = (
                    metadata.get("source", ""),
                    metadata.get("chunk_id", ""),
                    doc.page_content[:100],
                )

                if key not in seen:
                    seen.add(key)
                    collected.append((doc, score))

        # Put chunks that explicitly mention Major Project first.
        collected.sort(
            key=lambda item: (
                "major project" not in item[0].page_content.lower(),
                item[1],
            )
        )

        results = collected[:max(top_k, 3)]

    else:
        results = vector_store.similarity_search_with_score(
            question,
            k=top_k,
            filter={"programme": programme},
        )

    results = [
        (doc, score)
        for doc, score in results
        if (doc.metadata or {}).get("programme") == programme
    ]

    print("FILTERED RESULTS:", len(results))
    _print_results(results)

    return results



def _retrieve_general_btech(
    vector_store,
    question,
    top_k,
):
    """Search only explicitly tagged B.Tech branches."""

    print("FILTERING BY B.TECH PROGRAMMES:", BTECH_PROGRAMMES)

    results = vector_store.similarity_search_with_score(
        question,
        k=top_k,
        filter={
            "programme": {
                "$in": BTECH_PROGRAMMES
            }
        },
    )

    results = [
        (doc, score)
        for doc, score in results
        if (doc.metadata or {}).get("programme") in BTECH_PROGRAMMES
    ]

    print("B.TECH RESULTS:", len(results))
    _print_results(results)

    return results


def detect_information_intent(question):
    """Identify college-information questions that need cross-programme retrieval."""
    q = question.lower()

    intents = {
        "fees": [
            "fee", "fees", "tuition", "annual cost",
            "hostel charges", "admission charges",
        ],
        "placements": [
            "placement", "placed", "highest package",
            "average package", "median package",
            "ctc", "recruiter", "recruiters",
        ],
        "staff": [
            "director", "principal", "faculty",
            "staff", "hod", "head of department",
            "incharge", "in-charge",
        ],
    }

    for intent, keywords in intents.items():
        if any(keyword in q for keyword in keywords):
            return intent

    return None



# ============================================================
# DOCUMENT RETRIEVAL
# ============================================================

def retrieve_documents(question, top_k=3):
    vector_store = get_vector_store()

    q = question.lower()
    programme = detect_programme(question)

    print("=" * 60)
    print("QUESTION:", question)
    print("DETECTED PROGRAMME:", programme)
    print("CHROMA PATH:", CHROMA_PATH)
    print("COLLECTION:", COLLECTION_NAME)
    print("=" * 60)

    # --------------------------------------------------------
    # General B.Tech/B.E. question
    # --------------------------------------------------------

    
    # --------------------------------------------------------
    # Specific programme questions
    # --------------------------------------------------------

    
    # --------------------------------------------------------
    # General B.Tech/B.E. question
    # --------------------------------------------------------

    if programme == "btech_general":
        q = question.lower()

        branch_question = any(
            term in q
            for term in [
                "branch", "branches", "department", "departments",
                "how many", "list every", "list all",
            ]
        )

        if branch_question:
            print("B.TECH BRANCH QUESTION: Searching all documents")

            results = vector_store.similarity_search_with_score(
                question,
                k=max(top_k * 5, 15),
            )

            branch_terms = [
                "civil engineering",
                "computer science & engineering",
                "electronics & communication engineering",
                "electrical engineering",
                "artificial intelligence & machine learning",
                "cyber security",
            ]

            results.sort(
                key=lambda item: (
                    -sum(
                        term in item[0].page_content.lower()
                        for term in branch_terms
                    ),
                    item[1],
                )
            )

            selected = results[:top_k]
            _print_results(selected)
            return _tag_scores(selected)

        try:
            results = _retrieve_general_btech(
                vector_store, question, top_k
            )
            return _tag_scores(results)
        except Exception as exc:
            print("General B.Tech retrieval failed:", exc)
            return []

    # --------------------------------------------------------
    # Specific programme questions



    # --------------------------------------------------------
    # Specific programme question
    # --------------------------------------------------------

    if programme:
        try:
            results = _retrieve_by_programme(
                vector_store,
                question,
                programme,
                top_k,
            )
            return _tag_scores(results)

        except Exception as exc:
            print(
                f"Programme retrieval failed ({programme}):",
                exc,
            )
            return []

    # --------------------------------------------------------
    # Academic-calendar retrieval
    # --------------------------------------------------------

    year_match = re.search(
        r"\b(20\d{2})\s*[-–—/]\s*(\d{2,4})\b",
        question,
    )

    single_year_match = re.search(
        r"\b(20\d{2})\b",
        question,
    )

    exam_question = any(
        term in q
        for term in [
            "exam",
            "examination",
            "date sheet",
            "timetable",
            "semester",
            "odd semester",
        ]
    )

    target_year = None

    if year_match:
        start = int(year_match.group(1))
        end_part = year_match.group(2)

        if len(end_part) == 4:
            end = int(end_part)
        else:
            end = (start // 100) * 100 + int(end_part)

        if end < start:
            end += 100

        target_year = (start, end)

    elif single_year_match and exam_question:
        start = int(single_year_match.group(1))
        target_year = (start, start + 1)

    elif exam_question:
        today = date.today()

        start = (
            today.year
            if today.month >= 7
            else today.year - 1
        )

        target_year = (start, start + 1)

    if target_year:
        start, end = target_year

        short_name = f"{start}-{str(end)[-2:]}"
        full_name = f"{start}-{end}"

        filenames = [
            f"Academic-Calender-AY-{short_name}-1.txt",
            f"Academic-Calender-AY-{full_name}.txt",
        ]

        for filename in filenames:
            try:
                results = vector_store.similarity_search_with_score(
                    question,
                    k=top_k,
                    filter={"filename": filename},
                )

                if results:
                    return _tag_scores(results)

            except Exception as exc:
                print(
                    f"Calendar retrieval failed for {filename}:",
                    exc,
                )

    # --------------------------------------------------------
    # General questions: search general-tagged documents only.
    # Do not mix unrelated programme syllabuses.
    # --------------------------------------------------------

    try:
        results = vector_store.similarity_search_with_score(
            question,
            k=top_k,
            filter={"programme": "general"},
        )

        results = [
            (doc, score)
            for doc, score in results
            if (doc.metadata or {}).get("programme") == "general"
        ]

        _print_results(results)
        return _tag_scores(results)

    except Exception as exc:
        print("General retrieval failed:", exc)
        return []


# ============================================================
# GEMINI MODEL
# ============================================================



def get_llm():
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is missing. Check rag-service/.env"
        )

    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
        temperature=0.2,
        api_key=api_key,
        timeout=20,
        max_retries=0,
    )




# ============================================================
# ANSWER GENERATION
# ============================================================

def generate_answer(question, documents):
    syllabus_answer = get_syllabus_answer(question)

    if syllabus_answer is not None:
        return syllabus_answer

    programme = detect_programme(question)

    # --------------------------------------------------------
    # Validate document metadata before using any context.
    # --------------------------------------------------------


    intent = detect_information_intent(question)

    if programme and programme != "btech_general":
        if intent not in {"fees", "placements", "staff"}:
            documents = [
                doc for doc in documents
                if (doc.metadata or {}).get("programme") == programme
            ]


    
    elif programme == "btech_general":
        q = question.lower()

        branch_question = any(
            term in q
            for term in [
                "branch", "branches", "department",
                "departments", "how many", "list every",
                "list all",
            ]
        )

        if not branch_question:
            documents = [
                doc for doc in documents
                if (doc.metadata or {}).get("programme")
                in BTECH_PROGRAMMES
            ]


    # --------------------------------------------------------
    # No matching documents
    # --------------------------------------------------------

    if not documents:
        if programme == "btech_general":
            return (
                "I couldn't find verified B.Tech/B.E. curriculum "
                "information in the college knowledge base. I won't "
                "use M.Tech, BCA, BBA, LLB, or unrelated documents "
                "as a substitute. Please add the relevant official "
                "B.Tech curriculum documents and rebuild the index, "
                "or confirm the details with the MIET department."
            )

        if programme:
            return (
                f"I couldn't find verified {programme.upper()}-specific "
                "information in the college knowledge base. I won't "
                "substitute another programme's syllabus. Please add "
                "the official programme document and rebuild the index, "
                "or confirm the details with the relevant MIET department."
            )

        return (
            "I couldn't find enough relevant information in the college "
            "knowledge base to answer this reliably. Please rephrase "
            "the question or contact the relevant MIET department."
        )

    # --------------------------------------------------------
    # Build context
    # --------------------------------------------------------

    context_parts = []

    for i, doc in enumerate(documents, start=1):
        metadata = doc.metadata or {}

        context_parts.append(
            f"[Source {i}]\n"
            f"Document: {metadata.get('source', metadata.get('filename', 'Unknown'))}\n"
            f"Programme tag: {metadata.get('programme', 'general')}\n"
            f"Page: {metadata.get('page', 'Unknown')}\n"
            f"Content:\n{doc.page_content}"
        )

    context = "\n\n".join(context_parts)

    # --------------------------------------------------------
    # Source restrictions
    # --------------------------------------------------------

    if programme == "btech_general":
        programme_rule = (
            "The student asked a general B.Tech/B.E. question. "
            "Use only retrieved B.Tech branch documents. Identify "
            "the branch and source supporting each claim. Do not "
            "claim a subject is taught across all branches unless "
            "the sources establish that. Never use M.Tech, BCA, "
            "BBA, LLB, or unrelated facts."
        )

    elif programme:
        programme_rule = (
            f"The student explicitly asked about programme "
            f"'{programme.upper()}'. Use only context tagged for "
            "that exact programme. If the context does not answer "
            "the question, clearly state that the information is "
            "unavailable. Never substitute another programme's "
            "information."
        )

    else:
        programme_rule = (
            "Use only the supplied context. If it does not answer "
            "the question, clearly say so. Do not treat semantically "
            "similar documents as proof about another programme."
        )

    # --------------------------------------------------------
    # Prompt
    # --------------------------------------------------------

    prompt = f"""
You are College AI, the college information assistant for MIET Jammu.

STUDENT QUESTION:
{question}

RETRIEVED COLLEGE DOCUMENTS:
{context}

MANDATORY SOURCE RULES:

1. {programme_rule}

2. Use only facts supported by the retrieved documents.
   Never invent syllabus subjects, programming languages, dates,
   fees, rules, deadlines, or college policies.

3. If the sources are irrelevant or insufficient, say so clearly.

4. Identify the source document when useful.

5. Give a clear, student-friendly answer using Markdown headings
   and bullet points when helpful.

6. For fees, distinguish approved official fees from proposals
   or unverified charges.

7. Do not claim that a source supports information absent from its text.

8. When asked which programming languages are taught, list only
   languages explicitly mentioned in the retrieved documents.
   Do not infer languages from a typical engineering curriculum.

Answer the student's question now.
"""
    
    import time

    start = time.perf_counter()

    llm = get_llm()
    print(
    f"LLM initialization: {time.perf_counter() - start:.2f}s",
    flush=True
    )

    api_start = time.perf_counter()
    response = llm.invoke(prompt)

    print(
    f"Groq invoke time: {time.perf_counter() - api_start:.2f}s",
    flush=True
    )

    print(
    f"Total LLM setup + invocation: {time.perf_counter() - start:.2f}s",
    flush=True
    )

    content = response.content

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        return "\n".join(
            str(block.get("text", ""))
            for block in content
            if isinstance(block, dict) and block.get("text")
        )

    return str(content)
