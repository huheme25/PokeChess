import type { PokemonType, PieceClass, CombatResult, CombatLogEntry } from '@pokechess/data';
import { getTypeMultiplier } from './typeChart.js';

// Stats base por clase
export interface PieceStats {
  hp: number;
  die: number;   // lados del dado (d6=6, d8=8, etc.)
  attack: number;
  defense: number;
}

export const BASE_STATS: Record<PieceClass, PieceStats> = {
  Pawn:   { hp: 33, die: 6,  attack: 1, defense: 3 },
  Knight: { hp: 41, die: 6,  attack: 1, defense: 3 },
  Bishop: { hp: 41, die: 6,  attack: 1, defense: 3 },
  Rook:   { hp: 46, die: 6,  attack: 1, defense: 3 },
  Queen:  { hp: 51, die: 6,  attack: 1, defense: 3 },
  King:   { hp: 36, die: 6,  attack: 1, defense: 3 },
};

const DIE_PROGRESSION = [6, 8, 10, 12];

function upgradeDie(currentDie: number): number {
  const idx = DIE_PROGRESSION.indexOf(currentDie);
  if (idx === -1 || idx === DIE_PROGRESSION.length - 1) return currentDie;
  return DIE_PROGRESSION[idx + 1];
}

/** Calcula stats con evolución aplicada */
export function getStatsWithEvolution(
  pieceClass: PieceClass,
  stage: number,
  speciesMod: number,
  speciesModTarget: 'attack' | 'defense',
  isMewtwoKing: boolean = false,
): PieceStats {
  const base = { ...BASE_STATS[pieceClass] };

  // Solo peones evolucionan: +4 HP y die upgrade por stage
  // S2 alcanza HP de Minor (41) con mejor die (d10)
  if (pieceClass === 'Pawn') {
    for (let i = 0; i < stage; i++) {
      base.hp += 4;
      base.die = upgradeDie(base.die);
    }
  }

  // Species Mod
  if (speciesModTarget === 'attack') {
    base.attack += speciesMod;
  } else {
    base.defense += speciesMod;
  }

  // Mewtwo King penalty
  if (isMewtwoKing) {
    base.defense -= 1;
  }

  // Clamp
  base.attack = Math.max(0, base.attack);
  base.defense = Math.max(0, base.defense);

  return base;
}

/** Calcula daño de un golpe */
export function calculateDamage(
  roll: number,
  attackerAttack: number,
  defenderDefense: number,
  typeMultiplier: number,
  isFirstHitOnDefender: boolean,
): number {
  const effectiveDefense = isFirstHitOnDefender
    ? defenderDefense + 1  // Defender Guard: +1 D temporal
    : defenderDefense;
  const raw = roll + attackerAttack - effectiveDefense;
  return Math.floor(Math.max(0, raw) * typeMultiplier);
}

/** Genera roll aleatorio para un dado de N lados (1..N) */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export interface CombatantInfo {
  name: string;
  types: PokemonType[];
  hp: number;
  attack: number;
  defense: number;
  die: number;
}

/**
 * Simula combate completo entre atacante y defensor.
 * El atacante golpea primero (iniciativa de captura).
 */
export function resolveCombat(
  attacker: CombatantInfo,
  defender: CombatantInfo,
): CombatResult {
  const log: CombatLogEntry[] = [];
  let aHp = attacker.hp;
  let dHp = defender.hp;
  let turn = 0;
  let defenderHitCount = 0; // Cuántas veces ha sido golpeado el defensor
  let attackerHitCount = 0; // Cuántas veces ha sido golpeado el atacante

  const mAttacker = getTypeMultiplier(attacker.types, defender.types);
  const mDefender = getTypeMultiplier(defender.types, attacker.types);

  while (aHp > 0 && dHp > 0) {
    turn++;

    // Atacante golpea al defensor
    const aRoll = rollDie(attacker.die);
    const isFirstHitOnDefender = defenderHitCount === 0;
    const aDmg = calculateDamage(aRoll, attacker.attack, defender.defense, mAttacker, isFirstHitOnDefender);
    defenderHitCount++;
    dHp -= aDmg;
    log.push({
      turn,
      attacker: attacker.name,
      roll: aRoll,
      damage: aDmg,
      targetHpAfter: Math.max(0, dHp),
    });

    if (dHp <= 0) break;

    // Defensor contraataca
    const dRoll = rollDie(defender.die);
    const isFirstHitOnAttacker = attackerHitCount === 0;
    const dDmg = calculateDamage(dRoll, defender.attack, attacker.defense, mDefender, isFirstHitOnAttacker);
    attackerHitCount++;
    aHp -= dDmg;
    log.push({
      turn,
      attacker: defender.name,
      roll: dRoll,
      damage: dDmg,
      targetHpAfter: Math.max(0, aHp),
    });
  }

  return {
    winner: dHp <= 0 ? 'attacker' : 'defender',
    log,
    attackerHpRemaining: Math.max(0, aHp),
    defenderHpRemaining: Math.max(0, dHp),
  };
}
