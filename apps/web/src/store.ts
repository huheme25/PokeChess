import { create } from 'zustand';
import type { TeamConfig, PokemonType, CombatResult } from '@pokechess/data';
import type { GameState, Move, Position } from '@pokechess/engine';
import {
  createGame,
  makeMove as engineMakeMove,
  resolvePendingCombat,
  getLegalMoves,
  validateTeam,
} from '@pokechess/engine';

type ViewType = 'builder' | 'game' | 'balance';

function createEmptyTeam(primary: PokemonType, secondary: PokemonType): TeamConfig {
  return {
    primaryType: primary,
    secondaryType: secondary,
    slots: [],
  };
}

interface GameStore {
  // Navegacion
  currentView: ViewType;
  setView: (view: ViewType) => void;

  // Equipos
  teamWhite: TeamConfig;
  teamBlack: TeamConfig;
  activeTeam: 'white' | 'black';
  setActiveTeam: (team: 'white' | 'black') => void;
  updateTeam: (side: 'white' | 'black', team: TeamConfig) => void;

  // Juego
  gameState: GameState | null;
  selectedSquare: Position | null;
  legalMoves: Move[];
  lastCombatResult: CombatResult | null;
  showCombatModal: boolean;

  // Acciones de juego
  startGame: () => string[];
  selectSquare: (pos: Position) => void;
  executeMove: (move: Move) => void;
  resolveCombat: () => void;
  closeCombatModal: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Estado inicial
  currentView: 'builder',
  teamWhite: createEmptyTeam('Fire', 'Fighting'),
  teamBlack: createEmptyTeam('Water', 'Ice'),
  activeTeam: 'white',
  gameState: null,
  selectedSquare: null,
  legalMoves: [],
  lastCombatResult: null,
  showCombatModal: false,

  setView: (view) => set({ currentView: view }),

  setActiveTeam: (team) => set({ activeTeam: team }),

  updateTeam: (side, team) => {
    if (side === 'white') {
      set({ teamWhite: team });
    } else {
      set({ teamBlack: team });
    }
  },

  startGame: () => {
    const { teamWhite, teamBlack } = get();
    // Validar ambos equipos
    const whiteErrors = validateTeam(teamWhite, teamBlack.primaryType);
    const blackErrors = validateTeam(teamBlack, teamWhite.primaryType);
    const allErrors = [
      ...whiteErrors.map(e => `[White] ${e.message}`),
      ...blackErrors.map(e => `[Black] ${e.message}`),
    ];
    if (allErrors.length > 0) return allErrors;

    const gameState = createGame(teamWhite.slots, teamBlack.slots);
    set({
      gameState,
      currentView: 'game',
      selectedSquare: null,
      legalMoves: [],
      lastCombatResult: null,
      showCombatModal: false,
    });
    return [];
  },

  selectSquare: (pos) => {
    const { gameState, selectedSquare, legalMoves } = get();
    if (!gameState || gameState.phase !== 'playing') return;

    // Si ya hay una pieza seleccionada, intentar mover
    if (selectedSquare) {
      const targetMove = legalMoves.find(
        m => m.to.row === pos.row && m.to.col === pos.col
      );
      if (targetMove) {
        get().executeMove(targetMove);
        return;
      }
    }

    // Seleccionar pieza
    const piece = gameState.board[pos.row][pos.col];
    if (piece && piece.owner === gameState.currentPlayer) {
      const moves = getLegalMoves(gameState.board, piece, pos);
      set({ selectedSquare: pos, legalMoves: moves });
    } else {
      set({ selectedSquare: null, legalMoves: [] });
    }
  },

  executeMove: (move) => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const newState = engineMakeMove(gameState, move);
      if (newState.phase === 'combat') {
        set({
          gameState: newState,
          selectedSquare: null,
          legalMoves: [],
          showCombatModal: true,
        });
      } else {
        set({
          gameState: newState,
          selectedSquare: null,
          legalMoves: [],
        });
      }
    } catch (e) {
      console.error('Error ejecutando movimiento:', e);
      set({ selectedSquare: null, legalMoves: [] });
    }
  },

  resolveCombat: () => {
    const { gameState } = get();
    if (!gameState || !gameState.pendingCombat) return;

    const newState = resolvePendingCombat(gameState);
    set({
      gameState: newState,
      lastCombatResult: newState.lastCombatResult,
    });
  },

  closeCombatModal: () => {
    set({ showCombatModal: false, lastCombatResult: null });
  },
}));
