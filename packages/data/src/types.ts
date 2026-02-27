export type PokemonType =
  | 'Normal' | 'Fire' | 'Water' | 'Electric' | 'Grass' | 'Ice'
  | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic'
  | 'Bug' | 'Rock' | 'Ghost' | 'Dragon';

export interface PokemonData {
  id: number;
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spd: number;
    special: number;
  };
  evolutionFamilyId: number;
  stage: 0 | 1 | 2;
  evolvesTo: number[];
  isLegendary: boolean;
}

export type PieceClass = 'Pawn' | 'Knight' | 'Bishop' | 'Rook' | 'Queen' | 'King';

export interface PieceClassStats {
  hp: number;
  die: number;
  attack: number;
  defense: number;
}

export interface GamePiece {
  id: string;
  pokemonId: number;
  pieceClass: PieceClass;
  owner: 'white' | 'black';
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  die: number;
  stage: number;
  combatsWon: number;
  speciesMod: number;
  position: { row: number; col: number } | null;
}

export type BoardState = (GamePiece | null)[][];

export interface CombatResult {
  winner: 'attacker' | 'defender';
  log: CombatLogEntry[];
  attackerHpRemaining: number;
  defenderHpRemaining: number;
}

export interface CombatLogEntry {
  turn: number;
  attacker: string;
  roll: number;
  damage: number;
  targetHpAfter: number;
}

export interface TeamSlot {
  pokemonId: number;
  pieceClass: PieceClass;
}

export interface TeamConfig {
  primaryType: PokemonType;
  secondaryType: PokemonType;
  slots: TeamSlot[];
}
