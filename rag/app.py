"""
app.py

FastAPI server for the AI Emergency Health Assistant (Module 3).
Wraps rag_chain.py so the Node/Express backend (or the React Patient
Dashboard directly) can call this over HTTP instead of running Python
inline in the JS process.

Run locally:
    pipenv run uvicorn app:app --reload --port 8001

Then it's live at http://localhost:8001
Interactive docs auto-generated at http://localhost:8001/docs
"""

import os
import traceback

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag_chain import answer_query

app = FastAPI(title="MediAssist AI Health Assistant", version="1.0")

# Full tracebacks are useful while running the local RAG service. Set this to
# 0 in any environment where exception details must not be returned to clients.
SHOW_ERROR_DETAILS = os.getenv("RAG_SHOW_ERROR_DETAILS", "1") != "0"

# Allow the Node/Express backend and the React dev server to call this.
# Tighten allow_origins to your real frontend/backend URLs before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # e.g. ["http://localhost:3000", "http://localhost:5000"]
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


class SourceDoc(BaseModel):
    source: str
    page: int | None = None


class QueryResponse(BaseModel):
    result: str
    sources: list[SourceDoc]


@app.get("/health")
def health():
    """Lets the Express backend (or a Docker/uptime check) confirm this
    service is up before routing chat requests to it."""
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")

    try:
        result = answer_query(request.question)
    except Exception as e:
        error_trace = traceback.format_exc()
        print(error_trace, flush=True)

        if SHOW_ERROR_DETAILS:
            detail = f"AI assistant failed:\n{error_trace}"
        else:
            detail = "AI assistant failed"

        raise HTTPException(status_code=500, detail=detail) from e

    return result
