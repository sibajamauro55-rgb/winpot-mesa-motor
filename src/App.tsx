import { useEffect, useMemo, useState } from "react";
import { DEMO, analyze, type Derived, type Result } from "./engine";

const STORAGE_KEY = "mesa-motor-shoe-v1";

function loadShoe(): Result[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Result[];
    return parsed.filter((x) => x === "P" || x === "B" || x === "T");
  } catch {
    return [];
  }
}

function RoadGrid({
  columns,
  tiesOn,
  kind,
}: {
  columns: string[][];
  tiesOn?: number[][];
  kind: "pb" | "derived";
}) {
  const rows = Math.min(6, Math.max(1, ...columns.map((c) => c.length), 1));
  return (
    <div className="road" style={{ gridTemplateRows: `repeat(${rows}, 22px)` }}>
      {columns.map((col, ci) =>
        Array.from({ length: rows }).map((_, ri) => {
          const val = col[ri];
          if (!val) return <span key={`${ci}-${ri}`} className="cell empty" />;
          const ties = tiesOn?.[ci]?.[ri] ?? 0;
          const cls =
            kind === "pb"
              ? val === "P"
                ? "player"
                : "banker"
              : val === "R"
                ? "red"
                : "blue";
          return (
            <span key={`${ci}-${ri}`} className={`cell ${cls} ${kind === "derived" ? "tiny" : ""}`}>
              {kind === "pb" && ties > 0 ? <i className="tie">{ties > 1 ? ties : ""}</i> : null}
            </span>
          );
        })
      )}
    </div>
  );
}

function packDerived(marks: Derived[]): Derived[][] {
  const cols: Derived[][] = [];
  let current: Derived[] = [];
  let last: Derived | null = null;
  for (const m of marks) {
    if (last === null || m !== last || current.length >= 6) {
      current = [m];
      cols.push(current);
    } else {
      current.push(m);
    }
    last = m;
  }
  return cols;
}

export default function App() {
  const [shoe, setShoe] = useState<Result[]>(loadShoe);
  const [paste, setPaste] = useState("");
  const snap = useMemo(() => analyze(shoe), [shoe]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shoe));
  }, [shoe]);

  const push = (r: Result) => setShoe((s) => [...s, r]);
  const undo = () => setShoe((s) => s.slice(0, -1));
  const reset = () => setShoe([]);

  const applyPaste = () => {
    const normalized = paste
      .toUpperCase()
      .replace(/PUNTO/g, "P")
      .replace(/PLAYER/g, "P")
      .replace(/BANCA/g, "B")
      .replace(/BANKER/g, "B")
      .replace(/EMPATE/g, "T")
      .replace(/TIE/g, "T");
    const tokens = Array.from(normalized.matchAll(/[PBT]/g), (m) => m[0] as Result);
    if (tokens.length) setShoe(tokens);
  };

  const pickClass =
    snap.label === "BANCA" ? "verdict banker" : snap.label === "PUNTO" ? "verdict player" : "verdict sit";

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="kicker">Winpot · mesas live · lectura de roads</p>
          <h1>Mesa Motor</h1>
        </div>
        <p className="warn">
          No predice cartas. Banca ~1.06% house edge · Punto ~1.24% · Empate ~14.4%.
        </p>
      </header>

      <section className="meter">
        <div className="bar">
          <span className="seg player" style={{ width: `${snap.stats.pctPunto || 33.3}%` }}>
            {snap.stats.manos ? `${snap.stats.pctPunto.toFixed(0)}% P` : "P"}
          </span>
          <span className="seg tie" style={{ width: `${snap.stats.pctEmpate || 16}%` }}>
            {snap.stats.manos ? `${snap.stats.pctEmpate.toFixed(0)}% T` : "T"}
          </span>
          <span className="seg banker" style={{ width: `${snap.stats.pctBanca || 50}%` }}>
            {snap.stats.manos ? `${snap.stats.pctBanca.toFixed(0)}% B` : "B"}
          </span>
        </div>
        <div className="meta">
          <span>{snap.stats.manos} manos</span>
          <span>
            racha {snap.stats.lado ?? "—"} × {snap.stats.racha}
          </span>
        </div>
      </section>

      <section className={pickClass}>
        <div>
          <small>Lectura de sistemas</small>
          <strong>{snap.label}</strong>
        </div>
        <div className="score">
          <em>P {snap.scoreP}</em>
          <em>B {snap.scoreB}</em>
          <span>convicción {snap.conviction}</span>
        </div>
      </section>

      <section className="pad">
        <button className="btn player" onClick={() => push("P")}>
          Punto
        </button>
        <button className="btn banker" onClick={() => push("B")}>
          Banca
        </button>
        <button className="btn tie" onClick={() => push("T")}>
          Empate
        </button>
        <button className="btn ghost" onClick={undo} disabled={!shoe.length}>
          Undo
        </button>
        <button className="btn ghost" onClick={reset}>
          Zapato nuevo
        </button>
        <button className="btn ghost" onClick={() => setShoe(DEMO)}>
          Demo
        </button>
      </section>

      <section className="board">
        <article>
          <h2>Big Road</h2>
          <div className="scroll">
            <RoadGrid columns={snap.columns} tiesOn={snap.tiesOn} kind="pb" />
          </div>
        </article>
        <div className="derived">
          <article>
            <h2>
              Ojo Gordo <small>R{snap.stats.bebRojo} A{snap.stats.bebAzul}</small>
            </h2>
            <div className="scroll">
              <RoadGrid columns={packDerived(snap.beb)} kind="derived" />
            </div>
          </article>
          <article>
            <h2>
              Small <small>R{snap.stats.smallRojo} A{snap.stats.smallAzul}</small>
            </h2>
            <div className="scroll">
              <RoadGrid columns={packDerived(snap.small)} kind="derived" />
            </div>
          </article>
          <article>
            <h2>
              Cucaracha <small>R{snap.stats.cockRojo} A{snap.stats.cockAzul}</small>
            </h2>
            <div className="scroll">
              <RoadGrid columns={packDerived(snap.cock)} kind="derived" />
            </div>
          </article>
        </div>
      </section>

      <section className="cols">
        <article>
          <h2>Patrones activos</h2>
          <ul className="list">
            {snap.patterns.filter((p) => p.active).length === 0 && (
              <li className="muted">Ningún patrón de piso está armado. Zapato temprano o irregular.</li>
            )}
            {snap.patterns
              .filter((p) => p.active)
              .map((p) => (
                <li key={p.tag}>
                  <div className="row">
                    <b>{p.name}</b>
                    <span className={`chip ${p.suggests === "B" ? "banker" : p.suggests === "P" ? "player" : ""}`}>
                      {p.suggests === "B" ? "Banca" : p.suggests === "P" ? "Punto" : "sin lado"} · {p.strength}/5
                    </span>
                  </div>
                  <p>{p.intention}</p>
                  <small>{p.logic}</small>
                </li>
              ))}
          </ul>
        </article>
        <article>
          <h2>Voto de sistemas</h2>
          <ul className="list">
            {snap.votes.map((v, i) => (
              <li key={`${v.system}-${i}`}>
                <div className="row">
                  <b>{v.system}</b>
                  <span className={`chip ${v.pick === "B" ? "banker" : "player"}`}>
                    {v.pick === "B" ? "Banca" : "Punto"} · w{v.weight}
                  </span>
                </div>
                <p>{v.reason}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="paste">
        <h2>Pegar zapato</h2>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="B B P T B P P B …"
        />
        <button className="btn ghost" onClick={applyPaste}>
          Cargar secuencia
        </button>
      </section>

      <footer>
        Motor local. No se conecta a Winpot. Los círculos registran el pasado; no mueven las
        cartas. Úsalo para leer la mesa, no para perseguir un edge que no existe.
      </footer>
    </div>
  );
}
