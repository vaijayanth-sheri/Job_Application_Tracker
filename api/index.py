from __future__ import annotations

import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from datetime import datetime, timezone
from enum import StrEnum
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

from job_search.scraper import (
    RUNTIME_SEARCH_DIR,
    SUPPORTED_JOBSPY_SOURCES,
    SearchMetadata,
    build_search_params,
    dataframe_to_records,
    run_search,
)


DEFAULT_SOURCES = ["linkedin", "indeed"]
MAX_WORKERS = 2


class SearchCreateRequest(BaseModel):
    keyword: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)
    sources: list[str] = Field(default_factory=lambda: DEFAULT_SOURCES.copy())
    results_per_source: int = Field(default=25, ge=1, le=100)
    distance_km: int = Field(default=50, ge=0, le=200)
    hours_old: int | None = Field(default=None, ge=1, le=720)

    @field_validator("keyword", "location")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Value cannot be blank.")
        return stripped

    @field_validator("sources")
    @classmethod
    def normalize_sources(cls, value: list[str]) -> list[str]:
        normalized = [source.strip().lower() for source in value if source.strip()]
        if not normalized:
            raise ValueError("Select at least one job board.")
        return normalized

class SearchResultsResponse(BaseModel):
    job_id: str
    rows: list[dict[str, Any]]
    metadata: dict[str, Any]

def metadata_to_dict(metadata: SearchMetadata) -> dict[str, Any]:
    return asdict(metadata)


app = FastAPI(title="German Job Search Collector API", version="0.1.0")

# Optional CORS setup if called directly, Next.js proxy avoids this in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/py/searches", response_model=SearchResultsResponse)
def create_search(request: SearchCreateRequest) -> SearchResultsResponse:
    try:
        params = build_search_params(
            keyword=request.keyword,
            location=request.location,
            sources=request.sources,
            results_per_source=request.results_per_source,
            distance_km=request.distance_km,
            hours_old=request.hours_old,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    job_id = uuid.uuid4().hex
    
    try:
        result = run_search(
            params=params,
            output_dir=RUNTIME_SEARCH_DIR / job_id,
            filename_suffix=job_id[:8],
        )
        return SearchResultsResponse(
            job_id=job_id,
            rows=dataframe_to_records(result.jobs),
            metadata=metadata_to_dict(result.metadata),
        )
    except Exception as exc:
        logging.exception("Search job %s failed", job_id)
        raise HTTPException(status_code=500, detail=str(exc))
