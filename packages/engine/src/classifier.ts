import type { PokemonData, PieceClass } from '@pokechess/data';
import { allPokemon } from '@pokechess/data';

export interface ClassifiedPokemon {
  pokemon: PokemonData;
  os: number;  // Offensive Score
  ds: number;  // Defensive Score
  pr: number;  // Power Rating
  pool: PieceClass[];  // Pools donde es legal
  speciesMod: number;  // -1, 0, o +1
  speciesModTarget: 'attack' | 'defense';
  knightLegal: boolean;
  bishopLegal: boolean;
}

function calcOS(p: PokemonData): number {
  return 0.35 * p.baseStats.atk + 0.35 * p.baseStats.special + 0.30 * p.baseStats.spd;
}

function calcDS(p: PokemonData): number {
  return 0.45 * p.baseStats.hp + 0.35 * p.baseStats.def + 0.20 * p.baseStats.special;
}

function calcPR(os: number, ds: number): number {
  return 0.55 * os + 0.45 * ds;
}

/** Percentil (0-1) de un valor en un array ordenado ascendente */
function percentileRank(sorted: number[], value: number): number {
  let count = 0;
  for (const v of sorted) {
    if (v < value) count++;
    else if (v === value) count += 0.5;
  }
  return count / sorted.length;
}

function isTopPercent(sorted: number[], value: number, percent: number): boolean {
  const rank = percentileRank(sorted, value);
  return rank >= (1 - percent);
}

function isBottomPercent(sorted: number[], value: number, percent: number): boolean {
  const rank = percentileRank(sorted, value);
  return rank <= percent;
}

let _cache: ClassifiedPokemon[] | null = null;

export function classifyAllPokemon(): ClassifiedPokemon[] {
  if (_cache) return _cache;

  // Calcular PR para todos
  const withScores = allPokemon.map(p => {
    const os = calcOS(p);
    const ds = calcDS(p);
    const pr = calcPR(os, ds);
    return { pokemon: p, os, ds, pr };
  });

  // Ordenar por PR ascendente
  const sortedByPR = [...withScores].sort((a, b) => a.pr - b.pr);
  const prValues = sortedByPR.map(x => x.pr);

  // Asignar pools por percentil de PR
  const total = sortedByPR.length;

  // Pool boundaries por índice en el sorted array
  const pawnCutoff = Math.ceil(total * 0.45);    // 0-45%
  const minorCutoff = Math.ceil(total * 0.75);   // 45-75%
  const rookCutoff = Math.ceil(total * 0.92);     // 75-92%
  const queenCutoff = Math.ceil(total * 0.99);    // 92-99%
  // King: 70-97%
  const kingLow = Math.ceil(total * 0.70);
  const kingHigh = Math.ceil(total * 0.97);

  // Asignar pool primario por percentil
  const poolMap = new Map<number, PieceClass[]>();
  sortedByPR.forEach((item, idx) => {
    const pools: PieceClass[] = [];
    if (idx < pawnCutoff) pools.push('Pawn');
    if (idx >= pawnCutoff && idx < minorCutoff) pools.push('Knight', 'Bishop');
    if (idx >= minorCutoff && idx < rookCutoff) pools.push('Rook');
    if (idx >= rookCutoff && idx < queenCutoff) pools.push('Queen');
    if (idx >= kingLow && idx < kingHigh) pools.push('King');
    if (pools.length === 0) pools.push('Pawn'); // fallback
    poolMap.set(item.pokemon.id, pools);
  });

  // Sub-pool filtering para Knight, Bishop, Rook, King
  const minorPool = sortedByPR.filter((_, i) => i >= pawnCutoff && i < minorCutoff);
  const minorSpeeds = minorPool.map(x => x.pokemon.baseStats.spd).sort((a, b) => a - b);
  const minorSpecials = minorPool.map(x => x.pokemon.baseStats.special).sort((a, b) => a - b);

  const rookPool = sortedByPR.filter((_, i) => i >= minorCutoff && i < rookCutoff);
  const rookDS = rookPool.map(x => x.ds).sort((a, b) => a - b);

  const kingPool = sortedByPR.filter((_, i) => i >= kingLow && i < kingHigh);
  const kingDS = kingPool.map(x => x.ds).sort((a, b) => a - b);
  const kingDSMedian = kingDS.length > 0 ? kingDS[Math.floor(kingDS.length / 2)] : 0;

  // Species Mod: calcular por pool
  // Necesitamos PR por pool para top/bottom 15%
  const poolPRs = new Map<string, number[]>();
  const getPoolKey = (pools: PieceClass[]): string => pools.join(',');

  // Agrupar PRs por pool asignado
  sortedByPR.forEach((item) => {
    const pools = poolMap.get(item.pokemon.id) || ['Pawn'];
    const key = getPoolKey(pools);
    if (!poolPRs.has(key)) poolPRs.set(key, []);
    poolPRs.get(key)!.push(item.pr);
  });

  // Construir resultado final
  const result: ClassifiedPokemon[] = withScores.map(item => {
    const pools = poolMap.get(item.pokemon.id) || ['Pawn'];
    const poolKey = getPoolKey(pools);
    const poolPR = poolPRs.get(poolKey) || [item.pr];
    const sortedPoolPR = [...poolPR].sort((a, b) => a - b);

    // Knight legal: Speed top 40% dentro del Minor pool
    let knightLegal = pools.includes('Knight');
    if (knightLegal) {
      knightLegal = isTopPercent(minorSpeeds, item.pokemon.baseStats.spd, 0.40);
    }

    // Bishop legal: Special top 40% dentro del Minor pool
    let bishopLegal = pools.includes('Bishop');
    if (bishopLegal) {
      bishopLegal = isTopPercent(minorSpecials, item.pokemon.baseStats.special, 0.40);
    }

    // Rook: DS top 50%
    if (pools.includes('Rook')) {
      const rookLegal = isTopPercent(rookDS, item.ds, 0.50);
      if (!rookLegal) {
        // Sigue en Rook pool pero no puede ser Rook puro defensivo
        // Mantenemos en pool de todas formas
      }
    }

    // King: DS >= mediana del King pool
    if (pools.includes('King')) {
      if (item.ds < kingDSMedian) {
        const idx = pools.indexOf('King');
        if (idx > -1) pools.splice(idx, 1);
      }
    }

    // Species Mod
    let speciesMod = 0;
    let speciesModTarget: 'attack' | 'defense' = 'defense';
    if (isTopPercent(sortedPoolPR, item.pr, 0.15)) {
      speciesMod = -1;
      speciesModTarget = 'defense'; // -1 D por default
    } else if (isBottomPercent(sortedPoolPR, item.pr, 0.15)) {
      speciesMod = 1;
      speciesModTarget = 'defense'; // +1 D por default
    }

    // Mewtwo como King: -1 D permanente (además del SM)
    // Se aplica en la creación de pieza, no aquí

    return {
      pokemon: item.pokemon,
      os: Math.round(item.os * 100) / 100,
      ds: Math.round(item.ds * 100) / 100,
      pr: Math.round(item.pr * 100) / 100,
      pool: pools,
      speciesMod,
      speciesModTarget,
      knightLegal,
      bishopLegal,
    };
  });

  _cache = result;
  return result;
}

export function getClassification(pokemonId: number): ClassifiedPokemon | undefined {
  return classifyAllPokemon().find(c => c.pokemon.id === pokemonId);
}

export function getPokemonForPool(pieceClass: PieceClass): ClassifiedPokemon[] {
  return classifyAllPokemon().filter(c => {
    if (pieceClass === 'Knight') return c.knightLegal;
    if (pieceClass === 'Bishop') return c.bishopLegal;
    return c.pool.includes(pieceClass);
  });
}

export function clearCache(): void {
  _cache = null;
}
