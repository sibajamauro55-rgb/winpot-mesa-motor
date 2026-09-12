"""Motor de lectura de baccarat live.

Las roads describen el pasado. No cambian la probabilidad de la siguiente mano.
Banca ~1.06% house edge, Punto ~1.24%, Empate ~14.4%.
"""

from .models import PatternHit, Snapshot, Vote
from .roads import Roads, parse_token
from .service import analyze, snapshot_from_sequence

__all__ = [
    "PatternHit",
    "Roads",
    "Snapshot",
    "Vote",
    "analyze",
    "parse_token",
    "snapshot_from_sequence",
]

__version__ = "1.1.0"
