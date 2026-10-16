# AI-Powered College Information & Student Assistance System Using RAG

A college-level RAG project with:
- React + Vite frontend
- Node.js + Express backend
- Python Flask RAG service
- LangChain + ChromaDB retrieval
- Sentence Transformers embeddings
- Local document ingestion from PDF files

## Architecture

React Frontend -> Node/Express Backend -> Flask RAG Service -> LangChain Retriever -> ChromaDB

## Project structure

college-rag-system/
├── frontend/                 # React + Vite
├── backend/                  # Node.js + Express API
├── rag-service/              # Flask + LangChain + ChromaDB
│   ├── app.py
│   ├── ingest.py
│   ├── rag.py
│   ├── requirements.txt
│   ├── data/raw/             # Put college PDFs here
│   └── chroma_db/            # Generated vector database
├── .gitignore
└── README.md

## Requirements

- Node.js 18+
- Python 3.10+
- pip
- A few college PDF documents

## 1. Start Flask RAG service

cd rag-service
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

Put PDFs into:
rag-service/data/raw/

Then run:
python ingest.py

Start Flask:
python app.py

Flask runs on http://127.0.0.1:5001

## 2. Start Node backend

Open another terminal:

cd backend
npm install
npm run dev

Node runs on http://127.0.0.1:8000

## 3. Start React frontend

Open another terminal:

cd frontend
npm install
npm run dev

Open the URL printed by Vite, normally:
http://localhost:5173

## API

POST /api/query

Request:
{
  "question": "What is the attendance requirement?"
}

Response:
{
  "answer": "...",
  "sources": [
    {
      "source": "attendance_rules.pdf",
      "page": 4
    }
  ]
}

## Important

The starter version intentionally does retrieval first. The LLM generation layer can be added in Week 6 after retrieval is working correctly.

Do not commit real API keys or private college documents.
