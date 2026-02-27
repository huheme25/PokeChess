import type { PieceClass, PokemonType } from '@pokechess/data';
import { BASE_STATS, calculateDamage, type PieceStats } from './combat.js';
import { getTypeMultiplier } from './typeChart.js';

/**
 * Balance Engine — Cálculo EXACTO de probabilidad de victoria.
 * Usa DP iterativo bottom-up sobre estados (hpA, hpB, guardState).
 *
 * Guard states: 0=ambos consumidos, 1=solo guardA, 2=solo guardB, 3=ambos activos
 * Primer llamada siempre es con guardState=3 (ambos guards activos).
 * Tras la primera ronda, ambos guards se consumen -> guardState=0.
 */

interface CombatConfig {
  hpA: number;
  dieA: number;
  attackA: number;
  defenseA: number;
  hpB: number;
  dieB: number;
  attackB: number;
  defenseB: number;
  typeMultiplierAtoB: number;
  typeMultiplierBtoA: number;
}

/** Distribución de daño para un dado de N lados */
function damageDistribution(
  dieSides: number,
  attackerAttack: number,
  defenderDefense: number,
  typeMultiplier: number,
  defenderGuardActive: boolean,
): Map<number, number> {
  const dist = new Map<number, number>();
  const prob = 1 / dieSides;

  for (let roll = 1; roll <= dieSides; roll++) {
    const dmg = calculateDamage(roll, attackerAttack, defenderDefense, typeMultiplier, defenderGuardActive);
    dist.set(dmg, (dist.get(dmg) || 0) + prob);
  }

  return dist;
}

/**
 * Calcula P(A gana) para una ronda completa dado (hpA, hpB) sin guards.
 * Usa DP iterativo: "sin guards" porque tras la primera ronda ya se consumieron.
 *
 * En una ronda:
 *   A tira -> B puede morir (A gana)
 *   Si B vive, B tira -> A puede morir (B gana)
 *   Si ambos viven, nueva ronda con (hpA', hpB')
 *
 * Calcula bottom-up: estados terminales primero, luego hacia arriba.
 *
 * Manejo de dmg=0: cuando A y B ambos hacen 0 daño con cierta probabilidad,
 * el estado se referencia a sí mismo. Resolvemos algebraicamente:
 *   P(hA,hB) = pLoop * P(hA,hB) + pOther
 *   P(hA,hB) = pOther / (1 - pLoop)   si pLoop < 1
 *   P(hA,hB) = 0                        si pLoop = 1 (ambos siempre hacen 0)
 */
export function calculateWinProbability(config: CombatConfig): number {
  const { hpA, dieA, attackA, defenseA, hpB, dieB, attackB, defenseB,
          typeMultiplierAtoB, typeMultiplierBtoA } = config;

  // Precalcular distribuciones de daño
  const distA_guardOn = damageDistribution(dieA, attackA, defenseB, typeMultiplierAtoB, true);
  const distA_guardOff = damageDistribution(dieA, attackA, defenseB, typeMultiplierAtoB, false);
  const distB_guardOn = damageDistribution(dieB, attackB, defenseA, typeMultiplierBtoA, true);
  const distB_guardOff = damageDistribution(dieB, attackB, defenseA, typeMultiplierBtoA, false);

  // Paso 1: DP bottom-up para estado sin guards (la mayoría del combate)
  // dp[hA][hB] = P(A gana | hpA=hA, hpB=hB, sin guards)
  const dp: number[][] = [];
  for (let hA = 0; hA <= hpA; hA++) {
    dp[hA] = new Array(hpB + 1).fill(0);
  }
  // Base: hB=0 -> A gana (P=1), hA=0 -> B gana (P=0), ya iniciado a 0
  for (let hA = 1; hA <= hpA; hA++) {
    dp[hA][0] = 1;
  }

  // Iterar bottom-up: resolver estados con HP menores primero
  // Un estado (hA, hB) solo depende de estados con hB' < hB o hA' < hA (o sí mismo con dmg=0)
  // Manejamos la autoreferencia algebraicamente
  for (let hB_val = 1; hB_val <= hpB; hB_val++) {
    for (let hA_val = 1; hA_val <= hpA; hA_val++) {
      let pWin = 0;   // contribución de estados resueltos
      let pLoop = 0;  // probabilidad de volver al mismo estado

      for (const [dmgA, pA] of distA_guardOff) {
        const newHB = hB_val - dmgA;

        if (newHB <= 0) {
          pWin += pA;
        } else {
          for (const [dmgB, pB] of distB_guardOff) {
            const newHA = hA_val - dmgB;

            if (newHA <= 0) {
              // A muere, contribución = 0
            } else if (newHA === hA_val && newHB === hB_val) {
              // Autoreferencia (ambos dmg = 0)
              pLoop += pA * pB;
            } else {
              pWin += pA * pB * dp[newHA][newHB];
            }
          }
        }
      }

      if (pLoop >= 1.0) {
        // Ambos siempre hacen 0 daño: combate nunca termina, atacante no puede ganar
        dp[hA_val][hB_val] = 0;
      } else {
        dp[hA_val][hB_val] = pWin / (1 - pLoop);
      }
    }
  }

  // Paso 2: Calcular con guards activos (solo la primera ronda)
  // La primera ronda usa distA_guardOn (guard de B activo) y distB_guardOn (guard de A activo)
  // Después de la primera ronda, ambos guards se consumen -> usamos dp[][]
  let result = 0;

  for (const [dmgA, pA] of distA_guardOn) {
    const newHB = hpB - dmgA;

    if (newHB <= 0) {
      result += pA;
    } else {
      for (const [dmgB, pB] of distB_guardOn) {
        const newHA = hpA - dmgB;

        if (newHA <= 0) {
          // A muere
        } else {
          // Ambos vivos, guards consumidos -> usar dp
          result += pA * pB * dp[newHA][newHB];
        }
      }
    }
  }

  return result;
}

/** Versión simplificada para clase vs clase con tipo neutral */
export function classVsClassWinrate(
  attackerClass: PieceClass,
  defenderClass: PieceClass,
  typeMultiplier: number = 1.0,
): number {
  const a = BASE_STATS[attackerClass];
  const d = BASE_STATS[defenderClass];

  return calculateWinProbability({
    hpA: a.hp,
    dieA: a.die,
    attackA: a.attack,
    defenseA: a.defense,
    hpB: d.hp,
    dieB: d.die,
    attackB: d.attack,
    defenseB: d.defense,
    typeMultiplierAtoB: typeMultiplier,
    typeMultiplierBtoA: typeMultiplier,
  });
}

/** Winrate con multiplicadores asimétricos */
export function classVsClassWinrateAsym(
  attackerClass: PieceClass,
  defenderClass: PieceClass,
  mAtoB: number,
  mBtoA: number,
): number {
  const a = BASE_STATS[attackerClass];
  const d = BASE_STATS[defenderClass];

  return calculateWinProbability({
    hpA: a.hp,
    dieA: a.die,
    attackA: a.attack,
    defenseA: a.defense,
    hpB: d.hp,
    dieB: d.die,
    attackB: d.attack,
    defenseB: d.defense,
    typeMultiplierAtoB: mAtoB,
    typeMultiplierBtoA: mBtoA,
  });
}

/** Winrate con stats customizados */
export function customWinrate(
  attacker: PieceStats,
  defender: PieceStats,
  attackerTypes: PokemonType[],
  defenderTypes: PokemonType[],
): number {
  return calculateWinProbability({
    hpA: attacker.hp,
    dieA: attacker.die,
    attackA: attacker.attack,
    defenseA: attacker.defense,
    hpB: defender.hp,
    dieB: defender.die,
    attackB: defender.attack,
    defenseB: defender.defense,
    typeMultiplierAtoB: getTypeMultiplier(attackerTypes, defenderTypes),
    typeMultiplierBtoA: getTypeMultiplier(defenderTypes, attackerTypes),
  });
}
