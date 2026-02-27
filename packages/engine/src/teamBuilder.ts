import type { PokemonType, PieceClass, TeamSlot, TeamConfig } from '@pokechess/data';
import { allPokemon, getPokemonById, getEvolutionFamily } from '@pokechess/data';
import { getMatchupScore } from './typeChart.js';
import { getClassification, getPokemonForPool } from './classifier.js';

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
