/**
 * Auto-tuner de balance: busca stats optimos para que los winrates
 * de clase vs clase caigan dentro de los targets definidos.
 *
 * Estrategia: busqueda SECUENCIAL por cadena.
 * Cada target solo depende de 2 clases adyacentes:
 *   1. Pawn vs Pawn -> solo Pawn
 *   2. Minor vs Pawn -> Pawn (fijo) + Minor
 *   3. Rook vs Minor -> Minor (fijo) + Rook
 *   4. Queen vs Rook -> Rook (fijo) + Queen
 *   5. King = derivado de Rook con +1 DEF
 */

import { calculateWinProbability } from '@pokechess/engine';

interface ClassStats {
  hp: number;
  die: number;
  attack: number;
  defense: number;
}

function wr(a: ClassStats, d: ClassStats): number {
  return calculateWinProbability({
    hpA: a.hp, dieA: a.die, attackA: a.attack, defenseA: a.defense,
    hpB: d.hp, dieB: d.die, attackB: d.attack, defenseB: d.defense,
    typeMultiplierAtoB: 1.0, typeMultiplierBtoA: 1.0,
  });
}

function fmt(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

// --- Paso 1: Encontrar Pawn stats (Pawn vs Pawn = 52-55%) ---
console.log('=== PASO 1: Pawn vs Pawn (target 52-55%) ===\n');

interface ScoredStats {
  stats: ClassStats;
  winrate: number;
  dist: number; // distancia al centro del target
}

const pawnCandidates: ScoredStats[] = [];
const PAWN_TARGET = { low: 0.52, high: 0.55, mid: 0.535 };

for (let hp = 15; hp <= 60; hp++) {
  for (const die of [6, 8]) {
    for (let atk = 0; atk <= 3; atk++) {
      for (let def = 0; def <= 3; def++) {
        const stats: ClassStats = { hp, die, attack: atk, defense: def };
        const w = wr(stats, stats);
        if (w >= PAWN_TARGET.low && w <= PAWN_TARGET.high) {
          pawnCandidates.push({ stats, winrate: w, dist: Math.abs(w - PAWN_TARGET.mid) });
        }
      }
    }
  }
}

pawnCandidates.sort((a, b) => a.dist - b.dist);
console.log(`Encontrados: ${pawnCandidates.length} sets de Pawn validos`);
for (const c of pawnCandidates.slice(0, 10)) {
  const s = c.stats;
  console.log(`  HP=${s.hp} d${s.die} A=${s.attack} D=${s.defense} -> ${fmt(c.winrate)}`);
}

// --- Paso 2: Para cada Pawn, encontrar Minor (Minor vs Pawn = 78-85%) ---
console.log('\n=== PASO 2: Minor vs Pawn (target 78-85%) ===\n');

const MINOR_TARGET = { low: 0.78, high: 0.85, mid: 0.815 };

interface PairResult {
  pawn: ClassStats;
  minor: ClassStats;
  pawnWr: number;
  minorWr: number;
  cost: number;
}

const pawnMinorPairs: PairResult[] = [];

// Usar top 20 Pawn candidates para velocidad
for (const pawnC of pawnCandidates.slice(0, 20)) {
  for (let hp = pawnC.stats.hp; hp <= pawnC.stats.hp + 25; hp++) {
    for (const die of [pawnC.stats.die, Math.min(pawnC.stats.die + 2, 12)]) {
      for (let atk = pawnC.stats.attack; atk <= pawnC.stats.attack + 3; atk++) {
        for (let def = pawnC.stats.defense; def <= pawnC.stats.defense + 3; def++) {
          const minor: ClassStats = { hp, die, attack: atk, defense: def };
          const w = wr(minor, pawnC.stats);
          if (w >= MINOR_TARGET.low && w <= MINOR_TARGET.high) {
            const cost = Math.abs(pawnC.winrate - PAWN_TARGET.mid) + Math.abs(w - MINOR_TARGET.mid);
            pawnMinorPairs.push({
              pawn: pawnC.stats,
              minor,
              pawnWr: pawnC.winrate,
              minorWr: w,
              cost,
            });
          }
        }
      }
    }
  }
}

pawnMinorPairs.sort((a, b) => a.cost - b.cost);
console.log(`Encontrados: ${pawnMinorPairs.length} pares Pawn+Minor validos`);
for (const p of pawnMinorPairs.slice(0, 5)) {
  console.log(`  Pawn(HP=${p.pawn.hp} d${p.pawn.die} A=${p.pawn.attack} D=${p.pawn.defense}) -> PvP=${fmt(p.pawnWr)}`);
  console.log(`  Minor(HP=${p.minor.hp} d${p.minor.die} A=${p.minor.attack} D=${p.minor.defense}) -> MvP=${fmt(p.minorWr)}`);
  console.log('');
}

// --- Paso 3: Para cada par, encontrar Rook (Rook vs Minor = 65-75%) ---
console.log('=== PASO 3: Rook vs Minor (target 65-75%) ===\n');

const ROOK_TARGET = { low: 0.65, high: 0.75, mid: 0.70 };

interface TripleResult extends PairResult {
  rook: ClassStats;
  rookWr: number;
}

const triples: TripleResult[] = [];

for (const pair of pawnMinorPairs.slice(0, 15)) {
  for (let hp = pair.minor.hp; hp <= pair.minor.hp + 25; hp++) {
    for (const die of [pair.minor.die, Math.min(pair.minor.die + 2, 12)]) {
      for (let atk = pair.minor.attack; atk <= pair.minor.attack + 3; atk++) {
        for (let def = pair.minor.defense; def <= pair.minor.defense + 3; def++) {
          const rook: ClassStats = { hp, die, attack: atk, defense: def };
          const w = wr(rook, pair.minor);
          if (w >= ROOK_TARGET.low && w <= ROOK_TARGET.high) {
            const cost = pair.cost + Math.abs(w - ROOK_TARGET.mid);
            triples.push({ ...pair, rook, rookWr: w, cost });
          }
        }
      }
    }
  }
}

triples.sort((a, b) => a.cost - b.cost);
console.log(`Encontrados: ${triples.length} triples Pawn+Minor+Rook validos`);
for (const t of triples.slice(0, 3)) {
  console.log(`  Pawn(HP=${t.pawn.hp} d${t.pawn.die} A=${t.pawn.attack} D=${t.pawn.defense}) PvP=${fmt(t.pawnWr)}`);
  console.log(`  Minor(HP=${t.minor.hp} d${t.minor.die} A=${t.minor.attack} D=${t.minor.defense}) MvP=${fmt(t.minorWr)}`);
  console.log(`  Rook(HP=${t.rook.hp} d${t.rook.die} A=${t.rook.attack} D=${t.rook.defense}) RvM=${fmt(t.rookWr)}`);
  console.log('');
}

// --- Paso 4: Para cada triple, encontrar Queen (Queen vs Rook = 65-75%) ---
console.log('=== PASO 4: Queen vs Rook (target 65-75%) ===\n');

const QUEEN_TARGET = { low: 0.65, high: 0.75, mid: 0.70 };

interface FullResult extends TripleResult {
  queen: ClassStats;
  king: ClassStats;
  queenWr: number;
}

const fullResults: FullResult[] = [];

for (const triple of triples.slice(0, 15)) {
  for (let hp = triple.rook.hp; hp <= triple.rook.hp + 25; hp++) {
    for (const die of [triple.rook.die, Math.min(triple.rook.die + 2, 12)]) {
      for (let atk = triple.rook.attack; atk <= triple.rook.attack + 3; atk++) {
        for (let def = triple.rook.defense - 1; def <= triple.rook.defense + 2; def++) {
          if (def < 0) continue;
          const queen: ClassStats = { hp, die, attack: atk, defense: def };
          const w = wr(queen, triple.rook);
          if (w >= QUEEN_TARGET.low && w <= QUEEN_TARGET.high) {
            // King: como Rook pero con +1 DEF
            const king: ClassStats = {
              hp: triple.rook.hp,
              die: triple.rook.die,
              attack: triple.rook.attack,
              defense: triple.rook.defense + 1,
            };
            const cost = triple.cost + Math.abs(w - QUEEN_TARGET.mid);
            fullResults.push({ ...triple, queen, king, queenWr: w, cost });
          }
        }
      }
    }
  }
}

fullResults.sort((a, b) => a.cost - b.cost);
console.log(`Encontrados: ${fullResults.length} soluciones completas\n`);

// --- Imprimir mejores resultados ---
if (fullResults.length === 0) {
  console.log('ERROR: No se encontro ninguna solucion que cumpla todos los targets.');
  console.log('Intenta ampliar los rangos de busqueda.');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('  TOP 3 SOLUCIONES');
console.log('='.repeat(60));

for (let i = 0; i < Math.min(3, fullResults.length); i++) {
  const r = fullResults[i];
  console.log(`\n--- Solucion #${i + 1} (costo: ${r.cost.toFixed(4)}) ---\n`);

  console.log('BASE_STATS:');
  console.log(`  Pawn:   { hp: ${r.pawn.hp}, die: ${r.pawn.die},  attack: ${r.pawn.attack}, defense: ${r.pawn.defense} }`);
  console.log(`  Knight: { hp: ${r.minor.hp}, die: ${r.minor.die},  attack: ${r.minor.attack}, defense: ${r.minor.defense} }`);
  console.log(`  Bishop: { hp: ${r.minor.hp}, die: ${r.minor.die},  attack: ${r.minor.attack}, defense: ${r.minor.defense} }`);
  console.log(`  Rook:   { hp: ${r.rook.hp}, die: ${r.rook.die},  attack: ${r.rook.attack}, defense: ${r.rook.defense} }`);
  console.log(`  Queen:  { hp: ${r.queen.hp}, die: ${r.queen.die},  attack: ${r.queen.attack}, defense: ${r.queen.defense} }`);
  console.log(`  King:   { hp: ${r.king.hp}, die: ${r.king.die},  attack: ${r.king.attack}, defense: ${r.king.defense} }`);

  console.log('\nWinrates:');
  console.log(`  Pawn vs Pawn:   ${fmt(r.pawnWr).padEnd(8)} target [${fmt(PAWN_TARGET.low)}-${fmt(PAWN_TARGET.high)}]`);
  console.log(`  Minor vs Pawn:  ${fmt(r.minorWr).padEnd(8)} target [${fmt(MINOR_TARGET.low)}-${fmt(MINOR_TARGET.high)}]`);
  console.log(`  Rook vs Minor:  ${fmt(r.rookWr).padEnd(8)} target [${fmt(ROOK_TARGET.low)}-${fmt(ROOK_TARGET.high)}]`);
  console.log(`  Queen vs Rook:  ${fmt(r.queenWr).padEnd(8)} target [${fmt(QUEEN_TARGET.low)}-${fmt(QUEEN_TARGET.high)}]`);

  // Matriz completa
  console.log('\n  Matriz completa (neutral):');
  const classes = [
    { name: 'Pawn', stats: r.pawn },
    { name: 'Minor', stats: r.minor },
    { name: 'Rook', stats: r.rook },
    { name: 'Queen', stats: r.queen },
    { name: 'King', stats: r.king },
  ];
  const hdr = ['Atk\\Def', ...classes.map(c => c.name)].map(s => s.padEnd(10)).join('');
  console.log('  ' + hdr);
  for (const atk of classes) {
    const row = [atk.name.padEnd(10)];
    for (const def of classes) {
      const w = wr(atk.stats, def.stats);
      row.push(fmt(w).padEnd(10));
    }
    console.log('  ' + row.join(''));
  }
}

console.log('\n--- Fin del tuner ---');
