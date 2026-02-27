import { describe, it, expect } from 'vitest';
import { validateTeam, autoBuildTeam } from '../src/teamBuilder.js';
import { classifyAllPokemon, getPokemonForPool } from '../src/classifier.js';
import { getPokemonById } from '@pokechess/data';
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

describe('autoBuildTeam', () => {
  it('Genera equipo valido Water/Normal', () => {
    const result = autoBuildTeam('Water', 'Normal');
    expect(result.team).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    if (result.team) {
      expect(result.team.slots).toHaveLength(16);
      const errors = validateTeam(result.team);
      expect(errors).toHaveLength(0);
    }
  });

  it('Respeta conteo de tipos minimos', () => {
    const result = autoBuildTeam('Water', 'Poison');
    expect(result.team).not.toBeNull();
    if (result.team) {
      const primaryCount = result.team.slots.filter(s => {
        const p = getPokemonById(s.pokemonId);
        return p && p.types.includes('Water');
      }).length;
      const secondaryCount = result.team.slots.filter(s => {
        const p = getPokemonById(s.pokemonId);
        return p && p.types.includes('Poison');
      }).length;
      expect(primaryCount).toBeGreaterThanOrEqual(10);
      expect(secondaryCount).toBeGreaterThanOrEqual(6);
    }
  });

  it('No tiene especies ni familias duplicadas', () => {
    const result = autoBuildTeam('Normal', 'Poison');
    expect(result.team).not.toBeNull();
    if (result.team) {
      const ids = result.team.slots.map(s => s.pokemonId);
      expect(new Set(ids).size).toBe(16);
      const families = result.team.slots.map(s => getPokemonById(s.pokemonId)!.evolutionFamilyId);
      expect(new Set(families).size).toBe(16);
    }
  });

  it('Composicion correcta de piezas', () => {
    const result = autoBuildTeam('Poison', 'Ground');
    expect(result.team).not.toBeNull();
    if (result.team) {
      const counts: Record<string, number> = {};
      for (const s of result.team.slots) {
        counts[s.pieceClass] = (counts[s.pieceClass] || 0) + 1;
      }
      expect(counts['Pawn']).toBe(8);
      expect(counts['Knight']).toBe(2);
      expect(counts['Bishop']).toBe(2);
      expect(counts['Rook']).toBe(2);
      expect(counts['Queen']).toBe(1);
      expect(counts['King']).toBe(1);
    }
  });

  it('Devuelve error para combo imposible (Dragon/Dragon)', () => {
    const result = autoBuildTeam('Dragon', 'Dragon');
    expect(result.team).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('Devuelve error para tipo primario con pocas familias', () => {
    const result = autoBuildTeam('Fire', 'Normal');
    expect(result.team).toBeNull();
    expect(result.errors[0]).toContain('familias');
  });

  it('Mismo tipo primario y secundario funciona para tipos comunes', () => {
    const result = autoBuildTeam('Water', 'Water');
    expect(result.team).not.toBeNull();
    if (result.team) {
      const errors = validateTeam(result.team);
      expect(errors).toHaveLength(0);
    }
  });

  it('Max 1 legendario', () => {
    const result = autoBuildTeam('Normal', 'Psychic');
    expect(result.team).not.toBeNull();
    if (result.team) {
      const legendaryCount = result.team.slots.filter(s => {
        const p = getPokemonById(s.pokemonId);
        return p && p.isLegendary;
      }).length;
      expect(legendaryCount).toBeLessThanOrEqual(1);
    }
  });
});
