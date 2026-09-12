from __future__ import annotations

from .models import Snapshot
from .patterns import detect_patterns
from .roads import Roads, parse_token
from .systems import consensus, systems_vote

DISCLAIMER = (
    "Lectura de tablero, no prediccion. Cada mano es independiente. "
    "Banca sigue siendo la apuesta con menos ventaja de casa. Empate se ignora."
)


def analyze(roads: Roads) -> Snapshot:
    patterns = detect_patterns(roads)
    votes = systems_vote(roads, patterns)
    pick, score_p, score_b, label, conviction = consensus(votes)
    return Snapshot(
        results=list(roads.results),
        columns=[list(col) for col in roads.columns],
        ties_on=[list(col) for col in roads.ties_on],
        bead=list(roads.bead),
        beb=list(roads.beb),
        small=list(roads.small),
        cock=list(roads.cock),
        stats=roads.stats(),
        patterns=patterns,
        votes=votes,
        pick=pick,
        score_p=score_p,
        score_b=score_b,
        label=label,
        conviction=conviction,
        disclaimer=DISCLAIMER,
    )


def snapshot_from_sequence(tokens: list[str]) -> Snapshot:
    roads = Roads()
    for token in tokens:
        parsed = parse_token(token)
        if parsed:
            roads.push(parsed)
    return analyze(roads)
