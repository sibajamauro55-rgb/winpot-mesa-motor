from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Literal, Optional

Side = Literal["P", "B"]
Result = Literal["P", "B", "T"]
Derived = Literal["R", "A"]


@dataclass(frozen=True, slots=True)
class PatternHit:
    name: str
    tag: str
    intention: str
    logic: str
    suggests: Optional[Side]
    strength: int
    active: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class Vote:
    system: str
    pick: Optional[Side]
    reason: str
    weight: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class Snapshot:
    results: list[Result]
    columns: list[list[Side]]
    ties_on: list[list[int]]
    bead: list[Result]
    beb: list[Derived]
    small: list[Derived]
    cock: list[Derived]
    stats: dict[str, Any]
    patterns: list[PatternHit]
    votes: list[Vote]
    pick: Optional[Side]
    score_p: int
    score_b: int
    label: str
    conviction: str
    disclaimer: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "results": self.results,
            "columns": self.columns,
            "ties_on": self.ties_on,
            "bead": self.bead,
            "beb": self.beb,
            "small": self.small,
            "cock": self.cock,
            "stats": self.stats,
            "patterns": [p.to_dict() for p in self.patterns],
            "votes": [v.to_dict() for v in self.votes],
            "pick": self.pick,
            "score_p": self.score_p,
            "score_b": self.score_b,
            "label": self.label,
            "conviction": self.conviction,
            "disclaimer": self.disclaimer,
        }
