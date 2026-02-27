import pokemonData from './pokemon.json';
import type { PokemonData, PokemonType, PieceClass, PieceClassStats, GamePiece, BoardState, CombatResult, CombatLogEntry, TeamSlot, TeamConfig } from './types.js';

export const allPokemon: PokemonData[] = pokemonData as PokemonData[];

export function getPokemonById(id: number): PokemonData | undefined {
  return allPokemon.find(p => p.id === id);
}

export function getPokemonByType(type: PokemonType): PokemonData[] {
  return allPokemon.filter(p => p.types.includes(type));
}

export function getEvolutionFamily(familyId: number): PokemonData[] {
  return allPokemon.filter(p => p.evolutionFamilyId === familyId);
}

export type { PokemonData, PokemonType, PieceClass, PieceClassStats, GamePiece, BoardState, CombatResult, CombatLogEntry, TeamSlot, TeamConfig };
