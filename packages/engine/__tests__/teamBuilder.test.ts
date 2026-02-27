import { describe, it, expect } from 'vitest';
import { validateTeam } from '../src/teamBuilder.js';
import { classifyAllPokemon, getPokemonForPool } from '../src/classifier.js';
import type { TeamConfig, PokemonType } from '@pokechess/data';

describe('Classifier', () => {
  it('Clasifica 151 Pokémon sin errores', () => {
    const classified = classifyAllPokemon();
    expect(classified).toHaveLength(151);
  });

  it('Cada Pokémon tiene al menos un pool', () => {
    const classified = classifyAllPokemon();
    for (const c of classified) {
      expect(c.pool.length).toBeGreaterThan(0);
    }
  });

  it('PR es positivo para todos', () => {
    const classified = classifyAllPokemon();
    for (const c of classified) {
      expect(c.pr).toBeGreaterThan(0);
    }
  });

  it('Hay Pokémon en cada pool', () => {
    const pools = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'] as const;
    for (const pool of pools) {
      const inPool = getPokemonForPool(pool);
      expect(inPool.length).toBeGreaterThan(0);
    }
  });

  it('Species Mod está en {-1, 0, 1}', () => {
    const classified = classifyAllPokemon();
    for (const c of classified) {
      expect([-1, 0, 1]).toContain(c.speciesMod);
    }
  });
});

describe('Team Builder Validation', () => {
  // Construir un equipo válido para tests
  function buildValidTeam(): TeamConfig {
    const pawnPool = getPokemonForPool('Pawn');
    const knightPool = getPokemonForPool('Knight');
    const bishopPool = getPokemonForPool('Bishop');
    const rookPool = getPokemonForPool('Rook');
    const queenPool = getPokemonForPool('Queen');
    const kingPool = getPokemonForPool('King');

    // Tomar los primeros disponibles, evitando familias repetidas
    const usedFamilies = new Set<number>();
    const usedIds = new Set<number>();

    function pickUnique(pool: ReturnType<typeof getPokemonForPool>, count: number, type?: PokemonType) {
      const result: { pokemonId: number }[] = [];
      for (const c of pool) {
        if (result.length >= count) break;
        if (usedFamilies.has(c.pokemon.evolutionFamilyId)) continue;
        if (usedIds.has(c.pokemon.id)) continue;
        if (type && !c.pokemon.types.includes(type)) continue;
        result.push({ pokemonId: c.pokemon.id });
        usedFamilies.add(c.pokemon.evolutionFamilyId);
        usedIds.add(c.pokemon.id);
      }
      return result;
    }

    // Usar Water como tipo principal, Normal como secundario
    const primaryType: PokemonType = 'Water';
    const secondaryType: PokemonType = 'Normal';

    const pawns = pickUnique(pawnPool, 8, primaryType);
    // Si no hay suficientes Water pawns, completar con Normal
    if (pawns.length < 8) {
      const morePawns = pickUnique(pawnPool, 8 - pawns.length, secondaryType);
      pawns.push(...morePawns);
    }
    // Si aún faltan, tomar cualquiera
    if (pawns.length < 8) {
      const morePawns = pickUnique(pawnPool, 8 - pawns.length);
      pawns.push(...morePawns);
    }

    const knights = pickUnique(knightPool, 2);
    const bishops = pickUnique(bishopPool, 2);
    const rooks = pickUnique(rookPool, 2);
    const queens = pickUnique(queenPool, 1);
    const kings = pickUnique(kingPool, 1);

    const slots = [
      ...pawns.map(p => ({ ...p, pieceClass: 'Pawn' as const })),
      ...knights.map(p => ({ ...p, pieceClass: 'Knight' as const })),
      ...bishops.map(p => ({ ...p, pieceClass: 'Bishop' as const })),
      ...rooks.map(p => ({ ...p, pieceClass: 'Rook' as const })),
      ...queens.map(p => ({ ...p, pieceClass: 'Queen' as const })),
      ...kings.map(p => ({ ...p, pieceClass: 'King' as const })),
    ];

    return {
      primaryType,
      secondaryType,
      slots: slots.slice(0, 16),
    };
  }

  it('Equipo vacío falla validación', () => {
    const team: TeamConfig = {
      primaryType: 'Water',
      secondaryType: 'Fire',
      slots: [],
    };
    const errors = validateTeam(team);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.code === 'WRONG_SIZE')).toBe(true);
  });

  it('Detecta especies duplicadas', () => {
    const team: TeamConfig = {
      primaryType: 'Water',
      secondaryType: 'Normal',
      slots: Array(16).fill({ pokemonId: 7, pieceClass: 'Pawn' }),
    };
    const errors = validateTeam(team);
    expect(errors.some(e => e.code === 'DUPLICATE_SPECIES')).toBe(true);
  });

  it('Detecta demasiados legendarios', () => {
    const pawnPool = getPokemonForPool('Pawn');
    const slots = pawnPool.slice(0, 14).map(c => ({
      pokemonId: c.pokemon.id,
      pieceClass: 'Pawn' as const,
    }));
    // Agregar 2 legendarios
    slots.push({ pokemonId: 150, pieceClass: 'Pawn' });
    slots.push({ pokemonId: 151, pieceClass: 'Pawn' });

    const team: TeamConfig = {
      primaryType: 'Psychic',
      secondaryType: 'Normal',
      slots,
    };
    const errors = validateTeam(team);
    expect(errors.some(e => e.code === 'TOO_MANY_LEGENDARIES')).toBe(true);
  });
});
