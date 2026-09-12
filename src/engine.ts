export type Side = "P" | "B";
export type Result = "P" | "B" | "T";
export type Derived = "R" | "A";

export type PatternHit = {
  name: string;
  tag: string;
  intention: string;
  logic: string;
  suggests: Side | null;
  strength: number;
  active: boolean;
};

export type Vote = {
  system: string;
  pick: Side | null;
  reason: string;
  weight: number;
};

export type Snapshot = {
  results: Result[];
  columns: Side[][];
  tiesOn: number[][];
  bead: Result[];
  beb: Derived[];
  small: Derived[];
  cock: Derived[];
  stats: {
    manos: number;
    punto: number;
    banca: number;
    empate: number;
    pctPunto: number;
    pctBanca: number;
    pctEmpate: number;
    racha: number;
    lado: Side | null;
    bebRojo: number;
    bebAzul: number;
    smallRojo: number;
    smallAzul: number;
    cockRojo: number;
    cockAzul: number;
  };
  patterns: PatternHit[];
  votes: Vote[];
  pick: Side | null;
  scoreP: number;
  scoreB: number;
  label: string;
  conviction: string;
};

export function opposite(side: Side | null): Side | null {
  if (side === "P") return "B";
  if (side === "B") return "P";
  return null;
}

function occupancy(columns: Side[][], col: number, row: number): Side | null {
  if (col < 0 || col >= columns.length) return null;
  if (row < 0 || row >= columns[col].length) return null;
  return columns[col][row];
}

export function derivedColor(
  columns: Side[][],
  col: number,
  row: number,
  lookback: number
): Derived | null {
  if (lookback < 1) return null;
  if (row === 0) {
    const prev = col - 1;
    const ref = col - 1 - lookback;
    if (prev < 0 || ref < 0) return null;
    return columns[prev].length === columns[ref].length ? "R" : "A";
  }
  const refCol = col - lookback;
  if (refCol < 0) return null;
  const here = occupancy(columns, refCol, row);
  const above = occupancy(columns, refCol, row - 1);
  if ((here === null) === (above === null)) {
    if (here === null || here === above) return "R";
    return "A";
  }
  return "A";
}

export function buildRoads(results: Result[]) {
  const columns: Side[][] = [];
  const tiesOn: number[][] = [];
  const bead: Result[] = [];
  const beb: Derived[] = [];
  const small: Derived[] = [];
  const cock: Derived[] = [];

  for (const result of results) {
    bead.push(result);
    if (result === "T") {
      if (columns.length) {
        const c = columns.length - 1;
        const r = columns[c].length - 1;
        tiesOn[c][r] += 1;
      }
      continue;
    }
    if (!columns.length || columns[columns.length - 1].at(-1) !== result) {
      columns.push([result]);
      tiesOn.push([0]);
    } else {
      columns[columns.length - 1].push(result);
      tiesOn[tiesOn.length - 1].push(0);
    }
    const col = columns.length - 1;
    const row = columns[col].length - 1;
    const pairs: [Derived[], number][] = [
      [beb, 1],
      [small, 2],
      [cock, 3],
    ];
    for (const [bucket, k] of pairs) {
      const color = derivedColor(columns, col, row, k);
      if (color) bucket.push(color);
    }
  }

  const lastSide = [...results].reverse().find((r) => r !== "T") as Side | undefined;
  return {
    columns,
    tiesOn,
    bead,
    beb,
    small,
    cock,
    lastSide: lastSide ?? null,
    streak: columns.length ? columns[columns.length - 1].length : 0,
    heights: columns.map((c) => c.length),
  };
}

function redRatio(marks: Derived[], n = 8): number | null {
  if (!marks.length) return null;
  const window = marks.slice(-n);
  return window.filter((m) => m === "R").length / window.length;
}

function detectPatterns(results: Result[]): PatternHit[] {
  const roads = buildRoads(results);
  const { heights, lastSide: last, streak, beb, small, cock } = roads;
  const hits: PatternHit[] = [];

  const add = (
    name: string,
    tag: string,
    intention: string,
    logic: string,
    suggests: Side | null,
    strength: number,
    active: boolean
  ) => hits.push({ name, tag, intention, logic, suggests, strength, active });

  add(
    "Dragon (racha larga)",
    "DRAGON",
    "La mesa se calentó de un lado. Quien sigue el dragón apuesta a que la columna sigue creciendo.",
    "Columna del Big Road de 6 o más. En un shoe de ~70 manos una racha de 6+ es común, no anómala.",
    streak >= 6 ? last : null,
    streak >= 8 ? 4 : 3,
    streak >= 6
  );
  add(
    "Racha corta (3-5)",
    "RACHA",
    "Seguir la racha mientras no corte. Sistema de piso más usado.",
    `Columna actual mide ${streak}. Se trata como momentum aunque cada mano no hereda la anterior.`,
    streak >= 3 && streak <= 5 ? last : null,
    2,
    streak >= 3 && streak <= 5
  );

  const last4 = heights.slice(-4);
  const isChop = last4.length >= 4 && last4.every((h) => h === 1);
  add(
    "Ping-pong / corte 1-1-1-1",
    "CHOP",
    "La mesa alterna Punto y Banca. La intención es apostar al contrario del último.",
    "Cuatro columnas seguidas de altura 1.",
    isChop ? opposite(last) : null,
    3,
    isChop
  );

  const last3 = heights.slice(-3);
  const isDoubles = last3.length === 3 && last3.every((h) => h === 2);
  add(
    "Dobles (2-2-2)",
    "DOBLES",
    "Se espera otro 2: el lado actual gana una más y corta.",
    "Tres columnas consecutivas de exactamente 2.",
    isDoubles && last ? (streak === 2 ? opposite(last) : last) : null,
    3,
    isDoubles
  );

  const cycle = heights.slice(-4);
  const is12 =
    cycle.length === 4 &&
    (cycle.join() === "1,2,1,2" || cycle.join() === "2,1,2,1");
  let nxt12: Side | null = null;
  if (is12 && last) {
    nxt12 =
      cycle.join() === "1,2,1,2"
        ? streak === 2
          ? opposite(last)
          : last
        : streak === 1
          ? opposite(last)
          : last;
  }
  add(
    "Ritmo 1-2",
    "UNO_DOS",
    "La mesa alterna columnas chicas y medianas. Se intenta cantar la altura que toca.",
    "Ciclo 1-2-1-2 o 2-1-2-1 en las últimas 4 columnas.",
    nxt12,
    2,
    is12
  );
  add(
    "Corte fresco",
    "CORTE",
    "Acaba de romper una columna. Quien sigue el corte espera ping-pong.",
    "La última columna tiene altura 1.",
    null,
    1,
    streak === 1 && roads.columns.length >= 2
  );

  const ratios = [redRatio(beb), redRatio(small), redRatio(cock)];
  const regular = ratios.filter((x) => x !== null && x >= 0.62).length;
  const choppy = ratios.filter((x) => x !== null && x <= 0.38).length;
  let regularPick: Side | null = null;
  if (regular >= 2 && last) {
    regularPick =
      streak === 1 && heights.length >= 2 && heights[heights.length - 2] === 1
        ? opposite(last)
        : last;
  }
  add(
    "Caminos derivados ROJOS",
    "REGULAR",
    "Rojo en Big Eye / Small / Cockroach NO es Banca. Significa que el Big Road se está copiando.",
    "Misma profundidad u ocupación contra 1/2/3 columnas atrás = rojo.",
    regularPick,
    regular >= 2 ? 3 : 1,
    regular >= 2
  );
  add(
    "Caminos derivados AZULES",
    "CHOPPY",
    "Azul = el Big Road no se está repitiendo. Intención clásica: no perseguir, o sentarse.",
    "Ventana reciente de derivadas mayormente azul.",
    choppy >= 2 && streak >= 3 ? opposite(last) : null,
    2,
    choppy >= 2
  );

  const n = results.length;
  const ties = results.filter((r) => r === "T").length;
  add(
    "Empates altos",
    "EMPATES",
    "Empate teórico ~9.5%. Apostar Empate tiene ~14.4% de ventaja de casa. Nunca se recomienda.",
    `Empates observados: ${ties}/${n}.`,
    null,
    1,
    n >= 20 && ties / n >= 0.13
  );

  const pb = results.filter((r) => r !== "T");
  if (pb.length) {
    const bRate = pb.filter((r) => r === "B").length / pb.length;
    add(
      "Sesgo del shoe (descriptivo)",
      "SESGO",
      "Solo describe lo ya salido. Un shoe 'de Banca' no cambia la siguiente mano.",
      `Banca ${pb.filter((r) => r === "B").length} / Punto ${pb.filter((r) => r === "P").length}.`,
      null,
      1,
      Math.abs(bRate - 0.5) >= 0.08 && pb.length >= 20
    );
  }
  return hits;
}

function vote(results: Result[], patterns: PatternHit[]): Vote[] {
  const roads = buildRoads(results);
  const { lastSide: last, streak, beb, heights } = roads;
  const votes: Vote[] = [
    {
      system: "Banca matemática",
      pick: "B",
      reason:
        "No lee patrones. Banca paga 0.95 y tiene ~1.06% de ventaja de casa vs ~1.24% de Punto.",
      weight: 1,
    },
  ];
  if (last) {
    votes.push({
      system: "Seguir al último",
      pick: last,
      reason: `Repite el último ganador (${last}).`,
      weight: 2,
    });
  }
  if (streak >= 7 && last) {
    votes.push({
      system: "Cazar el corte del dragón",
      pick: opposite(last),
      reason: "Falacia del apostador. El corte no se vuelve más probable.",
      weight: 1,
    });
  }
  for (const hit of patterns) {
    if (hit.active && hit.suggests) {
      votes.push({
        system: `Patrón ${hit.tag}`,
        pick: hit.suggests,
        reason: hit.intention,
        weight: hit.strength,
      });
    }
  }
  if (beb.length && last) {
    const lastBeb = beb[beb.length - 1];
    if (lastBeb === "R") {
      const pick =
        streak === 1 && heights.length >= 2 && heights[heights.length - 2] === 1
          ? opposite(last)
          : last;
      votes.push({
        system: "Preguntar al Ojo Gordo",
        pick,
        reason: "Última marca del Big Eye ROJA: se sigue el gesto actual.",
        weight: 3,
      });
    } else {
      votes.push({
        system: "Preguntar al Ojo Gordo",
        pick: streak >= 3 ? opposite(last) : last,
        reason: "Última marca del Big Eye AZUL: no perseguir columna alta.",
        weight: 2,
      });
    }
  }
  return votes.filter((v) => v.pick);
}

export function analyze(results: Result[]): Snapshot {
  const roads = buildRoads(results);
  const patterns = detectPatterns(results);
  const votes = vote(results, patterns);
  const score = { P: 0, B: 0 };
  for (const v of votes) {
    if (v.pick) score[v.pick] += v.weight;
  }
  let pick: Side | null = null;
  let label = "SENTARSE";
  let conviction = "nula";
  if (score.P !== score.B) {
    pick = score.B > score.P ? "B" : "P";
    label = pick === "B" ? "BANCA" : "PUNTO";
    const gap = Math.abs(score.B - score.P);
    conviction = gap <= 2 ? "baja" : gap <= 5 ? "media" : "alta";
  }
  const n = results.length;
  const punto = results.filter((r) => r === "P").length;
  const banca = results.filter((r) => r === "B").length;
  const empate = results.filter((r) => r === "T").length;
  return {
    results,
    columns: roads.columns,
    tiesOn: roads.tiesOn,
    bead: roads.bead,
    beb: roads.beb,
    small: roads.small,
    cock: roads.cock,
    stats: {
      manos: n,
      punto,
      banca,
      empate,
      pctPunto: n ? (punto / n) * 100 : 0,
      pctBanca: n ? (banca / n) * 100 : 0,
      pctEmpate: n ? (empate / n) * 100 : 0,
      racha: roads.streak,
      lado: roads.lastSide,
      bebRojo: roads.beb.filter((x) => x === "R").length,
      bebAzul: roads.beb.filter((x) => x === "A").length,
      smallRojo: roads.small.filter((x) => x === "R").length,
      smallAzul: roads.small.filter((x) => x === "A").length,
      cockRojo: roads.cock.filter((x) => x === "R").length,
      cockAzul: roads.cock.filter((x) => x === "A").length,
    },
    patterns,
    votes,
    pick,
    scoreP: score.P,
    scoreB: score.B,
    label,
    conviction,
  };
}

export const DEMO: Result[] = [
  "P", "B", "B", "P", "B", "P", "P", "B", "B", "P",
  "B", "P", "B", "B", "B", "B", "B", "B", "P", "B",
  "B", "P", "P", "P", "B", "T", "B", "P", "B", "B", "P", "B",
];
