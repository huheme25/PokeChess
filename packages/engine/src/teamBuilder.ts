import type { PokemonType, PieceClass, TeamSlot, TeamConfig } from '@pokechess/data';
import { allPokemon, getPokemonById, getEvolutionFamily } from '@pokechess/data';
import { getMatchupScore } from './typeChart.js';
import { getClassification, getPokemonForPool, type ClassifiedPokemon } from './classifier.js';

export interface ValidationError {
  code: string;
  message: string;
}

/** Valida un equipo completo */
export function validateTeam(
  team: TeamConfig,
  opponentPrimaryType?: PokemonType,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 16 piezas exactas
  if (team.slots.length !== 16) {
    errors.push({ code: 'WRONG_SIZE', message: `Se requieren 16 piezas, tienes ${team.slots.length}` });
  }

  // Contar por tipo
  const primaryCount = team.slots.filter(s => {
    const p = getPokemonById(s.pokemonId);
    return p && p.types.includes(team.primaryType);
  }).length;
  const secondaryCount = team.slots.filter(s => {
    const p = getPokemonById(s.pokemonId);
    return p && p.types.includes(team.secondaryType);
  }).length;

  if (primaryCount < 10) {
    errors.push({ code: 'LOW_PRIMARY', message: `Necesitas ≥10 piezas tipo principal (${team.primaryType}), tienes ${primaryCount}` });
  }
  if (secondaryCount < 6) {
    errors.push({ code: 'LOW_SECONDARY', message: `Necesitas ≥6 piezas tipo secundario (${team.secondaryType}), tienes ${secondaryCount}` });
  }

  // No repetir especie
  const speciesIds = team.slots.map(s => s.pokemonId);
  const uniqueSpecies = new Set(speciesIds);
  if (uniqueSpecies.size !== speciesIds.length) {
    errors.push({ code: 'DUPLICATE_SPECIES', message: 'No puedes repetir especie' });
  }

  // No repetir línea evolutiva
  const familyIds = new Set<number>();
  for (const slot of team.slots) {
    const p = getPokemonById(slot.pokemonId);
    if (p) {
      if (familyIds.has(p.evolutionFamilyId)) {
        errors.push({ code: 'DUPLICATE_FAMILY', message: `Familia evolutiva repetida: ${p.name} (familia ${p.evolutionFamilyId})` });
      }
      familyIds.add(p.evolutionFamilyId);
    }
  }

  // Máximo 1 legendario
  const legendaryCount = team.slots.filter(s => {
    const p = getPokemonById(s.pokemonId);
    return p && p.isLegendary;
  }).length;
  if (legendaryCount > 1) {
    errors.push({ code: 'TOO_MANY_LEGENDARIES', message: `Máximo 1 legendario, tienes ${legendaryCount}` });
  }

  // Validar que legendarios solo sean Mewtwo o Mew
  for (const slot of team.slots) {
    const p = getPokemonById(slot.pokemonId);
    if (p && p.isLegendary && p.id !== 150 && p.id !== 151) {
      errors.push({ code: 'INVALID_LEGENDARY', message: `${p.name} no es legendario permitido (solo Mewtwo y Mew)` });
    }
  }

  // Validar pool legal para cada pieza
  for (const slot of team.slots) {
    const classification = getClassification(slot.pokemonId);
    if (!classification) {
      errors.push({ code: 'UNKNOWN_POKEMON', message: `Pokémon ID ${slot.pokemonId} no encontrado` });
      continue;
    }

    const isLegal = isPokemonLegalForClass(slot.pokemonId, slot.pieceClass);
    if (!isLegal) {
      errors.push({
        code: 'ILLEGAL_CLASS',
        message: `${classification.pokemon.name} no es legal para ${slot.pieceClass}`,
      });
    }
  }

  // Validar composición de piezas (ajedrez estándar: 8 peones, 2 caballos, 2 alfiles, 2 torres, 1 reina, 1 rey)
  const classCounts: Record<PieceClass, number> = { Pawn: 0, Knight: 0, Bishop: 0, Rook: 0, Queen: 0, King: 0 };
  for (const slot of team.slots) {
    classCounts[slot.pieceClass]++;
  }
  if (classCounts.Pawn !== 8) errors.push({ code: 'WRONG_PAWN_COUNT', message: `Necesitas 8 peones, tienes ${classCounts.Pawn}` });
  if (classCounts.Knight !== 2) errors.push({ code: 'WRONG_KNIGHT_COUNT', message: `Necesitas 2 caballos, tienes ${classCounts.Knight}` });
  if (classCounts.Bishop !== 2) errors.push({ code: 'WRONG_BISHOP_COUNT', message: `Necesitas 2 alfiles, tienes ${classCounts.Bishop}` });
  if (classCounts.Rook !== 2) errors.push({ code: 'WRONG_ROOK_COUNT', message: `Necesitas 2 torres, tienes ${classCounts.Rook}` });
  if (classCounts.Queen !== 1) errors.push({ code: 'WRONG_QUEEN_COUNT', message: `Necesitas 1 reina, tienes ${classCounts.Queen}` });
  if (classCounts.King !== 1) errors.push({ code: 'WRONG_KING_COUNT', message: `Necesitas 1 rey, tienes ${classCounts.King}` });

  // Team Matchup Score (solo si se provee tipo rival)
  if (opponentPrimaryType) {
    let totalScore = 0;
    for (const slot of team.slots) {
      const p = getPokemonById(slot.pokemonId);
      if (p) {
        totalScore += getMatchupScore(p.types as PokemonType[], opponentPrimaryType);
      }
    }
    if (totalScore > 8) {
      errors.push({ code: 'MATCHUP_TOO_HIGH', message: `Team Matchup Score (${totalScore}) excede el máximo de +8` });
    }
  }

  return errors;
}

/** Verifica si un Pokémon es legal para una clase específica */
export function isPokemonLegalForClass(pokemonId: number, pieceClass: PieceClass): boolean {
  const c = getClassification(pokemonId);
  if (!c) return false;

  if (pieceClass === 'Knight') return c.knightLegal;
  if (pieceClass === 'Bishop') return c.bishopLegal;
  return c.pool.includes(pieceClass);
}

/** Calcula Team Matchup Score */
export function calculateTeamMatchupScore(
  team: TeamConfig,
  opponentPrimaryType: PokemonType,
): number {
  let total = 0;
  for (const slot of team.slots) {
    const p = getPokemonById(slot.pokemonId);
    if (p) {
      total += getMatchupScore(p.types as PokemonType[], opponentPrimaryType);
    }
  }
  return total;
}

// --- Auto Build ---

export interface AutoBuildResult {
  team: TeamConfig | null;
  errors: string[];
}

const SLOT_REQUIREMENTS: { pieceClass: PieceClass; count: number }[] = [
  { pieceClass: 'Queen',  count: 1 },
  { pieceClass: 'King',   count: 1 },
  { pieceClass: 'Rook',   count: 2 },
  { pieceClass: 'Knight', count: 2 },
  { pieceClass: 'Bishop', count: 2 },
  { pieceClass: 'Pawn',   count: 8 },
];

/** Construye equipo automaticamente segun tipos primario y secundario */
export function autoBuildTeam(
  primaryType: PokemonType,
  secondaryType: PokemonType,
): AutoBuildResult {
  const sameType = primaryType === secondaryType;
  // Pre-check: suficientes familias para cumplir los minimos de tipo?
  const eligible = allPokemon.filter(p =>
    p.types.includes(primaryType) || p.types.includes(secondaryType),
  );
  const uniqueFamilies = new Set(eligible.map(p => p.evolutionFamilyId));
  if (uniqueFamilies.size < 16) {
    return {
      team: null,
      errors: [`No hay suficientes Pokemon de tipo ${primaryType}/${secondaryType} (${uniqueFamilies.size} familias, se necesitan 16)`],
    };
  }

  // Verificar que hay suficientes familias por tipo para los minimos
  const primaryFamilies = new Set(allPokemon.filter(p => p.types.includes(primaryType)).map(p => p.evolutionFamilyId));
  const secondaryFamilies = new Set(allPokemon.filter(p => p.types.includes(secondaryType)).map(p => p.evolutionFamilyId));
  if (primaryFamilies.size < 10) {
    return {
      team: null,
      errors: [`${primaryType} solo tiene ${primaryFamilies.size} familias, se necesitan ≥10 para tipo primario`],
    };
  }
  if (secondaryFamilies.size < 6) {
    return {
      team: null,
      errors: [`${secondaryType} solo tiene ${secondaryFamilies.size} familias, se necesitan ≥6 para tipo secundario`],
    };
  }

  const usedIds = new Set<number>();
  const usedFamilies = new Set<number>();
  let usedLegendary = false;
  let primaryCount = 0;
  let secondaryCount = 0;
  const slots: TeamSlot[] = [];
  let slotsRemaining = 16;

  for (const { pieceClass, count } of SLOT_REQUIREMENTS) {
    const pool = getPokemonForPool(pieceClass);
    let picked = 0;

    // Seleccionar uno a uno, actualizando tracking entre picks
    while (picked < count) {
      // Filtrar candidatos disponibles (re-evalua en cada pick)
      const available = pool.filter(c => {
        if (usedIds.has(c.pokemon.id)) return false;
        if (usedFamilies.has(c.pokemon.evolutionFamilyId)) return false;
        if (c.pokemon.isLegendary) {
          if (usedLegendary) return false;
          if (c.pokemon.id !== 150 && c.pokemon.id !== 151) return false;
        }
        return true;
      });

      // Separar tipados y no tipados
      const typed = available.filter(c => c.pokemon.types.includes(primaryType) || c.pokemon.types.includes(secondaryType));
      const untyped = available.filter(c => !c.pokemon.types.includes(primaryType) && !c.pokemon.types.includes(secondaryType));

      // Ordenar tipados por prioridad normalizada, untyped como fallback
      const sorted = sortCandidates(typed, primaryType, secondaryType, primaryCount, secondaryCount, primaryFamilies.size, secondaryFamilies.size);
      const untypedSorted = [...untyped].sort((a, b) => b.pr - a.pr);
      const candidates = [...sorted, ...untypedSorted];

      if (candidates.length === 0) {
        return {
          team: null,
          errors: [`No hay suficientes Pokemon legales para ${pieceClass} (necesita ${count}, tiene ${picked})`],
        };
      }

      const pick = candidates[0];
      slots.push({ pokemonId: pick.pokemon.id, pieceClass });
      usedIds.add(pick.pokemon.id);
      usedFamilies.add(pick.pokemon.evolutionFamilyId);
      if (pick.pokemon.isLegendary) usedLegendary = true;
      if (pick.pokemon.types.includes(primaryType)) primaryCount++;
      if (pick.pokemon.types.includes(secondaryType)) secondaryCount++;
      slotsRemaining--;
      picked++;
    }
  }

  // Swap pass: si faltan tipos minimos, intentar intercambiar Pawns
  if (primaryCount < 10 || secondaryCount < 6) {
    swapForTypeBalance(slots, primaryType, secondaryType, primaryCount, secondaryCount, usedIds, usedFamilies);
  }

  const team: TeamConfig = { primaryType, secondaryType, slots };

  // Validar resultado
  const errors = validateTeam(team);
  if (errors.length > 0) {
    return { team: null, errors: errors.map(e => e.message) };
  }

  return { team, errors: [] };
}

function sortCandidates(
  candidates: ClassifiedPokemon[],
  primaryType: PokemonType,
  secondaryType: PokemonType,
  primaryCount: number,
  secondaryCount: number,
  primaryFamilyCount: number,
  secondaryFamilyCount: number,
): ClassifiedPokemon[] {
  // Normalizar deficits por disponibilidad: tipos escasos obtienen prioridad
  const primaryDeficit = Math.max(0, 10 - primaryCount) / Math.max(1, primaryFamilyCount);
  const secondaryDeficit = Math.max(0, 6 - secondaryCount) / Math.max(1, secondaryFamilyCount);

  return [...candidates].sort((a, b) => {
    const aHasPri = a.pokemon.types.includes(primaryType);
    const aHasSec = a.pokemon.types.includes(secondaryType);
    const bHasPri = b.pokemon.types.includes(primaryType);
    const bHasSec = b.pokemon.types.includes(secondaryType);
    const aHasBoth = aHasPri && aHasSec;
    const bHasBoth = bHasPri && bHasSec;

    // Tier 1: ambos tipos primero
    if (aHasBoth !== bHasBoth) return aHasBoth ? -1 : 1;

    // Tier 2: tipo con mas deficit normalizado
    const aScore = (aHasPri ? primaryDeficit : 0) + (aHasSec ? secondaryDeficit : 0);
    const bScore = (bHasPri ? primaryDeficit : 0) + (bHasSec ? secondaryDeficit : 0);
    if (aScore !== bScore) return bScore - aScore;

    // Desempate: mayor PR
    return b.pr - a.pr;
  });
}

function swapForTypeBalance(
  slots: TeamSlot[],
  primaryType: PokemonType,
  secondaryType: PokemonType,
  primaryCount: number,
  secondaryCount: number,
  usedIds: Set<number>,
  usedFamilies: Set<number>,
): void {
  // Intentar swaps en todas las clases, priorizando Pawns (mas flexibles)
  const classOrder: PieceClass[] = ['Pawn', 'Bishop', 'Knight', 'Rook', 'King', 'Queen'];

  for (const targetClass of classOrder) {
    if (primaryCount >= 10 && secondaryCount >= 6) break;

    const classIndices = slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.pieceClass === targetClass)
      .map(({ i }) => i);

    const pool = getPokemonForPool(targetClass);

    for (const idx of classIndices) {
      if (primaryCount >= 10 && secondaryCount >= 6) break;

      const current = getPokemonById(slots[idx].pokemonId);
      if (!current) continue;

      const curHasPri = current.types.includes(primaryType);
      const curHasSec = current.types.includes(secondaryType);

      // Solo intentar swap si este slot NO contribuye a un tipo que necesitamos
      const needPrimary = primaryCount < 10 && !curHasPri;
      const needSecondary = secondaryCount < 6 && !curHasSec;
      if (!needPrimary && !needSecondary) continue;

      // Buscar mejor reemplazo que mejore el deficit neto
      let bestReplacement: ClassifiedPokemon | null = null;
      let bestGain = 0;

      for (const c of pool) {
        if (c.pokemon.id === current.id) continue;
        if (usedIds.has(c.pokemon.id)) continue;
        if (usedFamilies.has(c.pokemon.evolutionFamilyId)) continue;
        if (c.pokemon.isLegendary) continue;

        const repHasPri = c.pokemon.types.includes(primaryType);
        const repHasSec = c.pokemon.types.includes(secondaryType);
        if (!repHasPri && !repHasSec) continue;

        // Calcular ganancia neta: que tanto mejoran los deficits
        const priDelta = (repHasPri ? 1 : 0) - (curHasPri ? 1 : 0);
        const secDelta = (repHasSec ? 1 : 0) - (curHasSec ? 1 : 0);

        // No empeorar un tipo que ya esta en minimo
        const newPriCount = primaryCount + priDelta;
        const newSecCount = secondaryCount + secDelta;
        if (newPriCount < Math.min(primaryCount, 10) && primaryCount <= 10) continue;
        if (newSecCount < Math.min(secondaryCount, 6) && secondaryCount <= 6) continue;

        // Ganancia ponderada: priorizar el tipo con mas deficit
        const priGain = Math.max(0, priDelta) * (primaryCount < 10 ? 2 : 0);
        const secGain = Math.max(0, secDelta) * (secondaryCount < 6 ? 2 : 0);
        const gain = priGain + secGain;

        if (gain > bestGain) {
          bestGain = gain;
          bestReplacement = c;
        }
      }

      if (bestReplacement) {
        usedIds.delete(current.id);
        usedFamilies.delete(current.evolutionFamilyId);
        if (curHasPri) primaryCount--;
        if (curHasSec) secondaryCount--;

        slots[idx] = { pokemonId: bestReplacement.pokemon.id, pieceClass: targetClass };
        usedIds.add(bestReplacement.pokemon.id);
        usedFamilies.add(bestReplacement.pokemon.evolutionFamilyId);
        if (bestReplacement.pokemon.types.includes(primaryType)) primaryCount++;
        if (bestReplacement.pokemon.types.includes(secondaryType)) secondaryCount++;
      }
    }
  }
}
