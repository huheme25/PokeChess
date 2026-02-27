// Type Chart
export { getTypeEffectiveness, getTypeMultiplier, getMatchupScore, SE, N, RES, IMM, TYPE_ORDER } from './typeChart.js';

// Combat
export { BASE_STATS, getStatsWithEvolution, calculateDamage, resolveCombat } from './combat.js';
export type { PieceStats, CombatantInfo } from './combat.js';

// Balance Engine
export { calculateWinProbability, classVsClassWinrate, classVsClassWinrateAsym, customWinrate } from './balance.js';

// Chess
export {
  getPseudoLegalMoves, getLegalMoves, isInCheck, isCheckmate, isStalemate,
  findKing, isSquareAttacked, applyMove, createEmptyBoard,
} from './chess.js';
export type { Position, Move } from './chess.js';

// Classifier
export { classifyAllPokemon, getClassification, getPokemonForPool, clearCache } from './classifier.js';
export type { ClassifiedPokemon } from './classifier.js';

// Team Builder
export { validateTeam, isPokemonLegalForClass, calculateTeamMatchupScore } from './teamBuilder.js';
export type { ValidationError } from './teamBuilder.js';

// Game
export { createGame, makeMove, resolvePendingCombat, createGamePiece, setupBoard } from './game.js';
export type { GameState, GamePhase } from './game.js';
