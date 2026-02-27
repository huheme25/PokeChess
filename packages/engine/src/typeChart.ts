import type { PokemonType } from '@pokechess/data';

// Multiplicadores: SE=1.5, N=1.0, RES=0.75, IMM=0
const SE = 1.5;
const N = 1.0;
const RES = 0.75;
const IMM = 0;

// Orden de tipos para indexar la matriz
const TYPE_ORDER: PokemonType[] = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic',
  'Bug', 'Rock', 'Ghost', 'Dragon',
];

// Matriz Gen 1: chart[atk][def] = multiplicador
// Filas = tipo atacante, Columnas = tipo defensor
const CHART: number[][] = [
  //          Nor  Fir  Wat  Ele  Gra  Ice  Fig  Poi  Gro  Fly  Psy  Bug  Roc  Gho  Dra
  /* Normal  */[N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,  RES, IMM,  N],
  /* Fire    */[N,  RES, RES,  N,   SE,  SE,  N,   N,   N,   N,   N,   SE, RES,  N,  RES],
  /* Water   */[N,   SE, RES,  N,  RES,  N,   N,   N,   SE,  N,   N,   N,   SE,  N,  RES],
  /* Electric*/[N,   N,   SE, RES, RES,  N,   N,   N,  IMM,  SE,  N,   N,   N,   N,  RES],
  /* Grass   */[N,  RES,  SE,  N,  RES,  N,   N,  RES, SE,  RES,  N,  RES,  SE,  N,  RES],
  /* Ice     */[N,   N,  RES,  N,   SE,  RES, N,   N,   SE,  SE,  N,   N,   N,   N,   SE],
  /* Fighting*/[SE,  N,   N,   N,   N,   SE,  N,  RES,  N,  RES, RES, RES,  SE, IMM,  N],
  /* Poison  */[N,   N,   N,   N,   SE,  N,   N,  RES, RES,  N,   N,   SE, RES, RES,  N],
  /* Ground  */[N,   SE,  N,   SE, RES,  N,   N,   SE,  N,  IMM,  N,  RES,  SE,  N,   N],
  /* Flying  */[N,   N,   N,  RES,  SE,  N,   SE,  N,   N,   N,   N,   SE, RES,  N,   N],
  /* Psychic */[N,   N,   N,   N,   N,   N,   SE,  SE,  N,   N,  RES,  N,   N,   N,   N],
  /* Bug     */[N,  RES,  N,   N,   SE,  N,  RES, RES,  N,  RES,  SE,  N,   N,  RES,  N],
  /* Rock    */[N,   SE,  N,   N,   N,   SE, RES,  N,  RES,  SE,  N,   SE,  N,   N,   N],
  /* Ghost   */[IMM, N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   SE,  N],
  /* Dragon  */[N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   N,   SE],
];

const typeIndex = new Map<PokemonType, number>();
TYPE_ORDER.forEach((t, i) => typeIndex.set(t, i));

/** Efectividad de un tipo atacante vs un tipo defensor */
export function getTypeEffectiveness(atkType: PokemonType, defType: PokemonType): number {
  const ai = typeIndex.get(atkType);
  const di = typeIndex.get(defType);
  if (ai === undefined || di === undefined) return N;
  return CHART[ai][di];
}

/**
 * Multiplicador total de tipo para ataque.
 * Atacante usa su(s) tipo(s) — usamos el MEJOR multiplicador entre sus tipos.
 * Defensor: multiplicamos efectos contra cada tipo del defensor.
 *
 * NOTA: En este juego, el atacante no elige "move type" —
 * usamos el tipo del Pokémon atacante. Si tiene dos tipos,
 * tomamos el mejor multiplicador (el más favorable para el atacante).
 */
export function getTypeMultiplier(
  attackerTypes: PokemonType[],
  defenderTypes: PokemonType[],
): number {
  let bestM = 0;
  for (const atkType of attackerTypes) {
    let m = 1;
    for (const defType of defenderTypes) {
      m *= getTypeEffectiveness(atkType, defType);
    }
    if (m > bestM) bestM = m;
  }
  return bestM;
}

/**
 * Califica matchup para Team Matchup Score:
 * SE -> +1, N -> 0, RES -> -1, IMM -> -2
 */
export function getMatchupScore(
  attackerTypes: PokemonType[],
  defenderPrimaryType: PokemonType,
): number {
  const m = getTypeMultiplier(attackerTypes, [defenderPrimaryType]);
  if (m >= SE) return 1;
  if (m === N) return 0;
  if (m > 0 && m <= RES) return -1;
  if (m === IMM) return -2;
  return 0;
}

export { SE, N, RES, IMM, TYPE_ORDER };
