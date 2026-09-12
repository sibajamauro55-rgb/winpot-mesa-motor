from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .roads import Roads, parse_token
from .service import analyze

app = FastAPI(
    title="Baccarat Mesa Motor",
    version="1.1.0",
    description="Lector de roads. No predice cartas.",
)


class SequenceIn(BaseModel):
    results: list[str] = Field(default_factory=list, examples=[["B", "B", "P", "T"]])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze_sequence(body: SequenceIn) -> dict:
    roads = Roads()
    for raw in body.results:
        parsed = parse_token(str(raw))
        if parsed:
            roads.push(parsed)
    return analyze(roads).to_dict()
